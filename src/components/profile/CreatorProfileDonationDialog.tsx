
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWallet } from '@/context/WalletContext';
import { DollarSign, Loader2, Wallet as WalletIcon } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { calculatePlatformFee, sendDonation } from '@/services/walletService';
import { SolanaWalletProvider } from '@/context/WalletContext';
import { supabase } from '@/integrations/supabase/client';

interface CreatorProfileDonationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  creatorWalletAddress: string;
  creatorDisplayName: string;
}

const CreatorProfileDonationDialog = ({
  isOpen,
  onOpenChange,
  creatorWalletAddress,
  creatorDisplayName,
}: CreatorProfileDonationDialogProps) => {
  const { connected, publicKey, solBalance, wenliveBalance, currentWallet, wallets, openWalletModal } = useWallet();
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [donationMessage, setDonationMessage] = useState<string>('');
  const [tokenType, setTokenType] = useState<'SOL' | 'WENLIVE'>('SOL');
  const [isProcessing, setIsProcessing] = useState(false);

  const parsedDonationAmount = parseFloat(donationAmount);
  const currentBalance = tokenType === 'SOL' ? solBalance : wenliveBalance;

  const getCurrentProvider = (): SolanaWalletProvider | null => {
    if (!currentWallet) return null;
    return wallets.find(wallet => wallet.name === currentWallet)?.provider || null;
  };

  const handleDonationAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and one decimal point, up to 9 decimal places for SOL/WENLIVE
    if (value === '' || /^\d*\.?\d{0,9}$/.test(value)) {
      setDonationAmount(value);
    }
  };

  const handleDonate = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first.");
      openWalletModal(); 
      return;
    }

    if (!creatorWalletAddress) {
      toast.error("Creator wallet address is missing.");
      return;
    }

    if (isNaN(parsedDonationAmount) || parsedDonationAmount <= 0) {
      toast.error("Please enter a valid donation amount.");
      return;
    }
    
    if (currentBalance !== null && parsedDonationAmount > currentBalance) {
      toast.error(`Insufficient ${tokenType} balance for this donation.`);
      return;
    }

    try {
      setIsProcessing(true);

      const provider = getCurrentProvider();
      if (!provider) {
        toast.error("Could not find wallet provider. Please ensure your wallet is connected properly.");
        setIsProcessing(false);
        return;
      }

      const platformFee = calculatePlatformFee(parsedDonationAmount);
      const creatorAmount = parsedDonationAmount - platformFee;

      toast.info(`Your ${parsedDonationAmount} ${tokenType} donation will be split:`, {
        description: `${creatorAmount.toFixed(4)} ${tokenType} to ${creatorDisplayName}, ${platformFee.toFixed(4)} ${tokenType} platform fee (20%).`,
        duration: 5000,
      });

      const senderPublicKey = new PublicKey(publicKey);

      console.log('🚀 Starting profile donation process:', {
        donor: publicKey.toString(),
        creator: creatorWalletAddress,
        amount: parsedDonationAmount,
        tokenType: tokenType
      });

      const signature = await sendDonation(
        provider,
        senderPublicKey,
        creatorWalletAddress,
        parsedDonationAmount,
        tokenType,
        donationMessage
      );

      if (signature) {
        console.log('✅ Profile donation transaction successful');

        // Get user profiles for user IDs - but don't require them for profile donations
        const { data: creatorProfile, error: creatorError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', creatorWalletAddress)
          .single();

        const { data: donorProfile, error: donorError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', publicKey.toString())
          .single();

        console.log('📋 Profile lookup results for profile donation:', {
          creatorProfile: creatorProfile?.id || 'not found',
          creatorError: creatorError?.message || 'none',
          donorProfile: donorProfile?.id || 'not found', 
          donorError: donorError?.message || 'none'
        });

        // Create donation record for profile donation - use NULL for stream_id and creator_user_id if not found
        const donationRecord = {
          creator_user_id: creatorProfile?.id || null, // NULL if creator profile not found
          donor_user_id: donorProfile?.id || null,     // NULL if donor profile not found
          stream_id: null,                             // Always NULL for profile donations
          amount_sol: parsedDonationAmount,
          token_type: tokenType,
          message: donationMessage,
          transaction_signature: signature,
          donor_wallet_address: publicKey.toString(),
          creator_wallet_address: creatorWalletAddress
        };

        console.log('💾 Inserting profile donation record:', donationRecord);

        const { data: insertedDonation, error: donationError } = await supabase
          .from('donations')
          .insert(donationRecord)
          .select();

        if (donationError) {
          console.error('❌ Error storing profile donation record:', donationError);
          toast.error("Donation succeeded but failed to record", {
            description: "Your donation went through but we couldn't save the record. Contact support if needed."
          });
        } else {
          console.log('✅ Profile donation record stored successfully:', insertedDonation);
          toast.success(`Thank you for your support!`, {
            description: `You donated ${parsedDonationAmount} ${tokenType} to ${creatorDisplayName}.`,
          });
        }

        setDonationAmount('');
        setDonationMessage('');
        onOpenChange(false); // Close dialog on success
      } else {
        console.log('❌ Profile donation transaction failed');
        // Error toast is handled within sendDonation
      }
    } catch (error: any) {
      console.error("❌ Error processing profile donation:", error);
      toast.error("Donation failed", {
        description: error.message || "Could not process your donation.",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  useEffect(() => {
    // Reset form when dialog is closed externally
    if (!isOpen) {
        setDonationAmount('');
        setDonationMessage('');
        setTokenType('SOL');
        setIsProcessing(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign size={24} className="text-primary" />
            Support {creatorDisplayName}
          </DialogTitle>
          <DialogDescription>
            Send a tip to show your appreciation. 80% goes to the creator, 20% to the platform.
          </DialogDescription>
        </DialogHeader>

        {!connected ? (
          <div className="py-8 text-center">
            <WalletIcon size={48} className="mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium mb-2">Connect Your Wallet</p>
            <p className="text-muted-foreground mb-4">
              To send a donation, please connect your Solana wallet.
            </p>
            <Button onClick={() => { openWalletModal(); onOpenChange(false); }} className="w-full sm:w-auto">
              Connect Wallet
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="token-type" className="text-sm font-medium">
                Token Type
              </label>
              <Select value={tokenType} onValueChange={(value: 'SOL' | 'WENLIVE') => setTokenType(value)}>
                <SelectTrigger className="bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="WENLIVE">$WENLIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Donation Amount ({tokenType})
              </label>
              <div className="relative">
                <Input
                  id="amount"
                  type="text"
                  placeholder={`e.g., 1.5`}
                  value={donationAmount}
                  onChange={handleDonationAmountChange}
                  className="bg-background border-input pr-16"
                  disabled={isProcessing}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                  {tokenType}
                </span>
              </div>
              {publicKey && (
                <p className="text-xs text-muted-foreground text-right">
                  Your balance: {currentBalance?.toFixed(4) || '0.00'} {tokenType}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                Message (Optional)
              </label>
              <Textarea
                id="message"
                placeholder="Say something nice!"
                value={donationMessage}
                onChange={(e) => setDonationMessage(e.target.value)}
                className="bg-background border-input resize-none"
                rows={3}
                disabled={isProcessing}
              />
            </div>
             {parsedDonationAmount > 0 && (
              <div className="text-xs text-muted-foreground p-2 rounded-md border border-dashed border-border bg-background/50">
                <p>Creator receives: {(parsedDonationAmount * 0.80).toFixed(4)} {tokenType}</p>
                <p>Platform fee (20%): {(parsedDonationAmount * 0.20).toFixed(4)} {tokenType}</p>
              </div>
            )}
          </div>
        )}

        {connected && (
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessing}>Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleDonate}
              disabled={
                isProcessing || 
                isNaN(parsedDonationAmount) || 
                parsedDonationAmount <= 0 ||
                (currentBalance !== null && parsedDonationAmount > currentBalance)
              }
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Donate ${parsedDonationAmount > 0 ? parsedDonationAmount : ''} ${tokenType}`
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreatorProfileDonationDialog;
