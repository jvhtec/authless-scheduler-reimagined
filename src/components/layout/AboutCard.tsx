import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import { useState } from "react"

// Get the build timestamp from Vite's env variables
const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP || 'development';

// Format the timestamp into a version number (YYYYMMDD.HHMMSS)
const formatVersion = (timestamp: string) => {
  if (timestamp === 'development') return 'dev';
  const date = new Date(timestamp);
  const version = date.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '.')
    .split('.')[0];
  return version;
};

export const AboutCard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const version = formatVersion(buildTimestamp);

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2"
          onClick={() => setIsOpen(true)}
        >
          <Info className="h-4 w-4" />
          <span>About</span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex flex-col gap-4">
          <img
            src="/lovable-uploads/7bd0c1d7-3226-470d-bea4-5cd7222e3248.png"
            alt="JVH"
            className="rounded-lg w-full h-auto"
          />
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Created by JVH
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Version {version}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}