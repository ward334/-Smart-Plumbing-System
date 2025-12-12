import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useLocation } from "wouter";
import { ArrowRight, Activity, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center min-h-[80vh]">
        {/* Text Content */}
        <div className="flex flex-col gap-6 items-start">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Smart Plumbing System v1.0
          </div>
          
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-6xl text-foreground">
            Predict Leaks. <br />
            <span className="text-primary">Protect Infrastructure.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            SPS integrates IoT sensors and AI to detect water pipe leaks and blockages before they cause damage. 
            Real-time monitoring and precise location tracking for modern buildings.
          </p>

          <div className="flex flex-wrap gap-4 mt-2">
            <Button 
              size="lg" 
              className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              onClick={() => setLocation("/blueprint")}
            >
              View Blueprint <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="rounded-full px-8"
              onClick={() => setLocation("/dashboard")}
            >
              System Status
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-lg">
            <div className="flex flex-col gap-2">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-primary mb-1">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm">Real-time</h3>
              <p className="text-xs text-muted-foreground">Instant alerts via web</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-primary mb-1">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm">AI Prediction</h3>
              <p className="text-xs text-muted-foreground">Prevent future leaks</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-primary mb-1">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm">Secure</h3>
              <p className="text-xs text-muted-foreground">24/7 Monitoring</p>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="relative lg:h-full flex items-center justify-center">
          <div className="relative w-full aspect-square max-w-md lg:max-w-full">
            {/* Abstract decorative blobs */}
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50 animate-pulse"></div>
            <div className="absolute -bottom-8 -left-8 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl opacity-50"></div>
            
            <img 
              src="/images/hero-pipes.png" 
              alt="SPS Pipe Network" 
              className="relative z-10 w-full h-auto object-contain drop-shadow-2xl rounded-3xl border border-white/20 bg-white/30 backdrop-blur-sm"
            />
            
            {/* Floating Cards */}
            <div className="absolute top-10 -left-4 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 animate-bounce-slow">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-xs font-bold text-foreground">System Active</p>
                  <p className="text-[10px] text-muted-foreground">Monitoring 3 zones</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-10 -right-4 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 animate-bounce-slow delay-700">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-primary">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Flow Rate</p>
                  <p className="text-[10px] text-muted-foreground">Normal (45 PSI)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
