
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Users, DollarSign, PlayCircle } from 'lucide-react';
import { StreamAnalytics } from '@/services/creatorAnalyticsService';

interface StreamAnalyticsTableProps {
  streams: StreamAnalytics[];
  isLoading: boolean;
  error: any;
}

const StreamAnalyticsTable: React.FC<StreamAnalyticsTableProps> = ({ streams, isLoading, error }) => {
  const formatDate = (dateString: string) => {
    return formatInTimeZone(new Date(dateString), 'Etc/UTC', "MMM dd, yyyy 'at' HH:mm");
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      case 'idle': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          Stream Performance
        </CardTitle>
        <CardDescription>
          Detailed analytics for each of your streams
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Peak Viewers</TableHead>
                <TableHead>Avg Viewers</TableHead>
                <TableHead>Tips</TableHead>
                <TableHead>VOD Views</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-destructive">
                    Error loading stream analytics
                  </TableCell>
                </TableRow>
              ) : streams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <div className="space-y-2">
                      <p>No streams found</p>
                      <p className="text-sm">Create your first stream to see analytics here!</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                streams.map((stream) => (
                  <TableRow key={stream.id}>
                    <TableCell className="max-w-xs">
                      <div>
                        <span className="font-medium" title={stream.title}>
                          {stream.title.length > 40 
                            ? `${stream.title.slice(0, 40)}...` 
                            : stream.title}
                        </span>
                        {stream.category && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {stream.category}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDate(stream.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm">
                          {stream.live_duration_minutes ? formatDuration(stream.live_duration_minutes) : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="font-semibold">{stream.peak_viewers}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{stream.avg_viewers}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-semibold">{stream.tips_received.toFixed(3)} SOL</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PlayCircle className="h-3 w-3" />
                        <span>{stream.vod_views}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(stream.status)}>
                        {stream.status}
                      </Badge>
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

export default StreamAnalyticsTable;
