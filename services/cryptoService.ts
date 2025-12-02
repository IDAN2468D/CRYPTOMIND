import { Coin } from '../types';

const API_URL = 'https://api.coingecko.com/api/v3';

export async function getMarketData(page = 1, perPage = 100): Promise<Coin[]> {
  try {
    const response = await fetch(
      `${API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h`
    );
    
    if (!response.ok) {
        // Fallback for rate limiting or errors
        console.warn('CoinGecko API limit reached or error, returning empty list');
        return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch crypto data:', error);
    return [];
  }
}