
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteAccountResponse {
  success: boolean;
  error?: string;
  user_id?: string;
  wallet_address?: string;
  email?: string;
  profiles_deleted?: number;
  deleted_at?: string;
}

export const deleteUserAccount = async (userUuid: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('delete_user_account', {
      requesting_user_id: userUuid
    });

    if (error) {
      console.error('Error deleting user account:', error);
      toast.error("Failed to delete account", {
        description: error.message
      });
      return false;
    }

    // Cast the data to our expected response type
    const response = data as unknown as DeleteAccountResponse;

    if (response?.success) {
      toast.success("Account deleted successfully", {
        description: "Your account and all associated data have been permanently deleted."
      });
      return true;
    } else {
      toast.error("Failed to delete account", {
        description: response?.error || "Unknown error occurred"
      });
      return false;
    }
  } catch (error: any) {
    console.error('Error deleting user account:', error);
    toast.error("Failed to delete account", {
      description: error.message || "An unexpected error occurred"
    });
    return false;
  }
};
