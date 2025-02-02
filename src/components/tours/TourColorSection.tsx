import React from "react";
import { SimplifiedJobColorPicker } from "../jobs/SimplifiedJobColorPicker";
import { Palette } from "lucide-react";

interface TourColorSectionProps {
  color: string;
  tourName: string;
  onColorChange: (color: string) => Promise<void>;
  onNameChange: (name: string) => Promise<void>;
}

export const TourColorSection: React.FC<TourColorSectionProps> = ({
  color,
  tourName,
  onColorChange,
  onNameChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Tour Color Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="font-medium">Tour Color</span>
        </div>
        <SimplifiedJobColorPicker color={color} onChange={onColorChange} />
      </div>

      {/* Tour Name Editing Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Tour Name</span>
        </div>
        <input
          type="text"
          value={tourName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};
