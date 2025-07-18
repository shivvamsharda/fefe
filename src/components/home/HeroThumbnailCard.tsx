
import React, { useState } from 'react';
import { Play, Eye, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeroThumbnailCardProps {
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

const HeroThumbnailCard: React.FC<HeroThumbnailCardProps> = ({
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
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 transform hover:scale-[1.03]"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Thumbnail - Small Thumbnail Size */}
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Live/Promoted indicator */}
        {(isLive || isPromoted) && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-600 text-white px-1.5 py-0.5 rounded text-xs font-bold">
            <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
            {isPromoted ? 'PROMOTED' : isSpace ? 'SPACE' : 'LIVE'}
          </div>
        )}

        {/* Viewer count - Only show for VODs */}
        {!isLive && !isPromoted && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded">
            {isSpace ? <Users className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
            <span className="font-medium text-xs">{viewerCount > 999 ? `${Math.floor(viewerCount/1000)}k` : viewerCount}</span>
          </div>
        )}

        {/* Play overlay */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 hover:bg-white/30 transition-colors">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-2">
        <h5 className="text-foreground font-medium text-xs leading-tight mb-1 line-clamp-2">
          {title}
        </h5>
        <p className="text-foreground/60 text-xs truncate">
          {creator.name}
        </p>
      </div>
    </div>
  );
};

export default HeroThumbnailCard;
