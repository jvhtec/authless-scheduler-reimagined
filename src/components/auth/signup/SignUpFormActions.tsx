import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface SignUpFormActionsProps {
  loading: boolean;
  onBack: () => void;
}

export const SignUpFormActions = ({ loading, onBack }: SignUpFormActionsProps) => {
  return (
    <div className="flex justify-between">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Sign Up'
        )}
      </Button>
    </div>
  );
};