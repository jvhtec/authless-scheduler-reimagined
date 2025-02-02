import { useState } from "react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

// Get the version from Vite's env variables
const version = import.meta.env.VITE_APP_VERSION || "dev"

// An array of image URLs to choose from
const images = [
  "/lovable-uploads/7bd0c1d7-3226-470d-bea4-5cd7222e3248.png",
  "/lovable-uploads/78EA43B6-3727-454E-BB54-257619F40C1E.jpeg",
  "/lovable-uploads/another-image.png",
]

export const AboutCard = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentImage, setCurrentImage] = useState(images[0])

  // Selects a random image from the images array.
  const selectRandomImage = () => {
    const randomIndex = Math.floor(Math.random() * images.length)
    return images[randomIndex]
  }

  // When the card is opened, update the image to a random one.
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setCurrentImage(selectRandomImage())
    }
  }

  return (
    <HoverCard open={isOpen} onOpenChange={handleOpenChange}>
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
            src={currentImage}
            alt="About Image"
            className="rounded-lg w-full h-auto"
          />
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Created by JVH
            </p>
            <p className="text-xs text-center text-muted-foreground">
              v{version}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}