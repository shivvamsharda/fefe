import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Crown, Medal, DollarSign } from 'lucide-react';

interface DonationLeaderboardProps {
  streamId: string;
}

interface DonorData {
  donor_wallet_address: string;
  donor_display_name: string;
  total_sol: number;
  total_wenlive: number;
  donation_count: number;
  combined_value: number; // For sorting - SOL equivalent
}

const DonationLeaderboard = ({ streamId }: DonationLeaderboardProps) => {
  const [donors, setDonors] = useState<DonorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch donations data
  const fetchDonationsData = async () => {
    try {
      const { data: donations, error } = await supabase
        .from('donations')
        .select(`
          donor_wallet_address,
          amount_sol,
          token_type
        `)
        .eq('stream_id', streamId);

      if (error) {
        console.error('Error fetching donations:', error);
        return;
      }

      if (!donations || donations.length === 0) {
        setDonors([]);
        return;
      }

      // Group donations by donor wallet
      const donorMap = new Map<string, { sol: number; wenlive: number; count: number }>();
      
      donations.forEach(donation => {
        const wallet = donation.donor_wallet_address;
        if (!donorMap.has(wallet)) {
          donorMap.set(wallet, { sol: 0, wenlive: 0, count: 0 });
        }
        
        const donor = donorMap.get(wallet)!;
        donor.count++;
        
        if (donation.token_type === 'WENLIVE') {
          donor.wenlive += donation.amount_sol; // amount_sol stores the actual amount regardless of token type
        } else {
          donor.sol += donation.amount_sol;
        }
      });

      // Get unique wallet addresses to fetch user profiles
      const walletAddresses = Array.from(donorMap.keys());
      
      // Fetch user profiles for display names
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('wallet_address, username, display_name')
        .in('wallet_address', walletAddresses);

      if (profileError) {
        console.error('Error fetching user profiles:', profileError);
      }

      // Create profile lookup map
      const profileMap = new Map<string, { username?: string; display_name?: string }>();
      profiles?.forEach(profile => {
        profileMap.set(profile.wallet_address, {
          username: profile.username,
          display_name: profile.display_name
        });
      });

      // Convert to array and calculate combined value for sorting
      const donorArray: DonorData[] = Array.from(donorMap.entries()).map(([wallet, data]) => {
        const profile = profileMap.get(wallet);
        const displayName = profile?.display_name || profile?.username || 
          `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
        
        // Convert WENLIVE to SOL equivalent for sorting (assume 1 WENLIVE = 0.0001 SOL for now)
        const wenliveToSol = data.wenlive * 0.0001;
        const combinedValue = data.sol + wenliveToSol;

        return {
          donor_wallet_address: wallet,
          donor_display_name: displayName,
          total_sol: data.sol,
          total_wenlive: data.wenlive,
          donation_count: data.count,
          combined_value: combinedValue
        };
      });

      // Sort by combined value (SOL equivalent) descending and take top 10
      const sortedDonors = donorArray
        .sort((a, b) => b.combined_value - a.combined_value)
        .slice(0, 10);

      setDonors(sortedDonors);
    } catch (error) {
      console.error('Error fetching donations data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (streamId) {
      fetchDonationsData();
    }
  }, [streamId]);

  // Set up real-time listener for new donations
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`donation-leaderboard-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'donations',
          filter: `stream_id=eq.${streamId}`
        },
        () => {
          // Refresh leaderboard when new donation comes in
          fetchDonationsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2:
        return <Trophy className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Medal className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="w-4 h-4 flex items-center justify-center text-xs font-medium text-white/50">#{rank}</span>;
    }
  };

  const formatSolAmount = (amount: number) => {
    // For SOL amounts, keep precision and remove unnecessary trailing zeros after decimal
    return amount.toFixed(4).replace(/\.0+$/, '').replace(/(\.\d+?)0+$/, '$1');
  };

  const formatWenliveAmount = (amount: number) => {
    // For WENLIVE amounts, display as whole numbers with comma separators
    return Math.round(amount).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card className="bg-black/40 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign size={16} className="text-solana" />
            Donations Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-solana"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (donors.length === 0) {
    return (
      <Card className="bg-black/40 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign size={16} className="text-solana" />
            Donations Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-white/60 py-4">
            <DollarSign size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No donations yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign size={16} className="text-solana" />
          Donations Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/70 text-xs h-8 px-3">Rank</TableHead>
              <TableHead className="text-white/70 text-xs h-8 px-3">Donor</TableHead>
              <TableHead className="text-white/70 text-xs h-8 px-3 text-right">SOL</TableHead>
              <TableHead className="text-white/70 text-xs h-8 px-3 text-right">WENLIVE</TableHead>
              <TableHead className="text-white/70 text-xs h-8 px-3 text-right">Tips</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donors.map((donor, index) => (
              <TableRow key={donor.donor_wallet_address} className="border-white/10 hover:bg-white/5">
                <TableCell className="p-3">
                  <div className="flex items-center justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                </TableCell>
                <TableCell className="p-3">
                  <span className="text-white text-xs font-medium truncate max-w-[80px] block">
                    {donor.donor_display_name}
                  </span>
                </TableCell>
                <TableCell className="p-3 text-right">
                  {donor.total_sol > 0 ? (
                    <span className="text-solana text-xs font-medium">
                      {formatSolAmount(donor.total_sol)}
                    </span>
                  ) : (
                    <span className="text-white/30 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="p-3 text-right">
                  {donor.total_wenlive > 0 ? (
                    <span className="text-primary text-xs font-medium">
                      {formatWenliveAmount(donor.total_wenlive)}
                    </span>
                  ) : (
                    <span className="text-white/30 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="p-3 text-right">
                  <span className="text-white/70 text-xs">
                    {donor.donation_count}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DonationLeaderboard;
