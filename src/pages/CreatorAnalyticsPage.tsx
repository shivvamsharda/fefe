
import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  getCreatorDonations, 
  calculateDonationSummary,
  getCreatorStreamAnalytics,
  getCreatorVodAnalytics,
  getCreatorViewsOverTime,
  getCreatorTipsOverTime,
  getCreatorOverallStats,
  type CreatorDonation,
  type TimePeriod
} from '@/services/creatorAnalyticsService';
import { getCreatorProfileByUserUuid } from '@/services/creatorProfileService';
import Layout from '@/components/layout/Layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Copy, DollarSign, Hash, TrendingUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@/context/WalletContext';
import OverallStatsCards from '@/components/analytics/OverallStatsCards';
import StreamAnalyticsTable from '@/components/analytics/StreamAnalyticsTable';
import VodAnalyticsTable from '@/components/analytics/VodAnalyticsTable';
import AnalyticsCharts from '@/components/analytics/AnalyticsCharts';

const CreatorAnalyticsPage = () => {
  const { userUuid } = useParams<{ userUuid: string }>();
  const { effectiveWalletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d');

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['creatorProfileByUuid', userUuid],
    queryFn: () => userUuid ? getCreatorProfileByUserUuid(userUuid) : Promise.resolve(null),
    enabled: !!userUuid,
  });

  const { data: donations = [], isLoading: isLoadingDonations } = useQuery({
    queryKey: ['creatorDonations', userUuid],
    queryFn: () => getCreatorDonations(userUuid!),
    enabled: !!userUuid && !!profile,
  });

  const { data: streamAnalytics = [], isLoading: isLoadingStreams, error: streamError } = useQuery({
    queryKey: ['creatorStreamAnalytics', userUuid],
    queryFn: () => getCreatorStreamAnalytics(userUuid!),
    enabled: !!userUuid && !!profile,
  });

  const { data: vodAnalytics = [], isLoading: isLoadingVods, error: vodError } = useQuery({
    queryKey: ['creatorVodAnalytics', userUuid],
    queryFn: () => getCreatorVodAnalytics(userUuid!),
    enabled: !!userUuid && !!profile,
  });

  const { data: viewsOverTime = [], isLoading: isLoadingViews } = useQuery({
    queryKey: ['creatorViewsOverTime', userUuid, selectedPeriod],
    queryFn: () => getCreatorViewsOverTime(userUuid!, selectedPeriod),
    enabled: !!userUuid && !!profile,
  });

  const { data: tipsOverTime = [], isLoading: isLoadingTips } = useQuery({
    queryKey: ['creatorTipsOverTime', userUuid, selectedPeriod],
    queryFn: () => getCreatorTipsOverTime(userUuid!, selectedPeriod),
    enabled: !!userUuid && !!profile,
  });

  const { data: overallStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['creatorOverallStats', userUuid],
    queryFn: () => getCreatorOverallStats(userUuid!),
    enabled: !!userUuid && !!profile,
  });

  // Check if user is the owner of this profile
  const isOwner = !!(effectiveWalletAddress && profile?.wallet_address === effectiveWalletAddress);

  // Redirect if not the owner
  if (!isLoadingProfile && profile && !isOwner) {
    return <Navigate to={`/creator/${userUuid}`} replace />;
  }

  const summary = calculateDonationSummary(donations);

  const truncateWallet = (wallet: string) => {
    if (wallet.length <= 12) return wallet;
    return `${wallet.slice(0, 6)}...${wallet.slice(-6)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatAmount = (donation: CreatorDonation) => {
    return `${donation.amount_sol.toFixed(6)} ${donation.actual_token_type || donation.token_type}`;
  };

  const formatDate = (dateString: string) => {
    return formatInTimeZone(new Date(dateString), 'Etc/UTC', "MMM dd, yyyy 'at' HH:mm");
  };

  if (isLoadingProfile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-var(--navbar-height))]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return <Navigate to="/creator/setup" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8" />
              Analytics - {profile.display_name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive analytics for your content and earnings
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="streams">Streams</TabsTrigger>
              <TabsTrigger value="vods">VODs</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Overall Statistics */}
              <OverallStatsCards 
                stats={overallStats || {
                  total_streams: 0,
                  total_vods: 0,
                  total_views: 0,
                  total_watch_time_hours: 0,
                  total_tips_received: 0,
                  avg_completion_rate: 0,
                  follower_count: 0
                }}
                donationSummary={summary}
                isLoading={isLoadingStats} 
              />

              {/* Donation Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total SOL</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.totalSol.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">SOL received</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total WENLIVE</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.totalWenlive.toFixed(0)}</div>
                    <p className="text-xs text-muted-foreground">WENLIVE received</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.totalCount}</div>
                    <p className="text-xs text-muted-foreground">donations received</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg SOL Donation</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.averageSol.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">per SOL donation</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Donations Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Donations</CardTitle>
                  <CardDescription>
                    Latest donations received from your audience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Donor</TableHead>
                          <TableHead>Stream</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingDonations ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : donations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              <div className="space-y-2">
                                <p>No donations received yet</p>
                                <p className="text-sm">Start streaming to receive donations from your audience!</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          donations.slice(0, 10).map((donation) => (
                            <TableRow key={donation.id}>
                              <TableCell className="font-mono text-sm">
                                {formatDate(donation.created_at)}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {formatAmount(donation)}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  (donation.actual_token_type || donation.token_type) === 'SOL' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {donation.actual_token_type || donation.token_type}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                {donation.cleaned_message || donation.message ? (
                                  <span className="text-sm" title={donation.cleaned_message || donation.message}>
                                    {(donation.cleaned_message || donation.message || '').length > 50 
                                      ? `${(donation.cleaned_message || donation.message || '').slice(0, 50)}...` 
                                      : (donation.cleaned_message || donation.message)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">No message</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs">
                                    {truncateWallet(donation.donor_wallet_address)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(donation.donor_wallet_address)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                {donation.stream_title ? (
                                  <span className="text-sm" title={donation.stream_title}>
                                    {donation.stream_title.length > 30 
                                      ? `${donation.stream_title.slice(0, 30)}...` 
                                      : donation.stream_title}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">Direct donation</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="streams">
              <StreamAnalyticsTable 
                streams={streamAnalytics} 
                isLoading={isLoadingStreams} 
                error={streamError} 
              />
            </TabsContent>

            <TabsContent value="vods">
              <VodAnalyticsTable 
                vods={vodAnalytics} 
                isLoading={isLoadingVods} 
                error={vodError} 
              />
            </TabsContent>

            <TabsContent value="charts">
              <AnalyticsCharts 
                viewsData={viewsOverTime}
                tipsData={tipsOverTime}
                isLoading={isLoadingViews || isLoadingTips}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default CreatorAnalyticsPage;
