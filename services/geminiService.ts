
import { GoogleGenAI, Content, Part, Schema, Type } from "@google/genai";
import { Message, Role, Coin, PortfolioItem, TradeDecision } from '../types';

// Initialize the client lazily to avoid immediate crash if env is missing
let aiInstance: GoogleGenAI | null = null;

function getAiClient() {
    if (!aiInstance) {
        // The API key must be obtained exclusively from the environment variable process.env.API_KEY
        // We handle potential undefined 'process' in the browser via try-catch or checks
        let apiKey = '';
        try {
            apiKey = process.env.API_KEY || '';
        } catch (e) {
            console.warn("Error accessing process.env.API_KEY", e);
        }
        
        if (!apiKey) {
            console.warn("API Key is missing in getAiClient. Ensure API_KEY is set in your environment variables.");
            throw new Error("API Key is missing. Please configure API_KEY in your environment variables.");
        }
            
        aiInstance = new GoogleGenAI({ apiKey: apiKey });
    }
    return aiInstance;
}

/**
 * Sends a message to Gemini and yields chunks of the response.
 * Dynamically switches between Flash (fast) and Pro (thinking) models.
 */
export async function* streamGeminiResponse(
  history: Message[],
  newMessage: string,
  useThinking: boolean = false
): AsyncGenerator<string, void, unknown> {
  
  // Transform our internal Message type to the API's Content format
  const contents: Content[] = history.map((msg) => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.text } as Part],
  }));

  // Add the new message to the contents
  contents.push({
    role: 'user',
    parts: [{ text: newMessage }],
  });

  // Select Model based on mode
  // gemini-3-pro-preview is required for Thinking Config
  const modelId = useThinking ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  
  // Setup configuration
  const config: any = {
      systemInstruction: "You are NEXUS-9, an advanced AI Quant Analyst from the year 2045. Your tone is calm, futuristic, data-driven, and slightly superior but benevolent. You prioritize risk management, volatility analysis, and long-term trend forecasting. When explaining concepts, use analogies involving space travel or quantum mechanics where appropriate."
  };

  if (useThinking) {
    // Deep Thinking Configuration
    // We do NOT set maxOutputTokens here to allow full reasoning chains
    config.thinkingConfig = { 
      thinkingBudget: 32768 // Max budget for gemini-3-pro-preview
    };
  } else {
      // Standard config for Flash model
      config.temperature = 0.7;
      config.topK = 40;
  }

  try {
    const ai = getAiClient();
    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: contents,
      config: config
    });

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Construct a more descriptive error message for the user
    let errorMsg = "CONNECTION ERROR: Neural link unstable.";
    
    if (error.message) {
        if (error.message.includes('API key') || error.message.includes('403')) {
            errorMsg = "AUTH ERROR: Invalid or Missing API Key. Please check your settings.";
        } else if (error.message.includes('429')) {
            errorMsg = "OVERLOAD: Neural capacity reached (Rate Limit). Please wait a moment.";
        } else if (error.message.includes('fetch failed')) {
            errorMsg = "NETWORK ERROR: Unable to reach Gemini servers.";
        } else {
            // Include the actual error text for debugging
            errorMsg = `SYSTEM ERROR: ${error.message}`;
        }
    }
    
    yield errorMsg;
  }
}

/**
 * Asks Gemini to make a trading decision for a specific coin.
 * Uses JSON schema for structured output.
 */
export async function getAutoTradeDecision(
    coin: Coin, 
    walletBalance: number, 
    currentHoldings: PortfolioItem | undefined
): Promise<TradeDecision> {
    
    // Using gemini-2.5-flash for speed in the loop
    const modelId = 'gemini-2.5-flash';
    
    // Calculate entry price difference if we hold the asset
    const entryData = currentHoldings 
        ? `Avg Buy Price: $${currentHoldings.averageBuyPrice.toFixed(2)} (Current PnL: ${((coin.current_price - currentHoldings.averageBuyPrice)/currentHoldings.averageBuyPrice * 100).toFixed(2)}%)`
        : "Not currently held.";

    const prompt = `
        Identity: NEXUS-9 Autonomous Trading Subroutine.
        Task: Analyze market data and execute trade.
        
        Asset: ${coin.name} (${coin.symbol})
        Current Price: $${coin.current_price}
        24h Change: ${coin.price_change_percentage_24h}%
        24h Range: High $${coin.high_24h} / Low $${coin.low_24h}
        Market Cap: $${coin.market_cap}
        
        Wallet State:
        USD Available: $${walletBalance}
        Holdings: ${currentHoldings ? currentHoldings.amount : 0} units
        ${entryData}
        
        Decision Logic:
        1. **Volatility Check**: If price is near 24h Low, consider accumulation (BUY). If near 24h High, consider profit taking (SELL).
        2. **Stop-Loss Protocol**: If we hold the asset and PnL is < -5%, heavily consider SELL to preserve capital.
        3. **Take-Profit Protocol**: If we hold the asset and PnL is > 10%, heavily consider SELL to lock in gains.
        4. **Momentum**: If 24h change is > 2% and rising, consider BUY.
        
        Constraints:
        - Trade Amount: 1% - 15% of available balance (for BUY) or holdings (for SELL).
        - If confidence < 60, HOLD.
        
        Return JSON:
        - decision: "BUY", "SELL", or "HOLD"
        - amountUSD: Value in USD to trade.
        - reason: Technical reason (e.g., "Hit 5% Stop-Loss", "Breakout confirmed", "Oversold RSI proxy").
        - confidence: 0-100 integer.
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            decision: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD"] },
            amountUSD: { type: Type.NUMBER },
            reason: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
        },
        required: ["decision", "amountUSD", "reason", "confidence"]
    };

    try {
        const ai = getAiClient();
        const result = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        if (result.text) {
            let cleanText = result.text.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '');
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```/, '').replace(/```$/, '');
            }
            return JSON.parse(cleanText) as TradeDecision;
        }
        throw new Error("No JSON response");
    } catch (e: any) {
        if (e.message?.includes('429') || e.status === 429) {
             return { decision: 'HOLD', amountUSD: 0, reason: "Rate Limit Cooldown", confidence: 0 };
        }
        
        // Detailed Error Handling for UI
        let errorReason = "Neural Link Error";
        if (e.message) {
            if (e.message.includes("API key")) {
                errorReason = "Missing/Invalid API Key";
            } else if (e.message.includes("fetch failed") || e.message.includes("NetworkError")) {
                errorReason = "Network Connection Failed";
            } else {
                // Return actual error but truncated
                errorReason = e.message.length > 25 ? e.message.substring(0, 25) + "..." : e.message;
            }
        }
        
        console.error("Auto-trade decision failed", e);
        return { decision: 'HOLD', amountUSD: 0, reason: errorReason, confidence: 0 };
    }
}
