import { SimplifiedJobColorPicker } from "../jobs/SimplifiedJobColorPicker";
import { Palette } from "lucide-react";

interface TourColorSectionProps {
  color: string;
  onColorChange: (color: string) => Promise<void>;
}

export const TourColorSection = ({ color, onColorChange }: TourColorSectionProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4" />
        <span className="font-medium">Tour Color</span>
      </div>
      <SimplifiedJobColorPicker
        color={color}
        onChange={onColorChange}
      />
    </div>
  );
};