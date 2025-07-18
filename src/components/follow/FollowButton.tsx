
import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followCreator, unfollowCreator, isFollowingCreator } from '@/services/followService';
import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';

interface FollowButtonProps {
  creatorUserId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  creatorUserId,
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  className = ''
}) => {
  const { isAuthenticated, userUuid, openWalletModal } = useWallet();
  const queryClient = useQueryClient();

  // Don't render the button if user is not authenticated
  if (!isAuthenticated || !userUuid) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openWalletModal();
        }}
        className={className}
      >
        {showIcon && <UserPlus size={16} className="mr-1" />}
        Follow
      </Button>
    );
  }

  // Check if user is following this creator
  const { data: isFollowing, isLoading: isCheckingFollow } = useQuery({
    queryKey: ['isFollowing', creatorUserId, userUuid],
    queryFn: () => isFollowingCreator(creatorUserId, userUuid!),
    enabled: isAuthenticated && !!creatorUserId && !!userUuid,
    retry: 1,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: () => followCreator(creatorUserId, userUuid!),
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['isFollowing', creatorUserId, userUuid] });
        queryClient.invalidateQueries({ queryKey: ['followerCount', creatorUserId] });
        toast.success('You are now following this creator!');
      } else {
        toast.error('Failed to follow creator. Please try again.');
      }
    },
    onError: (error) => {
      console.error('Follow mutation error:', error);
      toast.error('Failed to follow creator. Please try again.');
    }
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: () => unfollowCreator(creatorUserId, userUuid!),
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['isFollowing', creatorUserId, userUuid] });
        queryClient.invalidateQueries({ queryKey: ['followerCount', creatorUserId] });
        toast.success('Successfully unfollowed creator');
      } else {
        toast.error('Failed to unfollow creator. Please try again.');
      }
    },
    onError: (error) => {
      console.error('Unfollow mutation error:', error);
      toast.error('Failed to unfollow creator. Please try again.');
    }
  });

  const handleFollowToggle = (e: React.MouseEvent) => {
    // Prevent event propagation to avoid navigation
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !userUuid) {
      openWalletModal();
      return;
    }

    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const isLoading = isCheckingFollow || followMutation.isPending || unfollowMutation.isPending;

  return (
    <Button
      variant={isFollowing ? 'default' : variant}
      size={size}
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <>
          {showIcon && (
            isFollowing ? (
              <UserCheck size={16} className="mr-1" />
            ) : (
              <UserPlus size={16} className="mr-1" />
            )
          )}
          {isFollowing ? 'Following' : 'Follow'}
        </>
      )}
    </Button>
  );
};

export default FollowButton;
