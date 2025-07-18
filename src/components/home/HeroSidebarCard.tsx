
import React, { useState } from 'react';
import { Play, Eye, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeroSidebarCardProps {
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
}

const HeroSidebarCard: React.FC<HeroSidebarCardProps> = ({
  id,
  title,
  creator,
  thumbnail,
  viewerCount = 0,
  isLive,
  isSpace = false,
  category,
  muxPlaybackId,
  isPromoted = false,
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (isPromoted) {
      navigate(`/promoted-stream/${id}`);
    } else if (isSpace) {
      navigate(`/spacesv2/${id}?invite=viewer`);
    } else if (isLive) {
      navigate(`/stream/${id}`);
    } else {
      navigate(`/vod/${muxPlaybackId || id}`);
    }
  };

  return (
    <div
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 transform hover:scale-[1.02] h-full flex flex-col"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Thumbnail - Takes most of the space */}
      <div className="relative flex-1 w-full overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Top left indicators */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          {isPromoted && (
            <div className="flex items-center gap-1 bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs font-bold">
              <div className="w-1 h-1 bg-primary-foreground rounded-full animate-pulse" />
              PROMOTED
            </div>
          )}
          {isLive && !isPromoted && (
            <div className="flex items-center gap-1 bg-red-600 text-white px-1.5 py-0.5 rounded text-xs font-bold">
              <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
              {isSpace ? 'SPACE' : 'LIVE'}
            </div>
          )}
        </div>

        {/* Bottom left - viewer count - Only show for VODs */}
        {!isLive && !isPromoted && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded">
            {isSpace ? <Users className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
            <span className="font-medium text-xs">{viewerCount.toLocaleString()}</span>
          </div>
        )}

        {/* Play overlay */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 hover:bg-white/30 transition-colors">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        )}
      </div>

      {/* Card content - Fixed height at bottom */}
      <div className="p-2.5 flex-shrink-0">
        <div className="flex gap-2">
          <img
            src={creator.avatar}
            alt={creator.name}
            className="w-6 h-6 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-foreground font-semibold text-xs leading-tight mb-0.5 line-clamp-2">
              {title}
            </h4>
            <p className="text-foreground/70 text-xs">
              {creator.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSidebarCard;
