import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import { useState } from "react"

export const AboutCard = () => {
  const [isOpen, setIsOpen] = useState(false)

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
          <p className="text-sm text-center text-muted-foreground">
            Created by JVH
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}