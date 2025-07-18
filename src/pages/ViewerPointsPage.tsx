import React, { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { pointsService, UserPointsSummary, PointsHistoryEntry } from '@/services/pointsService';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Trophy, TrendingUp, Clock, Heart, Share2, MessageCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ViewerPointsPage = () => {
  const { hasWalletCapability, userUuid, username, effectiveWalletAddress } = useWallet();
  const [pointsSummary, setPointsSummary] = useState<UserPointsSummary | null>(null);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!hasWalletCapability) {
      toast.error('Please connect your wallet to view points');
      return;
    }
  }, [hasWalletCapability]);

  // Load points summary
  useEffect(() => {
    const loadPointsSummary = async () => {
      if (!userUuid) return;
      
      setIsLoading(true);
      try {
        const summary = await pointsService.getUserPointsSummary(userUuid);
        setPointsSummary(summary);
      } catch (error) {
        console.error('Error loading points summary:', error);
        toast.error('Failed to load points summary');
      } finally {
        setIsLoading(false);
      }
    };

    loadPointsSummary();
  }, [userUuid]);

  // Load points history
  useEffect(() => {
    const loadPointsHistory = async () => {
      if (!userUuid) return;
      
      setIsHistoryLoading(true);
      try {
        const response = await pointsService.getUserPointsHistory(
          userUuid, 
          currentPage, 
          20, 
          'all'
        );
        
        if (currentPage === 1) {
          setPointsHistory(response.data);
        } else {
          setPointsHistory(prev => [...prev, ...response.data]);
        }
        setHasMore(response.has_more);
      } catch (error) {
        console.error('Error loading points history:', error);
        toast.error('Failed to load points history');
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadPointsHistory();
  }, [userUuid, currentPage]);


  const loadMoreHistory = () => {
    setCurrentPage(prev => prev + 1);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'watch_time': return <Clock className="h-4 w-4" />;
      case 'like': return <Heart className="h-4 w-4" />;
      case 'follow': return <TrendingUp className="h-4 w-4" />;
      case 'share': return <Share2 className="h-4 w-4" />;
      case 'comment': return <MessageCircle className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'watch_time': return 'bg-primary/20 text-primary border-primary/30';
      case 'like': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'follow': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'share': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'comment': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-accent/20 text-accent border-accent/30';
    }
  };

  if (!hasWalletCapability) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Viewer Points</CardTitle>
              <CardDescription>
                Connect your wallet to start earning points for watching streams and engaging with content.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="heading-xl gradient-text">Viewer Points</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Earn points by watching streams, liking content, following creators, and engaging with the community. 
              Your points unlock rewards and boost your status in the leaderboard.
            </p>
          </div>

          {/* Points Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              <>
                <Card className="glass-card hover-lift">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Points</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Star className="h-6 w-6 text-primary" />
                      <span className="text-2xl font-bold text-primary">
                        {pointsSummary?.total_points?.toLocaleString() || '0'}
                      </span>
                    </div>
                    {pointsSummary?.total_rank && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Rank #{pointsSummary.total_rank}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-6 w-6 text-accent" />
                      <span className="text-2xl font-bold text-accent">
                        {pointsSummary?.current_month_points?.toLocaleString() || '0'}
                      </span>
                    </div>
                    {pointsSummary?.current_month_rank && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Rank #{pointsSummary.current_month_rank}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Last Month</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-6 w-6 text-blue-400" />
                      <span className="text-2xl font-bold">
                        {pointsSummary?.last_month_points?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Account</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{username || 'Anonymous'}</p>
                      {effectiveWalletAddress && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {effectiveWalletAddress.slice(0, 4)}...{effectiveWalletAddress.slice(-4)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* How to Earn Points */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                How to Earn Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <Clock className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">Watch Streams</p>
                    <p className="text-sm text-muted-foreground">Earn points while watching</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <Heart className="h-6 w-6 text-red-400" />
                  <div>
                    <p className="font-medium">Like Streams</p>
                    <p className="text-sm text-muted-foreground">Earn points for engagement</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                  <div>
                    <p className="font-medium">Follow Creators</p>
                    <p className="text-sm text-muted-foreground">Earn points for following</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                  <Share2 className="h-6 w-6 text-green-400" />
                  <div>
                    <p className="font-medium">Share Streams</p>
                    <p className="text-sm text-muted-foreground">Earn points for sharing</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <MessageCircle className="h-6 w-6 text-purple-400" />
                  <div>
                    <p className="font-medium">Chat Messages</p>
                    <p className="text-sm text-muted-foreground">Earn points for chatting</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points History */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Points History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isHistoryLoading && currentPage === 1 ? (
                  <>
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </>
                ) : pointsHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No points history yet</p>
                    <p className="text-sm text-muted-foreground">Start watching streams to earn your first points!</p>
                  </div>
                ) : (
                  <>
                    {pointsHistory.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50">
                        <div className="flex items-center gap-3">
                          {getActionIcon(entry.action_type)}
                          <div>
                            <p className="font-medium">{entry.stream_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {entry.action_type.replace('_', ' ').charAt(0).toUpperCase() + entry.action_type.replace('_', ' ').slice(1)}
                              {' • '}
                              {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getActionColor(entry.action_type)}>
                            +{entry.points_earned} pts
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {hasMore && (
                      <div className="text-center pt-4">
                        <Button 
                          variant="outline" 
                          onClick={loadMoreHistory}
                          disabled={isHistoryLoading}
                        >
                          {isHistoryLoading ? 'Loading...' : 'Load More'}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ViewerPointsPage;