import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Eye, TrendingUp, Clock, Zap, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/context/WalletContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { solPriceService } from '@/services/solPriceService';
import type { StreamPromotionData, PlacementSelection } from '@/pages/PromoteStreamPage';

interface PromotePlacementSelectorProps {
  streamData: StreamPromotionData;
  onSelect: (placement: PlacementSelection) => void;
  onBack: () => void;
}

const placementOptions = [
  {
    id: 'featured_banner',
    name: 'Featured Banner',
    description: 'Guaranteed placement in the Featured Content slideshow',
    baseFee: 50, // $50 flat rate
    placementFee: 0,
    icon: Star,
    features: ['Featured Content placement', 'Maximum visibility', '24-hour duration', 'One of 6 featured slots'],
    popular: true
  }
];

const PromotePlacementSelector: React.FC<PromotePlacementSelectorProps> = ({
  streamData,
  onSelect,
  onBack
}) => {
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const [selectedPlacement, setSelectedPlacement] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<number>(6);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [solAmount, setSolAmount] = useState<number>(0);
  const [displayPrice, setDisplayPrice] = useState<string>('$50');
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check available slots
        const { data, error } = await supabase
          .from('promoted_streams')
          .select('slot_position')
          .eq('is_active', true)
          .not('slot_position', 'is', null);
        
        if (error) {
          console.error('Error checking available slots:', error);
          setAvailableSlots(6);
        } else {
          const occupiedSlots = data?.length || 0;
          setAvailableSlots(6 - occupiedSlots);
        }

        // Get real-time SOL price
        const solAmountNeeded = await solPriceService.convertUSDToSOL(50);
        const priceDisplay = await solPriceService.getDisplayPrice(50);
        
        setSolAmount(solAmountNeeded);
        setDisplayPrice(priceDisplay);
      } catch (error) {
        console.error('Error initializing data:', error);
        setAvailableSlots(6);
        setSolAmount(0.5); // Fallback amount
        setDisplayPrice('$50 (~0.5 SOL)');
      } finally {
        setIsLoadingSlots(false);
        setIsLoadingPrice(false);
      }
    };

    initializeData();
  }, []);

  const calculateActualCost = (option: typeof placementOptions[0]) => {
    // Return the real-time SOL amount
    return solAmount;
  };

  const getDisplayPrice = (option: typeof placementOptions[0]) => {
    return isLoadingPrice ? '$50 (Loading...)' : displayPrice;
  };

  const getPriceDescription = () => {
    return 'Flat rate for Featured Banner placement';
  };

  const handleSelect = (placementId: string) => {
    if (availableSlots <= 0) {
      return; // No slots available
    }

    const placement = placementOptions.find(p => p.id === placementId);
    if (!placement) return;

    const actualCost = calculateActualCost(placement);

    const placementData: PlacementSelection = {
      placementType: 'featured_banner' as PlacementSelection['placementType'],
      placementFee: 0,
      baseFee: placement.baseFee,
      totalFee: actualCost,
      discountApplied: false,
      discountType: undefined,
      originalPrice: actualCost
    };

    onSelect(placementData);
  };

  const handleCreateStream = () => {
    navigate('/create/stream');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Featured Banner Promotion</h1>
          <p className="text-foreground/70 mt-1">Get guaranteed placement in our Featured Content slideshow for $50</p>
        </div>
      </div>

      {/* Availability Status */}
      {!isLoadingSlots && (
        <Card className={`mb-6 ${availableSlots > 0 ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className={`w-5 h-5 ${availableSlots > 0 ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className={`font-medium ${availableSlots > 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {availableSlots > 0 ? `${availableSlots} Featured Slots Available` : 'All Featured Slots Occupied'}
                </p>
                <p className={`text-sm ${availableSlots > 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {availableSlots > 0 
                    ? `Out of 6 total Featured Banner slots, ${availableSlots} are currently available for promotion.`
                    : 'All 6 Featured Banner slots are currently occupied. Please try again later.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stream Preview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Stream Preview</CardTitle>
          <CardDescription>This is how your promoted stream will appear</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <img
              src={streamData.thumbnailUrl}
              alt={streamData.streamTitle}
              className="w-32 h-18 object-cover rounded"
            />
            <div>
              <h3 className="font-semibold text-foreground">{streamData.streamTitle}</h3>
              <p className="text-sm text-foreground/70 mt-1">{streamData.description}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                  {streamData.category}
                </span>
                {streamData.tags.slice(0, 2).map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placement Options */}
      <div className="max-w-md mx-auto">
        {placementOptions.map((option) => {
          const IconComponent = option.icon;
          const displayPrice = getDisplayPrice(option);
          const priceDescription = getPriceDescription();
          const isDisabled = availableSlots <= 0;
          
          return (
            <Card 
              key={option.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedPlacement === option.id ? 'ring-2 ring-primary' : ''
              } ${option.popular ? 'ring-2 ring-green-500' : ''} ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => !isDisabled && setSelectedPlacement(option.id)}
            >
              <CardHeader className="relative">
                {option.popular && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    Featured
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <IconComponent className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{option.name}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                   <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">
                      {isLoadingPrice ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Loading...
                        </div>
                      ) : (
                        displayPrice
                      )}
                    </div>
                    <div className="text-sm text-foreground/70">
                      {priceDescription}
                    </div>
                    <div className="text-xs text-foreground/50 mt-1">
                      24 hours duration
                    </div>
                  </div>
                  
                  <ul className="space-y-2">
                    {option.features.map((feature, index) => (
                      <li key={index} className="text-sm text-foreground/70 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full" 
                    variant={selectedPlacement === option.id ? "default" : "outline"}
                    disabled={isDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option.id);
                    }}
                  >
                    {isDisabled ? 'No Slots Available' : 'Select Featured Banner'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-6 bg-muted/50 rounded-lg">
        <h3 className="font-semibold text-foreground mb-2">How Featured Banners Work</h3>
        <ul className="space-y-2 text-sm text-foreground/70">
          <li>• <strong>Flat $50 rate</strong> for guaranteed Featured Content placement</li>
          <li>• Your stream appears in the main Featured Content slideshow</li>
          <li>• Maximum of 6 promoted streams at any time</li>
          <li>• 24-hour promotion duration</li>
          <li>• Maximum visibility to all visitors</li>
          <li>• You can end promotions early anytime from your dashboard</li>
          <li>• Platform fee is included in the $50 price</li>
        </ul>
      </div>
    </div>
  );
};

export default PromotePlacementSelector;
