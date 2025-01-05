import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

export const AboutCard = () => {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2"
        >
          <Info className="h-4 w-4" />
          <span>About</span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex flex-col gap-4">
          <img
            src="/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png"
            alt="Sector Pro"
            className="rounded-lg w-full h-auto dark:invert"
          />
          <p className="text-sm text-center text-muted-foreground">
            Created by JVH
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}