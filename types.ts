export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export interface GeminiConfig {
  useThinking: boolean;
}

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
}

export interface PortfolioItem {
  coinId: string;
  symbol: string;
  amount: number;
  averageBuyPrice: number;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  coinId: string;
  symbol: string;
  amount: number;
  price: number;
  totalValue: number;
  timestamp: number;
  isAutoTrade?: boolean;
  aiReason?: string;
}

export interface UserWallet {
  usdBalance: number;
  assets: { [key: string]: PortfolioItem };
}

export interface TradeDecision {
  decision: 'BUY' | 'SELL' | 'HOLD';
  amountUSD: number;
  reason: string;
  confidence: number;
}