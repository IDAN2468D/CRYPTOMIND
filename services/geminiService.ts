import { GoogleGenAI, Content, Part, Schema, Type } from "@google/genai";
import { Message, Role, Coin, PortfolioItem, TradeDecision } from '../types';

// Initialize the client
// The API key is injected via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends a message to Gemini and yields chunks of the response.
 * Uses gemini-3-pro-preview for advanced reasoning.
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

  // Configure the model
  const modelId = 'gemini-3-pro-preview';
  
  // Setup configuration
  const config: any = {
      systemInstruction: "You are an elite crypto market analyst. Be concise, technical, and data-driven."
  };

  if (useThinking) {
    // Deep Thinking Configuration
    config.thinkingConfig = { 
      thinkingBudget: 32768 // Max budget for gemini-3-pro-preview
    };
  }

  try {
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
  } catch (error) {
    console.error("Gemini API Error:", error);
    yield "Error: Unable to connect to the AI Analyst. Please try again.";
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

    const prompt = `
        You are a High Frequency Trading Bot. Analyze this crypto asset and current wallet state to make an immediate trading decision.
        
        Asset: ${coin.name} (${coin.symbol})
        Current Price: $${coin.current_price}
        24h Change: ${coin.price_change_percentage_24h}%
        Market Cap: $${coin.market_cap}
        
        Wallet USD Balance: $${walletBalance}
        Current Holdings of ${coin.symbol}: ${currentHoldings ? currentHoldings.amount : 0} units
        
        Strategy: High Activity. Don't be too conservative. Look for momentum.
        - If 24h change is positive (> 0.5%), consider BUY to catch the trend.
        - If 24h change is negative (< -0.5%) and we hold it, consider SELL to stop loss.
        - If we have a lot of USD, lean towards BUY.
        - If we have a lot of the asset and it's up, lean towards SELL to take profit.
        
        Amount: Trade between 1% to 10% of available balance/holdings.
        
        Return JSON with:
        - decision: "BUY", "SELL", or "HOLD"
        - amountUSD: The amount in USD to trade (0 if HOLD).
        - reason: A short 5-8 word explanation.
        - confidence: 0-100 score.
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
            // Remove markdown code blocks if present (Gemini sometimes adds them despite MIME type)
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '');
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```/, '').replace(/```$/, '');
            }
            return JSON.parse(cleanText) as TradeDecision;
        }
        throw new Error("No JSON response");
    } catch (e: any) {
        // Handle Rate Limits specifically (429)
        if (e.message?.includes('429') || e.status === 429) {
             console.warn("Gemini Rate Limit Hit - Skipping Auto-Trade turn");
             return { decision: 'HOLD', amountUSD: 0, reason: "Rate Limit Cooldown", confidence: 0 };
        }
        
        console.error("Auto-trade decision failed", e);
        return { decision: 'HOLD', amountUSD: 0, reason: "API Error", confidence: 0 };
    }
}