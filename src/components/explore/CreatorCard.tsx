
import React from 'react';
import { Link } from 'react-router-dom';
import { CreatorProfile } from '@/services/creatorProfileService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import FollowButton from '../follow/FollowButton';
import FollowerCount from '../follow/FollowerCount';

interface CreatorCardProps {
  profile: CreatorProfile; // This profile should now include user_id_uuid
}

const CreatorCard: React.FC<CreatorCardProps> = ({ profile }) => {
  const fallbackInitial = profile.display_name?.substring(0, 2)?.toUpperCase() || '??';
  const shortBio = profile.bio ? (profile.bio.length > 100 ? profile.bio.substring(0, 97) + "..." : profile.bio) : "No bio yet.";

  // If user_id_uuid is not present, this card shouldn't render or link should be disabled.
  // ExploreCreatorsPage already filters this, but good to be defensive.
  if (!profile.user_id_uuid) {
    return null; 
  }

  return (
    <Link to={`/creator/${profile.user_id_uuid}`} className="block group"> {/* Use user_id_uuid */}
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300 border-border bg-card">
        <CardHeader className="flex flex-col items-center text-center p-4 sm:p-6">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 mb-3 border-2 border-primary/20">
            <AvatarImage 
              src={profile.profile_picture_url || undefined} 
              alt={profile.display_name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/100x100/101010/FFFFFF?text=${fallbackInitial}`;
              }}
            />
            <AvatarFallback className="text-2xl sm:text-3xl bg-muted">
              {fallbackInitial}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-lg sm:text-xl font-semibold text-foreground break-all mb-2">{profile.display_name}</CardTitle>
          
          {/* Follower count */}
          <FollowerCount 
            creatorUserId={profile.user_id_uuid} 
            className="mb-3"
          />
          
          {/* Follow button */}
          <div onClick={(e) => e.stopPropagation()}>
            <FollowButton 
              creatorUserId={profile.user_id_uuid} 
              variant="outline"
              size="sm"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4 sm:p-6 pt-0">
          {profile.content_categories && profile.content_categories.length > 0 && (
            <div className="mb-3 flex flex-wrap justify-center gap-1.5">
              {profile.content_categories.slice(0, 3).map(category => ( 
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs sm:text-sm text-foreground/70 text-center leading-relaxed">
            {shortBio}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CreatorCard;
