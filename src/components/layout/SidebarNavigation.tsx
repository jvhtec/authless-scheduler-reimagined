import { Link } from "react-router-dom";
import { LayoutDashboard, Music2, Lightbulb, Video, Settings as SettingsIcon, UserCircle2, User } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

interface SidebarNavigationProps {
  userRole: string | null;
}

export const SidebarNavigation = ({ userRole }: SidebarNavigationProps) => {
  const isTechnician = userRole === 'technician';
  const showTechnicianAndProfile = isTechnician;

  return (
    <SidebarMenu>
      {!isTechnician && (
        <>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/sound">
                <Music2 className="h-4 w-4" />
                <span>Sound</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/lights">
                <Lightbulb className="h-4 w-4" />
                <span>Lights</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/video">
                <Video className="h-4 w-4" />
                <span>Video</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/settings">
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </>
      )}
      {showTechnicianAndProfile && (
        <>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/technician">
                <UserCircle2 className="h-4 w-4" />
                <span>Technician View</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/profile">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </>
      )}
    </SidebarMenu>
  );
};