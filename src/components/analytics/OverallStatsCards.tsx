
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Hash, TrendingUp, Users, PlayCircle, Video, Clock, BarChart3, DollarSign } from 'lucide-react';
import { CreatorOverallStats, DonationSummary } from '@/services/creatorAnalyticsService';

interface OverallStatsCardsProps {
  stats: CreatorOverallStats;
  donationSummary: DonationSummary;
  isLoading: boolean;
}

const OverallStatsCards: React.FC<OverallStatsCardsProps> = ({ stats, donationSummary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Streams",
      value: stats.total_streams,
      description: "streams created",
      icon: PlayCircle,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Total VODs", 
      value: stats.total_vods,
      description: "recordings available",
      icon: Video,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Total Views",
      value: stats.total_views.toLocaleString(),
      description: "across all content",
      icon: Hash,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Watch Time",
      value: `${stats.total_watch_time_hours.toFixed(1)}h`,
      description: "total watch time",
      icon: Clock,
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Followers",
      value: stats.follower_count,
      description: "followers",
      icon: Users,
      gradient: "from-pink-500 to-rose-500"
    },
    {
      title: "Avg Completion",
      value: `${stats.avg_completion_rate.toFixed(1)}%`,
      description: "VOD completion rate",
      icon: BarChart3,
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      title: "Growth Rate",
      value: `${stats.total_views > 0 ? '+' : ''}${((stats.follower_count / Math.max(stats.total_streams, 1)) * 100).toFixed(1)}%`,
      description: "followers per stream",
      icon: TrendingUp,
      gradient: "from-teal-500 to-cyan-500"
    },
    {
      title: "Avg WENLIVE Donation",
      value: donationSummary.averageWenlive.toFixed(0),
      description: "per WENLIVE donation",
      icon: DollarSign,
      gradient: "from-yellow-500 to-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="glass-card hover-lift group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-xl bg-gradient-to-r ${card.gradient} opacity-80 group-hover:opacity-100 transition-opacity duration-300`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-black tracking-tight">{card.value}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OverallStatsCards;
