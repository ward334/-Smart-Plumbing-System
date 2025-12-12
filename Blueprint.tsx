import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/contexts/AlertContext";
import { useLocation } from "wouter";
import { AlertTriangle, Droplets, List, Upload, Info, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Blueprint() {
  const { sensors, simulateLeak, resetSystem, blueprintImage, setBlueprintImage, isLoading, seedSensors } = useAlerts();
  const [, setLocation] = useLocation();
  const [isSimulating, setIsSimulating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSimulate = async (sensorId?: number) => {
    setIsSimulating(true);
    setDialogOpen(false);
    
    try {
      const alert = await simulateLeak(sensorId);
      
      toast.error(alert.message, {
        description: `Location: ${alert.location}`,
        action: {
          label: "View Alerts",
          onClick: () => setLocation("/alerts"),
        },
      });
    } catch (error) {
      toast.error("Failed to simulate leak", {
        description: "Please try again",
      });
    }

    setTimeout(() => setIsSimulating(false), 1000);
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetSystem();
      toast.success("System reset successfully", {
        description: "All sensors are now in normal state",
      });
    } catch (error) {
      toast.error("Failed to reset system");
    }
    setIsResetting(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBlueprintImage(reader.result as string);
        toast.success("Blueprint uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const getSensorStatusColor = (status: string) => {
    switch (status) {
      case "leak":
        return "bg-destructive border-destructive text-white";
      case "warning":
        return "bg-yellow-500 border-yellow-500 text-white";
      case "offline":
        return "bg-gray-400 border-gray-400 text-white";
      default:
        return "bg-white border-primary text-primary";
    }
  };

  const getSensorStatusText = (status: string) => {
    switch (status) {
      case "leak":
        return "Leak Detected";
      case "warning":
        return "Warning";
      case "offline":
        return "Offline";
      default:
        return "Normal";
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/home")}
              className="rounded-full hover:bg-primary/10 hover:text-primary"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">Building Blueprint</h1>
              <p className="text-muted-foreground mt-1">Interactive sensor map with AI monitoring</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileUpload}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full"
            >
              <Upload className="h-4 w-4 mr-2" /> Upload Blueprint
            </Button>

            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={isResetting}
              className="rounded-full"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isResetting && "animate-spin")} /> 
              Reset System
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className={cn(
                    "rounded-full shadow-lg shadow-primary/20 transition-all",
                    isSimulating && "opacity-80"
                  )}
                  disabled={isSimulating}
                >
                  {isSimulating ? (
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                      Simulating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Droplets className="h-4 w-4" /> Simulate Leak
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Simulate Leak Event</DialogTitle>
                  <DialogDescription>
                    Choose a sensor to trigger a leak alert or simulate a random event.
                    The AI system will analyze the leak and classify its severity.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Button onClick={() => handleSimulate()} className="w-full" variant="destructive">
                    Random Sensor Leak
                  </Button>
                  <div className="grid grid-cols-1 gap-2">
                    {sensors.map(sensor => (
                      <Button 
                        key={sensor.id} 
                        variant="outline" 
                        onClick={() => handleSimulate(sensor.id)}
                        className="justify-start"
                        disabled={sensor.status === "leak"}
                      >
                        <span className={cn(
                          "h-2 w-2 rounded-full mr-2",
                          sensor.status === "leak" ? "bg-destructive" : "bg-primary"
                        )}></span>
                        Sensor #{sensor.id} - {sensor.location}
                        {sensor.status === "leak" && <span className="ml-auto text-xs text-destructive">(Leaking)</span>}
                      </Button>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="secondary"
              onClick={() => setLocation("/alerts")}
              className="rounded-full"
            >
              <List className="h-4 w-4 mr-2" /> View Alerts
            </Button>
          </div>
        </div>

        {/* Blueprint Map Container */}
        <div className="relative w-full aspect-[16/9] bg-white rounded-3xl shadow-sm border border-border overflow-hidden group">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading sensors...</span>
              </div>
            </div>
          )}
          
          {/* Background Image */}
          <img 
            src={blueprintImage} 
            alt="Floor Plan" 
            className="w-full h-full object-cover opacity-90 transition-transform duration-700"
          />
          
          {/* Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

          {/* Sensors */}
          {sensors.map((sensor) => (
            <TooltipProvider key={sensor.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110 z-10"
                    style={{ left: `${sensor.x}%`, top: `${sensor.y}%` }}
                    onClick={() => {
                      if (sensor.status === "leak") {
                        toast.info(`Sensor #${sensor.id} Status`, {
                          description: "Active Leak Detected! AI analysis in progress."
                        });
                      } else if (sensor.status === "warning") {
                        toast.warning(`Sensor #${sensor.id} Status`, {
                          description: "Abnormal flow pattern detected. Monitoring closely."
                        });
                      } else {
                        toast.success(`Sensor #${sensor.id} Status`, {
                          description: "Normal operation. No leaks detected."
                        });
                      }
                    }}
                  >
                    <div className="relative">
                      {/* Pulse Effect for Leak */}
                      {sensor.status === "leak" && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping"></span>
                      )}
                      {sensor.status === "warning" && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-50 animate-pulse"></span>
                      )}
                      
                      {/* Sensor Icon */}
                      <div className={cn(
                        "relative flex items-center justify-center h-10 w-10 rounded-full shadow-lg border-2 transition-colors duration-300",
                        getSensorStatusColor(sensor.status)
                      )}>
                        {sensor.status === "leak" ? (
                          <AlertTriangle className="h-5 w-5 animate-pulse" />
                        ) : sensor.status === "warning" ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-primary"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-white/95 backdrop-blur border-border p-3">
                  <div className="text-sm font-bold">Sensor #{sensor.id} {sensor.name && `- ${sensor.name}`}</div>
                  <div className="text-xs text-muted-foreground">{sensor.description}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Info className="h-3 w-3" /> {sensor.location}
                  </div>
                  <div className={cn(
                    "text-xs font-bold mt-2 uppercase tracking-wider",
                    sensor.status === "leak" ? "text-destructive" : 
                    sensor.status === "warning" ? "text-yellow-600" : "text-green-600"
                  )}>
                    {getSensorStatusText(sensor.status)}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-6 justify-center flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary"></div>
            <span className="text-sm text-muted-foreground">Active Sensor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-muted-foreground">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Leak Detected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400"></div>
            <span className="text-sm text-muted-foreground">Offline</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
