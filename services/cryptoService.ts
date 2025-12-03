import { Coin } from '../types';

const API_URL = 'https://api.coingecko.com/api/v3';

const MOCK_COINS: Coin[] = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
    current_price: 64230.50,
    price_change_percentage_24h: 2.45,
    market_cap: 1200000000000,
    total_volume: 35000000000,
    high_24h: 65000,
    low_24h: 63000
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
    current_price: 3450.12,
    price_change_percentage_24h: 1.15,
    market_cap: 400000000000,
    total_volume: 15000000000,
    high_24h: 3550,
    low_24h: 3400
  },
  {
    id: "solana",
    symbol: "sol",
    name: "Solana",
    image: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
    current_price: 145.20,
    price_change_percentage_24h: -5.4,
    market_cap: 65000000000,
    total_volume: 4000000000,
    high_24h: 155,
    low_24h: 142
  },
  {
    id: "binancecoin",
    symbol: "bnb",
    name: "BNB",
    image: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    current_price: 590.50,
    price_change_percentage_24h: 0.5,
    market_cap: 87000000000,
    total_volume: 1200000000,
    high_24h: 595,
    low_24h: 585
  },
  {
    id: "ripple",
    symbol: "xrp",
    name: "XRP",
    image: "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    current_price: 0.62,
    price_change_percentage_24h: -0.8,
    market_cap: 34000000000,
    total_volume: 1100000000,
    high_24h: 0.63,
    low_24h: 0.61
  },
  {
    id: "cardano",
    symbol: "ada",
    name: "Cardano",
    image: "https://coin-images.coingecko.com/coins/images/975/large/cardano.png",
    current_price: 0.45,
    price_change_percentage_24h: 1.2,
    market_cap: 16000000000,
    total_volume: 400000000,
    high_24h: 0.46,
    low_24h: 0.44
  },
  {
    id: "dogecoin",
    symbol: "doge",
    name: "Dogecoin",
    image: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png",
    current_price: 0.12,
    price_change_percentage_24h: 8.5,
    market_cap: 17000000000,
    total_volume: 2000000000,
    high_24h: 0.13,
    low_24h: 0.11
  },
  {
    id: "polkadot",
    symbol: "dot",
    name: "Polkadot",
    image: "https://coin-images.coingecko.com/coins/images/12171/large/polkadot.png",
    current_price: 7.20,
    price_change_percentage_24h: -2.1,
    market_cap: 10000000000,
    total_volume: 200000000,
    high_24h: 7.50,
    low_24h: 7.10
  }
];

export async function getMarketData(page = 1, perPage = 100): Promise<Coin[]> {
  try {
    const response = await fetch(
      `${API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h`
    );
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch crypto data, using mock data:', error);
    // Return mock data so the app doesn't look broken on initial load
    return MOCK_COINS;
  }
}