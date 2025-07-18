
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';
import { savePromotedStream } from '@/services/promotedStreamsService';
import { sendPromotionPayment } from '@/services/walletService';
import { solPriceService } from '@/services/solPriceService';
import { PublicKey } from '@solana/web3.js';
import type { StreamPromotionData, PlacementSelection } from '@/pages/PromoteStreamPage';

interface PromotePaymentProps {
  streamData: StreamPromotionData;
  placementData: PlacementSelection;
  onSuccess: (transactionSignature: string) => void;
  onBack: () => void;
}

const PromotePayment: React.FC<PromotePaymentProps> = ({
  streamData,
  placementData,
  onSuccess,
  onBack
}) => {
  const { walletAddress, provider } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSolAmount, setCurrentSolAmount] = useState<number>(placementData.totalFee);
  const [displayPrice, setDisplayPrice] = useState<string>('$50');

  useEffect(() => {
    const updateCurrentPrice = async () => {
      try {
        const solAmount = await solPriceService.convertUSDToSOL(50);
        const priceDisplay = await solPriceService.getDisplayPrice(50);
        
        setCurrentSolAmount(solAmount);
        setDisplayPrice(priceDisplay);
      } catch (error) {
        console.error('Error updating current price:', error);
        // Keep the original amounts if API fails
      }
    };

    updateCurrentPrice();
  }, []);

  const getPlacementDisplayName = (placementType: string) => {
    return 'Featured Banner';
  };

  const handlePayment = async () => {
    if (!walletAddress || !provider) {
      toast.error('Wallet not connected');
      return;
    }

    if (placementData.totalFee <= 0) {
      // Free promotion, skip payment
      try {
        setIsProcessing(true);
        const result = await savePromotedStream(
          streamData,
          placementData,
          walletAddress,
          'free-promotion-' + Date.now()
        );
        toast.success('Free promotion activated successfully!');
        onSuccess('free-promotion-' + Date.now());
      } catch (error) {
        console.error('Error saving free promotion:', error);
        toast.error('Failed to activate free promotion');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      setIsProcessing(true);
      
      // Send SOL transaction using the wallet service with current price
      const signature = await sendPromotionPayment(
        provider,
        new PublicKey(walletAddress),
        currentSolAmount,
        { streamData, placementData }
      );

      if (signature) {
        // Save promotion to database with current SOL amount
        const updatedPlacementData = { ...placementData, totalFee: currentSolAmount };
        await savePromotedStream(streamData, updatedPlacementData, walletAddress, signature);
        toast.success('Payment successful! Your stream is now being promoted.');
        onSuccess(signature);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Complete Your Promotion</h1>
          <p className="text-foreground/70 mt-1">Review and confirm your stream promotion</p>
        </div>
      </div>

      {/* Payment Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>Review your promotion details and pricing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stream Details */}
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <img
              src={streamData.thumbnailUrl}
              alt={streamData.streamTitle}
              className="w-24 h-16 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{streamData.streamTitle}</h3>
              <p className="text-sm text-foreground/70">{streamData.description}</p>
              <div className="flex gap-2 mt-1">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                  {getPlacementDisplayName(placementData.placementType)}
                </span>
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                  {streamData.category}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-foreground">Featured Banner Promotion:</span>
              <span className="text-foreground">{displayPrice}</span>
            </div>
            
            <div className="border-t pt-2">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span className="text-foreground">Total:</span>
                <span className="text-foreground">
                  {displayPrice}
                </span>
              </div>
            </div>
          </div>

          {/* Promotion Information */}
          <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">
                Featured Banner Promotion
              </span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Your stream will be guaranteed placement in our Featured Content slideshow, giving you maximum visibility to all visitors.
            </p>
          </div>

          {/* Duration Information */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Promotion Details</h4>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
              <li>• Duration: 24 hours from activation</li>
              <li>• Placement: Featured Content slideshow</li>
              <li>• One of maximum 6 promoted slots</li>
              <li>• You can end the promotion early anytime</li>
              <li>• Platform fee included in $50 price</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Payment Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full text-lg py-6"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : placementData.totalFee === 0 ? (
              'Activate Free Promotion'
            ) : (
              `Pay ${displayPrice} & Start Promotion`
            )}
          </Button>
          
          <p className="text-center text-sm text-foreground/60 mt-4">
            {placementData.totalFee === 0 ? 
              'Your promotion will be activated immediately.' :
              'Your stream will be promoted immediately after payment confirmation.'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromotePayment;
