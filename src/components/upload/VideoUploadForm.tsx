import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileVideo, X, ImageIcon, Wallet } from "lucide-react";
import { toast } from "sonner";
import { uploadToBunnyStream } from "@/services/bunnyStreamService";
import { useWallet } from "@/context/WalletContext";

interface VideoUploadFormProps {
  onUploadComplete?: (videoId: string) => void;
}

const VideoUploadForm: React.FC<VideoUploadFormProps> = ({ onUploadComplete }) => {
  const { hasWalletCapability, openWalletModal } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Please select a valid video file (MP4, WebM, MOV, or AVI)");
      return;
    }

    // Validate file size (4GB limit)
    const maxSize = 4 * 1024 * 1024 * 1024; // 4GB in bytes
    if (selectedFile.size > maxSize) {
      toast.error("File size must be less than 4GB");
      return;
    }

    setFile(selectedFile);
    
    // Auto-fill title from filename if not set
    if (!title) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (selectedFile.size > maxSize) {
      toast.error("Thumbnail size must be less than 10MB");
      return;
    }

    setThumbnail(selectedFile);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setThumbnailPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!hasWalletCapability) {
      toast.error("Please connect your wallet to upload videos");
      return;
    }

    if (!file || !title.trim()) {
      toast.error("Please select a file and enter a title");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      console.log('Starting upload process...');
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const videoId = await uploadToBunnyStream(file, {
        title,
        description,
        category,
        language,
        visibility: 'public', // Always set to public
        tags: [], // Could be extended later
        thumbnail
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (videoId) {
        toast.success("Video uploaded successfully! Processing...");
        
        // Reset form
        setFile(null);
        setThumbnail(null);
        setThumbnailPreview(null);
        setTitle('');
        setDescription('');
        setCategory('');
        setLanguage('');
        
        if (onUploadComplete) {
          onUploadComplete(videoId);
        }
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadProgress(0);
  };

  const removeThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="h-5 w-5" />
          Upload Video
        </CardTitle>
        <CardDescription>
          Upload your video to Bunny Stream. Supported formats: MP4, WebM, MOV, AVI (max 4GB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Connection Check */}
        {!hasWalletCapability && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Wallet Required</p>
                <p className="text-sm text-amber-700">Connect your wallet to upload videos</p>
                <Button 
                  onClick={openWalletModal} 
                  size="sm" 
                  className="mt-2 bg-amber-600 hover:bg-amber-700"
                >
                  Connect Wallet
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Video File Upload */}
        <div className="space-y-2">
          <Label htmlFor="video-file">Video File</Label>
          {!file ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                id="video-file"
                type="file"
                accept="video/mp4,video/webm,video/mov,video/avi"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="video-file"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-12 w-12 text-gray-400" />
                <span className="text-lg font-medium">Choose video file</span>
                <span className="text-sm text-gray-500">MP4, WebM, MOV, or AVI, up to 4GB</span>
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileVideo className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Thumbnail Upload */}
        <div className="space-y-2">
          <Label htmlFor="thumbnail-file">Custom Thumbnail (Optional)</Label>
          {!thumbnail ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                id="thumbnail-file"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleThumbnailSelect}
                className="hidden"
              />
              <label
                htmlFor="thumbnail-file"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium">Choose thumbnail image</span>
                <span className="text-xs text-gray-500">JPEG, PNG, or WebP, up to 10MB</span>
              </label>
            </div>
          ) : (
            <div className="relative">
              <div className="aspect-video w-full max-w-xs mx-auto rounded-lg overflow-hidden">
                <img
                  src={thumbnailPreview!}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeThumbnail}
                disabled={uploading}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Video Metadata */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description"
              rows={3}
              disabled={uploading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="memecoins">Memecoins</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="dev">Development</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="nsfw">MISC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!hasWalletCapability || !file || !title.trim() || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? "Uploading..." : "Upload Video"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default VideoUploadForm;
