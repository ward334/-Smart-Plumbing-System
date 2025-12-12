import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/contexts/AlertContext";
import { useLocation } from "wouter";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export default function Alerts() {
  const { alerts, markAlertsAsRead } = useAlerts();
  const [, setLocation] = useLocation();

  // Mark alerts as read when visiting the page
  useEffect(() => {
    markAlertsAsRead();
  }, []);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/blueprint")}
              className="rounded-full hover:bg-primary/10 hover:text-primary"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">System Alerts</h1>
              <p className="text-muted-foreground mt-1">History of detected anomalies</p>
            </div>
          </div>
          
          <div className="text-sm font-medium px-4 py-2 bg-secondary rounded-full text-secondary-foreground">
            Total Alerts: {alerts.length}
          </div>
        </div>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-3xl bg-card/50">
              <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground">All Systems Normal</h3>
              <p className="text-muted-foreground mt-2 max-w-xs">
                No leaks or anomalies have been detected in the network.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id}
                className={cn(
                  "group relative flex items-start gap-4 p-6 rounded-2xl border transition-all duration-300 hover:shadow-md cursor-pointer",
                  alert.isNew 
                    ? "bg-destructive/5 border-destructive/20" 
                    : "bg-card border-border hover:border-primary/20"
                )}
                onClick={() => setLocation("/blueprint")}
              >
                <div className={cn(
                  "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                  alert.isNew ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
                )}>
                  <AlertCircle className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={cn(
                      "font-bold text-base",
                      alert.isNew ? "text-destructive" : "text-foreground"
                    )}>
                      Leak Detected
                    </h3>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center text-xs font-medium text-primary bg-primary/5 w-fit px-2 py-1 rounded-md">
                    <MapPin className="h-3 w-3 mr-1" />
                    {alert.location}
                  </div>
                </div>

                {alert.isNew && (
                  <span className="absolute top-6 right-6 h-2 w-2 rounded-full bg-destructive animate-pulse"></span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
