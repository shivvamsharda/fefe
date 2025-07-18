
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Loader2, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { ViewsOverTimeData, TipsOverTimeData, TimePeriod } from '@/services/creatorAnalyticsService';
import PeriodSelector from './PeriodSelector';

interface AnalyticsChartsProps {
  viewsData: ViewsOverTimeData[];
  tipsData: TipsOverTimeData[];
  isLoading: boolean;
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ 
  viewsData, 
  tipsData, 
  isLoading, 
  selectedPeriod, 
  onPeriodChange 
}) => {
  const chartConfig = {
    stream_views: {
      label: "Stream Views",
      color: "#3b82f6"
    },
    vod_views: {
      label: "VOD Views", 
      color: "#06b6d4"
    },
    total_views: {
      label: "Total Views",
      color: "#8b5cf6"
    },
    tips_amount: {
      label: "Tips Amount (SOL)",
      color: "#f59e0b"
    },
    tips_count: {
      label: "Tips Count",
      color: "#ef4444"
    }
  };

  const formatXAxisTick = (value: string) => {
    const date = new Date(value);
    
    if (selectedPeriod === '24h') {
      return date.toLocaleDateString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      });
    } else if (selectedPeriod === '7d' || selectedPeriod === '30d') {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: '2-digit' 
      });
    }
  };

  const formatTooltipLabel = (value: string) => {
    const date = new Date(value);
    
    if (selectedPeriod === '24h') {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const getPeriodDescription = () => {
    switch (selectedPeriod) {
      case '24h': return 'Hourly data for the last 24 hours';
      case '7d': return 'Daily data for the last 7 days';
      case '30d': return 'Daily data for the last 30 days';
      case '90d': return 'Weekly data for the last 90 days';
      case '1y': return 'Weekly data for the last year';
      case 'all': return 'All-time data aggregated by week';
      default: return 'Daily data over the selected period';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span className="font-medium">Time Period</span>
          </div>
          <PeriodSelector value={selectedPeriod} onChange={onPeriodChange} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <span className="font-medium">Time Period</span>
        </div>
        <PeriodSelector value={selectedPeriod} onChange={onPeriodChange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Views Over Time
            </CardTitle>
            <CardDescription>
              {getPeriodDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {viewsData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No view data available</p>
                  <p className="text-sm">Start streaming to see views over time!</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={viewsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatXAxisTick}
                    />
                    <YAxis />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      labelFormatter={formatTooltipLabel}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="stream_views" 
                      stroke="var(--color-stream_views)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="vod_views" 
                      stroke="var(--color-vod_views)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_views" 
                      stroke="var(--color-total_views)" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Tips Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Tips Over Time
            </CardTitle>
            <CardDescription>
              {getPeriodDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tipsData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tip data available</p>
                  <p className="text-sm">Tips from your audience will appear here!</p>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tipsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatXAxisTick}
                    />
                    <YAxis />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      labelFormatter={formatTooltipLabel}
                    />
                    <Bar 
                      dataKey="tips_amount" 
                      fill="var(--color-tips_amount)" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
