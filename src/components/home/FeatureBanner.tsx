
import React, { useEffect, useState } from 'react';
import { Monitor, Video, Users, Coins, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import type { CarouselApi } from '@/components/ui/carousel';

const FeatureBanner = () => {
  const { t } = useLanguage();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const features = [
    {
      icon: Monitor,
      title: "Professional OBS Streaming",
      subtitle: "Stream with full control using OBS Studio integration",
      ctaText: "Start OBS Stream",
      ctaLink: "/create/stream"
    },
    {
      icon: Video,
      title: "Browser Streaming",
      subtitle: "Go live instantly without any software installation",
      ctaText: "Stream in Browser",
      ctaLink: "/create/stream"
    },
    {
      icon: Users,
      title: "Interactive Spaces",
      subtitle: "Multi-user meeting rooms with live video interaction",
      ctaText: "Create Space",
      ctaLink: "/spaces"
    },
    {
      icon: Coins,
      title: "Creator Economy",
      subtitle: "Earn SOL through subscriptions, tips, and donations",
      ctaText: "Become Creator",
      ctaLink: "/create"
    },
    {
      icon: MessageCircle,
      title: "Live Interaction",
      subtitle: "Real-time chat, donations, and viewer engagement",
      ctaText: "Start Watching",
      ctaLink: "/watch"
    }
  ];

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Auto-advance slides every 5 seconds
  useEffect(() => {
    if (!api) return;

    const timer = setInterval(() => {
      const nextIndex = api.selectedScrollSnap() + 1;
      if (nextIndex >= api.scrollSnapList().length) {
        api.scrollTo(0);
      } else {
        api.scrollNext();
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [api]);

  return (
    <div className="relative w-full max-w-6xl mx-auto overflow-hidden mb-20 md:mb-0">
      {/* Feature Carousel with integrated hero text */}
      <Carousel 
        setApi={setApi}
        className="w-full"
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent className="ml-0">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <CarouselItem key={index} className="pl-0">
                <div className="relative p-4 md:p-6 rounded-xl bg-gradient-to-br from-green-500/20 to-red-500/20 border border-primary/10 text-center mx-2 md:mx-4">
                  {/* Hero Text - Consistent on every slide */}
                  <div className="mb-4 md:mb-6">
                    <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 leading-tight">
                      <span className="bg-gradient-to-r from-green-500 to-red-500 bg-clip-text text-transparent">
                        Stream, Connect & Earn with WenLive.fun
                      </span>
                    </h1>
                  </div>

                  {/* Feature-specific content */}
                  <div className="flex flex-col items-center space-y-3 md:space-y-4">
                    {/* Icon and Title layout - responsive */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                      <IconComponent size={24} className="text-primary flex-shrink-0 sm:size-7" />
                      <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground text-center sm:text-left">
                        {feature.title}
                      </h2>
                    </div>
                    
                    <div>
                      <p className="text-foreground/70 text-sm md:text-base mb-3 md:mb-4 max-w-sm mx-auto px-2 leading-relaxed">
                        {feature.subtitle}
                      </p>
                    </div>

                    <Link to={feature.ctaLink}>
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground md:text-base">
                        {feature.ctaText}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        
        {/* Navigation arrows - hidden on mobile */}
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>

      {/* Navigation dots */}
      <div className="flex justify-center space-x-2 mt-4 mb-4 md:mb-0">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === current - 1 
                ? 'bg-primary scale-110' 
                : 'bg-primary/30 hover:bg-primary/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeatureBanner;
