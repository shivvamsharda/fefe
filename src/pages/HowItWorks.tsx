import React from 'react';
import Layout from '../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Coins, UserPlus, Settings2, Radio, Video, Users, Trophy, DollarSign, TrendingUp, Play, Heart, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

const HowItWorks = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 pt-24 md:pt-16 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-solana/30 to-solana-secondary/10 opacity-60"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="border-solana text-solana mb-4 px-4 py-1">
              Learn to Stream
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              How to <span className="solana-gradient bg-clip-text text-transparent">Stream</span> on WenLive
            </h1>
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              Learn everything you need to know about streaming on WenLive, from setting up your account to going live and earning SOL from your audience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/create">
                <Button size="lg" className="bg-solana hover:bg-solana/90 text-primary-foreground">
                  Start Streaming Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Steps */}
      <section className="py-16 bg-gradient-to-br from-black/50 to-solana/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Getting Started in 4 Simple Steps</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Follow these steps to start streaming on WenLive and connect with the Solana community.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                step: 1,
                title: "Connect Wallet",
                description: "Connect your Solana wallet to establish your identity and receive donations.",
                icon: <Coins className="h-8 w-8 text-primary-foreground" />
              },
              {
                step: 2,
                title: "Create Your Profile",
                description: "Set up your creator profile with a username, display name, and avatar.",
                icon: <UserPlus className="h-8 w-8 text-primary-foreground" />
              },
              {
                step: 3,
                title: "Set Up Your Stream",
                description: "Configure your stream title, description, and other details.",
                icon: <Settings2 className="h-8 w-8 text-primary-foreground" />
              },
              {
                step: 4,
                title: "Start Streaming",
                description: "Go live with your first stream and start building your audience.",
                icon: <Radio className="h-8 w-8 text-primary-foreground" />
              }
            ].map((item, index, arr) => (
              <div key={item.step} className="relative">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 bg-solana rounded-full flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/70 text-center text-sm">{item.description}</p>
                </div>
                {item.step < arr.length && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-solana/30 -z-10"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Tutorials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Video Tutorials</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Watch these quick tutorials to get started with streaming on WenLive.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3 text-center">How to Stream on WenLive</h3>
              <div className="aspect-video rounded-lg overflow-hidden shadow-xl border border-solana/30">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/a6Yp_XWoXyo"
                  title="How to Stream on WenLive"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3 text-center">How to MultiStream on WenLive</h3>
              <div className="aspect-video rounded-lg overflow-hidden shadow-xl border border-solana/30">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/uOdfgWfym0Q"
                  title="How to MultiStream on WenLive"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gradient-to-br from-black/50 to-solana/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why Stream on WenLive?</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Discover the benefits of streaming on the premier Solana content platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Coins className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Direct SOL Earnings</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Receive SOL donations directly to your wallet with only 20% platform fees - much lower than competitors.
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Solana Community</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Connect with passionate Solana enthusiasts who appreciate quality content and insights.
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Creator Rewards</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Earn monthly rewards, exclusive NFTs, and collaboration opportunities with Solana projects.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Streaming Methods */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Flexible Streaming Options</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Choose the streaming method that works best for you, from simple browser streaming to professional OBS setups.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Video className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Browser Streaming</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Start streaming instantly with no software required. Perfect for beginners or quick streams directly from your browser.
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Settings2 className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">OBS Streaming</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Advanced streaming with OBS integration for professional setups, multiple sources, and custom scenes.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stream Promotion */}
      <section className="py-16 bg-gradient-to-br from-black/50 to-solana/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Promote Your Streams</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Get your streams featured prominently on the platform with our paid promotion system.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle className="text-white">Hero Placement</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Feature your stream in the main hero section for maximum visibility and viewer engagement.
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle className="text-white">Affordable Pricing</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Competitive promotion rates with special discounts for active streamers and creators.
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle className="text-white">Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Track your promotion performance with detailed analytics and viewer engagement metrics.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Viewer Points & Rewards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Viewer Points & Rewards</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Engage with streams and earn points that unlock exclusive rewards and recognition.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: <Play className="h-6 w-6" />, title: "Watch Streams", desc: "Earn points by watching live streams" },
              { icon: <Heart className="h-6 w-6" />, title: "Follow Creators", desc: "Get bonus points for following" },
              { icon: <Users className="h-6 w-6" />, title: "Engage in Chat", desc: "Active participation rewards" },
              { icon: <Trophy className="h-6 w-6" />, title: "Climb Leaderboards", desc: "Compete for top positions" }
            ].map((item, index) => (
              <Card key={index} className="bg-secondary border-white/5 text-center">
                <CardHeader>
                  <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4 mx-auto text-solana">
                    {item.icon}
                  </div>
                  <CardTitle className="text-white text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-white/70 text-sm">
                  {item.desc}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Spaces Feature */}
      <section className="py-16 bg-gradient-to-br from-black/50 to-solana/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Interactive Spaces</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Join audio-focused group conversations and interactive sessions with creators and community members.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Host Your Space</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Create public or private audio spaces, manage participants, and lead engaging discussions with your community.
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Radio className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Join Conversations</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Participate in live audio discussions, raise your hand to speak, and connect with like-minded creators.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Social & Discovery</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Discover amazing creators, build your following, and connect with the Solana community.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Compass className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Explore Creators</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Browse through talented creators across different categories and find your new favorite streamers.
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Following System</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Follow your favorite creators to get notified when they go live and see their content in your feed.
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Leaderboards</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Compete on creator and referral leaderboards to showcase your community impact and achievements.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Monetization Features */}
      <section className="py-16 bg-gradient-to-br from-black/50 to-solana/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Creator Monetization</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Multiple ways to earn from your content with transparent, creator-friendly monetization options.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <DollarSign className="h-6 w-6" />, title: "Direct SOL Tips", desc: "Instant wallet-to-wallet donations" },
              { icon: <Coins className="h-6 w-6" />, title: "Low Fees", desc: "Only 20% platform fee" },
              { icon: <TrendingUp className="h-6 w-6" />, title: "Analytics", desc: "Track earnings and performance" },
              { icon: <Video className="h-6 w-6" />, title: "VOD Revenue", desc: "Monetize recorded content" }
            ].map((item, index) => (
              <Card key={index} className="bg-secondary border-white/5 text-center">
                <CardHeader>
                  <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4 mx-auto text-solana">
                    {item.icon}
                  </div>
                  <CardTitle className="text-white text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-white/70 text-sm">
                  {item.desc}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Content Management */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Content Management</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Comprehensive tools to manage your content, from live streams to uploaded videos and VODs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Video className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Video Uploads</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Upload pre-recorded videos, manage your content library, and organize videos by categories and tags.
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Settings2 className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">Stream Recording</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                Automatically record your live streams and convert them to VODs for viewers to watch later.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Streaming Tips */}
      <section className="py-16 bg-gradient-to-br from-black/50 to-solana/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Pro Streaming Tips</h2>
              <p className="text-white/70">
                Follow these best practices to create engaging streams and grow your audience.
              </p>
            </div>
            
            <div className="space-y-4">
              {[
                "Use a stable internet connection with at least 5 Mbps upload speed",
                "Ensure good lighting and clear audio for better viewer experience",
                "Engage with your chat and respond to questions regularly",
                "Create compelling stream titles and thumbnails",
                "Be consistent with your streaming schedule to build a regular audience",
                "Promote your streams on social media channels",
                "Collaborate with other creators in the Solana ecosystem"
              ].map((tip, index) => (
                <div key={index} className="flex items-center gap-3 bg-secondary/50 p-4 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-solana flex-shrink-0" />
                  <span className="text-white">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-solana/30 to-solana-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to Start Your Streaming Journey?</h2>
            <p className="text-white/80 text-lg mb-8">
              Join the WenLive community and start sharing your Solana expertise with the world.
            </p>
            <Link to="/create">
              <Button size="lg" className="bg-solana hover:bg-solana/90 text-primary-foreground">
                Become a Creator
              </Button>
            </Link>
            <div className="mt-4 text-white/50 text-sm">
              Get started in under a minute with just your Solana wallet
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HowItWorks;
