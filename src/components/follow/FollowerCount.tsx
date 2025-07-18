
import React from 'react';
import { Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getFollowerCount } from '@/services/followService';

interface FollowerCountProps {
  creatorUserId: string;
  showIcon?: boolean;
  className?: string;
}

const FollowerCount: React.FC<FollowerCountProps> = ({
  creatorUserId,
  showIcon = true,
  className = ''
}) => {
  const { data: followerCount, isLoading } = useQuery({
    queryKey: ['followerCount', creatorUserId],
    queryFn: () => getFollowerCount(creatorUserId),
    enabled: !!creatorUserId,
  });

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 text-sm text-foreground/70 ${className}`}>
        {showIcon && <Users size={14} />}
        <span>...</span>
      </div>
    );
  }

  const count = followerCount || 0;
  const displayCount = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toString();

  return (
    <div className={`flex items-center gap-1 text-sm text-foreground/70 ${className}`}>
      {showIcon && <Users size={14} />}
      <span>{displayCount} {count === 1 ? 'Follower' : 'Followers'}</span>
    </div>
  );
};

export default FollowerCount;
