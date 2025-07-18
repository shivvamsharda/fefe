
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/context/WalletContext';
import { deleteUserAccount } from '@/services/deleteAccountService';
import { AlertTriangle, Trash2, ArrowLeft } from 'lucide-react';

const DeleteAccountPage = () => {
  const { userUuid, username, publicKey, googleUser, disconnectWallet } = useWallet();
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (!userUuid) {
      console.error('No user UUID available for account deletion');
      return;
    }

    setIsDeleting(true);
    
    const success = await deleteUserAccount(userUuid);
    
    if (success) {
      // Disconnect wallet/logout and redirect to home
      await disconnectWallet();
      navigate('/');
    }
    
    setIsDeleting(false);
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-red-600 dark:text-red-400">Delete Account</CardTitle>
                <CardDescription>
                  This action cannot be undone. Please review your account information before proceeding.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">What will be deleted:</h3>
              <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-1">
                <li>Your user profile and username</li>
                <li>All account preferences and settings</li>
                <li>Your referral information</li>
                <li>Association with your wallet address or email</li>
              </ul>
            </div>

            {/* Current Account Information */}
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Current Account Information:</h3>
              <div className="space-y-2 text-sm">
                {username && (
                  <div>
                    <span className="font-medium">Username:</span> {username}
                  </div>
                )}
                {publicKey && (
                  <div>
                    <span className="font-medium">Wallet:</span> {publicKey}
                  </div>
                )}
                {googleUser?.email && (
                  <div>
                    <span className="font-medium">Email:</span> {googleUser.email}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Important Notice</h4>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                    Deleting your account will permanently remove all your data from our system. 
                    This action cannot be reversed. You can always create a new account later if needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  "Deleting Account..."
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Delete Account Permanently
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeleteAccountPage;
