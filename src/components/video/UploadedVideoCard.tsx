
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Edit, Trash2, Clock, Upload } from "lucide-react";
import { UploadedVideo, UploadedVideoWithCreator } from "@/services/uploadedVideoService";
import { formatDistanceToNow } from "date-fns";
import FollowButton from '../follow/FollowButton';

interface UploadedVideoCardProps {
  video: UploadedVideo | UploadedVideoWithCreator;
  onEdit?: (video: UploadedVideo) => void;
  onDelete?: (video: UploadedVideo) => void;
  onPlay?: (video: UploadedVideo) => void;
  showCreator?: boolean;
  showDeleteButton?: boolean;
}

const UploadedVideoCard: React.FC<UploadedVideoCardProps> = ({
  video,
  onEdit,
  onDelete,
  onPlay,
  showCreator = false,
  showDeleteButton = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const videoWithCreator = video as UploadedVideoWithCreator;
  const hasCreator = showCreator && videoWithCreator.creator;
  const fallbackInitial = hasCreator ? videoWithCreator.creator.display_name?.substring(0, 2)?.toUpperCase() || 'U' : 'U';
  
  const isProcessing = video.upload_status === 'processing' || video.upload_status === 'uploading';
  const canPlay = video.upload_status === 'ready';

  // Determine destination URL
  const destinationUrl = `/video/${video.id}`;

  // Get thumbnail with proper fallback
  const getThumbnailUrl = () => {
    if (thumbnailError || !video.bunny_thumbnail_url) {
      return `https://placehold.co/800x450/101010/FFFFFF?text=${encodeURIComponent(video.title || 'UPLOAD')}`;
    }
    return video.bunny_thumbnail_url;
  };

  const handleThumbnailError = () => {
    console.log(`Thumbnail failed to load for upload ${video.id}, using fallback`);
    setThumbnailError(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    console.log('Delete button clicked for video:', video.id);
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(video);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Check if the click target is the delete button or dropdown menu
    const target = e.target as HTMLElement;
    if (target.closest('[data-delete-button]') || target.closest('[data-dropdown-menu]')) {
      console.log('Click intercepted by button');
      e.preventDefault();
      return;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`relative group ${isProcessing ? 'pointer-events-none opacity-70' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link 
        to={canPlay ? destinationUrl : '#'} 
        className={`block ${!canPlay ? 'pointer-events-none' : ''}`}
        onClick={handleCardClick}
      >
        <div className="bg-card rounded-lg overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
          <div className="relative aspect-video overflow-hidden">
            <img 
              src={getThumbnailUrl()} 
              alt={video.title}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isHovered && !isProcessing ? 'scale-110' : 'scale-100'
              }`}
              loading="lazy"
              onError={handleThumbnailError}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Status Badge - Top Left */}
            <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
              <div className={`flex items-center gap-1.5 text-white text-sm font-bold px-3 py-1 rounded-md shadow-lg ${
                isProcessing ? 'bg-yellow-600' : 'bg-blue-600'
              }`}>
                {isProcessing ? (
                  <>
                    <Clock size={12} className="animate-pulse" />
                    <span>Processing</span>
                  </>
                ) : (
                  <>
                    <Upload size={12} />
                    <span>Upload</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Duration - Bottom Left */}
            {video.duration && !isProcessing && (
              <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm text-white text-sm px-2 py-1 rounded-md">
                {formatDuration(video.duration)}
              </div>
            )}
            
            {/* Category Badge - Bottom Right */}
            {video.category && (
              <div className="absolute bottom-3 right-3 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-md font-medium">
                {video.category}
              </div>
            )}
            
            {/* Play Button Overlay */}
            {isHovered && !isProcessing && canPlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200 pointer-events-none">
                <Play size={64} className="text-white/90 drop-shadow-lg" />
              </div>
            )}
          </div>
          
          {/* Content Section */}
          <div className="p-4">
            <div className="flex gap-3">
              {/* Creator Avatar */}
              {hasCreator && (
                <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-border">
                  <img 
                    src={videoWithCreator.creator.profile_picture_url || `https://placehold.co/100x100/101010/FFFFFF?text=${fallbackInitial}`}
                    alt={videoWithCreator.creator.display_name || 'Creator'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/100x100/101010/FFFFFF?text=${fallbackInitial}`;
                    }}
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="text-foreground font-semibold text-base leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                
                {/* Creator Info and Follow Button */}
                {hasCreator && (
                  <div className="flex items-center justify-between mb-1">
                    <Link 
                      to={`/creator/${videoWithCreator.creator.id}`} 
                      onClick={(e) => e.stopPropagation()} 
                      className="text-foreground/70 text-sm font-medium hover:text-primary transition-colors"
                    >
                      {videoWithCreator.creator.display_name || 'Unknown Creator'}
                    </Link>
                    <div onClick={(e) => e.stopPropagation()}>
                      <FollowButton creatorUserId={videoWithCreator.creator.id} size="sm" showIcon={false} />
                    </div>
                  </div>
                )}
                
                {/* Upload Info */}
                <div className="text-foreground/50 text-xs">
                  {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                  {isProcessing && ' • Processing...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Delete Button for Management Views */}
      {showDeleteButton && isHovered && !isProcessing && (
        <button
          data-delete-button
          onClick={handleDeleteClick}
          className="absolute top-3 right-3 bg-destructive/90 hover:bg-destructive text-destructive-foreground p-2 rounded-md transition-colors duration-200 shadow-lg z-10"
          aria-label={`Delete ${video.title}`}
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Management Dropdown for Creator Views */}
      {(onEdit || onDelete) && !showDeleteButton && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-8 w-8 p-0 bg-black/80 hover:bg-black/90 text-white border-0"
                data-dropdown-menu
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {canPlay && onPlay && (
                <DropdownMenuItem onClick={() => onPlay(video)}>
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(video)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(video)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default UploadedVideoCard;
