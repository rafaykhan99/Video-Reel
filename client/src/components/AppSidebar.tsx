import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Video,
  CreditCard,
  Sparkles,
  HelpCircle,
  LayoutDashboard,
  Settings,
  Image,
  Link as LinkIcon,
  Music
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();
  const { data: creditsData } = useQuery({
    queryKey: ["/api/credits"],
  });

  const menuItems = [
    {
      title: "Home",
      icon: Home,
      href: "/",
      testId: "link-home"
    },
    {
      title: "Dashboard", 
      icon: LayoutDashboard,
      href: "/dashboard",
      testId: "link-dashboard"
    },
    {
      title: "My Videos",
      icon: Video,
      href: "/my-videos",
      testId: "link-my-videos"
    },
    {
      title: "Video Enhancements",
      icon: Sparkles,
      href: "/video-enhancements",
      testId: "link-enhancements",
      badge: "NEW"
    },
    {
      title: "Image Studio",
      icon: Image,
      href: "/image-studio",
      testId: "link-image-studio"
    },
    {
      title: "Connect Accounts",
      icon: LinkIcon,
      href: "/connect-accounts",
      testId: "link-connect-accounts",
      badge: "NEW"
    },
    {
      title: "Music Library",
      icon: Music,
      href: "/music-library",
      testId: "link-music-library"
    },
    {
      title: "Credits",
      icon: CreditCard,
      href: "/credits", 
      testId: "link-credits",
      badge: (creditsData as any)?.balance?.toString()
    },
    {
      title: "Help",
      icon: HelpCircle,
      href: "/help",
      testId: "link-help"
    }
  ];

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.href}
                    data-testid={item.testId}
                  >
                    <Link to={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span className="flex items-center justify-between w-full">
                        {item.title}
                        {item.badge && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 ${
                            item.badge === "NEW" 
                              ? "bg-blue-500 text-white" 
                              : "bg-primary text-primary-foreground font-medium"
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}