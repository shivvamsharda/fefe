import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Shield, AlertTriangle } from 'lucide-react';
import { downloadPrivateKey, deleteEncryptedPrivateKey } from '@/services/googleWalletService';
import { toast } from 'sonner';

interface PrivateKeyDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  privateKey: string;
  walletAddress: string;
  userId: string;
  onConfirmed: () => void;
}

const PrivateKeyDownloadModal = ({
  isOpen,
  onClose,
  privateKey,
  walletAddress,
  userId,
  onConfirmed
}: PrivateKeyDownloadModalProps) => {
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownload = () => {
    downloadPrivateKey(privateKey, walletAddress);
    setHasDownloaded(true);
  };

  const handleConfirmAndFinish = async () => {
    if (!hasDownloaded || !hasConfirmed) {
      toast.error('Please download your private key and confirm you have saved it');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Delete the encrypted private key from the database
      const deleted = await deleteEncryptedPrivateKey(userId);
      
      if (deleted) {
        toast.success('Wallet setup completed successfully!');
        onConfirmed();
        onClose();
      } else {
        toast.error('Failed to complete wallet setup');
      }
    } catch (error) {
      console.error('Error completing wallet setup:', error);
      toast.error('Failed to complete wallet setup');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Download Your Private Key
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical Security Notice:</strong> This is your only chance to download your private key. 
              Save it securely - you won't see it again!
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Your Wallet Address:</p>
              <p className="text-xs font-mono break-all">{walletAddress}</p>
            </div>

            <Button
              onClick={handleDownload}
              className="w-full"
              variant={hasDownloaded ? "secondary" : "default"}
            >
              <Download className="h-4 w-4 mr-2" />
              {hasDownloaded ? 'Downloaded ✓' : 'Download Private Key'}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="confirm-saved"
                checked={hasConfirmed}
                onCheckedChange={(checked) => setHasConfirmed(checked === true)}
                disabled={!hasDownloaded}
              />
              <label htmlFor="confirm-saved" className="text-sm leading-tight">
                I have downloaded and securely saved my private key. I understand that:
                <ul className="mt-1 ml-4 list-disc text-xs text-muted-foreground">
                  <li>I am fully responsible for keeping it safe</li>
                  <li>Anyone with this key can access my wallet</li>
                  <li>Wenlive cannot recover it if I lose it</li>
                </ul>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAndFinish}
              disabled={!hasDownloaded || !hasConfirmed || isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Finalizing...' : 'Complete Setup'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivateKeyDownloadModal;