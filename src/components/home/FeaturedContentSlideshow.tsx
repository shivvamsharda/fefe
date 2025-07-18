import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HeroBanner from './HeroBanner';

type HeroContentItem = {
  id: string;
  title: string;
  creator: {
    id?: string;
    name: string;
    avatar: string;
    walletAddress?: string;
  };
  thumbnail: string;
  viewerCount?: number;
  isLive: boolean;
  isSpace?: boolean;
  category?: string;
  playbackUrl?: string;
  muxPlaybackId?: string;
  isPromoted?: boolean;
  embedUrl?: string;
  platform?: string;
};

interface FeaturedContentSlideshowProps {
  content: HeroContentItem[];
}

const FeaturedContentSlideshow: React.FC<FeaturedContentSlideshowProps> = ({ content }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);

  // Auto-scroll functionality for single banner display
  useEffect(() => {
    if (isAutoScrollPaused || content.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex >= content.length - 1 ? 0 : prevIndex + 1
      );
    }, 6000); // Change slide every 6 seconds

    return () => clearInterval(interval);
  }, [isAutoScrollPaused, content.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex <= 0 ? content.length - 1 : prevIndex - 1
    );
  }, [content.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex >= content.length - 1 ? 0 : prevIndex + 1
    );
  }, [content.length]);

  const canShowNavigation = content.length > 1;

  // If no content, don't render anything
  if (!content || content.length === 0) {
    return null;
  }

  // Get current banner
  const currentBanner = content[currentIndex];

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setIsAutoScrollPaused(true)}
      onMouseLeave={() => setIsAutoScrollPaused(false)}
    >
      {/* Navigation Arrows */}
      {canShowNavigation && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105 backdrop-blur-sm"
            aria-label="Previous banner"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105 backdrop-blur-sm"
            aria-label="Next banner"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Banner Container */}
      <div className="w-full">
        {currentBanner && (
          <HeroBanner
            id={currentBanner.id}
            title={currentBanner.title}
            creator={currentBanner.creator}
            thumbnail={currentBanner.thumbnail}
            viewerCount={currentBanner.viewerCount}
            isLive={currentBanner.isLive}
            isSpace={currentBanner.isSpace}
            category={currentBanner.category}
            playbackUrl={currentBanner.playbackUrl}
            muxPlaybackId={currentBanner.muxPlaybackId}
            isPromoted={currentBanner.isPromoted}
            embedUrl={currentBanner.embedUrl}
            platform={currentBanner.platform}
          />
        )}
      </div>

      {/* Slide Indicators */}
      {content.length > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {content.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                currentIndex === index ? 'bg-primary' : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedContentSlideshow;