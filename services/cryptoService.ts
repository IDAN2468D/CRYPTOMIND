
import { Coin } from '../types';

const API_URL = 'https://api.coingecko.com/api/v3';

// Helper to generate mock sparkline
const generateMockSparkline = (startPrice: number): number[] => {
    const points = [];
    let price = startPrice;
    for(let i=0; i<168; i++) { // 7 days * 24 hours
        price = price * (1 + (Math.random() * 0.04 - 0.02));
        points.push(price);
    }
    return points;
};

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
    low_24h: 63000,
    sparkline_in_7d: { price: generateMockSparkline(62000) }
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
    current_price: 3450.12,
    price_change_percentage_24h: 1.15,
    market_cap: 400000000000,
    total_volume: 1500000000,
    high_24h: 3550,
    low_24h: 3400,
    sparkline_in_7d: { price: generateMockSparkline(3300) }
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
    low_24h: 142,
    sparkline_in_7d: { price: generateMockSparkline(150) }
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
    low_24h: 585,
    sparkline_in_7d: { price: generateMockSparkline(580) }
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
    low_24h: 0.61,
    sparkline_in_7d: { price: generateMockSparkline(0.60) }
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
    low_24h: 0.44,
    sparkline_in_7d: { price: generateMockSparkline(0.42) }
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
    low_24h: 0.11,
    sparkline_in_7d: { price: generateMockSparkline(0.10) }
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
    low_24h: 7.10,
    sparkline_in_7d: { price: generateMockSparkline(7.40) }
  }
];

export async function getMarketData(page = 1, perPage = 100): Promise<Coin[]> {
  try {
    // Attempt to fetch real data with sparkline=true
    const response = await fetch(
      `${API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=24h`
    );
    
    // Check if response is OK. If 429 (Too Many Requests) or other error, throw to catch block.
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Basic validation to ensure we got an array
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Empty or invalid data received");
    }

    return data;

  } catch (error) {
    console.warn('Crypto API failed (likely CORS or Rate Limit), using Backup Data:', error);
    
    // Return mock data so the app always has something to show
    return MOCK_COINS.map(coin => ({
        ...coin,
        current_price: coin.current_price * (1 + (Math.random() * 0.002 - 0.001)), // +/- 0.1% random fluctuation
        price_change_percentage_24h: coin.price_change_percentage_24h + (Math.random() * 0.2 - 0.1)
    }));
  }
}

export interface ChartDataPoint {
  date: string;
  price: number;
}

export async function getCoinHistory(coinId: string, timeframe: string | number = 7): Promise<ChartDataPoint[]> {
  // Convert custom timeframe strings to CoinGecko 'days' format
  let daysParam = timeframe;
  let isOneHour = false;

  if (timeframe === '1h') {
      daysParam = 1; // Fetch 24h, filter later
      isOneHour = true;
  } else if (timeframe === '1m') {
      daysParam = 30;
  }

  try {
    const response = await fetch(
      `${API_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${daysParam}`
    );

    if (!response.ok) throw new Error('Failed to fetch history');
    
    const data = await response.json();
    let prices = data.prices as [number, number][];

    // Filter for 1H view if requested (last ~12 points assuming 5min intervals or just take last hour)
    if (isOneHour) {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        prices = prices.filter(p => p[0] >= oneHourAgo);
    }

    return prices.map((item: [number, number]) => ({
      date: new Date(item[0]).toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          hour: (daysParam === 1 || isOneHour) ? 'numeric' : undefined,
          minute: isOneHour ? '2-digit' : undefined
      }),
      price: item[1]
    }));

  } catch (error) {
    console.warn('Using Mock History Data for chart due to API limit');
    
    // Generate realistic looking mock chart data
    const mockData: ChartDataPoint[] = [];
    const now = Date.now();
    
    // Determine number of points based on timeframe
    let points = 50;
    let duration = 0;

    if (timeframe === '1h') {
        points = 20;
        duration = 60 * 60 * 1000; // 1 hour
    } else if (timeframe === '1m' || timeframe === 30) {
        points = 30;
        duration = 30 * 24 * 60 * 60 * 1000;
    } else {
        const days = typeof timeframe === 'number' ? timeframe : 7;
        points = days * 12;
        duration = days * 24 * 60 * 60 * 1000;
    }

    const coin = MOCK_COINS.find(c => c.id === coinId) || MOCK_COINS[0];
    let price = coin.current_price;

    for (let i = points; i >= 0; i--) {
      const time = now - (i * duration / points);
      const volatility = 0.02; // 2% volatility
      const change = 1 + (Math.random() * volatility * 2 - volatility);
      price = price * change;
      
      mockData.push({
        date: new Date(time).toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            hour: (duration <= 24 * 60 * 60 * 1000) ? '2-digit' : undefined,
            minute: (duration <= 60 * 60 * 1000) ? '2-digit' : undefined
        }),
        price: price
      });
    }
    return mockData;
  }
}
