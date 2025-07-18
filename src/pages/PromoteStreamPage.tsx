import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { getCreatorProfileByWallet } from '@/services/creatorProfileService';
import { getActivePromotedStreams } from '@/services/promotedStreamsService';
import Layout from '@/components/layout/Layout';
import PromoteStreamForm from '@/components/promote/PromoteStreamForm';
import PromotePlacementSelector from '@/components/promote/PromotePlacementSelector';
import PromotePayment from '@/components/promote/PromotePayment';
import PromoteSuccess from '@/components/promote/PromoteSuccess';
import PromotionDashboard from '@/components/promote/PromotionDashboard';
import { Loader2 } from 'lucide-react';

export interface StreamPromotionData {
  streamUrl: string;
  streamTitle: string;
  description?: string;
  thumbnailUrl: string;
  category: string;
  tags: string[];
}

export interface PlacementSelection {
  placementType: 'featured_banner';
  placementFee: number;
  baseFee: number;
  totalFee: number;
  discountApplied?: boolean;
  discountType?: string;
  originalPrice?: number;
}

const PromoteStreamPage = () => {
  const navigate = useNavigate();
  const { hasWalletCapability, effectiveWalletAddress, openWalletModal } = useWallet();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isCheckingCreator, setIsCheckingCreator] = useState(false);
  const [hasCreatorProfile, setHasCreatorProfile] = useState(false);
  const [hasActivePromotions, setHasActivePromotions] = useState(false);
  const [streamData, setStreamData] = useState<StreamPromotionData | null>(null);
  const [placementData, setPlacementData] = useState<PlacementSelection | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string>('');

  // Step 0: Check wallet authentication
  useEffect(() => {
    if (!hasWalletCapability || !effectiveWalletAddress) {
      setCurrentStep(0);
    } else {
      checkCreatorProfile();
    }
  }, [hasWalletCapability, effectiveWalletAddress]);

  // Step 1: Check creator profile and active promotions
  const checkCreatorProfile = async () => {
    if (!effectiveWalletAddress) return;
    
    setIsCheckingCreator(true);
    try {
      const creatorProfile = await getCreatorProfileByWallet(effectiveWalletAddress);
      if (creatorProfile) {
        setHasCreatorProfile(true);
        // Check for active promotions
        const activePromotions = await getActivePromotedStreams(effectiveWalletAddress);
        if (activePromotions.length > 0) {
          setHasActivePromotions(true);
          setCurrentStep(2); // Show dashboard
        } else {
          setHasActivePromotions(false);
          setCurrentStep(3); // Show form directly
        }
      } else {
        setHasCreatorProfile(false);
        setCurrentStep(1); // Show creator profile requirement
      }
    } catch (error) {
      console.error('Error checking creator profile:', error);
      setHasCreatorProfile(false);
      setCurrentStep(1);
    } finally {
      setIsCheckingCreator(false);
    }
  };

  const handleWalletConnect = () => {
    openWalletModal();
  };

  const handleCreateProfile = () => {
    navigate('/creator/setup');
  };

  const handleStreamDataSubmit = (data: StreamPromotionData) => {
    setStreamData(data);
    setCurrentStep(4);
  };

  const handlePlacementSelect = (placement: PlacementSelection) => {
    setPlacementData(placement);
    setCurrentStep(5);
  };

  const handlePaymentSuccess = (signature: string) => {
    setTransactionSignature(signature);
    setCurrentStep(6);
  };

  const handleBackToStep = (step: number) => {
    setCurrentStep(step);
  };

  const handlePromoteNew = () => {
    // Reset form data and go to form step
    setStreamData(null);
    setPlacementData(null);
    setTransactionSignature('');
    setCurrentStep(3);
  };

  const handleBackToDashboard = () => {
    if (hasActivePromotions) {
      setCurrentStep(2);
    } else {
      navigate('/');
    }
  };

  if (isCheckingCreator) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-foreground/70">Checking creator profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Step 0: Wallet Authentication */}
        {currentStep === 0 && (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-foreground mb-6">Promote Your Stream</h1>
            <p className="text-foreground/70 mb-8 max-w-2xl mx-auto">
              Connect your Solana wallet to start promoting your streams and reach a wider audience.
            </p>
            <button
              onClick={handleWalletConnect}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {/* Step 1: Creator Profile Required */}
        {currentStep === 1 && (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-foreground mb-6">Creator Profile Required</h1>
            <p className="text-foreground/70 mb-8 max-w-2xl mx-auto">
              You need to set up your creator profile before you can promote streams. This helps viewers learn more about you and your content.
            </p>
            <button
              onClick={handleCreateProfile}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Create Creator Profile
            </button>
          </div>
        )}

        {/* Step 2: Promotion Dashboard */}
        {currentStep === 2 && (
          <PromotionDashboard
            onBack={() => navigate('/')}
            onPromoteNew={handlePromoteNew}
          />
        )}

        {/* Step 3: Stream Promotion Form */}
        {currentStep === 3 && (
          <PromoteStreamForm
            onSubmit={handleStreamDataSubmit}
            onBack={hasActivePromotions ? handleBackToDashboard : () => navigate('/')}
          />
        )}

        {/* Step 4: Placement Selection */}
        {currentStep === 4 && streamData && (
          <PromotePlacementSelector
            streamData={streamData}
            onSelect={handlePlacementSelect}
            onBack={() => handleBackToStep(3)}
          />
        )}

        {/* Step 5: Payment */}
        {currentStep === 5 && streamData && placementData && (
          <PromotePayment
            streamData={streamData}
            placementData={placementData}
            onSuccess={handlePaymentSuccess}
            onBack={() => handleBackToStep(4)}
          />
        )}

        {/* Step 6: Success */}
        {currentStep === 6 && streamData && placementData && transactionSignature && (
          <PromoteSuccess
            streamData={streamData}
            placementData={placementData}
            transactionSignature={transactionSignature}
            onDone={() => navigate('/')}
            onPromoteAnother={handlePromoteNew}
          />
        )}
      </div>
    </Layout>
  );
};

export default PromoteStreamPage;
