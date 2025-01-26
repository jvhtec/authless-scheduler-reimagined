import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export const ReloadButton = () => {
  const handleReload = () => {
    window.location.reload(); // Reload the current page
  };

  return (
    <Button onClick={handleReload} variant="outline" className="flex items-center gap-2">
      <RefreshCw className="h-4 w-4" />
      Reload
    </Button>
  );
};
