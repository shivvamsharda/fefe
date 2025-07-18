
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createCreatorProfile, uploadProfilePicture, CreatorProfileData } from '@/services/creatorProfileService';
import { Camera, Loader2, Twitter, Youtube, Instagram, Send, DollarSign, Tv, Video, Globe } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const urlValidation = z.string().url({ message: "Please enter a valid URL (e.g., https://example.com)" }).max(200, "URL must be 200 characters or less").optional().or(z.literal(''));

const creatorProfileSchema = z.object({
  displayName: z.string().min(3, "Display name must be at least 3 characters").max(50, "Display name must be 50 characters or less"),
  fullName: z.string().max(100, "Full name must be 100 characters or less").optional().or(z.literal('')),
  email: z.string().email("Invalid email address").max(100, "Email must be 100 characters or less").optional().or(z.literal('')),
  bio: z.string().max(200, "Bio must be 200 characters or less").optional().or(z.literal('')),
  contentCategories: z.array(z.string()).optional(),
  languagePreference: z.string().optional().or(z.literal('')),
  profilePicture: z.custom<FileList>().optional()
    .refine(files => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE_BYTES, `Max file size is ${MAX_FILE_SIZE_MB}MB.`)
    .refine(files => !files || files.length === 0 || ALLOWED_IMAGE_TYPES.includes(files[0].type), "Only .jpg, .jpeg, .png, .gif, .webp formats are supported."),
  websiteUrl: urlValidation,
  socialXUrl: urlValidation,
  socialTelegramUrl: urlValidation,
  socialYoutubeUrl: urlValidation,
  socialInstagramUrl: urlValidation,
  socialKickUrl: urlValidation,
  socialTwitchUrl: urlValidation,
  subscription_enabled: z.boolean().default(false).optional(),
  subscription_price_sol: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : parseFloat(String(val))),
    z.number({ invalid_type_error: "Price must be a number" })
      .positive({ message: "Price must be greater than 0" })
      .optional()
  ),
}).refine(data => {
  if (data.subscription_enabled && (data.subscription_price_sol === undefined || data.subscription_price_sol === null || data.subscription_price_sol <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Subscription price must be set and greater than 0 if subscriptions are enabled.",
  path: ["subscription_price_sol"],
});

type CreatorProfileFormValues = z.infer<typeof creatorProfileSchema>;

const CreatorSetupPage = () => {
  const navigate = useNavigate();
  const { hasWalletCapability, effectiveWalletAddress, refreshCreatorProfileStatus } = useWallet();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);

  const contentCategories = [
    { id: 'gaming', label: t('creator_setup.category_gaming') },
    { id: 'education', label: t('creator_setup.category_education') },
    { id: 'crypto', label: t('creator_setup.category_crypto') },
    { id: 'nfts', label: t('creator_setup.category_nfts') },
    { id: 'development', label: t('creator_setup.category_development') },
    { id: 'art_music', label: t('creator_setup.category_art_music') },
    { id: 'lifestyle', label: t('creator_setup.category_lifestyle') },
    { id: 'nsfw', label: t('creator_setup.category_nsfw') },
    { id: 'other', label: t('creator_setup.category_other') },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español (Spanish)' },
    { value: 'fr', label: 'Français (French)' },
    { value: 'de', label: 'Deutsch (German)' },
    { value: 'ja', label: '日本語 (Japanese)' },
    { value: 'ko', label: '한국어 (Korean)' },
    { value: 'zh', label: '中文 (Chinese)' },
  ];

  const form = useForm<CreatorProfileFormValues>({
    resolver: zodResolver(creatorProfileSchema),
    defaultValues: {
      displayName: '',
      fullName: '',
      email: '',
      bio: '',
      contentCategories: [],
      languagePreference: 'en',
      profilePicture: undefined,
      websiteUrl: '',
      socialXUrl: '',
      socialTelegramUrl: '',
      socialYoutubeUrl: '',
      socialInstagramUrl: '',
      socialKickUrl: '',
      socialTwitchUrl: '',
      subscription_enabled: false,
      subscription_price_sol: undefined,
    },
  });

  const subscriptionEnabled = form.watch("subscription_enabled");

  useEffect(() => {
    if (!hasWalletCapability || !effectiveWalletAddress) {
      toast.error(t('creator_setup.wallet_not_connected'));
      navigate('/create');
    }
  }, [hasWalletCapability, effectiveWalletAddress, navigate, t]);

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        form.setError("profilePicture", { type: "manual", message: `Max file size is ${MAX_FILE_SIZE_MB}MB.` });
        setProfilePicPreview(null);
        return;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        form.setError("profilePicture", { type: "manual", message: "Invalid file type." });
        setProfilePicPreview(null);
        return;
      }
      form.clearErrors("profilePicture");
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("profilePicture", event.target.files);
    } else {
      setProfilePicPreview(null);
      form.setValue("profilePicture", undefined);
    }
  };

  const onSubmit = async (values: CreatorProfileFormValues) => {
    if (!effectiveWalletAddress) {
      toast.error(t('creator_setup.wallet_missing_error'));
      return;
    }
    setIsSubmitting(true);

    let profilePictureUrl: string | null | undefined = undefined;
    if (values.profilePicture && values.profilePicture.length > 0) {
      try {
        profilePictureUrl = await uploadProfilePicture(effectiveWalletAddress, values.profilePicture[0]);
        if (!profilePictureUrl) {
          toast.error('Failed to upload profile picture, but proceeding with profile creation');
        }
      } catch (error) {
        console.error('Profile picture upload failed:', error);
        toast.error('Failed to upload profile picture, but proceeding with profile creation');
        profilePictureUrl = null;
      }
    }

    const profileData: CreatorProfileData = {
      wallet_address: effectiveWalletAddress,
      display_name: values.displayName,
      full_name: values.fullName || null,
      email: values.email || null,
      bio: values.bio || null,
      content_categories: values.contentCategories || null,
      language_preference: values.languagePreference || null,
      profile_picture_url: profilePictureUrl || null,
      website_url: values.websiteUrl || null,
      social_x_url: values.socialXUrl || null,
      social_telegram_url: values.socialTelegramUrl || null,
      social_youtube_url: values.socialYoutubeUrl || null,
      social_instagram_url: values.socialInstagramUrl || null,
      social_kick_url: values.socialKickUrl || null,
      social_twitch_url: values.socialTwitchUrl || null,
      subscription_enabled: values.subscription_enabled || false,
      subscription_price_sol: values.subscription_enabled ? values.subscription_price_sol || null : null,
    };

    const newProfile = await createCreatorProfile(profileData);

    setIsSubmitting(false);
    if (newProfile) {
      // Fetch user_id_uuid from user_profiles table using the effectiveWalletAddress
      const { data: userProfile, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('wallet_address', effectiveWalletAddress) // effectiveWalletAddress is the wallet_address of the current user
        .single();

      if (userProfileError || !userProfile) {
        console.error("Error fetching user UUID for navigation after profile creation:", userProfileError);
        toast.error("Profile created successfully!", {
          description: "However, we couldn't redirect you automatically. Please find your profile in the explore section or try logging out and back in.",
        });
        navigate('/explore-creators'); // Redirect to a safe page
        return;
      }

      const userUuid = userProfile.id;
      
      // Refresh creator profile status in context
      await refreshCreatorProfileStatus();
      
      toast.success("You're now a Creator on Wenlive!");
      navigate(`/creator/${userUuid}`); // Redirect to new public profile page with UUID
    } else {
      toast.error('Failed to create creator profile. Please try again.');
    }
  };
  
  if (!hasWalletCapability || !effectiveWalletAddress) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-xl text-white">{t('creator_setup.wallet_not_connected')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <Card className="w-full max-w-2xl bg-secondary border-white/10">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-white">{t('creator_setup.title')}</CardTitle>
            <CardDescription className="text-white/70">
              {t('creator_setup.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="profilePicture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">{t('creator_setup.profile_picture')}</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-24 rounded-full bg-popover border border-border flex items-center justify-center overflow-hidden">
                            {profilePicPreview ? (
                              <img src={profilePicPreview} alt="Profile preview" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-10 h-10 text-muted-foreground" />
                            )}
                          </div>
                          <Input
                            type="file"
                            accept={ALLOWED_IMAGE_TYPES.join(',')}
                            onChange={handleProfilePictureChange}
                            className="text-white file:text-solana file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-solana/10 hover:file:bg-solana/20"
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-white/50">
                        {t('creator_setup.profile_picture_description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">{t('creator_setup.display_name_required')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('creator_setup.display_name_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel className="text-white">{t('creator_setup.wallet_address')}</FormLabel>
                  <Input type="text" value={effectiveWalletAddress || ''} readOnly className="bg-popover text-white/70 border-white/20 cursor-not-allowed" />
                  <FormDescription className="text-white/50">
                    {t('creator_setup.wallet_address_description')}
                  </FormDescription>
                </FormItem>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">{t('creator_setup.full_name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('creator_setup.full_name_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">{t('creator_setup.email')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t('creator_setup.email_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                       <FormDescription className="text-white/50">
                        {t('creator_setup.email_description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">{t('creator_setup.bio')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('creator_setup.bio_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana min-h-[100px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center"><Globe size={16} className="mr-2 text-blue-500" /> {t('creator_setup.website_url')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('creator_setup.website_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialXUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center"><Twitter size={16} className="mr-2 text-sky-500" /> {t('creator_setup.social_x')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('creator_setup.social_x_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialTelegramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center"><Send size={16} className="mr-2 text-blue-500" /> {t('creator_setup.social_telegram')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('creator_setup.social_telegram_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialYoutubeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center"><Youtube size={16} className="mr-2 text-red-600" /> {t('creator_setup.social_youtube')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('creator_setup.social_youtube_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialInstagramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center"><Instagram size={16} className="mr-2 text-pink-500" /> {t('creator_setup.social_instagram')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('creator_setup.social_instagram_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialKickUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center"><Tv size={16} className="mr-2 text-green-500" /> {t('creator_setup.social_kick')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('creator_setup.social_kick_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialTwitchUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white flex items-center"><Video size={16} className="mr-2 text-purple-500" /> {t('creator_setup.social_twitch')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('creator_setup.social_twitch_placeholder')} {...field} className="bg-background text-white border-white/20 focus:border-solana" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contentCategories"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-white">{t('creator_setup.content_categories')}</FormLabel>
                       <FormDescription className="text-white/50 pb-2">{t('creator_setup.content_categories_description')}</FormDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {contentCategories.map((category) => (
                          <FormField
                            key={category.id}
                            control={form.control}
                            name="contentCategories"
                            render={({ field }) => {
                              return (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 rounded-md border border-white/10 bg-background">
                                  <FormControl>
                                    <Checkbox
                                      className="border-white/30 data-[state=checked]:bg-solana data-[state=checked]:border-solana"
                                      checked={field.value?.includes(category.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), category.id])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== category.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-white">
                                    {category.label}
                                    {category.id === 'nsfw' && <span className="text-xs text-amber-400 ml-1">{t('creator_setup.category_nsfw_note')}</span>}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="languagePreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">{t('creator_setup.language_preference')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background text-white border-white/20 focus:border-solana">
                            <SelectValue placeholder={t('creator_setup.language_placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover text-white border-white/20">
                          {languageOptions.map(lang => (
                            <SelectItem key={lang.value} value={lang.value} className="hover:bg-solana/20 focus:bg-solana/20">
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2 p-4 border border-white/10 rounded-md bg-background/30">
                  <h3 className="text-lg font-semibold text-white">{t('creator_setup.monetization_settings')}</h3>
                  <FormField
                    control={form.control}
                    name="subscription_enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-transparent p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-white">{t('creator_setup.subscription_enabled')}</FormLabel>
                          <FormDescription className="text-white/50">
                            {t('creator_setup.subscription_description')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-solana"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {subscriptionEnabled && (
                    <FormField
                      control={form.control}
                      name="subscription_price_sol"
                      render={({ field }) => (
                        <FormItem className="pt-2">
                          <FormLabel className="text-white">{t('creator_setup.subscription_price')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                              <Input
                                type="number"
                                placeholder={t('creator_setup.subscription_price_placeholder')}
                                {...field}
                                onChange={event => field.onChange(event.target.value === '' ? undefined : parseFloat(event.target.value))}
                                value={field.value === undefined ? '' : field.value}
                                className="bg-background text-white border-white/20 focus:border-solana pl-8"
                                step="0.01"
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-white/50">
                            {t('creator_setup.subscription_price_description')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <CardFooter className="p-0 pt-6">
                  <Button type="submit" size="lg" className="w-full bg-solana hover:bg-solana/90 text-white" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isSubmitting ? t('creator_setup.submit_button_saving') : t('creator_setup.submit_button')}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CreatorSetupPage;
