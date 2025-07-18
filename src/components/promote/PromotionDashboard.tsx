
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, ExternalLink, StopCircle, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';
import { getActivePromotedStreams, endPromotedStream, type PromotedStreamData } from '@/services/promotedStreamsService';

interface PromotionDashboardProps {
  onBack: () => void;
  onPromoteNew: () => void;
}

const PromotionDashboard: React.FC<PromotionDashboardProps> = ({ onBack, onPromoteNew }) => {
  const { walletAddress } = useWallet();
  const [promotions, setPromotions] = useState<PromotedStreamData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [endingPromotions, setEndingPromotions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (walletAddress) {
      loadPromotions();
    }
  }, [walletAddress]);

  const loadPromotions = async () => {
    if (!walletAddress) return;
    
    try {
      const data = await getActivePromotedStreams(walletAddress);
      setPromotions(data);
    } catch (error) {
      console.error('Error loading promotions:', error);
      toast.error('Failed to load promotions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndPromotion = async (promotionId: string) => {
    if (!walletAddress) return;
    
    setEndingPromotions(prev => new Set([...prev, promotionId]));
    
    try {
      await endPromotedStream(promotionId, walletAddress);
      toast.success('Promotion ended successfully');
      loadPromotions(); // Refresh the list
    } catch (error) {
      console.error('Error ending promotion:', error);
      toast.error('Failed to end promotion');
    } finally {
      setEndingPromotions(prev => {
        const newSet = new Set(prev);
        newSet.delete(promotionId);
        return newSet;
      });
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  const getPlacementDisplayName = (placementType: string) => {
    switch (placementType) {
      case 'standard': return 'Standard';
      case 'hero': return 'Hero Banner';
      case 'top_right': return 'Top Right';
      case 'mid_right': return 'Mid Right';
      case 'horizontal': return 'Horizontal Banner';
      default: return placementType;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Promotion Dashboard</h1>
            <p className="text-foreground/70 mt-1">Loading your active promotions...</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Promotion Dashboard</h1>
            <p className="text-foreground/70 mt-1">Manage your active stream promotions</p>
          </div>
        </div>
        <Button onClick={onPromoteNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Promote Another Stream
        </Button>
      </div>


      {promotions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Active Promotions</h3>
            <p className="text-foreground/70 mb-6">You don't have any active stream promotions at the moment.</p>
            <Button onClick={onPromoteNew}>
              <Plus className="w-4 h-4 mr-2" />
              Promote Your First Stream
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {promotions.map((promotion) => (
            <Card key={promotion.id} className="overflow-hidden">
              <div className="flex">
                <div className="w-48 h-32 flex-shrink-0">
                  <img
                    src={promotion.thumbnailUrl}
                    alt={promotion.streamTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">
                        {promotion.streamTitle}
                      </h3>
                      <p className="text-foreground/70 text-sm mb-2">
                        {promotion.description}
                      </p>
                      <div className="flex gap-2 mb-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                          {getPlacementDisplayName(promotion.placementType)}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                          {promotion.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">
                        {promotion.totalAmountPaidSol === 0 ? 'FREE' : `${promotion.totalAmountPaidSol} SOL`}
                      </p>
                      <p className="text-sm text-foreground/60">
                        {promotion.totalAmountPaidSol === 0 ? 'Discount Applied' : 'Total Paid'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {getTimeRemaining(promotion.basePaymentExpiresAt)}
                        </span>
                      </div>
                      <a
                        href={promotion.streamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Stream
                      </a>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEndPromotion(promotion.id)}
                      disabled={endingPromotions.has(promotion.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {endingPromotions.has(promotion.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                          Ending...
                        </>
                      ) : (
                        <>
                          <StopCircle className="w-4 h-4 mr-2" />
                          End Promotion
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromotionDashboard;
