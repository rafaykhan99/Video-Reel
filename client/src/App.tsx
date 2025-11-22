import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import { UserSettings } from "@/components/UserSettings";
import NotFound from "@/pages/not-found";
import VideoGenerator from "@/pages/video-generator";
import Dashboard from "@/pages/dashboard";
import MyVideos from "@/pages/my-videos";
import VideoPreview from "@/pages/video-preview";
import VideoEdit from "@/pages/video-edit";
import Help from "@/pages/help";
import Landing from "@/pages/Landing";
import Credits from "@/pages/credits";
import VideoEnhancements from "@/pages/video-enhancements";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import ImageStudio from "@/pages/image-studio";
import ConnectAccounts from "@/pages/connect-accounts";
import MusicLibrary from "@/pages/music-library";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { Menu } from "lucide-react";

// Header component
function Header() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null; // Don't show header on landing page
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 h-16">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center space-x-3">
          <SidebarTrigger className="md:hidden" data-testid="button-sidebar-toggle">
            <Menu className="w-5 h-5" />
          </SidebarTrigger>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 3H3c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h18c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 16H3V5h18v14zm-10-7.27L17 14l-6 3.27v-5.27z"/>
            </svg>
          </div>
          <Link to="/">
            <h1 className="text-xl font-semibold text-slate-900 cursor-pointer hover:text-primary transition-colors" data-testid="text-app-title">
              Explainer AI Video Generator
            </h1>
          </Link>
        </div>
        
        <UserSettings />
      </div>
    </header>
  );
}

// Footer component  
function Footer() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null; // Don't show footer on landing page
  }

  return (
    <footer className="bg-white border-t border-slate-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-6 text-sm text-slate-600">
            <a href="#" className="hover:text-slate-900 transition-colors" data-testid="link-terms">Terms</a>
            <a href="#" className="hover:text-slate-900 transition-colors" data-testid="link-privacy">Privacy</a>
            <a href="#" className="hover:text-slate-900 transition-colors" data-testid="link-support">Support</a>
          </div>
          <div className="text-sm text-slate-500" data-testid="text-copyright">
            © 2024 Explainer AI Video Generator. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={VideoGenerator} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/my-videos" component={MyVideos} />
          <Route path="/video-enhancements" component={VideoEnhancements} />
          <Route path="/credits" component={Credits} />
          <Route path="/videos/:id/preview" component={VideoPreview} />
          <Route path="/videos/:id/edit" component={VideoEdit} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={Settings} />
          <Route path="/image-studio" component={ImageStudio} />
          <Route path="/connect-accounts" component={ConnectAccounts} />
          <Route path="/music-library" component={MusicLibrary} />
          <Route path="/help" component={Help} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-slate-50 font-inter text-slate-900">
            <Router />
          </div>
          <Toaster />
          <PWAInstallPrompt />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-slate-50 font-inter text-slate-900">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1">
                <Router />
              </main>
              <Footer />
            </div>
          </div>
          <Toaster />
          <PWAInstallPrompt />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

export default AppWrapper;
