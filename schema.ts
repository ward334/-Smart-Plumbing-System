import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Sensors table - stores IoT sensor information
 */
export const sensors = mysqlTable("sensors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 256 }).notNull(),
  pipeType: varchar("pipeType", { length: 64 }).default("main"),
  status: mysqlEnum("status", ["active", "leak", "warning", "offline"]).default("active").notNull(),
  positionX: int("positionX").default(50).notNull(), // percentage position on blueprint
  positionY: int("positionY").default(50).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sensor = typeof sensors.$inferSelect;
export type InsertSensor = typeof sensors.$inferInsert;

/**
 * Flow readings - stores flow rate data from sensors over time
 * Used for smart monitoring and pattern analysis
 */
export const flowReadings = mysqlTable("flowReadings", {
  id: int("id").autoincrement().primaryKey(),
  sensorId: int("sensorId").notNull(),
  flowRate: int("flowRate").notNull(), // liters per minute * 100 (for precision without decimals)
  pressure: int("pressure").notNull(), // PSI * 100
  temperature: int("temperature").default(2000), // Celsius * 100
  timestamp: bigint("timestamp", { mode: "number" }).notNull(), // Unix timestamp in ms
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FlowReading = typeof flowReadings.$inferSelect;
export type InsertFlowReading = typeof flowReadings.$inferInsert;

/**
 * Alerts table - stores leak and anomaly alerts
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  sensorId: int("sensorId").notNull(),
  type: mysqlEnum("type", ["leak", "blockage", "pressure_drop", "anomaly", "prediction"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  message: text("message").notNull(),
  location: varchar("location", { length: 256 }).notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  isResolved: boolean("isResolved").default(false).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Flow patterns - stores learned normal flow patterns for AI prediction
 * Aggregated hourly patterns for each sensor
 */
export const flowPatterns = mysqlTable("flowPatterns", {
  id: int("id").autoincrement().primaryKey(),
  sensorId: int("sensorId").notNull(),
  hourOfDay: int("hourOfDay").notNull(), // 0-23
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6 (Sunday = 0)
  avgFlowRate: int("avgFlowRate").notNull(), // average flow rate * 100
  minFlowRate: int("minFlowRate").notNull(),
  maxFlowRate: int("maxFlowRate").notNull(),
  stdDeviation: int("stdDeviation").notNull(), // standard deviation * 100
  sampleCount: int("sampleCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlowPattern = typeof flowPatterns.$inferSelect;
export type InsertFlowPattern = typeof flowPatterns.$inferInsert;

/**
 * Pipe risk scores - AI-calculated risk scores for each sensor/pipe
 */
export const pipeRiskScores = mysqlTable("pipeRiskScores", {
  id: int("id").autoincrement().primaryKey(),
  sensorId: int("sensorId").notNull(),
  riskScore: int("riskScore").default(0).notNull(), // 0-100
  leakProbability: int("leakProbability").default(0).notNull(), // percentage * 100
  blockageProbability: int("blockageProbability").default(0).notNull(),
  factors: text("factors"), // JSON string of contributing factors
  lastAnalyzedAt: bigint("lastAnalyzedAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PipeRiskScore = typeof pipeRiskScores.$inferSelect;
export type InsertPipeRiskScore = typeof pipeRiskScores.$inferInsert;

/**
 * System settings - stores system configuration
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
