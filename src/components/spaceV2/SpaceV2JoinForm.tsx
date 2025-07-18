
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';
import type { SpaceV2 } from '@/services/spacesV2Service';

interface SpaceV2JoinFormProps {
  space: SpaceV2;
  isHost: boolean;
  isLoading: boolean;
  onJoinSpace: (displayName: string, role: 'host' | 'participant' | 'viewer') => void;
}

const SpaceV2JoinForm: React.FC<SpaceV2JoinFormProps> = ({
  space,
  isHost,
  isLoading,
  onJoinSpace
}) => {
  const [displayName, setDisplayName] = useState(isHost ? 'Host' : '');
  const [selectedRole, setSelectedRole] = useState<'participant' | 'viewer'>('participant');

  const handleJoin = () => {
    const finalRole = isHost ? 'host' : selectedRole;
    onJoinSpace(displayName, finalRole);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={24} />
              Join Space: {space.title}
            </CardTitle>
            {space.description && (
              <p className="text-muted-foreground">{space.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={50}
              />
            </div>

            {!isHost && (
              <div>
                <label className="block text-sm font-medium mb-2">Join as</label>
                <Select value={selectedRole} onValueChange={(value: 'participant' | 'viewer') => setSelectedRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participant">Participant (with camera/mic)</SelectItem>
                    <SelectItem value="viewer">Viewer (watch only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-primary/10 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Space Info:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Participants: {space.participant_count}</li>
                <li>• Status: {space.is_live ? 'Live' : 'Private'}</li>
                {space.category && <li>• Category: {space.category}</li>}
              </ul>
            </div>

            <Button 
              onClick={handleJoin}
              disabled={isLoading || !displayName.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Joining...' : `Join as ${isHost ? 'Host' : selectedRole}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SpaceV2JoinForm;
