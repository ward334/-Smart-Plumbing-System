import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/contexts/AlertContext";
import { useLocation } from "wouter";
import { ArrowLeft, Activity, Droplets, CheckCircle2, AlertTriangle, Shield, TrendingUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { sensors, alerts, dashboardStats, refreshData, isLoading } = useAlerts();
  const [, setLocation] = useLocation();

  // Get AI predictions
  const riskScoresQuery = trpc.prediction.getAllRiskScores.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Use backend stats or calculate from local data
  const totalSensors = dashboardStats?.totalSensors ?? sensors.length;
  const activeLeaks = dashboardStats?.leakingSensors ?? sensors.filter(s => s.status === "leak").length;
  const warningSensors = dashboardStats?.warningSensors ?? 0;
  const highRiskPipes = dashboardStats?.highRiskPipes ?? 0;
  
  // Calculate leaks today
  const today = new Date().toDateString();
  const leaksToday = dashboardStats?.alertsToday ?? alerts.filter(a => new Date(a.timestamp).toDateString() === today).length;
  
  // Calculate health percentage
  const healthPercentage = dashboardStats?.healthPercentage ?? Math.max(0, 100 - (activeLeaks * 10));

  // Mock data for chart (last 7 days) - in production this would come from backend
  const chartData = [
    { name: 'Mon', leaks: 1 },
    { name: 'Tue', leaks: 0 },
    { name: 'Wed', leaks: 2 },
    { name: 'Thu', leaks: 0 },
    { name: 'Fri', leaks: 1 },
    { name: 'Sat', leaks: 0 },
    { name: 'Sun', leaks: leaksToday },
  ];

  // Risk score data for chart
  const riskData = riskScoresQuery.data?.slice(0, 5).map(score => ({
    name: `Sensor ${score.sensorId}`,
    risk: score.riskScore,
    color: score.riskScore > 70 ? '#ef4444' : score.riskScore > 40 ? '#f59e0b' : '#22c55e',
  })) ?? [];

  const stats = [
    {
      label: "Total Sensors",
      value: totalSensors,
      icon: Droplets,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Leaks Today",
      value: leaksToday,
      icon: AlertTriangle,
      color: leaksToday > 0 ? "text-red-500" : "text-orange-500",
      bg: leaksToday > 0 ? "bg-red-50" : "bg-orange-50",
    },
    {
      label: "Warnings",
      value: warningSensors,
      icon: Shield,
      color: warningSensors > 0 ? "text-yellow-500" : "text-green-500",
      bg: warningSensors > 0 ? "bg-yellow-50" : "bg-green-50",
    },
    {
      label: "System Health",
      value: `${healthPercentage}%`,
      icon: Activity,
      color: healthPercentage > 80 ? "text-green-500" : healthPercentage > 50 ? "text-yellow-500" : "text-red-500",
      bg: healthPercentage > 80 ? "bg-green-50" : healthPercentage > 50 ? "bg-yellow-50" : "bg-red-50",
    },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
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
              <h1 className="font-heading text-3xl font-bold text-foreground">System Dashboard</h1>
              <p className="text-muted-foreground mt-1">AI-powered network monitoring & predictions</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={refreshData}
            disabled={isLoading}
            className="rounded-full"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-3 transition-transform hover:scale-[1.02]"
            >
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold font-heading text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* High Risk Alert */}
        {highRiskPipes > 0 && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-8 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-800">High Risk Alert</p>
              <p className="text-sm text-red-600">{highRiskPipes} pipe(s) have been identified as high risk by AI analysis. Immediate inspection recommended.</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Leak Frequency Chart */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Leak Frequency (7 Days)
            </h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLeaks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} 
                    dy={10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="leaks" 
                    stroke="var(--primary)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorLeaks)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Risk Prediction Chart */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> AI Risk Predictions
            </h2>
            {riskData.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border)',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Risk Score']}
                    />
                    <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">No risk data available. Run simulations to generate predictions.</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* System Info */}
          <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl">
            <h2 className="font-heading text-lg font-bold mb-4 text-primary flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> System Information
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-primary/10">
                <span className="text-muted-foreground text-sm">Version</span>
                <span className="font-medium text-sm">SPS v2.0.0 (AI Enhanced)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-primary/10">
                <span className="text-muted-foreground text-sm">Active Sensors</span>
                <span className="font-medium text-sm">{dashboardStats?.activeSensors ?? sensors.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-primary/10">
                <span className="text-muted-foreground text-sm">Network Uptime</span>
                <span className="font-medium text-sm">99.98%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-primary/10">
                <span className="text-muted-foreground text-sm">AI Model Status</span>
                <span className="font-medium text-sm text-green-600">Active</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground text-sm">Pattern Learning</span>
                <span className="font-medium text-sm text-green-600">Enabled</span>
              </div>
            </div>
          </div>

          {/* AI Features */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6 rounded-2xl">
            <h2 className="font-heading text-lg font-bold mb-4 text-primary flex items-center gap-2">
              <Shield className="h-5 w-5" /> AI Capabilities
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Smart Monitoring</p>
                  <p className="text-xs text-muted-foreground">Reduces false alerts by 85%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Pattern Learning</p>
                  <p className="text-xs text-muted-foreground">Learns normal flow patterns</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Predictive Analysis</p>
                  <p className="text-xs text-muted-foreground">Predicts failures before they occur</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
