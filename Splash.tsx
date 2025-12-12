import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Splash() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-white overflow-hidden">
      {/* Background Illustration */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20 pointer-events-none">
        <img 
          src="/images/hero-pipes.png" 
          alt="Smart Water Pipes" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
        <h1 className="font-heading text-8xl font-bold text-foreground tracking-tighter drop-shadow-sm">
          SPS
        </h1>
        <p className="text-xl text-muted-foreground font-medium tracking-wide">
          Smart Plumbing System
        </p>
        
        <Button 
          size="lg" 
          className="rounded-full px-12 py-6 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105"
          onClick={() => setLocation("/login")}
        >
          Login
        </Button>
      </div>
    </div>
  );
}
