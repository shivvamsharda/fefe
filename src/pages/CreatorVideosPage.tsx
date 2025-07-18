import React, { useState, useEffect } from 'react';
import Layout from "@/components/layout/Layout";
import UploadedVideoCard from "@/components/video/UploadedVideoCard";
import VideoStatusChecker from "@/components/video/VideoStatusChecker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, RefreshCw } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { getUserUploadedVideos, debugUserVideosQuery, deleteUploadedVideo, UploadedVideo } from "@/services/uploadedVideoService";
import { checkMultipleVideoStatuses } from "@/services/bunnyStatusService";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/context/WalletContext";
import { toast } from "sonner";

const CreatorVideosPage: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingStatuses, setCheckingStatuses] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [walletAddress]);

  useEffect(() => {
    if (userId) {
      loadUploadedVideos();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    if (!walletAddress) {
      console.log('No wallet address available');
      setLoading(false);
      return;
    }
    
    try {
      console.log('=== CreatorVideosPage Debug ===');
      console.log('1. Loading user profile for wallet:', walletAddress);
      
      // Get user profile by wallet address to get the user ID
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id, wallet_address, username')
        .eq('wallet_address', walletAddress)
        .single();

      console.log('2. User profile query result:', { profile, error });

      if (error) {
        console.error('3. Profile query error details:', error);
        
        if (error.code === 'PGRST116') {
          console.log('4. No profile found - user may need to complete profile setup');
          toast.error("User profile not found. Please complete your profile setup.");
        } else {
          toast.error("Could not load user profile");
        }
        setLoading(false);
        return;
      }

      if (!profile) {
        console.log('5. Profile is null despite no error');
        toast.error("Could not load user profile");
        setLoading(false);
        return;
      }

      console.log('6. Setting user ID:', profile.id);
      setUserId(profile.id);
    } catch (error) {
      console.error('7. Error loading user profile:', error);
      toast.error("Failed to load user profile");
      setLoading(false);
    }
  };

  const loadUploadedVideos = async () => {
    if (!userId) {
      console.log('No user ID available for loading videos');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('=== Loading Videos Debug ===');
    console.log('1. Loading uploaded videos for user ID:', userId);
    
    try {
      // Run debug queries first
      const debugResults = await debugUserVideosQuery(userId);
      console.log('2. Debug query results:', debugResults);
      
      // Then run the main query
      const videos = await getUserUploadedVideos(userId);
      console.log('3. Final videos result:', videos);
      console.log('4. Videos count:', videos.length);
      
      if (videos.length === 0) {
        console.log('5. No videos found - this could be due to:');
        console.log('   - No videos uploaded for this user');
        console.log('   - All videos are marked as deleted');
        console.log('   - Database permission issues');
        console.log('   - User ID mismatch');
      }
      
      setUploadedVideos(videos);

      // Auto-check status for processing videos
      const processingVideos = videos.filter(v => v.upload_status === 'processing');
      if (processingVideos.length > 0) {
        console.log('Found processing videos, checking statuses:', processingVideos.map(v => v.bunny_video_id));
        setTimeout(() => {
          checkMultipleVideoStatuses(processingVideos.map(v => v.bunny_video_id));
        }, 2000);
      }
    } catch (error) {
      console.error('6. Error loading uploaded videos:', error);
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAllStatuses = async () => {
    const processingVideos = uploadedVideos.filter(v => v.upload_status === 'processing');
    if (processingVideos.length === 0) {
      toast.info("No videos are currently processing");
      return;
    }

    setCheckingStatuses(true);
    try {
      await checkMultipleVideoStatuses(processingVideos.map(v => v.bunny_video_id));
      // Refresh the list after checking
      setTimeout(() => {
        loadUploadedVideos();
      }, 2000);
      toast.success(`Checked status for ${processingVideos.length} video(s)`);
    } finally {
      setCheckingStatuses(false);
    }
  };

  const handleDeleteVideo = async (video: UploadedVideo) => {
    if (!walletAddress) return;
    
    if (window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
      const success = await deleteUploadedVideo(video.id, walletAddress);
      if (success) {
        setUploadedVideos(prev => prev.filter(v => v.id !== video.id));
      }
    }
  };

  const handlePlayVideo = (video: UploadedVideo) => {
    // Navigate to video player page
    navigate(`/video/${video.id}`);
  };

  const handleEditVideo = (video: UploadedVideo) => {
    // Navigate to edit page (to be implemented)
    navigate(`/creator/video/${video.id}/edit`);
  };

  useEffect(() => {
    const processingVideos = uploadedVideos.filter(v => v.upload_status === 'processing');
    
    if (processingVideos.length > 0) {
      const interval = setInterval(() => {
        console.log('Auto-polling for video status updates...');
        loadUploadedVideos();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [uploadedVideos, userId]);

  if (!walletAddress) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Wallet</h1>
          <p>Please connect your wallet to access your videos.</p>
        </div>
      </Layout>
    );
  }

  const processingCount = uploadedVideos.filter(v => v.upload_status === 'processing').length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Videos
            </h1>
            <p className="text-gray-600">
              Manage your uploaded videos and stream recordings
            </p>
            {userId && (
              <p className="text-xs text-gray-500 mt-1">
                User ID: {userId} | Wallet: {walletAddress}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {processingCount > 0 && (
              <Button 
                variant="outline" 
                onClick={handleCheckAllStatuses}
                disabled={checkingStatuses}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${checkingStatuses ? 'animate-spin' : ''}`} />
                Check Status ({processingCount})
              </Button>
            )}
            <Button onClick={() => navigate('/creator/upload')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Upload Video
            </Button>
          </div>
        </div>

        <Tabs defaultValue="uploads" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="uploads">Uploaded Videos</TabsTrigger>
            <TabsTrigger value="streams">Stream Recordings</TabsTrigger>
          </TabsList>

          <TabsContent value="uploads" className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : uploadedVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {uploadedVideos.map((video) => (
                  <div key={video.id} className="space-y-2">
                    <UploadedVideoCard
                      video={video}
                      onEdit={() => navigate(`/creator/video/${video.id}/edit`)}
                      onDelete={async (video) => {
                        if (!walletAddress) return;
                        
                        if (window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
                          const success = await deleteUploadedVideo(video.id, walletAddress);
                          if (success) {
                            setUploadedVideos(prev => prev.filter(v => v.id !== video.id));
                          }
                        }
                      }}
                      onPlay={(video) => navigate(`/video/${video.id}`)}
                      showCreator={false}
                    />
                    <VideoStatusChecker
                      videoId={video.id}
                      bunnyVideoId={video.bunny_video_id}
                      currentStatus={video.upload_status}
                      onStatusUpdate={loadUploadedVideos}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No uploaded videos yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Start sharing your content by uploading your first video.
                </p>
                <Button onClick={() => navigate('/creator/upload')}>
                  Upload Your First Video
                </Button>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                  <p className="text-sm text-gray-600 mb-2">Debug Info:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>Wallet: {walletAddress}</li>
                    <li>User ID: {userId || 'Not found'}</li>
                    <li>Videos loaded: {uploadedVideos.length}</li>
                    <li>Loading state: {loading ? 'Loading...' : 'Complete'}</li>
                  </ul>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="streams" className="space-y-6">
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Stream recordings coming soon
              </h3>
              <p className="text-gray-500">
                Your live stream recordings will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CreatorVideosPage;
