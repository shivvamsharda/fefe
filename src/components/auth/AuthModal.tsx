
import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { wallets, connectWallet, isConnecting } = useWallet();

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) {
        toast.error("Failed to sign in with Google", {
          description: error.message
        });
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error("Failed to sign in with Google");
    }
  };

  const handleWalletConnect = async (walletName: string) => {
    try {
      await connectWallet(walletName);
      onClose();
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-popover border border-border p-0 max-w-md w-full">
        <div className="p-6">
          <DialogHeader className="flex justify-between items-center mb-6">
            <DialogTitle className="text-xl font-bold text-foreground">Login</DialogTitle>
            <DialogClose onClick={onClose} className="text-foreground/70 hover:text-foreground">
              <X size={20} />
            </DialogClose>
          </DialogHeader>
          
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => {
                  if (wallet.provider && !isConnecting) {
                    handleWalletConnect(wallet.name);
                  }
                }}
                disabled={!wallet.provider || isConnecting}
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <img src={wallet.icon} alt={wallet.name} className="w-10 h-10" />
                  </div>
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-foreground">{wallet.name}</div>
                  {wallet.provider ? (
                    <div className="text-xs text-green-400">
                      {isConnecting ? 'Connecting...' : 'Ready to connect'}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Not installed</div>
                  )}
                </div>
                {isConnecting && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </button>
            ))}
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-popover px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full flex items-center gap-3 p-4 h-auto border border-border hover:bg-secondary/80"
              disabled={isConnecting}
            >
              <div className="flex-shrink-0">
                <div className="w-6 h-6">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
              </div>
              <div className="text-left flex-1">
                <div className="font-medium text-foreground">Continue with Google</div>
                <div className="text-xs text-muted-foreground">Watch and subscribe to creators</div>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
