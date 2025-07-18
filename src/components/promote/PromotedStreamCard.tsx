
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Eye, Star, ExternalLink } from 'lucide-react';

interface PromotedStreamCardProps {
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
  category?: string;
  embedUrl: string;
  platform: string;
  streamUrl: string;
  isHero?: boolean;
  className?: string;
}

const PromotedStreamCard: React.FC<PromotedStreamCardProps> = ({
  id,
  title,
  creator,
  thumbnail,
  viewerCount = 0,
  category,
  embedUrl,
  platform,
  streamUrl,
  isHero = false,
  className = "",
}) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    console.log('Navigating to promoted stream:', id);
    navigate(`/promoted-stream/${id}`);
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case 'youtube':
        return '🎥';
      case 'twitch':
        return '🟣';
      case 'kick':
        return '🟢';
      case 'twitter':
        return '🐦';
      default:
        return '📺';
    }
  };

  return (
    <div
      className={`relative group cursor-pointer rounded-lg overflow-hidden bg-card border border-primary/30 hover:border-primary/50 transition-all duration-300 transform hover:scale-[1.02] ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Promoted Badge */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold">
        <Star className="w-3 h-3" />
        PROMOTED
      </div>

      {/* Video Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Live and Platform indicators */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* Live Badge */}
          <div className="flex items-center gap-1.5 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-md shadow-lg">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span>LIVE</span>
          </div>
          
          {/* Platform indicator */}
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium">
            <span>{getPlatformIcon()}</span>
            {platform.toUpperCase()}
          </div>
        </div>

        {/* Category */}
        {category && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium">
            {category.toUpperCase()}
          </div>
        )}

        {/* Viewer count */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          <Eye className="w-3 h-3" />
          <span className="font-medium">{viewerCount > 999 ? `${Math.floor(viewerCount/1000)}k` : viewerCount}</span>
        </div>

        {/* Play overlay */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-primary/20 backdrop-blur-sm rounded-full p-3 hover:bg-primary/30 transition-colors">
              {platform === 'twitter' ? (
                <ExternalLink className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white fill-white" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-3">
        <div className="flex gap-2">
          <img
            src={creator.avatar}
            alt={creator.name}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-foreground font-semibold text-sm leading-tight mb-1 line-clamp-2">
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

export default PromotedStreamCard;
