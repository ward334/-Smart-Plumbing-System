import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  sensors, InsertSensor, Sensor,
  flowReadings, InsertFlowReading,
  alerts, InsertAlert, Alert,
  flowPatterns, InsertFlowPattern,
  pipeRiskScores, InsertPipeRiskScore
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ SENSOR QUERIES ============
export async function getAllSensors(): Promise<Sensor[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(sensors).orderBy(sensors.id);
}

export async function getSensorById(id: number): Promise<Sensor | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sensors).where(eq(sensors.id, id)).limit(1);
  return result[0];
}

export async function createSensor(sensor: InsertSensor): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sensors).values(sensor);
  return result[0].insertId;
}

export async function updateSensorStatus(id: number, status: "active" | "leak" | "warning" | "offline"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(sensors).set({ status }).where(eq(sensors.id, id));
}

// ============ FLOW READINGS QUERIES ============
export async function addFlowReading(reading: InsertFlowReading): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(flowReadings).values(reading);
  return result[0].insertId;
}

export async function getRecentFlowReadings(sensorId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(flowReadings)
    .where(eq(flowReadings.sensorId, sensorId))
    .orderBy(desc(flowReadings.timestamp))
    .limit(limit);
}

export async function getFlowReadingsInTimeRange(sensorId: number, startTime: number, endTime: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(flowReadings)
    .where(and(
      eq(flowReadings.sensorId, sensorId),
      gte(flowReadings.timestamp, startTime),
      lte(flowReadings.timestamp, endTime)
    ))
    .orderBy(flowReadings.timestamp);
}

// Get aggregated flow data for all sensors to compare
export async function getAggregatedFlowData(timeWindowMs: number = 300000) { // 5 minutes default
  const db = await getDb();
  if (!db) return [];
  const cutoffTime = Date.now() - timeWindowMs;
  
  return await db.select({
    sensorId: flowReadings.sensorId,
    avgFlowRate: sql<number>`AVG(${flowReadings.flowRate})`,
    minFlowRate: sql<number>`MIN(${flowReadings.flowRate})`,
    maxFlowRate: sql<number>`MAX(${flowReadings.flowRate})`,
    avgPressure: sql<number>`AVG(${flowReadings.pressure})`,
    readingCount: sql<number>`COUNT(*)`,
  })
    .from(flowReadings)
    .where(gte(flowReadings.timestamp, cutoffTime))
    .groupBy(flowReadings.sensorId);
}

// ============ ALERTS QUERIES ============
export async function createAlert(alert: InsertAlert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alerts).values(alert);
  return result[0].insertId;
}

export async function getAllAlerts(limit: number = 50): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(alerts)
    .orderBy(desc(alerts.timestamp))
    .limit(limit);
}

export async function getUnreadAlerts(): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(alerts)
    .where(eq(alerts.isRead, false))
    .orderBy(desc(alerts.timestamp));
}

export async function markAlertAsRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
}

export async function markAllAlertsAsRead(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(alerts).set({ isRead: true }).where(eq(alerts.isRead, false));
}

export async function resolveAlert(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(alerts).set({ isResolved: true, resolvedAt: new Date() }).where(eq(alerts.id, id));
}

export async function getAlertsToday(): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return await db.select()
    .from(alerts)
    .where(gte(alerts.timestamp, startOfDay.getTime()))
    .orderBy(desc(alerts.timestamp));
}

// ============ FLOW PATTERNS (AI Learning) ============
export async function upsertFlowPattern(pattern: InsertFlowPattern): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(flowPatterns).values(pattern).onDuplicateKeyUpdate({
    set: {
      avgFlowRate: pattern.avgFlowRate,
      minFlowRate: pattern.minFlowRate,
      maxFlowRate: pattern.maxFlowRate,
      stdDeviation: pattern.stdDeviation,
      sampleCount: sql`${flowPatterns.sampleCount} + 1`,
    }
  });
}

export async function getFlowPattern(sensorId: number, hourOfDay: number, dayOfWeek: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select()
    .from(flowPatterns)
    .where(and(
      eq(flowPatterns.sensorId, sensorId),
      eq(flowPatterns.hourOfDay, hourOfDay),
      eq(flowPatterns.dayOfWeek, dayOfWeek)
    ))
    .limit(1);
  return result[0];
}

export async function getAllFlowPatternsForSensor(sensorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(flowPatterns)
    .where(eq(flowPatterns.sensorId, sensorId))
    .orderBy(flowPatterns.dayOfWeek, flowPatterns.hourOfDay);
}

// ============ PIPE RISK SCORES (AI Prediction) ============
export async function upsertPipeRiskScore(score: InsertPipeRiskScore): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(pipeRiskScores).values(score).onDuplicateKeyUpdate({
    set: {
      riskScore: score.riskScore,
      leakProbability: score.leakProbability,
      blockageProbability: score.blockageProbability,
      factors: score.factors,
      lastAnalyzedAt: score.lastAnalyzedAt,
    }
  });
}

export async function getPipeRiskScore(sensorId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select()
    .from(pipeRiskScores)
    .where(eq(pipeRiskScores.sensorId, sensorId))
    .orderBy(desc(pipeRiskScores.lastAnalyzedAt))
    .limit(1);
  return result[0];
}

export async function getAllPipeRiskScores() {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(pipeRiskScores)
    .orderBy(desc(pipeRiskScores.riskScore));
}

// ============ SMART MONITORING HELPERS ============

/**
 * Calculate flow variance across all sensors to detect anomalies
 * Low tank water vs real leak detection
 */
export async function calculateFlowVariance() {
  const aggregatedData = await getAggregatedFlowData(300000); // 5 min window
  
  if (aggregatedData.length < 2) return null;
  
  const flowRates = aggregatedData.map(d => Number(d.avgFlowRate));
  const avgFlow = flowRates.reduce((a, b) => a + b, 0) / flowRates.length;
  const variance = flowRates.reduce((sum, rate) => sum + Math.pow(rate - avgFlow, 2), 0) / flowRates.length;
  
  return {
    avgFlow,
    variance,
    stdDev: Math.sqrt(variance),
    sensorData: aggregatedData,
  };
}

/**
 * Check if a sensor's flow is anomalous compared to its learned pattern
 */
export async function checkFlowAnomaly(sensorId: number, currentFlowRate: number): Promise<{
  isAnomaly: boolean;
  deviation: number;
  expectedRange: { min: number; max: number } | null;
}> {
  const now = new Date();
  const hourOfDay = now.getHours();
  const dayOfWeek = now.getDay();
  
  const pattern = await getFlowPattern(sensorId, hourOfDay, dayOfWeek);
  
  if (!pattern || pattern.sampleCount < 10) {
    // Not enough data to determine anomaly
    return { isAnomaly: false, deviation: 0, expectedRange: null };
  }
  
  const expectedMin = pattern.avgFlowRate - (2 * pattern.stdDeviation);
  const expectedMax = pattern.avgFlowRate + (2 * pattern.stdDeviation);
  
  const isAnomaly = currentFlowRate < expectedMin || currentFlowRate > expectedMax;
  const deviation = currentFlowRate - pattern.avgFlowRate;
  
  return {
    isAnomaly,
    deviation,
    expectedRange: { min: expectedMin / 100, max: expectedMax / 100 },
  };
}
