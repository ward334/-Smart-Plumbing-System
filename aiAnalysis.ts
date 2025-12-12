/**
 * AI Analysis Service for SPS Smart Plumbing System
 * 
 * This module provides:
 * - Smart Monitoring: Track flow over short periods to reduce false alerts
 * - Flow Comparison: Compare flow between pipes to distinguish low tank water from leaks
 * - Pattern Learning: Learn normal flow patterns for early warning
 * - Risk Prediction: Predict pipes more likely to leak
 * - Leak Classification: Classify leak type and severity
 */

import { invokeLLM } from "./_core/llm";
import * as db from "./db";

// ============ TYPES ============
export interface FlowAnalysisResult {
  sensorId: number;
  status: "normal" | "warning" | "leak" | "blockage";
  confidence: number; // 0-100
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  factors: string[];
}

export interface SystemHealthReport {
  overallHealth: number; // 0-100
  totalSensors: number;
  activeSensors: number;
  warningCount: number;
  leakCount: number;
  predictions: PredictionResult[];
}

export interface PredictionResult {
  sensorId: number;
  sensorName: string;
  riskScore: number;
  leakProbability: number;
  blockageProbability: number;
  factors: string[];
  recommendation: string;
}

// ============ SMART MONITORING ============

/**
 * Analyze flow readings over a short period to reduce false alerts
 * Uses rolling average and variance to detect genuine anomalies
 */
export async function analyzeFlowOverTime(sensorId: number, windowMinutes: number = 5): Promise<FlowAnalysisResult> {
  const windowMs = windowMinutes * 60 * 1000;
  const endTime = Date.now();
  const startTime = endTime - windowMs;
  
  const readings = await db.getFlowReadingsInTimeRange(sensorId, startTime, endTime);
  const sensor = await db.getSensorById(sensorId);
  
  if (!sensor) {
    return {
      sensorId,
      status: "normal",
      confidence: 0,
      message: "Sensor not found",
      severity: "low",
      factors: ["sensor_not_found"],
    };
  }
  
  if (readings.length < 3) {
    return {
      sensorId,
      status: "normal",
      confidence: 50,
      message: "Insufficient data for analysis",
      severity: "low",
      factors: ["insufficient_data"],
    };
  }
  
  // Calculate statistics
  const flowRates = readings.map(r => r.flowRate);
  const pressures = readings.map(r => r.pressure);
  
  const avgFlow = flowRates.reduce((a, b) => a + b, 0) / flowRates.length;
  const avgPressure = pressures.reduce((a, b) => a + b, 0) / pressures.length;
  
  const flowVariance = flowRates.reduce((sum, rate) => sum + Math.pow(rate - avgFlow, 2), 0) / flowRates.length;
  const flowStdDev = Math.sqrt(flowVariance);
  
  // Check for anomalies
  const anomalyCheck = await db.checkFlowAnomaly(sensorId, avgFlow);
  
  const factors: string[] = [];
  let status: "normal" | "warning" | "leak" | "blockage" = "normal";
  let severity: "low" | "medium" | "high" | "critical" = "low";
  let confidence = 70;
  
  // High variance indicates unstable flow (possible leak)
  if (flowStdDev > avgFlow * 0.3) {
    factors.push("high_flow_variance");
    status = "warning";
    severity = "medium";
  }
  
  // Sudden pressure drop indicates leak
  if (avgPressure < 3000) { // Below 30 PSI
    factors.push("low_pressure");
    status = "leak";
    severity = "high";
    confidence = 85;
  }
  
  // Very low flow might indicate blockage
  if (avgFlow < 100 && avgPressure > 5000) { // Low flow but high pressure
    factors.push("possible_blockage");
    status = "blockage";
    severity = "medium";
    confidence = 75;
  }
  
  // Check against learned patterns
  if (anomalyCheck.isAnomaly) {
    factors.push("pattern_deviation");
    if (status === "normal") {
      status = "warning";
      severity = "medium";
    }
    confidence = Math.min(confidence + 10, 95);
  }
  
  const message = generateAnalysisMessage(status, factors, sensor.location);
  
  return {
    sensorId,
    status,
    confidence,
    message,
    severity,
    factors,
  };
}

/**
 * Compare flow between all pipes to distinguish low tank water from real leaks
 */
export async function compareFlowAcrossPipes(): Promise<{
  isSystemWideIssue: boolean;
  affectedSensors: number[];
  diagnosis: string;
}> {
  const flowVariance = await db.calculateFlowVariance();
  
  if (!flowVariance) {
    return {
      isSystemWideIssue: false,
      affectedSensors: [],
      diagnosis: "Insufficient data for comparison",
    };
  }
  
  const { sensorData, stdDev, avgFlow } = flowVariance;
  
  // If all sensors show similar low flow, it's likely a system-wide issue (low tank)
  const lowFlowSensors = sensorData.filter(s => Number(s.avgFlowRate) < avgFlow * 0.5);
  const isSystemWide = lowFlowSensors.length > sensorData.length * 0.7;
  
  if (isSystemWide) {
    return {
      isSystemWideIssue: true,
      affectedSensors: sensorData.map(s => s.sensorId),
      diagnosis: "System-wide low flow detected. Possible causes: low water tank level, main supply issue, or scheduled maintenance.",
    };
  }
  
  // Find outliers (sensors with significantly different flow)
  const outliers = sensorData.filter(s => {
    const deviation = Math.abs(Number(s.avgFlowRate) - avgFlow);
    return deviation > stdDev * 2;
  });
  
  if (outliers.length > 0) {
    return {
      isSystemWideIssue: false,
      affectedSensors: outliers.map(s => s.sensorId),
      diagnosis: `Localized flow anomaly detected in ${outliers.length} sensor(s). Possible leak or blockage in specific pipe sections.`,
    };
  }
  
  return {
    isSystemWideIssue: false,
    affectedSensors: [],
    diagnosis: "All sensors operating within normal parameters.",
  };
}

// ============ AI PATTERN LEARNING ============

/**
 * Learn and update flow patterns from recent readings
 */
export async function learnFlowPatterns(sensorId: number): Promise<void> {
  const readings = await db.getRecentFlowReadings(sensorId, 100);
  
  if (readings.length < 10) return;
  
  // Group readings by hour and day
  const patterns: Map<string, number[]> = new Map();
  
  for (const reading of readings) {
    const date = new Date(reading.timestamp);
    const key = `${date.getDay()}-${date.getHours()}`;
    
    if (!patterns.has(key)) {
      patterns.set(key, []);
    }
    patterns.get(key)!.push(reading.flowRate);
  }
  
  // Calculate and store patterns
  for (const [key, flowRates] of Array.from(patterns.entries())) {
    const [dayOfWeek, hourOfDay] = key.split("-").map(Number);
    
    const avg = flowRates.reduce((a: number, b: number) => a + b, 0) / flowRates.length;
    const min = Math.min(...flowRates);
    const max = Math.max(...flowRates);
    const variance = flowRates.reduce((sum: number, rate: number) => sum + Math.pow(rate - avg, 2), 0) / flowRates.length;
    const stdDev = Math.sqrt(variance);
    
    await db.upsertFlowPattern({
      sensorId,
      hourOfDay,
      dayOfWeek,
      avgFlowRate: Math.round(avg),
      minFlowRate: min,
      maxFlowRate: max,
      stdDeviation: Math.round(stdDev),
      sampleCount: flowRates.length,
    });
  }
}

// ============ AI RISK PREDICTION ============

/**
 * Calculate risk score for a pipe based on historical data and patterns
 */
export async function calculatePipeRiskScore(sensorId: number): Promise<PredictionResult | null> {
  const sensor = await db.getSensorById(sensorId);
  if (!sensor) return null;
  
  const recentReadings = await db.getRecentFlowReadings(sensorId, 50);
  const patterns = await db.getAllFlowPatternsForSensor(sensorId);
  
  const factors: string[] = [];
  let riskScore = 0;
  let leakProbability = 0;
  let blockageProbability = 0;
  
  // Factor 1: Current status
  if (sensor.status === "leak") {
    riskScore += 50;
    leakProbability += 80;
    factors.push("Active leak detected");
  } else if (sensor.status === "warning") {
    riskScore += 25;
    leakProbability += 30;
    factors.push("Warning status active");
  }
  
  // Factor 2: Flow variance in recent readings
  if (recentReadings.length >= 10) {
    const flowRates = recentReadings.map(r => r.flowRate);
    const avg = flowRates.reduce((a: number, b: number) => a + b, 0) / flowRates.length;
    const variance = flowRates.reduce((sum: number, rate: number) => sum + Math.pow(rate - avg, 2), 0) / flowRates.length;
    const coefficientOfVariation = Math.sqrt(variance) / avg;
    
    if (coefficientOfVariation > 0.5) {
      riskScore += 20;
      leakProbability += 25;
      factors.push("High flow variability");
    }
    
    // Check for pressure drops
    const pressures = recentReadings.map(r => r.pressure);
    const avgPressure = pressures.reduce((a, b) => a + b, 0) / pressures.length;
    if (avgPressure < 3500) {
      riskScore += 15;
      leakProbability += 20;
      factors.push("Below-normal pressure");
    }
  }
  
  // Factor 3: Pattern deviations
  if (patterns.length > 0) {
    const now = new Date();
    const currentPattern = patterns.find(
      p => p.hourOfDay === now.getHours() && p.dayOfWeek === now.getDay()
    );
    
    if (currentPattern && recentReadings.length > 0) {
      const currentFlow = recentReadings[0].flowRate;
      const deviation = Math.abs(currentFlow - currentPattern.avgFlowRate);
      
      if (deviation > currentPattern.stdDeviation * 2) {
        riskScore += 15;
        factors.push("Significant pattern deviation");
      }
    }
  }
  
  // Factor 4: Pipe type risk
  if (sensor.pipeType === "main") {
    riskScore += 5;
    factors.push("Main pipe (higher impact)");
  }
  
  // Normalize scores
  riskScore = Math.min(riskScore, 100);
  leakProbability = Math.min(leakProbability, 100);
  blockageProbability = Math.min(blockageProbability, 100);
  
  // Generate recommendation
  let recommendation = "Continue regular monitoring.";
  if (riskScore > 70) {
    recommendation = "Immediate inspection recommended. High risk of failure.";
  } else if (riskScore > 40) {
    recommendation = "Schedule preventive maintenance within the next week.";
  } else if (riskScore > 20) {
    recommendation = "Monitor closely. Consider inspection during next maintenance cycle.";
  }
  
  // Store the risk score
  await db.upsertPipeRiskScore({
    sensorId,
    riskScore,
    leakProbability: leakProbability * 100,
    blockageProbability: blockageProbability * 100,
    factors: JSON.stringify(factors),
    lastAnalyzedAt: Date.now(),
  });
  
  return {
    sensorId,
    sensorName: sensor.name,
    riskScore,
    leakProbability,
    blockageProbability,
    factors,
    recommendation,
  };
}

// ============ LEAK CLASSIFICATION ============

/**
 * Classify leak type and severity using AI
 */
export async function classifyLeak(sensorId: number): Promise<{
  type: "pinhole" | "joint" | "burst" | "seepage" | "unknown";
  severity: "low" | "medium" | "high" | "critical";
  estimatedFlowLoss: number; // liters per hour
  urgency: string;
}> {
  const sensor = await db.getSensorById(sensorId);
  const readings = await db.getRecentFlowReadings(sensorId, 20);
  
  if (!sensor || readings.length < 5) {
    return {
      type: "unknown",
      severity: "medium",
      estimatedFlowLoss: 0,
      urgency: "Unable to classify - insufficient data",
    };
  }
  
  const flowRates = readings.map(r => r.flowRate);
  const pressures = readings.map(r => r.pressure);
  
  const avgFlow = flowRates.reduce((a, b) => a + b, 0) / flowRates.length;
  const avgPressure = pressures.reduce((a, b) => a + b, 0) / pressures.length;
  const flowVariance = flowRates.reduce((sum, rate) => sum + Math.pow(rate - avgFlow, 2), 0) / flowRates.length;
  
  // Classification logic based on flow characteristics
  let type: "pinhole" | "joint" | "burst" | "seepage" | "unknown" = "unknown";
  let severity: "low" | "medium" | "high" | "critical" = "medium";
  let estimatedFlowLoss = 0;
  
  // Burst: Sudden high flow, low pressure
  if (avgFlow > 5000 && avgPressure < 2000) {
    type = "burst";
    severity = "critical";
    estimatedFlowLoss = avgFlow / 100 * 60; // Convert to L/hour
  }
  // Joint leak: Moderate flow increase, gradual pressure drop
  else if (avgFlow > 3000 && avgPressure < 4000 && flowVariance < 1000000) {
    type = "joint";
    severity = "high";
    estimatedFlowLoss = (avgFlow - 2000) / 100 * 60;
  }
  // Pinhole: Small consistent increase in flow
  else if (avgFlow > 2000 && avgFlow < 4000 && flowVariance < 500000) {
    type = "pinhole";
    severity = "medium";
    estimatedFlowLoss = (avgFlow - 1500) / 100 * 60;
  }
  // Seepage: Very slow, minimal flow change
  else if (avgFlow > 1500 && avgFlow < 2500) {
    type = "seepage";
    severity = "low";
    estimatedFlowLoss = (avgFlow - 1200) / 100 * 60;
  }
  
  const urgencyMap = {
    critical: "Immediate action required. Shut off water supply if possible.",
    high: "Urgent repair needed within 24 hours.",
    medium: "Schedule repair within 1 week.",
    low: "Monitor and plan for repair during next maintenance window.",
  };
  
  return {
    type,
    severity,
    estimatedFlowLoss: Math.max(0, Math.round(estimatedFlowLoss)),
    urgency: urgencyMap[severity],
  };
}

// ============ SYSTEM HEALTH ============

/**
 * Generate comprehensive system health report
 */
export async function generateSystemHealthReport(): Promise<SystemHealthReport> {
  const allSensors = await db.getAllSensors();
  const alertsToday = await db.getAlertsToday();
  
  const activeSensors = allSensors.filter(s => s.status !== "offline").length;
  const warningSensors = allSensors.filter(s => s.status === "warning").length;
  const leakSensors = allSensors.filter(s => s.status === "leak").length;
  
  // Calculate predictions for all sensors
  const predictions: PredictionResult[] = [];
  for (const sensor of allSensors) {
    const prediction = await calculatePipeRiskScore(sensor.id);
    if (prediction) {
      predictions.push(prediction);
    }
  }
  
  // Calculate overall health
  let healthScore = 100;
  healthScore -= leakSensors * 20;
  healthScore -= warningSensors * 10;
  healthScore -= (allSensors.length - activeSensors) * 5;
  healthScore -= alertsToday.length * 2;
  
  // Factor in high-risk pipes
  const highRiskPipes = predictions.filter(p => p.riskScore > 50);
  healthScore -= highRiskPipes.length * 5;
  
  return {
    overallHealth: Math.max(0, Math.min(100, healthScore)),
    totalSensors: allSensors.length,
    activeSensors,
    warningCount: warningSensors,
    leakCount: leakSensors,
    predictions: predictions.sort((a, b) => b.riskScore - a.riskScore),
  };
}

// ============ HELPER FUNCTIONS ============

function generateAnalysisMessage(
  status: string,
  factors: string[],
  location: string
): string {
  const factorText = factors.length > 0 ? ` Factors: ${factors.join(", ")}.` : "";
  
  switch (status) {
    case "leak":
      return `Leak detected at ${location}.${factorText}`;
    case "blockage":
      return `Possible blockage detected at ${location}.${factorText}`;
    case "warning":
      return `Abnormal flow pattern at ${location}. Monitoring recommended.${factorText}`;
    default:
      return `Normal operation at ${location}.`;
  }
}

/**
 * Use LLM to generate detailed analysis report
 */
export async function generateAIAnalysisReport(sensorId: number): Promise<string> {
  const sensor = await db.getSensorById(sensorId);
  const readings = await db.getRecentFlowReadings(sensorId, 20);
  const riskScore = await db.getPipeRiskScore(sensorId);
  
  if (!sensor) return "Sensor not found.";
  
  const flowData = readings.map(r => ({
    flow: r.flowRate / 100,
    pressure: r.pressure / 100,
    time: new Date(r.timestamp).toISOString(),
  }));
  
  const prompt = `Analyze this plumbing sensor data and provide a brief technical assessment:

Sensor: ${sensor.name}
Location: ${sensor.location}
Status: ${sensor.status}
Risk Score: ${riskScore?.riskScore ?? "N/A"}

Recent Flow Data (last 20 readings):
${JSON.stringify(flowData.slice(0, 10), null, 2)}

Provide:
1. Current status assessment (1-2 sentences)
2. Trend analysis (1-2 sentences)
3. Recommended action (1 sentence)

Keep response under 150 words.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a plumbing system analyst. Provide concise, technical assessments." },
        { role: "user", content: prompt },
      ],
    });
    
    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
    return "Analysis unavailable.";
  } catch (error) {
    console.error("LLM analysis failed:", error);
    return "AI analysis temporarily unavailable.";
  }
}
