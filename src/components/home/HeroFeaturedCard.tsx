
import React, { useState } from 'react';
import { Play, Eye, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeroFeaturedCardProps {
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

const HeroFeaturedCard: React.FC<HeroFeaturedCardProps> = ({
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
      className="relative group cursor-pointer rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 transform hover:scale-[1.01] h-full flex flex-col"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Thumbnail - Flexible height to match sidebar height */}
      <div className="relative flex-1 w-full overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top left indicators */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isPromoted && (
            <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-bold">
              <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
              PROMOTED
            </div>
          )}
          {isLive && (
            <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {isSpace ? 'SPACE' : 'LIVE'}
            </div>
          )}
          {category && (
            <div className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-medium">
              {category.toUpperCase()}
            </div>
          )}
        </div>

        {/* Bottom left - viewer count - Only show for VODs */}
        {!isLive && !isPromoted && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-lg">
            {isSpace ? <Users className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="font-medium">{viewerCount.toLocaleString()}</span>
            <span className="text-xs">views</span>
          </div>
        )}

        {/* Play overlay */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 hover:bg-white/30 transition-colors">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4 flex-shrink-0">
        <div className="flex gap-3">
          <img
            src={creator.avatar}
            alt={creator.name}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-foreground font-bold text-lg leading-tight mb-1 line-clamp-2">
              {title}
            </h3>
            <p className="text-foreground/70 text-sm font-medium">
              {creator.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroFeaturedCard;
