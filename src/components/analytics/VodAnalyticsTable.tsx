
import React from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Video, Eye, Clock, BarChart3 } from 'lucide-react';
import { VodAnalytics } from '@/services/creatorAnalyticsService';

interface VodAnalyticsTableProps {
  vods: VodAnalytics[];
  isLoading: boolean;
  error: any;
}

const VodAnalyticsTable: React.FC<VodAnalyticsTableProps> = ({ vods, isLoading, error }) => {
  const formatDate = (dateString: string) => {
    return formatInTimeZone(new Date(dateString), 'Etc/UTC', "MMM dd, yyyy");
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    if (rate >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          VOD Performance
        </CardTitle>
        <CardDescription>
          Analytics for your video-on-demand content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Avg Watch Time</TableHead>
                <TableHead>Completion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-destructive">
                    Error loading VOD analytics
                  </TableCell>
                </TableRow>
              ) : vods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <div className="space-y-2">
                      <p>No VODs found</p>
                      <p className="text-sm">Your stream recordings will appear here automatically!</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                vods.map((vod) => (
                  <TableRow key={vod.id}>
                    <TableCell className="max-w-xs">
                      <div>
                        <span className="font-medium" title={vod.title}>
                          {vod.title.length > 40 
                            ? `${vod.title.slice(0, 40)}...` 
                            : vod.title}
                        </span>
                        {vod.category && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {vod.category}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDate(vod.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm">
                          {formatDuration(vod.duration)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span className="font-semibold">{vod.views}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        <span className="text-sm">
                          {formatDuration(vod.avg_watch_time)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${getCompletionRateColor(vod.completion_rate)}`}>
                            {vod.completion_rate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={vod.completion_rate} 
                          className="h-2"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default VodAnalyticsTable;
