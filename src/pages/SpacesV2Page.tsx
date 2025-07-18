import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/context/WalletContext';
import { createSpaceV2 } from '@/services/spacesV2Service';
import { toast } from 'sonner';
import { Users, Video, Loader2 } from 'lucide-react';

const SpacesV2Page = () => {
  const navigate = useNavigate();
  const { hasWalletCapability, effectiveWalletAddress } = useWallet();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasWalletCapability || !effectiveWalletAddress) {
      toast.error('Please connect your wallet or sign in to create a space');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a space title');
      return;
    }

    setIsCreating(true);
    
    try {
      const space = await createSpaceV2({
        title: title.trim(),
        description: description.trim(),
        hostWallet: effectiveWalletAddress,
      });
      
      toast.success('Space created successfully!');
      navigate(`/spaces/${space.room_name}`);
    } catch (error) {
      console.error('Error creating space:', error);
      toast.error('Failed to create space. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users size={32} className="text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Create Space</h1>
          </div>
          <p className="text-foreground/70 text-lg">
            Start a multi-user meeting room
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video size={20} />
              Space Details
            </CardTitle>
            <CardDescription>
              Set up your Space meeting. Participants can interact with each other, and you can make it public to appear in live channels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSpace} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Space Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter space title..."
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this space about?"
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-primary mb-2">What happens when you create a Space:</h4>
                <ul className="space-y-1 text-sm text-foreground/70">
                  <li>• You'll be the host of a meeting room</li>
                  <li>• You can share the room link with others to join</li>
                  <li>• Participants can use their camera and microphone</li>
                  <li>• Viewers can join to watch without participating</li>
                  <li>• Click "Go Live" to make it public and appear in live channels</li>
                </ul>
              </div>

              <Button 
                type="submit" 
                disabled={isCreating || !hasWalletCapability || !effectiveWalletAddress || !title.trim()}
                className="w-full"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Creating Space...
                  </>
                ) : (
                  <>
                    <Users size={20} className="mr-2" />
                    Create Space
                  </>
                )}
              </Button>

              {!hasWalletCapability && (
                <p className="text-center text-sm text-destructive">
                  Please connect your wallet or sign in to create a space
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SpacesV2Page;
