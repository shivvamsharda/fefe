import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ShieldAlert, Loader2, ExternalLink, Rocket, TrendingUp, Cat, type LucideProps, Languages, Wallet as WalletIcon, Monitor, Camera } from 'lucide-react';
import { createStream } from '@/services/streamService';
import { supabase } from '@/integrations/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define types for token platforms
type ImagePlatform = {
  name: string;
  url: string;
  iconType: "image";
  iconName: string;
};

type LucidePlatform = {
  name:string;
  url: string;
  iconType: "lucide";
  IconComponent: React.FC<LucideProps>;
};

type TokenPlatformConfig = ImagePlatform | LucidePlatform;

const CreateStream = () => {
  const { hasWalletCapability, effectiveWalletAddress, openWalletModal } = useWallet();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [streamMethod, setStreamMethod] = useState<'browser' | 'livekit-obs'>('browser');

  const formSchema = z.object({
    title: z.string().min(5, t('create_stream.title_min_error')).max(100, t('create_stream.title_max_error')),
    description: z.string().min(10, t('create_stream.description_min_error')).max(500, t('create_stream.description_max_error')),
    category: z.string().min(1, t('create_stream.category_required')),
    language: z.string().min(1, t('create_stream.language_required')),
    tags: z.string().optional(),
    isLaunchingToken: z.boolean().optional(),
    tokenContractAddress: z.string().optional().refine(val => {
      if (val && val.length > 0) {
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val) || t('create_stream.invalid_contract_address');
      }
      return true;
    }, { message: t('create_stream.invalid_contract_address') }),
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "memecoins", 
      language: "en",
      tags: "",
      isLaunchingToken: false,
      tokenContractAddress: "",
    },
  });

  const isLaunchingToken = form.watch("isLaunchingToken");

  const categoryOptions = [
    { label: t('create_stream.category_memecoins'), value: "memecoins" },
    { label: t('create_stream.category_gaming'), value: "gaming" },
    { label: t('create_stream.category_dev'), value: "dev" },
    { label: t('create_stream.category_trading'), value: "trading" },
    { label: t('create_stream.category_education'), value: "education" },
    { label: t('create_stream.category_nsfw'), value: "nsfw" },
  ];

  const languageOptions = [
    { label: t('create_stream.language_english'), value: "en" },
    { label: t('create_stream.language_spanish'), value: "es" },
    { label: t('create_stream.language_french'), value: "fr" },
    { label: t('create_stream.language_german'), value: "de" },
    { label: t('create_stream.language_portuguese'), value: "pt" },
    { label: t('create_stream.language_russian'), value: "ru" },
    { label: t('create_stream.language_japanese'), value: "ja" },
    { label: t('create_stream.language_korean'), value: "ko" },
    { label: t('create_stream.language_chinese_simplified'), value: "zh-CN" },
    { label: t('create_stream.language_chinese_traditional'), value: "zh-TW" },
    { label: t('create_stream.language_hindi'), value: "hi" },
    { label: t('create_stream.language_arabic'), value: "ar" },
    { label: t('create_stream.language_other'), value: "other" },
  ];


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!hasWalletCapability || !effectiveWalletAddress) {
      toast({
        title: t('create_stream.wallet_error'),
        description: t('create_stream.wallet_connect_first'),
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('wallet_address', effectiveWalletAddress)
        .single();
      
      if (!userProfile?.id) {
        toast({
          title: t('create_stream.profile_error'),
          description: t('create_stream.profile_not_found'),
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }

      const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()) : [];

      if (streamMethod === 'livekit-obs') {
        // Import the LiveKit service
        const { createLiveKitOBSStream } = await import('@/services/livekitOBSService');
        
        // Create the LiveKit OBS stream directly
        const streamData = {
          title: values.title,
          description: values.description,
          category: values.category,
          language: values.language,
          tags: tagsArray,
          walletAddress: effectiveWalletAddress,
          tokenContractAddress: values.isLaunchingToken ? values.tokenContractAddress : undefined,
        };

        const response = await createLiveKitOBSStream(streamData);
        
        // Store the created stream data in sessionStorage
        sessionStorage.setItem('livekitStreamData', JSON.stringify(response));
        
        toast({
          title: 'LiveKit OBS Stream Created',
          description: 'Your stream is ready! Configure OBS with the provided credentials.',
        });
        navigate(`/create/stream/obs-v2`);
      } else {
        // For browser streaming, pass the form data to the browser streaming page
        const streamData = {
          title: values.title,
          description: values.description,
          category: values.category,
          tags: tagsArray,
          language: values.language,
          isLaunchingToken: values.isLaunchingToken,
          tokenContractAddress: values.tokenContractAddress,
          userId: userProfile.id
        };
        
        // Store stream data in sessionStorage to pass to browser streaming page
        sessionStorage.setItem('pendingStreamData', JSON.stringify(streamData));
        
        toast({
          title: t('create_stream.setup_ready_title'),
          description: t('create_stream.setup_ready_description'),
        });
        navigate(`/create/stream/browser`);
      }
    } catch (error: any) {
      console.error("Error creating stream:", error);
      toast({
        title: t('create_stream.creation_failed'),
        description: error.message || t('create_stream.creation_error'),
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto bg-secondary border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold text-white">{t('create_stream.title')}</CardTitle>
            <Languages size={28} className="text-solana" />
          </CardHeader>
          <CardContent>
            {hasWalletCapability ? (
              <>
                <div className="bg-secondary/50 p-4 rounded-md border border-solana/20 mb-6">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="text-solana" />
                    <h3 className="text-white font-medium">{t('create_stream.content_policy_title')}</h3>
                  </div>
                  <p className="text-white/70 text-sm mt-2">
                    {t('create_stream.content_policy_text')}
                  </p>
                </div>

                {/* Streaming Method Selection */}
                <div className="mb-6 space-y-4">
                  <Label className="text-white font-medium">{t('create_stream.streaming_method')}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        streamMethod === 'browser' 
                          ? 'border-solana bg-solana/10' 
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      onClick={() => setStreamMethod('browser')}
                    >
                      <div className="flex items-center gap-3">
                        <Camera size={24} className="text-solana" />
                        <div>
                          <h4 className="text-white font-medium">{t('create_stream.browser_streaming')}</h4>
                          <p className="text-white/70 text-sm">{t('create_stream.browser_streaming_description')}</p>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        streamMethod === 'livekit-obs' 
                          ? 'border-solana bg-solana/10' 
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      onClick={() => setStreamMethod('livekit-obs')}
                    >
                      <div className="flex items-center gap-3">
                        <Monitor size={24} className="text-primary" />
                        <div>
                          <h4 className="text-white font-medium">V2 Low Latency OBS/RTMP</h4>
                          <p className="text-white/70 text-sm">Next-gen OBS streaming</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">{t('create_stream.stream_title')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('create_stream.stream_title_placeholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">{t('create_stream.description')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={t('create_stream.description_placeholder')} 
                              className="min-h-[100px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">{t('create_stream.category')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full bg-secondary border-white/10 text-white">
                                  <SelectValue placeholder={t('create_stream.category_placeholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-secondary border-white/10 text-white">
                                {categoryOptions.map(option => (
                                  <SelectItem 
                                    key={option.value} 
                                    value={option.value}
                                    className="hover:bg-solana/20 focus:bg-solana/30"
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">{t('create_stream.language')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full bg-secondary border-white/10 text-white">
                                  <SelectValue placeholder={t('create_stream.language_placeholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-secondary border-white/10 text-white max-h-60 overflow-y-auto">
                                {languageOptions.map(option => (
                                  <SelectItem 
                                    key={option.value} 
                                    value={option.value}
                                    className="hover:bg-solana/20 focus:bg-solana/30"
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">{t('create_stream.tags')}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t('create_stream.tags_placeholder')} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isLaunchingToken"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border border-white/10 p-4 bg-secondary/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              id="isLaunchingToken"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <Label htmlFor="isLaunchingToken" className="text-white font-medium cursor-pointer">
                              {t('create_stream.launching_token')}
                            </Label>
                            <p className="text-xs text-white/70">
                              {t('create_stream.launching_token_description')}
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                     {isLaunchingToken && (
                      <div className="space-y-4 p-4 border border-solana/30 rounded-md bg-secondary/20">
                        <FormField
                          control={form.control}
                          name="tokenContractAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Token Contract Address (CA)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Eg. 7sM9...Do5n8 (Solana Address)" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-solana hover:bg-solana/90 text-primary-foreground"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('create_stream.creating_setup')}
                        </>
                      ) : (
                        <>
                          {streamMethod === 'livekit-obs' ? 'Create LiveKit OBS Setup' : t('create_stream.create_browser_button')}
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-white mb-4">{t('create_stream.wallet_connect_first')}</p>
                <Button 
                  className="bg-solana hover:bg-solana/90 text-primary-foreground"
                  onClick={openWalletModal}
                >
                  <WalletIcon size={16} className="mr-2" /> 
                  {t('create_stream.connect_wallet')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CreateStream;
