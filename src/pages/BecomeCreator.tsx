
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Video, Users, Trophy, Coins, ChevronRight, PlayCircle, Loader2, Tv2, UserPlus, Settings2, Radio } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast as sonnerToast } from 'sonner';
import { getCreatorProfileByWallet } from '@/services/creatorProfileService';

const BecomeCreator = () => {
  const { hasWalletCapability, effectiveWalletAddress, connectWallet } = useWallet();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isCheckingProfile, setIsCheckingProfile] = React.useState(false);
  
  const handleBecomeCreatorClick = async () => {
    if (!hasWalletCapability || !effectiveWalletAddress) {
      sonnerToast.error(t('creator.wallet_not_connected'), {
        description: t('creator.connect_wallet_first'),
      });
      return;
    }
    
    setIsCheckingProfile(true);
    try {
      const profile = await getCreatorProfileByWallet(effectiveWalletAddress);
      if (profile) {
        navigate('/create/stream');
      } else {
        navigate('/creator/setup');
      }
    } catch (error) {
      console.error("Error checking creator profile:", error);
      sonnerToast.error(t('creator.profile_check_error'), { description: t('creator.try_again')});
    } finally {
      setIsCheckingProfile(false);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 pt-24 md:pt-16 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-solana/30 to-solana-secondary/10 opacity-60"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="border-solana text-solana mb-4 px-4 py-1">
              {t('creator.program')}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('creator.become_title')} <span className="solana-gradient bg-clip-text text-transparent">{t('creator.solana')}</span> {t('creator.creator')}
            </h1>
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              {t('creator.hero_description')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
            {hasWalletCapability ? (
                <Button 
                  size="lg" 
                  className="bg-solana hover:bg-solana/90 text-primary-foreground"
                  onClick={handleBecomeCreatorClick}
                  disabled={isCheckingProfile}
                >
                  {isCheckingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('creator.start_streaming')} <ChevronRight className="ml-1" />
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  className="bg-solana hover:bg-solana/90 text-primary-foreground"
                  onClick={() => connectWallet('Phantom')}
                >
                  {t('creator.connect_to_stream')} <ChevronRight className="ml-1" />
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5">
                <PlayCircle className="mr-1" /> {t('creator.watch_stories')}
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">{t('creator.why_create')}</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              {t('creator.why_create_description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Coins className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">{t('creator.direct_earnings')}</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                {t('creator.direct_earnings_description')}
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">{t('creator.engaged_community')}</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                {t('creator.engaged_community_description')}
              </CardContent>
            </Card>
            
            <Card className="bg-secondary border-white/5">
              <CardHeader>
                <div className="h-12 w-12 bg-solana/20 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-solana" />
                </div>
                <CardTitle className="text-white">{t('creator.creator_rewards')}</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                {t('creator.creator_rewards_description')}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-16 bg-gradient-to-br from-black/50 to-solana/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">{t('creator.how_it_works')}</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              {t('creator.how_it_works_description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
            {[
              {
                step: 1,
                title: t('creator.step1_title'),
                description: t('creator.step1_description'),
                icon: <Coins className="h-8 w-8 text-primary-foreground" />
              },
              {
                step: 2,
                title: t('creator.step2_title'),
                description: t('creator.step2_description'),
                icon: <UserPlus className="h-8 w-8 text-primary-foreground" />
              },
              {
                step: 3,
                title: t('creator.step3_title'),
                description: t('creator.step3_description'),
                icon: <Settings2 className="h-8 w-8 text-primary-foreground" />
              },
              {
                step: 4,
                title: t('creator.step4_title'),
                description: t('creator.step4_description'),
                icon: <Radio className="h-8 w-8 text-primary-foreground" />
              }
            ].map((item, index, arr) => (
              <div key={item.step} className="relative">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 bg-solana rounded-full flex items-center justify-center mb-4">
                    {React.cloneElement(item.icon, { className: `${item.icon.props.className} text-primary-foreground`})}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/70 text-center text-sm">{item.description}</p>
                </div>
                {item.step < arr.length && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-solana/30 -z-10">
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Embedded Videos Section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">{t('creator.learn_to_stream')}</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              {t('creator.learn_to_stream_description')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3 text-center">{t('creator.video1_title')}</h3>
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
              <h3 className="text-xl font-semibold text-white mb-3 text-center">{t('creator.video2_title')}</h3>
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
      
      {/* Content Types */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">{t('creator.content_types')}</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              {t('creator.content_types_description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: t('creator.educational_title'),
                description: t('creator.educational_description'),
                icon: <Video className="h-6 w-6 text-solana" />
              },
              {
                title: t('creator.market_analysis_title'),
                description: t('creator.market_analysis_description'),
                icon: <Video className="h-6 w-6 text-solana" />
              },
              {
                title: t('creator.development_title'),
                description: t('creator.development_description'),
                icon: <Video className="h-6 w-6 text-solana" />
              },
              {
                title: t('creator.nft_title'),
                description: t('creator.nft_description'),
                icon: <Video className="h-6 w-6 text-solana" />
              },
              {
                title: t('creator.ama_title'),
                description: t('creator.ama_description'),
                icon: <Video className="h-6 w-6 text-solana" />
              },
              {
                title: t('creator.gaming_title'),
                description: t('creator.gaming_description'),
                icon: <Video className="h-6 w-6 text-solana" />
              },
              {
                title: t('creator.vlogs_title'),
                description: t('creator.vlogs_description'),
                icon: <Video className="h-6 w-6 text-solana" />
              },
              {
                title: t('creator.nsfw_title'),
                description: t('creator.nsfw_description'),
                icon: <Video className="h-6 w-6 text-solana" />
              },
            ].map((item, index) => (
              <div key={index} className="flex gap-4 p-6 bg-secondary border border-white/5 rounded-lg">
                <div className="h-12 w-12 bg-solana/10 rounded-full flex-shrink-0 flex items-center justify-center">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/70">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Streaming Tips */}
      <section className="py-16 bg-gradient-to-br from-black/50 to-solana/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">{t('creator.streaming_tips')}</h2>
              <p className="text-white/70">
                {t('creator.streaming_tips_description')}
              </p>
            </div>
            
            <div className="space-y-4">
              {[
                t('creator.tip1'),
                t('creator.tip2'),
                t('creator.tip3'),
                t('creator.tip4'),
                t('creator.tip5')
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
      
      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">{t('creator.faq_title')}</h2>
            </div>
            
            <div className="space-y-6">
              {[
                {
                  question: t('creator.faq1_question'),
                  answer: t('creator.faq1_answer')
                },
                {
                  question: t('creator.faq2_question'),
                  answer: t('creator.faq2_answer')
                },
                {
                  question: t('creator.faq3_question'),
                  answer: t('creator.faq3_answer')
                },
                {
                  question: t('creator.faq4_question'),
                  answer: t('creator.faq4_answer')
                },
                {
                  question: t('creator.faq5_question'),
                  answer: t('creator.faq5_answer')
                }
              ].map((faq, index) => (
                <div key={index} className="bg-secondary border border-white/5 rounded-lg overflow-hidden">
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-white mb-2">{faq.question}</h3>
                    <p className="text-white/70">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-solana/30 to-solana-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">{t('creator.cta_title')}</h2>
            <p className="text-white/80 text-lg mb-8">
              {t('creator.cta_description')}
            </p>
            {hasWalletCapability ? (
              <Button 
                size="lg" 
                className="bg-solana hover:bg-solana/90 text-primary-foreground"
                onClick={handleBecomeCreatorClick}
                disabled={isCheckingProfile}
              >
                {isCheckingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('creator.start_streaming_now')}
              </Button>
            ) : (
              <Button 
                size="lg" 
                className="bg-solana hover:bg-solana/90 text-primary-foreground"
                onClick={() => connectWallet('Phantom')}
              >
                {t('creator.connect_to_stream')}
              </Button>
            )}
            <div className="mt-4 text-white/50 text-sm">
              {t('creator.start_quickly')}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BecomeCreator;
