
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { LanguageProvider } from "./context/LanguageContext";
import { TipProvider, useTips } from "./context/TipContext";
import TipNotification from "./components/stream/TipNotification";
import CreatorSetupPage from "./pages/CreatorSetupPage"; 
import CreatorPublicProfilePage from "./pages/CreatorPublicProfilePage";
import CreatorAnalyticsPage from "./pages/CreatorAnalyticsPage";
import SubscriptionSettingsPage from "./pages/SubscriptionSettingsPage";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import HowItWorks from "./pages/HowItWorks";
import FollowingPage from "./pages/FollowingPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import UploadVideoPage from "./pages/UploadVideoPage";
import CreatorVideosPage from "./pages/CreatorVideosPage";
import VideoViewPage from "./pages/VideoViewPage";
import AllUploadsPage from "./pages/AllUploadsPage";
import SpacesV2Page from "./pages/SpacesV2Page";
import SpaceV2RoomPage from "./pages/SpaceV2RoomPage";
import PfpPage from "./pages/PfpPage";
import AdsPage from "./pages/AdsPage";

import OBSStreamingV2 from "./pages/OBSStreamingV2";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import PromoteStreamPage from "./pages/PromoteStreamPage";
import PromotedStreamView from "./pages/PromotedStreamView";
import ViewerPointsPage from "./pages/ViewerPointsPage";
import SettingsPage from "./pages/SettingsPage";
import LaunchToken from "./pages/LaunchToken";

import Index from "./pages/Index";
import StartWatching from "./pages/StartWatching";
import BecomeCreator from "./pages/BecomeCreator";
import ExploreCreatorsPage from "./pages/ExploreCreatorsPage";
import CreateStream from "./pages/CreateStream";
import StreamView from "./pages/StreamView";
import OBSStreaming from "./pages/OBSStreaming";
import TestOBSStreaming from "./pages/TestOBSStreaming";
import BrowserStreaming from "./pages/BrowserStreaming";
import VodView from "./pages/VodView";
import AllVODs from "./pages/AllVODs";
import Staking from "./pages/Staking";
import NotFound from "./pages/NotFound";

import React from "react";
import { useReferralTracking } from "./hooks/useReferralTracking";

// Optimized query client for maximum performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Smart retry logic: fewer retries for client errors, more for network issues
        if (error && 'status' in error && typeof error.status === 'number') {
          if (error.status >= 400 && error.status < 500) return false; // Don't retry client errors
        }
        return failureCount < 2; // Reduced from 3 to 2 for faster feedback
      },
      staleTime: 3000, // Reduced from 2 minutes to 3s for live streams
      gcTime: 2 * 60 * 1000, // Reduced cache time for fresher data
      refetchOnMount: true,
      retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 2000), // Faster retry backoff
      // Enable background refetching for better UX
      refetchInterval: false, // Let individual queries control their own intervals
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1, // Reduced mutation retries for faster feedback
      retryDelay: 1000,
    },
  },
});

// Wrapper component to handle referral tracking
const ReferralTracker = () => {
  useReferralTracking();
  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <WalletProvider>
            <TipProvider>
              <ReferralTracker />
              <Toaster />
              <Sonner position="top-right" closeButton richColors expand={false} />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/watch" element={<StartWatching />} />
                  <Route path="/following" element={<FollowingPage />} />
                  <Route path="/explore-creators" element={<ExploreCreatorsPage />} />
                  <Route path="/create" element={<BecomeCreator />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/staking" element={<Staking />} />
                  
                  <Route path="/spaces" element={<SpacesV2Page />} />
                  <Route path="/spaces/:roomName" element={<SpaceV2RoomPage />} />
                  <Route path="/pfp" element={<PfpPage />} />
                  <Route path="/ads.txt" element={<AdsPage />} />
                  <Route path="/delete-account" element={<DeleteAccountPage />} />
                  <Route path="/promote-stream" element={<PromoteStreamPage />} />
                  <Route path="/promoted-stream/:id" element={<PromotedStreamView />} />
                  <Route path="/viewer-points" element={<ViewerPointsPage />} />
                  <Route path="/launch-token" element={<LaunchToken />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/creator/setup" element={<CreatorSetupPage />} />
                  <Route path="/creator/subscription-settings" element={<SubscriptionSettingsPage />} />
                  <Route path="/creator/upload" element={<UploadVideoPage />} />
                  <Route path="/creator/videos" element={<CreatorVideosPage />} />
                  <Route path="/creator/:userUuid" element={<CreatorPublicProfilePage />} />
                  <Route path="/creator/:userUuid/analytics" element={<CreatorAnalyticsPage />} />
                  <Route path="/create/stream" element={<CreateStream />} />
                  <Route path="/create/stream/obs" element={<OBSStreaming />} />
                  <Route path="/create/stream/obs-v2" element={<OBSStreamingV2 />} />
                  <Route path="/create/stream/test-obs" element={<TestOBSStreaming />} />
                  <Route path="/create/stream/browser" element={<BrowserStreaming />} />
                  <Route path="/stream/:id" element={<StreamView />} />
                  <Route path="/video/:id" element={<VideoViewPage />} />
                  <Route path="/vod/:playbackId" element={<VodView />} />
                  <Route path="/vods" element={<AllVODs />} />
                  <Route path="/uploads" element={<AllUploadsPage />} />
                  <Route path="/termsofservice" element={<TermsOfService />} />
                  <Route path="/privacypolicies" element={<PrivacyPolicy />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              <TipNotificationContainer />
            </TipProvider>
          </WalletProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const TipNotificationContainer = () => {
  const { currentTip } = useTips();
  return <TipNotification tip={currentTip} />;
};

export default App;
