
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Play, Trash2, Eye } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { deleteVod } from '@/services/vodService';
import DeleteVodDialog from './DeleteVodDialog';
import { useVodViewStats } from '@/hooks/useVodViewStats';

interface VodCardProps {
  id: string; // This should be the actual VOD UUID from the database
  playbackId: string; // This is the mux_playback_id for the video player
  title: string;
  creator: {
    id: string;
    name: string;
    avatar: string;
    walletAddress: string;
  };
  thumbnail?: string;
  category?: string;
  showDeleteButton?: boolean;
  onVodDeleted?: (vodId: string) => void;
}

const VodCard = ({ 
  id, 
  playbackId,
  title, 
  creator, 
  thumbnail, 
  category,
  showDeleteButton = false,
  onVodDeleted
}: VodCardProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Add view stats
  const { data: viewStats } = useVodViewStats(id);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    
    try {
      console.log('Starting VOD deletion process for ID:', id);
      const success = await deleteVod(id);
      
      if (success) {
        console.log('VOD deletion successful, invalidating queries');
        
        // Invalidate all relevant queries to force refetch
        await queryClient.invalidateQueries({ queryKey: ['creatorVods'] });
        await queryClient.invalidateQueries({ queryKey: ['creatorVodsCount'] });
        await queryClient.invalidateQueries({ queryKey: ['vods'] });
        await queryClient.invalidateQueries({ queryKey: ['following-vods'] });
        
        // Refetch queries immediately to update UI
        queryClient.refetchQueries({ queryKey: ['creatorVods'] });
        queryClient.refetchQueries({ queryKey: ['vods'] });
        
        // Call the callback with the VOD ID
        onVodDeleted?.(id);
        setIsDeleteDialogOpen(false);
        
        console.log('VOD deletion process completed');
      } else {
        console.error('VOD deletion failed');
      }
    } catch (error) {
      console.error('Error in handleDeleteConfirm:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const fallbackInitial = creator.name?.substring(0, 2)?.toUpperCase() || 'U';

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden bg-card border border-border">
        <Link to={`/vod/${playbackId}`} className="block">
          <div className="relative aspect-video overflow-hidden bg-muted">
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x225/101010/FFFFFF?text=VOD';
                }}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Play size={32} className="text-muted-foreground" />
              </div>
            )}
            
            {/* Delete Button Overlay */}
            {showDeleteButton && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteClick}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            )}

            {/* VOD Badge and View Count */}
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                VOD
              </Badge>
              {viewStats && viewStats.totalViews > 0 && (
                <div className="flex items-center gap-1 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                  <Eye size={12} />
                  <span>{viewStats.totalViews}</span>
                </div>
              )}
            </div>
          </div>
          
          <CardContent className="p-3">
            <div className="flex gap-3">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="text-xs bg-muted">
                  {fallbackInitial}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-2 text-foreground mb-1 group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-xs text-muted-foreground mb-1">{creator.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {category && <span>{category}</span>}
                  {viewStats && viewStats.totalViews > 0 && (
                    <>
                      {category && <span>•</span>}
                      <span>{viewStats.totalViews} views</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>

      <DeleteVodDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        vodTitle={title}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default VodCard;
