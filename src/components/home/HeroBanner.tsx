import React from 'react';
import { Play, Users, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

type HeroContentItem = {
  id: string;
  title: string;
  creator: {
    id?: string;
    name: string;
    avatar: string;
    walletAddress?: string;
  };
  thumbnail: string;
  viewerCount?: number;
  isLive: boolean;
  isSpace?: boolean;
  category?: string;
  playbackUrl?: string;
  muxPlaybackId?: string;
  isPromoted?: boolean;
  embedUrl?: string;
  platform?: string;
};

interface HeroBannerProps extends HeroContentItem {}

const HeroBanner: React.FC<HeroBannerProps> = ({
  id,
  title,
  creator,
  thumbnail,
  viewerCount,
  isLive,
  isSpace,
  category,
  playbackUrl,
  muxPlaybackId,
  isPromoted,
  embedUrl,
  platform
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (isPromoted && embedUrl) {
      navigate(`/promoted-stream/${id}`);
    } else if (isSpace) {
      navigate(`/space/${id}`);
    } else if (muxPlaybackId) {
      navigate(`/vod/${muxPlaybackId}`);
    } else {
      navigate(`/stream/${id}`);
    }
  };

  return (
    <div 
      className="relative w-full h-64 md:h-80 lg:h-96 rounded-xl overflow-hidden cursor-pointer group bg-gradient-to-br from-background/20 to-background/40 border border-border/50"
      onClick={handleClick}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundImage: `url(${thumbnail})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
          <Play className="w-8 h-8 text-white fill-white" />
        </div>
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        {/* Top Section - Status Badges */}
        <div className="flex items-start justify-between">
          <div className="flex gap-2 flex-wrap">
            {isLive && (
              <Badge 
                variant="destructive" 
                className="bg-red-600 text-white font-semibold px-3 py-1 text-sm animate-pulse"
              >
                LIVE
              </Badge>
            )}
            {isSpace && (
              <Badge 
                variant="secondary" 
                className="bg-purple-600 text-white font-semibold px-3 py-1 text-sm"
              >
                SPACE
              </Badge>
            )}
            {isPromoted && (
              <Badge 
                variant="outline" 
                className="bg-yellow-500/20 border-yellow-500 text-yellow-500 font-semibold px-3 py-1 text-sm"
              >
                PROMOTED
              </Badge>
            )}
            {category && (
              <Badge 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white px-3 py-1 text-sm"
              >
                {category}
              </Badge>
            )}
          </div>

          {/* Viewer Count */}
          {viewerCount !== undefined && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              {isLive ? (
                <Eye className="w-4 h-4 text-white" />
              ) : (
                <Users className="w-4 h-4 text-white" />
              )}
              <span className="text-white text-sm font-medium">
                {viewerCount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Section - Title and Creator */}
        <div className="space-y-3">
          {/* Title */}
          <h3 className="text-white text-xl md:text-2xl lg:text-3xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Creator Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white/30">
              <AvatarImage src={creator.avatar} alt={creator.name} />
              <AvatarFallback className="bg-primary/20 text-primary-foreground">
                {creator.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-white font-medium text-base truncate">
                {creator.name}
              </p>
              {platform && (
                <p className="text-white/70 text-sm">
                  via {platform}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;