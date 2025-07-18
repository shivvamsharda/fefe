import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Copy, ExternalLink, Wallet, TrendingUp, Users, DollarSign, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/context/WalletContext';
import { regenerateWallet } from '@/services/googleWalletService';
import PrivateKeyDownloadModal from '@/components/wallet/PrivateKeyDownloadModal';

interface WalletStats {
  totalEarnings: number;
  totalDonations: number;
  uniqueDonors: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    date: string;
    type: 'donation' | 'withdrawal';
    from?: string;
  }>;
}

const WalletSettings = () => {
  const { hasWalletCapability, effectiveWalletAddress, userProfile, isGoogleAuthenticated, connected } = useWallet();
  const [stats, setStats] = useState<WalletStats>({
    totalEarnings: 0,
    totalDonations: 0,
    uniqueDonors: 0,
    recentTransactions: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [generatedWallet, setGeneratedWallet] = useState<{ privateKey: string; walletAddress: string } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (hasWalletCapability && userProfile) {
      fetchWalletStats();
    }
  }, [hasWalletCapability, userProfile]);

  const fetchWalletStats = async () => {
    if (!userProfile?.id) return;

    try {
      const { data: donations, error } = await supabase
        .from('donations')
        .select('*')
        .eq('creator_user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const totalEarnings = donations?.reduce((sum, donation) => sum + Number(donation.amount_sol), 0) || 0;
      const uniqueDonors = new Set(donations?.map(d => d.donor_wallet_address)).size;

      const recentTransactions = donations?.map(donation => ({
        id: donation.id,
        amount: Number(donation.amount_sol),
        date: donation.created_at,
        type: 'donation' as const,
        from: donation.donor_wallet_address
      })) || [];

      setStats({
        totalEarnings,
        totalDonations: donations?.length || 0,
        uniqueDonors,
        recentTransactions
      });
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(4)} SOL`;
  };

  const handleRegenerateWallet = async () => {
    if (!userProfile?.id) {
      toast.error('User profile not found');
      return;
    }

    setIsRegenerating(true);
    
    try {
      const newWallet = await regenerateWallet(userProfile.id);
      
      if (newWallet) {
        setGeneratedWallet({
          privateKey: newWallet.privateKey,
          walletAddress: newWallet.publicKey
        });
        setShowPrivateKeyModal(true);
      }
    } catch (error) {
      console.error('Error regenerating wallet:', error);
      toast.error('Failed to regenerate wallet');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleWalletRegenerationComplete = async () => {
    setGeneratedWallet(null);
    setShowPrivateKeyModal(false);
    
    // Refetch the updated profile instead of reloading
    if (userProfile?.id) {
      try {
        const { data: updatedProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userProfile.id)
          .single();
        
        if (!error && updatedProfile) {
          console.log('🔄 Profile refreshed after wallet regeneration:', updatedProfile);
          // The wallet context will handle the profile update through its auth state listener
        }
      } catch (error) {
        console.error('❌ Error refreshing profile after regeneration:', error);
      }
    }
    
    toast.success("Wallet regenerated successfully!");
  };

  if (!hasWalletCapability) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please connect your wallet or sign in to access wallet settings.</p>
      </div>
    );
  }

  const displayWalletAddress = effectiveWalletAddress;
  const isConnectedWallet = connected && effectiveWalletAddress;
  const isAutoGeneratedWallet = !connected && userProfile?.wallet_address;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Wallet & Earnings</h3>
        <p className="text-sm text-muted-foreground">
          View your wallet information and earnings statistics.
        </p>
      </div>

      <div className="space-y-6">
        {/* Wallet Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet size={16} />
              {isConnectedWallet ? 'Connected Wallet' : 'Auto-Generated Wallet'}
            </CardTitle>
            <CardDescription>
              {isConnectedWallet 
                ? 'Your currently connected Solana wallet.' 
                : 'Your automatically generated Solana wallet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Wallet size={16} className="text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">{truncateAddress(displayWalletAddress || '')}</p>
                  <Badge variant="secondary" className="text-xs">
                    {isConnectedWallet ? 'Connected' : 'Auto-Generated'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(displayWalletAddress || '', 'Wallet address')}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`https://solscan.io/account/${displayWalletAddress}`, '_blank')}
                >
                  <ExternalLink size={14} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold">{formatSOL(stats.totalEarnings)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Donations</p>
                  <p className="text-2xl font-bold">{stats.totalDonations}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unique Donors</p>
                  <p className="text-2xl font-bold">{stats.uniqueDonors}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <CardDescription>
              Your latest donations and transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : stats.recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No transactions yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start streaming to receive donations!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentTransactions.map((transaction, index) => (
                  <div key={transaction.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <DollarSign size={14} className="text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            Donation from {truncateAddress(transaction.from || '')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          +{formatSOL(transaction.amount)}
                        </p>
                      </div>
                    </div>
                    {index < stats.recentTransactions.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google User Wallet Management */}
        {isGoogleAuthenticated && displayWalletAddress && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Wallet Management
              </CardTitle>
              <CardDescription>
                Manage your auto-generated wallet for Google account users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Your wallet was automatically generated when you signed up with Google. 
                  You can regenerate it if needed, but any funds in the current wallet will not be recoverable.
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={isRegenerating}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                    {isRegenerating ? 'Regenerating...' : 'Regenerate Wallet'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Regenerate Wallet
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will replace your current wallet with a new one. 
                      <strong className="block mt-2 text-foreground">
                        Any funds in your previous wallet ({truncateAddress(displayWalletAddress)}) will not be recoverable.
                      </strong>
                      Are you sure you want to continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRegenerateWallet}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Regenerate Wallet
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Withdrawal Settings</CardTitle>
            <CardDescription>
              Configure automatic withdrawals and payout settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Automatic withdrawals are not yet available. All donations are sent directly to your connected wallet.
              </p>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Minimum withdrawal amount</p>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
              <Button disabled variant="outline">
                Configure
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Auto-withdrawal schedule</p>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
              <Button disabled variant="outline">
                Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Private Key Download Modal */}
      {generatedWallet && (
        <PrivateKeyDownloadModal
          isOpen={showPrivateKeyModal}
          onClose={() => setShowPrivateKeyModal(false)}
          privateKey={generatedWallet.privateKey}
          walletAddress={generatedWallet.walletAddress}
          userId={userProfile?.id || ''}
          onConfirmed={handleWalletRegenerationComplete}
        />
      )}
    </div>
  );
};

export default WalletSettings;