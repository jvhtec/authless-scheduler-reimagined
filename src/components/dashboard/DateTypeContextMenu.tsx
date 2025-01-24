import { useState } from "react";
import { Plane, Wrench, Star, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format, startOfDay } from "date-fns";

interface DateTypeContextMenuProps {
  children: React.ReactNode;
  jobId: string;
  date: Date;
  onTypeChange?: () => void;
}

export const DateTypeContextMenu = ({ children, jobId, date, onTypeChange }: DateTypeContextMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSetDateType = async (type: 'travel' | 'setup' | 'show' | 'off') => {
    try {
      // Convert to start of day to ensure consistent date handling
      const localDate = startOfDay(date);
      const formattedDate = format(localDate, 'yyyy-MM-dd');
      
      console.log('Setting date type:', {
        type,
        jobId,
        date: localDate,
        formattedDate,
        originalDate: date
      });
      
      const { error } = await supabase
        .from('job_date_types')
        .upsert({
          job_id: jobId,
          date: formattedDate,
          type
        });

      if (error) throw error;

      toast.success('Date type updated successfully');
      if (onTypeChange) onTypeChange();
      setIsOpen(false); // Close menu after successful update
    } catch (error) {
      console.error('Error setting date type:', error);
      toast.error('Failed to update date type');
    }
  };

  return (
    <div className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>
        {children}
      </div>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1" role="menu" aria-orientation="vertical">
              <button
                onClick={() => handleSetDateType('travel')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <Plane className="mr-2 h-4 w-4" />
                Travel Day
              </button>
              <button
                onClick={() => handleSetDateType('setup')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <Wrench className="mr-2 h-4 w-4" />
                Setup Day
              </button>
              <button
                onClick={() => handleSetDateType('show')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <Star className="mr-2 h-4 w-4" />
                Show Day
              </button>
              <button
                onClick={() => handleSetDateType('off')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <Moon className="mr-2 h-4 w-4" />
                Day Off
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};