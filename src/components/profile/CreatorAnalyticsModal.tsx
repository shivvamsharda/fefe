
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  getCreatorDonations, 
  calculateDonationSummary,
  type CreatorDonation 
} from '@/services/creatorAnalyticsService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, DollarSign, Hash, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface CreatorAnalyticsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userUuid: string;
  creatorDisplayName: string;
}

const CreatorAnalyticsModal = ({ 
  isOpen, 
  onOpenChange, 
  userUuid, 
  creatorDisplayName 
}: CreatorAnalyticsModalProps) => {
  const { data: donations = [], isLoading, error } = useQuery({
    queryKey: ['creatorDonations', userUuid],
    queryFn: () => getCreatorDonations(userUuid),
    enabled: !!userUuid && isOpen,
  });

  const summary = calculateDonationSummary(donations);

  const truncateWallet = (wallet: string) => {
    if (wallet.length <= 12) return wallet;
    return `${wallet.slice(0, 6)}...${wallet.slice(-6)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatAmount = (donation: CreatorDonation) => {
    return `${donation.amount_sol.toFixed(6)} ${donation.actual_token_type || donation.token_type}`;
  };

  const formatDate = (dateString: string) => {
    return formatInTimeZone(new Date(dateString), 'Etc/UTC', "MMM dd, yyyy 'at' HH:mm");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Analytics - {creatorDisplayName}
          </DialogTitle>
          <DialogDescription>
            View your donation history and earnings summary
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total SOL</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalSol.toFixed(6)}</div>
              <p className="text-xs text-muted-foreground">SOL received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total WENLIVE</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalWenlive.toFixed(6)}</div>
              <p className="text-xs text-muted-foreground">WENLIVE received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCount}</div>
              <p className="text-xs text-muted-foreground">donations received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageAmount.toFixed(6)}</div>
              <p className="text-xs text-muted-foreground">per donation</p>
            </CardContent>
          </Card>
        </div>

        {/* Donations Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Stream</TableHead>
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
                    Error loading donations
                  </TableCell>
                </TableRow>
              ) : donations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <div className="space-y-2">
                      <p>No donations received yet</p>
                      <p className="text-sm">Start streaming to receive donations from your audience!</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(donation.created_at)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatAmount(donation)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        (donation.actual_token_type || donation.token_type) === 'SOL' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {donation.actual_token_type || donation.token_type}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {donation.cleaned_message || donation.message ? (
                        <span className="text-sm" title={donation.cleaned_message || donation.message}>
                          {(donation.cleaned_message || donation.message || '').length > 50 
                            ? `${(donation.cleaned_message || donation.message || '').slice(0, 50)}...` 
                            : (donation.cleaned_message || donation.message)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">No message</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {truncateWallet(donation.donor_wallet_address)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(donation.donor_wallet_address)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {donation.stream_title ? (
                        <span className="text-sm" title={donation.stream_title}>
                          {donation.stream_title.length > 30 
                            ? `${donation.stream_title.slice(0, 30)}...` 
                            : donation.stream_title}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Direct donation</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatorAnalyticsModal;
