
import { Badge } from "@/components/ui/badge";
import { Package, PackageCheck, Truck, Clock, Warehouse, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LogisticsEventCardProps {
  event: any;
  onClick: () => void;
  compact?: boolean;
  className?: string;
}

export const LogisticsEventCard = ({ 
  event, 
  onClick, 
  compact = false,
  className 
}: LogisticsEventCardProps) => {
  const eventTime = format(new Date(`2000-01-01T${event.event_time}`), 'HH:mm');
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative text-sm cursor-pointer",
        compact ? "px-2 py-1 truncate hover:bg-accent/50 rounded" : "p-3 bg-card border rounded-md",
        className
      )}
    >
      {/* Always visible content */}
      <div className="truncate">
        {event.job?.title || "Unnamed Event"}
      </div>

      {/* Hover tooltip for compact view */}
      {compact && (
        <div className="absolute hidden group-hover:block z-50 top-full left-0 w-64 mt-1 p-3 bg-popover border rounded-md shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge 
              variant={event.event_type === 'load' ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              {event.event_type === 'load' ? (
                <Package className="h-3 w-3" />
              ) : (
                <PackageCheck className="h-3 w-3" />
              )}
              <span className="capitalize">{event.event_type}</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              <span className="capitalize">{event.transport_type}</span>
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{eventTime}</span>
            </div>

            {event.license_plate && (
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span>{event.license_plate}</span>
              </div>
            )}

            {event.loading_bay && (
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span>Bay {event.loading_bay}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {event.departments?.map((dept: any) => (
                <Badge 
                  key={dept.department} 
                  variant="secondary" 
                  className="text-xs"
                >
                  {dept.department}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expanded view for non-compact */}
      {!compact && (
        <>
          <div className="flex items-center justify-between gap-2 mt-2">
            <Badge 
              variant={event.event_type === 'load' ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              {event.event_type === 'load' ? (
                <Package className="h-3 w-3" />
              ) : (
                <PackageCheck className="h-3 w-3" />
              )}
              <span className="capitalize">{event.event_type}</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              <span className="capitalize">{event.transport_type}</span>
            </Badge>
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{eventTime}</span>
            </div>

            {event.license_plate && (
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span>{event.license_plate}</span>
              </div>
            )}

            {event.loading_bay && (
              <div className="flex items-center gap-2 text-sm">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span>Loading Bay: {event.loading_bay}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {event.departments?.map((dept: any) => (
                <Badge 
                  key={dept.department} 
                  variant="secondary" 
                  className="text-xs"
                >
                  {dept.department}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
