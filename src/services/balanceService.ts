
import { PublicKey } from '@solana/web3.js';
import { getWenliveBalance } from '@/services/walletService';
import { supabase } from '@/integrations/supabase/client';

interface BalanceResult {
  sol: number | null;
  wenlive: number | null;
}

export class BalanceService {
  private static instance: BalanceService;
  private balanceCache = new Map<string, { balance: BalanceResult; timestamp: number }>();
  private readonly CACHE_TTL = 15000; // 15 seconds

  static getInstance(): BalanceService {
    if (!BalanceService.instance) {
      BalanceService.instance = new BalanceService();
    }
    return BalanceService.instance;
  }

  private async getRpcUrl(): Promise<string> {
    try {
      const { data } = await supabase.functions.invoke('get-rpc-url');
      return data?.rpcUrl || 'https://mainnet.helius-rpc.com/?api-key=8d5d0812-ab2e-4699-808a-a245f1880138';
    } catch (error) {
      console.warn('Failed to get RPC URL from Supabase, using fallback');
      return 'https://mainnet.helius-rpc.com/?api-key=8d5d0812-ab2e-4699-808a-a245f1880138';
    }
  }

  // Fetch both SOL and WENLIVE balances in parallel
  async fetchBalances(publicKey: PublicKey): Promise<BalanceResult> {
    const cacheKey = publicKey.toString();
    const cached = this.balanceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.balance;
    }

    try {
      // Fetch both balances in parallel for better performance
      const [solBalance, wenliveBalance] = await Promise.allSettled([
        this.fetchSolBalance(publicKey),
        this.fetchWenliveBalance(publicKey),
      ]);

      const result: BalanceResult = {
        sol: solBalance.status === 'fulfilled' ? solBalance.value : null,
        wenlive: wenliveBalance.status === 'fulfilled' ? wenliveBalance.value : null,
      };

      // Cache the result
      this.balanceCache.set(cacheKey, {
        balance: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('Error fetching balances:', error);
      return { sol: null, wenlive: null };
    }
  }

  private async fetchSolBalance(publicKey: PublicKey): Promise<number> {
    const rpcUrl = await this.getRpcUrl();
    
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [publicKey.toString()],
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }
    
    const balanceInLamports = data.result.value;
    return balanceInLamports / 1000000000;
  }

  private async fetchWenliveBalance(publicKey: PublicKey): Promise<number> {
    return await getWenliveBalance(publicKey);
  }

  // Clear cache for a specific wallet or all
  clearCache(publicKey?: string) {
    if (publicKey) {
      this.balanceCache.delete(publicKey);
    } else {
      this.balanceCache.clear();
    }
  }

  // Get cached balance if available
  getCachedBalance(publicKey: string): BalanceResult | null {
    const cached = this.balanceCache.get(publicKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.balance;
    }
    return null;
  }
}

export const balanceService = BalanceService.getInstance();
