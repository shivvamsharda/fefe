
import React from 'react';
import { CheckCircle, ExternalLink, Clock, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StreamPromotionData, PlacementSelection } from '@/pages/PromoteStreamPage';

interface PromoteSuccessProps {
  streamData: StreamPromotionData;
  placementData: PlacementSelection;
  transactionSignature: string;
  onDone: () => void;
  onPromoteAnother: () => void;
}

const PromoteSuccess: React.FC<PromoteSuccessProps> = ({
  streamData,
  placementData,
  transactionSignature,
  onDone,
  onPromoteAnother
}) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Promotion Active!</h1>
        <p className="text-foreground/70">
          Your stream is now being promoted and will reach a wider audience
        </p>
      </div>

      {/* Success Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Promotion Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stream Info */}
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <img
              src={streamData.thumbnailUrl}
              alt={streamData.streamTitle}
              className="w-24 h-14 object-cover rounded"
            />
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground">{streamData.streamTitle}</h3>
              <p className="text-sm text-foreground/70">{streamData.description}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                  Featured Banner
                </span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">${50} ({placementData.totalFee} SOL)</div>
              <div className="text-sm text-green-700 dark:text-green-300">Total Paid</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">24h</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Duration</div>
            </div>
          </div>

          {/* Expiry */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Clock className="w-5 h-5 text-foreground/70" />
            <div className="text-left">
              <p className="font-medium text-foreground">Expires at</p>
              <p className="text-sm text-foreground/70">
                {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Transaction */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-foreground/70 mb-1">Transaction Signature</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                {transactionSignature}
              </code>
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What happens now?</CardTitle>
        </CardHeader>
        <CardContent className="text-left">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium">Your stream is now in Featured Content</p>
                <p className="text-sm text-foreground/70">Your stream appears in the main Featured Content slideshow with maximum visibility</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium">Track your promotion performance</p>
                <p className="text-sm text-foreground/70">Visit your creator dashboard to see clicks and engagement</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium">Manage your promotions</p>
                <p className="text-sm text-foreground/70">End early or extend your promotion anytime</p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={onPromoteAnother} className="flex-1">
          <Repeat className="w-4 h-4 mr-2" />
          Promote Another Stream
        </Button>
        <Button onClick={onDone} className="flex-1">
          Done
        </Button>
      </div>

      <div className="mt-6 text-sm text-foreground/60">
        Need help? Contact our support team or check the documentation.
      </div>
    </div>
  );
};

export default PromoteSuccess;
