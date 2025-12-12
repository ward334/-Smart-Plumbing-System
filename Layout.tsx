import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Droplets, LayoutDashboard, Bell, Map } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function Layout({ children, className }: LayoutProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    { label: "Home", path: "/home", icon: Droplets },
    { label: "Blueprint", path: "/blueprint", icon: Map },
    { label: "Alerts", path: "/alerts", icon: Bell },
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setLocation("/home")}
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Droplets className="h-5 w-5" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-foreground">
              SPS
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location === item.path
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className={cn("container py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500", className)}>
        {children}
      </main>
    </div>
  );
}
