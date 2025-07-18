import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import { getCreatorProfileByUserUuid, CreatorProfile, updateCreatorProfile, UpdateCreatorProfileData } from '@/services/creatorProfileService'; 
import { 
  getVodsByUserId, 
  CreatorVod, 
  getActiveStreamByUserId, 
  getVodsCountByUserId,
  getStreamsCountByUserId, 
  getLastStreamedAtByUserId 
} from '@/services/streamService'; 
import { getUserUploadedVideos, deleteUploadedVideo } from '@/services/uploadedVideoService';
import Layout from '@/components/layout/Layout';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertTriangle, Wallet, LayoutGrid, Languages, Link as LinkIcon, AlignLeft, Tv, User, Mail, Twitter, Youtube, Instagram, Send, DollarSign, Video, Radio, CalendarDays, Edit, Save, Upload, Globe, BarChart3, Settings } from 'lucide-react'; 
import CreatorProfileDonationDialog from '@/components/profile/CreatorProfileDonationDialog';
import CreatorAnalyticsModal from '@/components/profile/CreatorAnalyticsModal';
import StreamCard from '@/components/stream/StreamCard';
import VodCard from '@/components/vod/VodCard';
import DeleteUploadDialog from '@/components/upload/DeleteUploadDialog';
import VideoUploadForm from '@/components/upload/VideoUploadForm';
import { useWallet } from '@/context/WalletContext';
import { toast } from 'sonner';

const ProfileFormSchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(50, "Display name must be at most 50 characters"),
  full_name: z.string().max(100, "Full name must be at most 100 characters").optional().or(z.literal('')),
  email: z.string().email("Invalid email address").max(100, "Email must be at most 100 characters").optional().or(z.literal('')),
  bio: z.string().max(1000, "Bio must be at most 1000 characters").optional().or(z.literal('')),
  content_categories: z.string().optional().or(z.literal('')), // Comma-separated string
  language_preference: z.string().max(50, "Language must be at most 50 characters").optional().or(z.literal('')),
  website_url: z.string().url("Invalid URL").or(z.literal('')).optional(),
  social_x_url: z.string().url("Invalid URL").or(z.literal('')).optional(),
  social_telegram_url: z.string().url("Invalid URL").or(z.literal('')).optional(),
  social_youtube_url: z.string().url("Invalid URL").or(z.literal('')).optional(),
  social_instagram_url: z.string().url("Invalid URL").or(z.literal('')).optional(),
  social_kick_url: z.string().url("Invalid URL").or(z.literal('')).optional(),
  social_twitch_url: z.string().url("Invalid URL").or(z.literal('')).optional(),
});

type ProfileFormData = z.infer<typeof ProfileFormSchema>;

const CreatorPublicProfilePage = () => {
  const { userUuid } = useParams<{ userUuid: string }>();
  const navigate = useNavigate();
  const [isDonationDialogOpen, setIsDonationDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [vodsLimit, setVodsLimit] = useState(6);
  const [uploadsLimit, setUploadsLimit] = useState(6);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteUploadDialog, setDeleteUploadDialog] = useState<{
    isOpen: boolean;
    uploadId: string;
    uploadTitle: string;
  }>({
    isOpen: false,
    uploadId: '',
    uploadTitle: ''
  });

  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useQuery<CreatorProfile | null>({
    queryKey: ['creatorProfileByUuid', userUuid],
    queryFn: () => userUuid ? getCreatorProfileByUserUuid(userUuid) : Promise.resolve(null),
    enabled: !!userUuid,
  });

  const { data: activeStream, isLoading: isLoadingActiveStream, error: activeStreamError } = useQuery({
    queryKey: ['activeStream', userUuid],
    queryFn: () => userUuid ? getActiveStreamByUserId(userUuid) : Promise.resolve(null),
    enabled: !!userUuid && !!profile,
  });

  const { data: vods, isLoading: isLoadingVods, error: vodsError } = useQuery<CreatorVod[]>({
    queryKey: ['creatorVods', userUuid, vodsLimit],
    queryFn: () => userUuid ? getVodsByUserId(userUuid, vodsLimit === Infinity ? undefined : vodsLimit) : Promise.resolve([]),
    enabled: !!userUuid && !!profile, 
  });

  const { data: vodsCount, isLoading: isLoadingVodsCount, error: vodsCountError } = useQuery<number>({
    queryKey: ['creatorVodsCount', userUuid],
    queryFn: () => userUuid ? getVodsCountByUserId(userUuid) : Promise.resolve(0),
    enabled: !!userUuid && !!profile,
  });

  const { data: streamsCount, isLoading: isLoadingStreamsCount, error: streamsCountError } = useQuery<number>({
    queryKey: ['creatorStreamsCount', userUuid],
    queryFn: () => userUuid ? getStreamsCountByUserId(userUuid) : Promise.resolve(0),
    enabled: !!userUuid && !!profile,
  });

  const { data: lastStreamedAt, isLoading: isLoadingLastStreamedAt, error: lastStreamedAtError } = useQuery<string | null>({
    queryKey: ['creatorLastStreamedAt', userUuid],
    queryFn: () => userUuid ? getLastStreamedAtByUserId(userUuid) : Promise.resolve(null),
    enabled: !!userUuid && !!profile,
  });

  const { data: uploadedVideos, isLoading: isLoadingUploads, error: uploadsError } = useQuery({
    queryKey: ['creatorUploads', userUuid, uploadsLimit],
    queryFn: () => {
      if (!userUuid || !profile) return Promise.resolve([]);
      return getUserUploadedVideos(userUuid);
    },
    enabled: !!userUuid && !!profile,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileFormSchema),
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

  useEffect(() => {
    if (profile) {
      form.reset({
        display_name: profile.display_name || '',
        full_name: profile.full_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        content_categories: profile.content_categories?.join(', ') || '',
        language_preference: profile.language_preference || '',
        website_url: profile.website_url || '',
        social_x_url: profile.social_x_url || '',
        social_telegram_url: profile.social_telegram_url || '',
        social_youtube_url: profile.social_youtube_url || '',
        social_instagram_url: profile.social_instagram_url || '',
        social_kick_url: profile.social_kick_url || '',
        social_twitch_url: profile.social_twitch_url || '',
      });
    }
  }, [profile, form.reset]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateCreatorProfileData) => {
      if (!profile || !profile.wallet_address) {
        toast.error("Profile data is not available to update.");
        throw new Error("Wallet address is missing or profile not loaded for mutation");
      }
      return updateCreatorProfile(profile.wallet_address, data);
    },
    onSuccess: (updatedProfileData) => {
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['creatorProfileByUuid', userUuid] });
      if (updatedProfileData) {
         queryClient.setQueryData(['creatorProfileByUuid', userUuid], (oldData: CreatorProfile | null | undefined) => ({...oldData, ...updatedProfileData}));
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const deleteUploadMutation = useMutation({
    mutationFn: ({ uploadId, walletAddress }: { uploadId: string; walletAddress: string }) => {
      return deleteUploadedVideo(uploadId, walletAddress);
    },
    onSuccess: () => {
      toast.success('Video deleted successfully!');
      setDeleteUploadDialog({ isOpen: false, uploadId: '', uploadTitle: '' });
      queryClient.invalidateQueries({ queryKey: ['creatorUploads', userUuid, uploadsLimit] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete video: ${error.message}`);
    },
  });

  const onSubmit = (formData: ProfileFormData) => {
    const updateData: UpdateCreatorProfileData = {
      ...formData,
      content_categories: formData.content_categories ? formData.content_categories.split(',').map(s => s.trim()).filter(s => s) : [],
    };
    updateProfileMutation.mutate(updateData);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (profile) { // Reset form to original profile data
      form.reset({
        display_name: profile.display_name || '',
        full_name: profile.full_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        content_categories: profile.content_categories?.join(', ') || '',
        language_preference: profile.language_preference || '',
        website_url: profile.website_url || '',
        social_x_url: profile.social_x_url || '',
        social_telegram_url: profile.social_telegram_url || '',
        social_youtube_url: profile.social_youtube_url || '',
        social_instagram_url: profile.social_instagram_url || '',
        social_kick_url: profile.social_kick_url || '',
        social_twitch_url: profile.social_twitch_url || '',
      });
    }
  };

  // Handle VOD deletion by invalidating queries
  const handleVodDeleted = (vodId: string) => {
    // The queries will be refetched automatically due to invalidation in VodCard
    console.log(`VOD ${vodId} deleted successfully`);
  };

  const handleUploadVideo = () => {
    setIsUploadDialogOpen(true);
  };

  const handleUploadComplete = (videoId: string) => {
    console.log('Upload completed for video:', videoId);
    setIsUploadDialogOpen(false);
    
    // Show processing message
    toast.success("Your video is processing and will be available to watch in 1-2 minutes", {
      duration: 5000,
    });
    
    // Refresh the uploaded videos section after upload
    queryClient.invalidateQueries({ queryKey: ['creatorUploads', userUuid, uploadsLimit] });
  };

  const handleViewVideos = () => {
    navigate('/creator/videos');
  };

  const handleVideoPlay = (video: any) => {
    navigate(`/video/${video.id}`);
  };

  const handleVideoEdit = (video: any) => {
    navigate(`/creator/videos`);
  };

  const handleVideoDelete = (video: any) => {
    // This will be handled by the UploadedVideoCard component
    console.log('Delete video:', video.id);
  };

  const handleUploadDelete = (uploadId: string, uploadTitle: string) => {
    setDeleteUploadDialog({
      isOpen: true,
      uploadId,
      uploadTitle
    });
  };

  const handleConfirmUploadDelete = () => {
    if (!profile?.wallet_address) return;
    
    deleteUploadMutation.mutate({
      uploadId: deleteUploadDialog.uploadId,
      walletAddress: profile.wallet_address
    });
  };

  const handleAnalyticsClick = () => {
    navigate(`/creator/${userUuid}/analytics`);
  };

  if (isLoadingProfile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-var(--navbar-height))]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (profileError || !profile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center min-h-[calc(100vh-var(--navbar-height))]">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Profile Not Found</h1>
          <p className="text-foreground/70">
            {profileError ? 'There was an error fetching the profile.' : 'The creator profile could not be found or does not exist.'}
          </p>
        </div>
      </Layout>
    );
  }

  const fallbackInitial = profile.display_name?.substring(0, 2)?.toUpperCase() || 'U';
  const isOwner = !!(publicKey && profile.wallet_address === publicKey);
  
  // Social links for display mode (now includes website, Kick and Twitch)
  const socialLinksDisplay = [
    { Icon: Globe, url: profile.website_url, label: 'Website', color: 'text-blue-500 hover:text-blue-400' },
    { Icon: Twitter, url: profile.social_x_url, label: 'X', color: 'text-sky-500 hover:text-sky-400' },
    { Icon: Send, url: profile.social_telegram_url, label: 'Telegram', color: 'text-blue-500 hover:text-blue-400' },
    { Icon: Youtube, url: profile.social_youtube_url, label: 'YouTube', color: 'text-red-600 hover:text-red-500' },
    { Icon: Instagram, url: profile.social_instagram_url, label: 'Instagram', color: 'text-pink-500 hover:text-pink-400' },
    { Icon: Tv, url: profile.social_kick_url, label: 'Kick', color: 'text-green-500 hover:text-green-400' },
    { Icon: Video, url: profile.social_twitch_url, label: 'Twitch', color: 'text-purple-500 hover:text-purple-400' },
  ].filter(link => link.url);

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4 py-8 md:py-12">
        <Card className="max-w-4xl mx-auto shadow-xl overflow-hidden bg-card border border-border">
          {/* Banner Section - Remains outside Form Provider and form tag */}
          <div 
            className="h-48 md:h-64 bg-gradient-to-br from-secondary via-background to-secondary/70 relative group"
          >
             <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-300"></div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Profile Info Overlapping Banner */}
              <div className="relative px-4 sm:px-6 md:px-8">
                <div className="-mt-16 md:-mt-20 flex flex-col items-center text-center">
                  <Avatar className="h-32 w-32 md:h-36 md:w-36 mb-3 border-4 border-background bg-muted shadow-lg">
                    <AvatarImage 
                      src={profile.profile_picture_url || undefined} 
                      alt={profile.display_name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/200x200/101010/FFFFFF?text=${fallbackInitial}`;
                      }}
                    />
                    <AvatarFallback className="text-4xl md:text-5xl bg-muted">
                      {fallbackInitial}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem className="w-full max-w-sm mx-auto my-2">
                          <FormLabel className="sr-only">Display Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="text-3xl md:text-4xl font-bold text-center" placeholder="Display Name"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">{profile.display_name}</h1>
                  )}
                  {isOwner && !isEditing && (
                    <div className="flex gap-2 mt-4 flex-wrap justify-center">
                      <Button onClick={() => navigate('/settings')} variant="outline" size="sm">
                        <Settings size={16} className="mr-2" /> Settings
                      </Button>
                      <Button onClick={handleAnalyticsClick} variant="outline" size="sm">
                        <BarChart3 size={16} className="mr-2" /> Analytics
                      </Button>
                      <Button onClick={handleUploadVideo} variant="default" size="sm">
                        <Upload size={16} className="mr-2" /> Upload Video
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <CardContent className="pt-8 px-4 sm:px-6 md:px-8 pb-8">
                <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                  {/* Left Column / First on mobile */}
                  <div className="md:col-span-1 space-y-4">
                    {isEditing ? (
                      <>
                        <FormField
                          control={form.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center"><User size={18} className="mr-2 text-primary" />Full Name</FormLabel>
                              <FormControl><Input {...field} placeholder="Your full name" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center"><Mail size={18} className="mr-2 text-primary" />Email</FormLabel>
                              <FormControl><Input type="email" {...field} placeholder="your.email@example.com" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="content_categories"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center"><LayoutGrid size={18} className="mr-2 text-primary" />Categories (comma-separated)</FormLabel>
                              <FormControl><Textarea {...field} placeholder="e.g. Gaming, Music, Art" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="language_preference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center"><Languages size={18} className="mr-2 text-primary" />Language</FormLabel>
                              <FormControl><Input {...field} placeholder="e.g. English" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <div>
                          <h3 className="text-lg font-semibold text-foreground/90 mb-2 flex items-center">
                            <LinkIcon size={18} className="mr-2 text-primary" /> Links
                          </h3>
                          <div className="space-y-3">
                            <FormField control={form.control} name="website_url" render={({ field }) => ( <FormItem><FormLabel className="text-sm">Website URL</FormLabel><FormControl><Input {...field} placeholder="https://yourwebsite.com" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="social_x_url" render={({ field }) => ( <FormItem><FormLabel className="text-sm">X (Twitter) URL</FormLabel><FormControl><Input {...field} placeholder="https://twitter.com/yourprofile" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="social_telegram_url" render={({ field }) => ( <FormItem><FormLabel className="text-sm">Telegram URL</FormLabel><FormControl><Input {...field} placeholder="https://t.me/yourprofile" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="social_youtube_url" render={({ field }) => ( <FormItem><FormLabel className="text-sm">YouTube URL</FormLabel><FormControl><Input {...field} placeholder="https://youtube.com/yourchannel" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="social_instagram_url" render={({ field }) => ( <FormItem><FormLabel className="text-sm">Instagram URL</FormLabel><FormControl><Input {...field} placeholder="https://instagram.com/yourprofile" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="social_kick_url" render={({ field }) => ( <FormItem><FormLabel className="text-sm">Kick URL</FormLabel><FormControl><Input {...field} placeholder="https://kick.com/yourprofile" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="social_twitch_url" render={({ field }) => ( <FormItem><FormLabel className="text-sm">Twitch URL</FormLabel><FormControl><Input {...field} placeholder="https://twitch.tv/yourprofile" /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground/90 mb-1.5 flex items-center"><User size={18} className="mr-2 text-primary" />Full Name</h3>
                          {profile.full_name ? <p className="text-foreground/80">{profile.full_name}</p> : <p className="text-foreground/50 italic text-sm">Full name not added</p>}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground/90 mb-1.5 flex items-center"><Mail size={18} className="mr-2 text-primary" />Email</h3>
                          {profile.email ? <p className="text-foreground/80 break-all">{profile.email}</p> : <p className="text-foreground/50 italic text-sm">Email not provided</p>}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground/90 mb-2 flex items-center"><LayoutGrid size={18} className="mr-2 text-primary" />Categories</h3>
                          {profile.content_categories && profile.content_categories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {profile.content_categories.map(category => (
                                <span key={category} className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">{category}</span>
                              ))}
                            </div>
                          ) : <p className="text-foreground/50 italic text-sm">No categories selected</p>}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground/90 mb-1.5 flex items-center"><Languages size={18} className="mr-2 text-primary" />Language</h3>
                          {profile.language_preference ? <p className="text-foreground/80">{profile.language_preference}</p> : <p className="text-foreground/50 italic text-sm">Language not specified</p>}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground/90 mb-2 flex items-center"><LinkIcon size={18} className="mr-2 text-primary" />Links</h3>
                          {socialLinksDisplay.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {socialLinksDisplay.map(social => (
                                <Button key={social.label} variant="outline" size="icon" asChild className="border-border hover:bg-muted/50">
                                  <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.label}><social.Icon size={18} className={social.color} /></a>
                                </Button>
                              ))}
                            </div>
                          ) : <p className="text-sm text-foreground/60 italic">No social links added yet.</p>}
                        </div>
                      </>
                    )}
                    {/* Donate Button (always visible if wallet address exists) */}
                    {!isEditing && (
                        <Button 
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
                            onClick={() => setIsDonationDialogOpen(true)}
                            disabled={!profile.wallet_address} 
                        >
                            <DollarSign size={16} className="mr-2" /> Donate
                        </Button>
                    )}
                     {isEditing && (
                        <div className="flex space-x-2 mt-6">
                            <Button type="submit" className="flex-1" disabled={updateProfileMutation.isPending}>
                            {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                            Save Changes
                            </Button>
                            <Button type="button" variant="outline" className="flex-1" onClick={handleCancelEdit} disabled={updateProfileMutation.isPending}>
                            Cancel
                            </Button>
                        </div>
                    )}
                  </div>

                  {/* Right Column / Second on mobile */}
                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center">
                        <AlignLeft size={20} className="mr-2 text-primary" />
                        About {isEditing ? form.getValues("display_name") || profile.display_name : profile.display_name}
                      </h2>
                      {isEditing ? (
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="sr-only">Bio</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Tell us about yourself..." rows={5} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        profile.bio ? (
                          <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
                        ) : (
                          <p className="text-foreground/50 italic">This creator has not set up a bio yet.</p>
                        )
                      )}
                    </div>

                    {/* Live Stream Section - remains view-only */}
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                        <Radio size={20} className="mr-2 text-primary" />
                        Live Stream
                      </h2>
                      {isLoadingActiveStream && (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      {activeStreamError && (
                        <div className="text-center text-destructive py-4">
                          <p>Could not load live stream status. Please try again later.</p>
                        </div>
                      )}
                      {!isLoadingActiveStream && !activeStreamError && activeStream && (
                        <StreamCard
                          key={activeStream.id}
                          id={activeStream.id} 
                          title={activeStream.title}
                          creator={{
                            id: profile.user_id_uuid || userUuid || "",
                            name: profile.display_name || "Creator",
                            avatar: profile.profile_picture_url || `https://placehold.co/100x100/101010/FFFFFF?text=${fallbackInitial}`,
                            walletAddress: profile.wallet_address 
                          }}
                          thumbnail={activeStream.thumbnail || undefined} 
                          viewerCount={activeStream.viewer_count || 0}
                          isLive={true}
                          category={activeStream.category || undefined}
                        />
                      )}
                      {!isLoadingActiveStream && !activeStreamError && !activeStream && (
                        <p className="text-foreground/60 italic text-center py-4">
                          {profile.display_name} is not live currently.
                        </p>
                      )}
                    </div>
                    
                    {/* Activity Section - remains view-only */}
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                        <Tv size={20} className="mr-2 text-primary" />
                        Activity
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-foreground/70 mb-0.5">Stream Count</p>
                          {isLoadingStreamsCount ? <Loader2 className="h-4 w-4 animate-spin"/> : <p className="font-semibold text-lg text-foreground">{streamsCount ?? 'N/A'}</p>}
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-foreground/70 mb-0.5">Total VODs</p>
                          {isLoadingVodsCount ? <Loader2 className="h-4 w-4 animate-spin"/> : <p className="font-semibold text-lg text-foreground">{vodsCount ?? 'N/A'}</p>}
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg sm:col-span-2">
                          <p className="text-foreground/70 mb-0.5 flex items-center">
                            <CalendarDays size={14} className="mr-1.5 text-foreground/70" />
                            Last Streamed
                          </p>
                          {isLoadingLastStreamedAt && <Loader2 className="h-4 w-4 animate-spin mt-1"/>}
                          {!isLoadingLastStreamedAt && lastStreamedAtError && <p className="font-semibold text-destructive text-sm">Error loading</p>}
                          {!isLoadingLastStreamedAt && !lastStreamedAtError && lastStreamedAt && (
                            <p className="font-semibold text-lg text-foreground">
                              {formatInTimeZone(new Date(lastStreamedAt), 'Etc/UTC', "PPpp")} (UTC)
                            </p>
                          )}
                          {!isLoadingLastStreamedAt && !lastStreamedAtError && !lastStreamedAt && (
                            <p className="font-semibold text-lg text-foreground">Never</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Creator Uploads Section - Now using StreamCard */}
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                        <Upload size={20} className="mr-2 text-primary" />
                        Uploaded Videos
                      </h2>
                      {isLoadingUploads && (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      {uploadsError && (
                        <div className="text-center text-destructive py-4">
                          <p>Could not load uploaded videos. Please try again later.</p>
                        </div>
                      )}
                      {!isLoadingUploads && !uploadsError && uploadedVideos && uploadedVideos.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {uploadedVideos.slice(0, uploadsLimit).map((video) => (
                            <StreamCard
                              key={video.id}
                              id={video.id}
                              title={video.title}
                              creator={{
                                id: profile.user_id_uuid || userUuid || "",
                                name: profile.display_name || "Creator",
                                avatar: profile.profile_picture_url || `https://placehold.co/100x100/101010/FFFFFF?text=${fallbackInitial}`,
                                walletAddress: profile.wallet_address
                              }}
                              thumbnail={video.bunny_thumbnail_url || undefined}
                              viewerCount={0}
                              isLive={false}
                              category={video.category || undefined}
                              language={video.language}
                              isUpload={true}
                              uploadStatus={video.upload_status}
                              showDeleteButton={isOwner}
                              onDelete={handleUploadDelete}
                            />
                          ))}
                        </div>
                      )}
                      {!isLoadingUploads && !uploadsError && (!uploadedVideos || uploadedVideos.length === 0) && (
                         <p className="text-foreground/60 italic text-center py-4">
                          This creator has no uploaded videos yet.
                        </p>
                      )}
                      
                      {uploadedVideos && uploadedVideos.length > uploadsLimit && uploadsLimit !== Infinity && (
                        <div className="mt-6 text-center">
                          <Button onClick={() => setUploadsLimit(Infinity)} variant="outline">
                            View All {uploadedVideos.length} Uploaded Videos
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* VODs Section */}
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                        <Video size={20} className="mr-2 text-primary" />
                        Recent VODs
                      </h2>
                      {isLoadingVods && (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      {vodsError && (
                        <div className="text-center text-destructive py-4">
                          <p>Could not load VODs. Please try again later.</p>
                        </div>
                      )}
                      {!isLoadingVods && !vodsError && vods && vods.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {vods.map((vod) => (
                            <VodCard
                              key={vod.id} 
                              id={vod.id}
                              playbackId={vod.mux_playback_id}
                              title={vod.title}
                              creator={{
                                id: profile.user_id_uuid || userUuid || "", 
                                name: profile.display_name || "Creator",
                                avatar: profile.profile_picture_url || `https://placehold.co/100x100/101010/FFFFFF?text=${fallbackInitial}`,
                                walletAddress: profile.wallet_address 
                              }}
                              thumbnail={vod.thumbnail_url || undefined}
                              category={vod.streams?.category || undefined}
                              showDeleteButton={isOwner}
                              onVodDeleted={handleVodDeleted}
                            />
                          ))}
                        </div>
                      )}
                      {!isLoadingVods && !vodsError && (!vods || vods.length === 0) && (
                         <p className="text-foreground/60 italic text-center py-4">
                          This creator has no VODs yet.
                        </p>
                      )}
                      
                      {!isLoadingVodsCount && !vodsCountError && vodsCount && vodsCount > vodsLimit && vodsLimit !== Infinity && (
                        <div className="mt-6 text-center">
                          <Button onClick={() => setVodsLimit(Infinity)} variant="outline">
                            View All {vodsCount} VODs
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </form>
          </Form>
        </Card>
      </div>
      {profile && profile.wallet_address && profile.display_name && (
        <CreatorProfileDonationDialog
          isOpen={isDonationDialogOpen}
          onOpenChange={setIsDonationDialogOpen}
          creatorWalletAddress={profile.wallet_address}
          creatorDisplayName={profile.display_name}
        />
      )}
      <DeleteUploadDialog
        isOpen={deleteUploadDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteUploadDialog({ isOpen: false, uploadId: '', uploadTitle: '' })}
        onConfirm={handleConfirmUploadDelete}
        isDeleting={deleteUploadMutation.isPending}
        uploadTitle={deleteUploadDialog.uploadTitle}
      />
      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Your Video</DialogTitle>
            <DialogDescription>
              Share your content with the world using Bunny Stream
            </DialogDescription>
          </DialogHeader>
          <VideoUploadForm onUploadComplete={handleUploadComplete} />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CreatorPublicProfilePage;
