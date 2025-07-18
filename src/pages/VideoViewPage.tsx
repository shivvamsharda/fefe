
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from "@/components/layout/Layout";
import { getUploadedVideoByIdWithCreator, UploadedVideoWithCreator } from "@/services/uploadedVideoService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { FileVideo, Clock, Calendar } from "lucide-react";
import BunnyPlayer from "@/components/video/BunnyPlayer";
import StreamInteraction from "@/components/stream/StreamInteraction";

const VideoViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<UploadedVideoWithCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadVideo();
    }
  }, [id]);

  const loadVideo = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      console.log('Loading video with ID:', id);
      const videoData = await getUploadedVideoByIdWithCreator(id);
      console.log('Loaded video data:', videoData);
      
      if (videoData) {
        setVideo(videoData);
      } else {
        setError('Video not found');
      }
    } catch (error) {
      console.error('Error loading video:', error);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading video...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !video) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Video Not Found</h2>
              <p className="text-muted-foreground">
                The video you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const fallbackInitial = video.creator?.display_name?.substring(0, 2)?.toUpperCase() || 'U';
  const isProcessing = video.upload_status === 'processing' || video.upload_status === 'uploading';
  const timeAgo = formatDistanceToNow(new Date(video.created_at), { addSuffix: true });

  const creatorInfo = {
    username: video.creator?.display_name || 'Unknown Creator',
    display_name: video.creator?.display_name || 'Unknown Creator',
    avatar_url: video.creator?.profile_picture_url || null,
    wallet_address: video.creator?.wallet_address
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Video and description section */}
            <div className="lg:col-span-3">
              <div className="aspect-video mb-6 bg-black rounded-lg overflow-hidden">
                {video.upload_status === 'ready' ? (
                  <BunnyPlayer
                    playbackUrl={video.bunny_playback_url}
                    thumbnailUrl={video.bunny_thumbnail_url}
                    title={video.title}
                    width="100%"
                    height="100%"
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      {isProcessing ? (
                        <>
                          <Clock className="h-16 w-16 mx-auto mb-4 opacity-50 animate-pulse" />
                          <p className="text-lg font-medium mb-2">Video Processing</p>
                          <p className="text-sm opacity-75">
                            This video is still being processed. Please check back later.
                          </p>
                        </>
                      ) : (
                        <>
                          <FileVideo className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">Video Unavailable</p>
                          <p className="text-sm opacity-75">
                            This video is not ready for playback.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <h1 className="text-2xl font-bold mb-4">{video.title}</h1>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <Link 
                      to={`/creator/${video.creator?.id}`}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={creatorInfo.avatar_url || undefined}
                          alt={creatorInfo.username || 'Creator'}
                        />
                        <AvatarFallback className="bg-black/50 text-white/70">
                          {fallbackInitial}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {creatorInfo.display_name}
                        </p>
                      </div>
                    </Link>
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{timeAgo}</span>
                    </div>
                  </div>

                  {video.description && (
                    <div className="bg-card rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {video.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-card rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Video Details</h3>
                    <div className="space-y-3">
                      {video.category && (
                        <div>
                          <span className="text-muted-foreground">Category:</span>
                          <span className="ml-2 font-medium">{video.category}</span>
                        </div>
                      )}
                      {video.language && (
                        <div>
                          <span className="text-muted-foreground">Language:</span>
                          <span className="ml-2 font-medium">{video.language.toUpperCase()}</span>
                        </div>
                      )}
                      {video.duration && (
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="ml-2 font-medium">
                            {formatDuration(video.duration)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat and donation section */}
            <div className="lg:col-span-1 flex flex-col">
              {id && (
                <StreamInteraction 
                  streamId={id}
                  creatorName={video.creator?.display_name || 'Creator'}
                  creatorWallet={video.creator?.wallet_address}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VideoViewPage;
