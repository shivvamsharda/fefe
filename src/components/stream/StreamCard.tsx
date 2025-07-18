
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Users, PlayCircle, Video, Languages, Upload, Clock, Trash2 } from 'lucide-react'; 
import FollowButton from '../follow/FollowButton';
import { useViewerCount } from '@/hooks/useViewerCount';
import { useLanguage } from '@/context/LanguageContext';

interface StreamCardCreatorProps {
  id: string;
  name: string;
  avatar: string;
  walletAddress?: string;
}

interface StreamCardProps {
  id: string; 
  title: string;
  creator: StreamCardCreatorProps;
  thumbnail?: string;
  viewerCount: number;
  isLive: boolean;
  category?: string;
  language?: string | null;
  isUpload?: boolean;
  uploadStatus?: string;
  showDeleteButton?: boolean;
  onDelete?: (id: string, title: string) => void;
}

const getLanguageDisplayName = (code: string | null | undefined): string | null => {
  if (!code) return null;
  try {
    if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(code)) {
        if (code.toLowerCase() === 'en') return 'English';
        if (code.toLowerCase() === 'es') return 'Español';
        return code.toUpperCase();
    }
    const displayName = new Intl.DisplayNames(['en'], { type: 'language' });
    return displayName.of(code);
  } catch (e) {
    return code.toUpperCase();
  }
};

const StreamCard = React.memo(({
  id,
  title,
  creator,
  thumbnail,
  viewerCount: fallbackViewerCount,
  isLive,
  category,
  language,
  isUpload = false,
  uploadStatus,
  showDeleteButton = false,
  onDelete
}: StreamCardProps) => {
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  
  // Determine destination URL based on content type
  let destinationUrl = '';
  if (isUpload) {
    destinationUrl = `/video/${id}`;
  } else if (isLive) {
    destinationUrl = `/stream/${id}`;
  } else {
    destinationUrl = `/vod/${id}`;
  }
  
  const languageDisplay = getLanguageDisplayName(language);

  const { viewerCount: liveViewerCount, isLoading: isLoadingViewerCount } = useViewerCount(id, isLive, isLive);
  const displayViewerCount = isLive ? liveViewerCount : fallbackViewerCount;

  // Determine which thumbnail to use with proper fallback
  const getThumbnailUrl = () => {
    if (thumbnailError || !thumbnail) {
      const fallbackText = isUpload ? t('stream.upload') : (isLive ? t('stream.live') : t('stream.vod'));
      return `https://placehold.co/800x450/101010/FFFFFF?text=${encodeURIComponent(title || fallbackText)}`;
    }
    return thumbnail;
  };

  const handleThumbnailError = () => {
    console.log(`Thumbnail failed to load for ${isUpload ? 'upload' : 'stream'} ${id}, using fallback`);
    setThumbnailError(true);
  };

  // Check if upload is processing
  const isProcessing = isUpload && uploadStatus === 'processing';

  const handleDeleteClick = (e: React.MouseEvent) => {
    console.log('Delete button clicked for video:', id);
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(id, title);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Check if the click target is the delete button or its children
    const target = e.target as HTMLElement;
    if (target.closest('[data-delete-button]')) {
      console.log('Click intercepted by delete button');
      e.preventDefault();
      return;
    }
  };

  return (
    <div 
      className={`relative group ${isProcessing ? 'pointer-events-none opacity-70' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link 
        to={destinationUrl} 
        className="block"
        onClick={handleCardClick}
      >
        <div className="bg-card rounded-lg overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
          <div className="relative aspect-video overflow-hidden">
            <img 
              src={getThumbnailUrl()} 
              alt={title}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isHovered && !isProcessing ? 'scale-110' : 'scale-100'
              }`}
              loading="lazy"
              onError={handleThumbnailError}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
              {isLive && (
                <div className="flex items-center gap-1.5 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-md shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                  <span>{t('stream.live')}</span>
                </div>
              )}
              {isUpload && (
                <div className={`flex items-center gap-1.5 text-white text-sm font-bold px-3 py-1 rounded-md shadow-lg ${
                  isProcessing ? 'bg-yellow-600' : 'bg-blue-600'
                }`}>
                  {isProcessing ? (
                    <>
                      <Clock size={12} className="animate-pulse" />
                      <span>{t('stream.processing')}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={12} />
                      <span>{t('stream.upload')}</span>
                    </>
                  )}
                </div>
              )}
              {languageDisplay && (
                <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                  <Languages size={14} />
                  <span>{languageDisplay}</span>
                </div>
              )}
            </div>
            
            {(isLive || displayViewerCount > 0) && !isUpload && ( 
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-sm text-white text-sm px-2 py-1 rounded-md">
                <Users size={14} />
                <span>
                  {isLive && isLoadingViewerCount ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    displayViewerCount.toLocaleString()
                  )}
                </span>
              </div>
            )}
            
            {category && (
              <div className="absolute bottom-3 right-3 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-md font-medium">
                {category}
              </div>
            )}
            
            {isHovered && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200 pointer-events-none">
                <PlayCircle size={64} className="text-white/90 drop-shadow-lg" />
              </div>
            )}
          </div>
          
          <div className="p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-border">
                <img 
                  src={creator.avatar} 
                  alt={creator.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/100x100/101010/FFFFFF?text=${creator.name?.substring(0,2) || 'U'}`;
                  }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground font-semibold text-base leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <div className="flex items-center justify-between mb-1">
                  <Link 
                    to={`/creator/${creator.id}`} 
                    onClick={(e) => e.stopPropagation()} 
                    className="text-foreground/70 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {creator.name}
                  </Link>
                  {creator.id && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <FollowButton creatorUserId={creator.id} size="sm" showIcon={false} />
                    </div>
                  )}
                </div>
                {!isLive && !isUpload && (
                  <div className="text-foreground/50 text-xs">
                    {t('stream.vod')}
                  </div>
                )}
                {isUpload && isProcessing && (
                  <div className="text-foreground/50 text-xs">
                    {t('stream.processing_text')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Delete Button for Uploads - positioned outside the Link */}
      {showDeleteButton && isUpload && isHovered && !isProcessing && (
        <button
          data-delete-button
          onClick={handleDeleteClick}
          className="absolute top-3 right-3 bg-destructive/90 hover:bg-destructive text-destructive-foreground p-2 rounded-md transition-colors duration-200 shadow-lg z-10"
          aria-label={`Delete ${title}`}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
});

StreamCard.displayName = 'StreamCard';

export default StreamCard;
