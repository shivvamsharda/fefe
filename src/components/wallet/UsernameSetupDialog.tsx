
import React, { useState } from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { checkUsernameAvailability } from "@/services/profileService";

// Form schema for username validation
const usernameSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
});

interface UsernameSetupDialogProps {
  isOpen: boolean;
  walletAddress: string | null;
  onSubmit: (username: string) => Promise<void>;
  onCancel: () => void;
}

const UsernameSetupDialog = ({ 
  isOpen, 
  walletAddress, 
  onSubmit, 
  onCancel 
}: UsernameSetupDialogProps) => {
  const [isChecking, setIsChecking] = useState(false);

  const form = useForm<z.infer<typeof usernameSchema>>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof usernameSchema>) => {
    try {
      setIsChecking(true);
      
      // Check if username is available
      const isAvailable = await checkUsernameAvailability(values.username);
      
      if (!isAvailable) {
        form.setError("username", { 
          type: "manual", 
          message: "This username is already taken" 
        });
        setIsChecking(false);
        return;
      }
      
      // Submit the username
      await onSubmit(values.username);
    } catch (error) {
      console.error("Error submitting username:", error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-secondary border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Create a Username</DialogTitle>
          <DialogDescription className="text-white/70">
            Choose a unique username to identify yourself on the platform.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter a unique username" 
                      {...field} 
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="border-white/20 hover:bg-secondary/80"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-solana hover:bg-solana/90" 
                disabled={isChecking || form.formState.isSubmitting}
              >
                {(isChecking || form.formState.isSubmitting) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Username
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameSetupDialog;
