interface CoinGeckoPriceResponse {
  solana: {
    usd: number;
  };
}

interface CachedPrice {
  usdPrice: number;
  timestamp: number;
}

class SolPriceService {
  private cachedPrice: CachedPrice | null = null;
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds for real-time updates
  private readonly PRICE_BUFFER = 0.02; // 2% buffer
  private readonly FALLBACK_PRICE = 165; // $165 realistic SOL fallback price
  private readonly API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

  /**
   * Get the current SOL price in USD from CoinGecko API
   */
  async getSolPriceUSD(): Promise<number> {
    // Check cache first
    if (this.cachedPrice && this.isCacheValid()) {
      return this.cachedPrice.usdPrice;
    }

    try {
      console.log('Fetching SOL price from CoinGecko...');
      const response = await fetch(this.API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoPriceResponse = await response.json();
      const price = data.solana.usd;

      console.log(`Fetched SOL price: $${price}`);

      // Validate price is realistic (between $1 and $1000)
      if (price < 1 || price > 1000) {
        throw new Error(`Unrealistic SOL price: $${price}`);
      }

      // Cache the price
      this.cachedPrice = {
        usdPrice: price,
        timestamp: Date.now(),
      };

      return price;
    } catch (error) {
      console.error('Error fetching SOL price from CoinGecko:', error);
      
      // Return cached price if available, otherwise fallback
      if (this.cachedPrice) {
        console.warn('Using cached SOL price due to API error');
        return this.cachedPrice.usdPrice;
      }
      
      console.warn(`Using fallback SOL price: $${this.FALLBACK_PRICE}`);
      return this.FALLBACK_PRICE;
    }
  }

  /**
   * Convert USD amount to SOL with buffer
   */
  async convertUSDToSOL(usdAmount: number): Promise<number> {
    const solPrice = await this.getSolPriceUSD();
    const baseSolAmount = usdAmount / solPrice;
    
    // Add buffer to account for price movements during transaction
    const solAmountWithBuffer = baseSolAmount * (1 + this.PRICE_BUFFER);
    
    // Round to 6 decimal places for clarity
    return Math.round(solAmountWithBuffer * 1000000) / 1000000;
  }

  /**
   * Get display string for USD to SOL conversion
   */
  async getDisplayPrice(usdAmount: number): Promise<string> {
    const solAmount = await this.convertUSDToSOL(usdAmount);
    return `$${usdAmount} (~${solAmount} SOL)`;
  }

  /**
   * Check if cached price is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cachedPrice) return false;
    return Date.now() - this.cachedPrice.timestamp < this.CACHE_DURATION;
  }

  /**
   * Clear the price cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cachedPrice = null;
  }

  /**
   * Get cached price info for debugging
   */
  getCacheInfo(): { price: number | null; age: number | null; valid: boolean } {
    if (!this.cachedPrice) {
      return { price: null, age: null, valid: false };
    }

    const age = Date.now() - this.cachedPrice.timestamp;
    return {
      price: this.cachedPrice.usdPrice,
      age,
      valid: this.isCacheValid(),
    };
  }
}

// Export singleton instance
export const solPriceService = new SolPriceService();