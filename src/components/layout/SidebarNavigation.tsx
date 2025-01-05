import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Music2,
  Lightbulb,
  Video,
  Settings,
  Briefcase
} from "lucide-react";

interface SidebarNavigationProps {
  userRole: string | null;
}

export const SidebarNavigation = ({ userRole }: SidebarNavigationProps) => {
  const location = useLocation();

  const isAuthorizedForProjectManagement = ['admin', 'logistics', 'management'].includes(userRole as string);

  return (
    <div className="space-y-2">
      <div>
        <Link to="/dashboard">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${
              location.pathname === "/dashboard" ? "bg-accent" : ""
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
        </Link>

        {isAuthorizedForProjectManagement && (
          <Link to="/project-management">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-2 ${
                location.pathname === "/project-management" ? "bg-accent" : ""
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>Project Management</span>
            </Button>
          </Link>
        )}

        <Link to="/sound">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${
              location.pathname === "/sound" ? "bg-accent" : ""
            }`}
          >
            <Music2 className="h-4 w-4" />
            <span>Sound</span>
          </Button>
        </Link>

        <Link to="/lights">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${
              location.pathname === "/lights" ? "bg-accent" : ""
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            <span>Lights</span>
          </Button>
        </Link>

        <Link to="/video">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${
              location.pathname === "/video" ? "bg-accent" : ""
            }`}
          >
            <Video className="h-4 w-4" />
            <span>Video</span>
          </Button>
        </Link>

        <Link to="/settings">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${
              location.pathname === "/settings" ? "bg-accent" : ""
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};