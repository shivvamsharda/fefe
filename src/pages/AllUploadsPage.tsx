
import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import UploadedVideoCard from '../components/video/UploadedVideoCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Upload, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getUploadedVideosWithCreators } from '@/services/uploadedVideoService';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

const AllUploadsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const {
    data: uploadedVideos,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['allUploadedVideos'],
    queryFn: () => getUploadedVideosWithCreators(50), // Fetch more videos for browse page
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider stale after 4 minutes
  });

  const handleVideoPlay = (video: any) => {
    navigate(`/video/${video.id}`);
  };

  // Filter and sort videos
  const filteredAndSortedVideos = React.useMemo(() => {
    if (!uploadedVideos) return [];

    let filtered = uploadedVideos.filter(video => {
      const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          video.creator?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || video.category === categoryFilter;
      
      return matchesSearch && matchesCategory && video.upload_status === 'ready';
    });

    // Sort videos
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return filtered;
  }, [uploadedVideos, searchTerm, categoryFilter, sortBy]);

  // Get unique categories for filter
  const categories = React.useMemo(() => {
    if (!uploadedVideos) return [];
    const uniqueCategories = [...new Set(uploadedVideos.map(video => video.category).filter(Boolean))];
    return uniqueCategories;
  }, [uploadedVideos]);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Upload size={32} className="text-primary" />
            <h1 className="text-3xl font-bold text-foreground">All Uploaded Videos</h1>
          </div>
          <p className="text-foreground/70">Browse all uploaded videos from creators on WenLive</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Search videos, creators, descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter size={16} className="mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count and refresh */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground/70">
              {filteredAndSortedVideos.length} videos found
              {searchTerm && ` for "${searchTerm}"`}
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Loader2 size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="text-center py-16 bg-destructive/10 rounded-2xl border border-destructive/30">
            <Upload size={48} className="mx-auto mb-4 text-destructive/50" />
            <p className="text-foreground/70 mb-4">Failed to load uploaded videos</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16">
            <Loader2 size={48} className="mx-auto mb-4 animate-spin text-primary" />
            <p className="text-foreground/70">Loading uploaded videos...</p>
          </div>
        ) : filteredAndSortedVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredAndSortedVideos.map((video) => (
              <UploadedVideoCard
                key={video.id}
                video={video}
                onPlay={handleVideoPlay}
                showCreator={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card/50 rounded-2xl border border-border">
            <Upload size={48} className="mx-auto mb-4 text-foreground/20" />
            <p className="text-foreground/70 mb-4">
              {searchTerm || categoryFilter !== 'all' 
                ? 'No videos match your search criteria' 
                : 'No uploaded videos available yet'}
            </p>
            {(searchTerm || categoryFilter !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AllUploadsPage;
