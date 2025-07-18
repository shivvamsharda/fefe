import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, User, Globe, Twitter, Youtube, Instagram, Send, Video, Tv, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/context/WalletContext';
import { 
  getCreatorProfile, 
  createCreatorProfile, 
  updateCreatorProfile,
  CreatorProfile,
  CreatorProfileData,
  UpdateCreatorProfileData 
} from '@/services/creatorProfileService';

const profileSchema = z.object({
  display_name: z.string().min(2, 'Display name must be at least 2 characters').max(50, 'Display name must be at most 50 characters'),
  full_name: z.string().max(100, 'Full name must be at most 100 characters').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').max(100, 'Email must be at most 100 characters').optional().or(z.literal('')),
  bio: z.string().max(1000, 'Bio must be at most 1000 characters').optional().or(z.literal('')),
  content_categories: z.string().optional().or(z.literal('')), // Comma-separated string
  language_preference: z.string().max(50, 'Language must be at most 50 characters').optional().or(z.literal('')),
  website_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
  social_x_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
  social_telegram_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
  social_youtube_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
  social_instagram_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
  social_kick_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
  social_twitch_url: z.string().url('Invalid URL').or(z.literal('')).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ProfileSettings = () => {
  const { publicKey, isAuthenticated, isGoogleAuthenticated, userProfile, walletAddress } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      full_name: '',
      email: '',
      bio: '',
      content_categories: '',
      language_preference: '',
      website_url: '',
      social_x_url: '',
      social_telegram_url: '',
      social_youtube_url: '',
      social_instagram_url: '',
      social_kick_url: '',
      social_twitch_url: '',
    },
  });

  // Fetch creator profile (only for wallet users)
  const { data: creatorProfile, isLoading: isLoadingProfile } = useQuery<CreatorProfile | null>({
    queryKey: ['creatorProfile', publicKey],
    queryFn: () => publicKey ? getCreatorProfile(publicKey) : Promise.resolve(null),
    enabled: !!publicKey && isAuthenticated && !isGoogleAuthenticated,
  });

  // Update form when creator profile loads (wallet users) or user profile loads (Google users)
  useEffect(() => {
    if (creatorProfile) {
      // Wallet user with creator profile
      form.reset({
        display_name: creatorProfile.display_name || '',
        full_name: creatorProfile.full_name || '',
        email: creatorProfile.email || '',
        bio: creatorProfile.bio || '',
        content_categories: creatorProfile.content_categories?.join(', ') || '',
        language_preference: creatorProfile.language_preference || '',
        website_url: creatorProfile.website_url || '',
        social_x_url: creatorProfile.social_x_url || '',
        social_telegram_url: creatorProfile.social_telegram_url || '',
        social_youtube_url: creatorProfile.social_youtube_url || '',
        social_instagram_url: creatorProfile.social_instagram_url || '',
        social_kick_url: creatorProfile.social_kick_url || '',
        social_twitch_url: creatorProfile.social_twitch_url || '',
      });
      setAvatarUrl(creatorProfile.profile_picture_url || '');
    } else if (isGoogleAuthenticated && userProfile) {
      // Google user - populate from user profile
      form.reset({
        display_name: userProfile.display_name || userProfile.username || '',
        full_name: '',
        email: userProfile.email || '',
        bio: '',
        content_categories: '',
        language_preference: '',
        website_url: '',
        social_x_url: '',
        social_telegram_url: '',
        social_youtube_url: '',
        social_instagram_url: '',
        social_kick_url: '',
        social_twitch_url: '',
      });
      setAvatarUrl(userProfile.avatar_url || '');
    }
  }, [creatorProfile, userProfile, isGoogleAuthenticated, form]);

  const handleAvatarUpload = async (file: File) => {
    const identifier = publicKey || userProfile?.id;
    if (!identifier) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${identifier}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('creator_profile_pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('creator_profile_pictures')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
      return null;
    }
  };

  const createProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (isGoogleAuthenticated) {
        // For Google users, update user_profiles table instead
        if (!userProfile?.id) throw new Error('No user profile found');
        
        let avatarUrl = '';
        if (avatarFile) {
          const uploadedUrl = await handleAvatarUpload(avatarFile);
          if (uploadedUrl) avatarUrl = uploadedUrl;
        }

        const { error } = await supabase
          .from('user_profiles')
          .update({
            display_name: data.display_name,
            avatar_url: avatarUrl || userProfile.avatar_url
          })
          .eq('id', userProfile.id);

        if (error) throw error;
        return { success: true };
      } else {
        // Wallet user - create creator profile
        if (!publicKey) throw new Error('No wallet connected');
        
        let avatarUrl = '';
        if (avatarFile) {
          const uploadedUrl = await handleAvatarUpload(avatarFile);
          if (uploadedUrl) avatarUrl = uploadedUrl;
        }

        const profileData: CreatorProfileData = {
          wallet_address: publicKey,
          display_name: data.display_name,
          full_name: data.full_name || null,
          email: data.email || null,
          bio: data.bio || null,
          profile_picture_url: avatarUrl || null,
          content_categories: data.content_categories 
            ? data.content_categories.split(',').map(s => s.trim()).filter(s => s) 
            : null,
          language_preference: data.language_preference || null,
          website_url: data.website_url || null,
          social_x_url: data.social_x_url || null,
          social_telegram_url: data.social_telegram_url || null,
          social_youtube_url: data.social_youtube_url || null,
          social_instagram_url: data.social_instagram_url || null,
          social_kick_url: data.social_kick_url || null,
          social_twitch_url: data.social_twitch_url || null,
          subscription_enabled: false,
          subscription_price_sol: null,
        };

        return await createCreatorProfile(profileData);
      }
    },
    onSuccess: () => {
      toast.success(isGoogleAuthenticated ? 'Profile updated successfully!' : 'Creator profile created successfully!');
      if (!isGoogleAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['creatorProfile', publicKey] });
      }
      setAvatarFile(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to ${isGoogleAuthenticated ? 'update' : 'create'} profile: ${error.message}`);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (isGoogleAuthenticated) {
        // For Google users, update user_profiles table
        if (!userProfile?.id) throw new Error('No user profile found');
        
        let newAvatarUrl = userProfile.avatar_url;
        if (avatarFile) {
          const uploadedUrl = await handleAvatarUpload(avatarFile);
          if (uploadedUrl) newAvatarUrl = uploadedUrl;
        }

        const { error } = await supabase
          .from('user_profiles')
          .update({
            display_name: data.display_name,
            avatar_url: newAvatarUrl
          })
          .eq('id', userProfile.id);

        if (error) throw error;
        return { success: true };
      } else {
        // Wallet user - update creator profile
        if (!publicKey) throw new Error('No wallet connected');
        
        let newAvatarUrl = creatorProfile?.profile_picture_url;
        if (avatarFile) {
          const uploadedUrl = await handleAvatarUpload(avatarFile);
          if (uploadedUrl) newAvatarUrl = uploadedUrl;
        }

        const updateData: UpdateCreatorProfileData = {
          display_name: data.display_name,
          full_name: data.full_name || null,
          email: data.email || null,
          bio: data.bio || null,
          profile_picture_url: newAvatarUrl || null,
          content_categories: data.content_categories 
            ? data.content_categories.split(',').map(s => s.trim()).filter(s => s) 
            : null,
          language_preference: data.language_preference || null,
          website_url: data.website_url || null,
          social_x_url: data.social_x_url || null,
          social_telegram_url: data.social_telegram_url || null,
          social_youtube_url: data.social_youtube_url || null,
          social_instagram_url: data.social_instagram_url || null,
          social_kick_url: data.social_kick_url || null,
          social_twitch_url: data.social_twitch_url || null,
        };

        return await updateCreatorProfile(publicKey, updateData);
      }
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      if (!isGoogleAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['creatorProfile', publicKey] });
      }
      setAvatarFile(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    if (isGoogleAuthenticated || creatorProfile) {
      updateProfileMutation.mutate(data);
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please connect your wallet or sign in with Google to access profile settings.</p>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCreating = !creatorProfile && !isGoogleAuthenticated;
  const isPending = createProfileMutation.isPending || updateProfileMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          {isGoogleAuthenticated ? 'Profile Information' : (isCreating ? 'Create Creator Profile' : 'Profile Information')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isGoogleAuthenticated 
            ? 'Update your profile information.'
            : (isCreating 
              ? 'Set up your creator profile to start streaming and building your audience.'
              : 'Update your creator profile information and social links.'
            )
          }
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>
                    <User size={32} />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        <Upload size={16} className="mr-2" />
                        Upload Avatar
                      </span>
                    </Button>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your display name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell us about yourself..." rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Content Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="content_categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Categories</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Gaming, Music, Art (comma-separated)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language_preference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Language</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. English" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Social Links</CardTitle>
              <CardDescription>
                Connect your social media accounts to build your audience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Globe size={16} className="mr-2" />
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourwebsite.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="social_x_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Twitter size={16} className="mr-2" />
                        X (Twitter)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://twitter.com/yourprofile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="social_youtube_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Youtube size={16} className="mr-2" />
                        YouTube
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://youtube.com/yourchannel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="social_instagram_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Instagram size={16} className="mr-2" />
                        Instagram
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://instagram.com/yourprofile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="social_twitch_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Video size={16} className="mr-2" />
                        Twitch
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://twitch.tv/yourprofile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="social_kick_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Tv size={16} className="mr-2" />
                        Kick
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://kick.com/yourprofile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="social_telegram_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Send size={16} className="mr-2" />
                        Telegram
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://t.me/yourprofile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCreating ? 'Create Profile' : 'Update Profile'}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ProfileSettings;