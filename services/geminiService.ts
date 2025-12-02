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
        Analyze this crypto asset and current wallet state to make a trading decision.
        
        Asset: ${coin.name} (${coin.symbol})
        Current Price: $${coin.current_price}
        24h Change: ${coin.price_change_percentage_24h}%
        Market Cap: $${coin.market_cap}
        
        Wallet USD Balance: $${walletBalance}
        Current Holdings of ${coin.symbol}: ${currentHoldings ? currentHoldings.amount : 0} units
        
        Strategy: Moderate Risk. Buy dips, sell peaks. Do not spend more than 5% of available USD balance on a single trade.
        If holding, consider selling if profit is likely or to stop loss.
        
        Return JSON with:
        - decision: "BUY", "SELL", or "HOLD"
        - amountUSD: The amount in USD to trade (0 if HOLD).
        - reason: A short 10-word explanation.
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
            return JSON.parse(result.text) as TradeDecision;
        }
        throw new Error("No JSON response");
    } catch (e) {
        console.error("Auto-trade decision failed", e);
        return { decision: 'HOLD', amountUSD: 0, reason: "API Error", confidence: 0 };
    }
}