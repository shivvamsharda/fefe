import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { useWallet } from '@/context/WalletContext';
import { uploadPromotedStreamThumbnail } from '@/services/thumbnailUploadService';
import type { StreamPromotionData } from '@/pages/PromoteStreamPage';

const streamCategories = [
  'memecoins',
  'gaming', 
  'dev',
  'trading',
  'education',
  'nsfw'
];

const streamFormSchema = z.object({
  streamUrl: z.string().url('Please enter a valid stream URL'),
  streamTitle: z.string().min(1, 'Stream title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  category: z.string().min(1, 'Please select a category'),
  tags: z.string().optional()
});

interface PromoteStreamFormProps {
  onSubmit: (data: StreamPromotionData) => void;
  onBack: () => void;
}

// Platform logos component
const SupportedPlatforms = () => {
  const platforms = [
    { name: 'Twitch', color: '#9146FF', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    { name: 'Kick', color: '#53FC18', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    { name: 'YouTube', color: '#FF0000', bgColor: 'bg-red-100', textColor: 'text-red-700' }
  ];

  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-foreground mb-3">Supported platforms:</p>
      <div className="flex gap-3 flex-wrap">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className={`${platform.bgColor} ${platform.textColor} px-3 py-2 rounded-lg text-sm font-medium transition-transform hover:scale-105 cursor-default`}
          >
            {platform.name}
          </div>
        ))}
      </div>
    </div>
  );
};

const PromoteStreamForm: React.FC<PromoteStreamFormProps> = ({ onSubmit, onBack }) => {
  const { walletAddress } = useWallet();
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof streamFormSchema>>({
    resolver: zodResolver(streamFormSchema),
    defaultValues: {
      streamUrl: '',
      streamTitle: '',
      description: '',
      category: '',
      tags: ''
    }
  });

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview('');
  };

  const handleFormSubmit = async (values: z.infer<typeof streamFormSchema>) => {
    if (!thumbnailFile) {
      toast.error('Please upload a thumbnail image');
      return;
    }

    if (!walletAddress) {
      toast.error('Wallet not connected');
      return;
    }

    setIsUploading(true);
    try {
      const thumbnailUrl = await uploadPromotedStreamThumbnail(thumbnailFile, walletAddress);
      
      const tags = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      
      const streamData: StreamPromotionData = {
        streamUrl: values.streamUrl,
        streamTitle: values.streamTitle,
        description: values.description,
        thumbnailUrl,
        category: values.category,
        tags
      };

      onSubmit(streamData);
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast.error('Failed to upload thumbnail. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Promote Your Stream</h1>
          <p className="text-foreground/70 mt-1">Fill in your stream details to get started</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="streamUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stream URL *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://twitch.tv/yourstream or https://kick.com/yourstream" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SupportedPlatforms />

          <FormField
            control={form.control}
            name="streamTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stream Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your stream title" {...field} />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Tell viewers what your stream is about..."
                    rows={3}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Thumbnail Image *
            </label>
            {!thumbnailPreview ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground/70 mb-2">Upload a thumbnail for your stream</p>
                <p className="text-sm text-foreground/50 mb-4">JPG, PNG, WebP, GIF up to 5MB</p>
                <Button type="button" variant="outline" asChild>
                  <label className="cursor-pointer">
                    Choose File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                  </label>
                </Button>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeThumbnail}
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {streamCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category === 'dev' ? 'Dev' : 
                         category === 'nsfw' ? 'NSFW' :
                         category.charAt(0).toUpperCase() + category.slice(1)}
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
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="gaming, crypto, educational (comma separated)" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isUploading}
          >
            {isUploading ? 'Uploading thumbnail...' : 'Continue to Placement Selection'}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default PromoteStreamForm;
