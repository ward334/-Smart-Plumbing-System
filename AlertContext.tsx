import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export interface Alert {
  id: string;
  sensorId: number;
  message: string;
  location: string;
  timestamp: string;
  isNew: boolean;
  type?: string;
  severity?: string;
}

export interface Sensor {
  id: number;
  x: number; // Percentage position X
  y: number; // Percentage position Y
  status: "normal" | "leak" | "warning" | "offline";
  location: string;
  description: string;
  name?: string;
}

interface DashboardStats {
  totalSensors: number;
  activeSensors: number;
  leakingSensors: number;
  warningSensors: number;
  alertsToday: number;
  healthPercentage: number;
  highRiskPipes: number;
}

interface AlertContextType {
  sensors: Sensor[];
  alerts: Alert[];
  blueprintImage: string;
  dashboardStats: DashboardStats | null;
  isLoading: boolean;
  setBlueprintImage: (url: string) => void;
  simulateLeak: (targetSensorId?: number) => Promise<Alert>;
  resetSystem: () => Promise<void>;
  markAlertsAsRead: () => void;
  refreshData: () => void;
  seedSensors: () => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Default stats for fallback
const defaultStats: DashboardStats = {
  totalSensors: 0,
  activeSensors: 0,
  leakingSensors: 0,
  warningSensors: 0,
  alertsToday: 0,
  healthPercentage: 100,
  highRiskPipes: 0,
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [blueprintImage, setBlueprintImage] = useState<string>("/images/blueprint-bg.png");
  const [isLoading, setIsLoading] = useState(true);
  
  // Local state with fallback data
  const [localSensors, setLocalSensors] = useState<Sensor[]>([
    { id: 1, x: 25, y: 30, status: "normal", location: "Upper floor – Kitchen", description: "Main Pipe", name: "Sensor #1" },
    { id: 2, x: 60, y: 45, status: "normal", location: "Ground floor – Bathroom", description: "Supply Line", name: "Sensor #2" },
    { id: 3, x: 40, y: 75, status: "normal", location: "Basement – Utility Room", description: "Drainage", name: "Sensor #3" },
  ]);

  const [localAlerts, setLocalAlerts] = useState<Alert[]>(() => {
    const saved = localStorage.getItem("sps-alerts");
    return saved ? JSON.parse(saved) : [];
  });

  // tRPC queries
  const sensorsQuery = trpc.sensors.list.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  const alertsQuery = trpc.alerts.list.useQuery({ limit: 50 }, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  const dashboardQuery = trpc.health.getDashboardStats.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Mutations
  const simulateLeakMutation = trpc.simulation.simulateLeak.useMutation();
  const resetSystemMutation = trpc.simulation.resetSystem.useMutation();
  const seedSensorsMutation = trpc.simulation.seedSensors.useMutation();

  // Transform backend sensors to frontend format
  const sensors: Sensor[] = sensorsQuery.data?.length 
    ? sensorsQuery.data.map(s => ({
        id: s.id,
        x: s.positionX,
        y: s.positionY,
        status: s.status === "active" ? "normal" : s.status as Sensor["status"],
        location: s.location,
        description: s.description || s.name,
        name: s.name,
      }))
    : localSensors;

  // Transform backend alerts to frontend format
  const alerts: Alert[] = alertsQuery.data?.length
    ? alertsQuery.data.map(a => ({
        id: String(a.id),
        sensorId: a.sensorId,
        message: a.message,
        location: a.location,
        timestamp: new Date(a.timestamp).toISOString(),
        isNew: !a.isRead,
        type: a.type,
        severity: a.severity,
      }))
    : localAlerts;

  // Dashboard stats
  const dashboardStats: DashboardStats = dashboardQuery.data 
    ? {
        totalSensors: dashboardQuery.data.totalSensors,
        activeSensors: dashboardQuery.data.activeSensors,
        leakingSensors: dashboardQuery.data.leakingSensors,
        warningSensors: dashboardQuery.data.warningSensors,
        alertsToday: dashboardQuery.data.alertsToday,
        healthPercentage: dashboardQuery.data.healthPercentage,
        highRiskPipes: dashboardQuery.data.highRiskPipes,
      }
    : defaultStats;

  // Auto-seed sensors on first load if none exist
  useEffect(() => {
    const checkAndSeedSensors = async () => {
      // Wait for initial query to complete
      if (!sensorsQuery.isLoading && sensorsQuery.data?.length === 0) {
        console.log("No sensors found, seeding default sensors...");
        try {
          await seedSensorsMutation.mutateAsync();
          sensorsQuery.refetch();
          dashboardQuery.refetch();
        } catch (error) {
          console.warn("Failed to auto-seed sensors:", error);
        }
      }
    };
    checkAndSeedSensors();
  }, [sensorsQuery.isLoading, sensorsQuery.data]);

  // Update loading state
  useEffect(() => {
    setIsLoading(sensorsQuery.isLoading || alertsQuery.isLoading);
  }, [sensorsQuery.isLoading, alertsQuery.isLoading]);

  // Persist local alerts to localStorage
  useEffect(() => {
    localStorage.setItem("sps-alerts", JSON.stringify(localAlerts));
  }, [localAlerts]);

  const simulateLeak = useCallback(async (targetSensorId?: number): Promise<Alert> => {
    try {
      const result = await simulateLeakMutation.mutateAsync({ sensorId: targetSensorId });
      
      // Refetch data
      sensorsQuery.refetch();
      alertsQuery.refetch();
      dashboardQuery.refetch();
      
      return {
        id: String(result.alertId),
        sensorId: result.sensor.id,
        message: result.message,
        location: result.location,
        timestamp: new Date().toISOString(),
        isNew: true,
      };
    } catch (error) {
      // Fallback to local simulation
      console.warn("Backend simulation failed, using local fallback:", error);
      
      let sensorToLeak: Sensor;
      if (targetSensorId) {
        const found = sensors.find(s => s.id === targetSensorId);
        if (!found) throw new Error("Sensor not found");
        sensorToLeak = found;
      } else {
        const randomSensorIndex = Math.floor(Math.random() * sensors.length);
        sensorToLeak = sensors[randomSensorIndex];
      }

      // Update local sensor status
      setLocalSensors((prev) =>
        prev.map((s) =>
          s.id === sensorToLeak.id ? { ...s, status: "leak" as const } : s
        )
      );

      // Create new alert
      const newAlert: Alert = {
        id: crypto.randomUUID(),
        sensorId: sensorToLeak.id,
        message: `Leak detected in sensor #${sensorToLeak.id}`,
        location: sensorToLeak.location,
        timestamp: new Date().toISOString(),
        isNew: true,
      };

      setLocalAlerts((prev) => [newAlert, ...prev]);
      return newAlert;
    }
  }, [sensors, simulateLeakMutation, sensorsQuery, alertsQuery, dashboardQuery]);

  const resetSystem = useCallback(async () => {
    try {
      await resetSystemMutation.mutateAsync();
      sensorsQuery.refetch();
      alertsQuery.refetch();
      dashboardQuery.refetch();
    } catch (error) {
      console.warn("Backend reset failed, using local fallback:", error);
      setLocalSensors((prev) => prev.map((s) => ({ ...s, status: "normal" as const })));
    }
  }, [resetSystemMutation, sensorsQuery, alertsQuery, dashboardQuery]);

  const markAlertsAsRead = useCallback(() => {
    setLocalAlerts((prev) => prev.map((a) => ({ ...a, isNew: false })));
  }, []);

  const refreshData = useCallback(() => {
    sensorsQuery.refetch();
    alertsQuery.refetch();
    dashboardQuery.refetch();
  }, [sensorsQuery, alertsQuery, dashboardQuery]);

  const seedSensors = useCallback(async () => {
    try {
      await seedSensorsMutation.mutateAsync();
      sensorsQuery.refetch();
    } catch (error) {
      console.warn("Failed to seed sensors:", error);
    }
  }, [seedSensorsMutation, sensorsQuery]);

  return (
    <AlertContext.Provider
      value={{ 
        sensors, 
        alerts, 
        blueprintImage, 
        dashboardStats,
        isLoading,
        setBlueprintImage, 
        simulateLeak, 
        resetSystem, 
        markAlertsAsRead,
        refreshData,
        seedSensors,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlerts must be used within an AlertProvider");
  }
  return context;
}
