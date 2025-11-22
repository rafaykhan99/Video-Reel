import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Settings } from "lucide-react";

export function UserSettings() {
  const { user } = useAuth();

  if (!user) return null;

  const userInitials = (user as any).firstName 
    ? `${(user as any).firstName[0]}${(user as any).lastName?.[0] || ''}`.toUpperCase()
    : (user as any).email?.[0]?.toUpperCase() || 'U';

  const displayName = (user as any).firstName 
    ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim()
    : (user as any).email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="flex items-center space-x-2 hover:bg-slate-100 rounded-lg p-2 transition-colors"
          data-testid="button-user-menu"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage 
              src={(user as any).profileImageUrl} 
              alt="Profile picture"
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none" data-testid="text-user-display-name">
              {displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground" data-testid="text-user-email">
              {(user as any).email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer" 
          data-testid="menu-item-profile"
          onClick={() => window.location.href = '/profile'}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="cursor-pointer" 
          data-testid="menu-item-settings"
          onClick={() => window.location.href = '/settings'}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => window.location.href = '/api/logout'}
          data-testid="menu-item-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}