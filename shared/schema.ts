import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["student", "staff", "admin"] }).notNull().default("student"),
  displayName: text("display_name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const machines = pgTable("machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type", { enum: ["washer", "dryer"] }).notNull(),
  location: text("location").notNull(),
  status: text("status", { enum: ["available", "in_use", "maintenance"] }).notNull().default("available"),
  cycleTimeMinutes: integer("cycle_time_minutes").notNull().default(30),
});

export const laundrySessions = pgTable("laundry_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  machineId: varchar("machine_id").notNull().references(() => machines.id),
  startedAt: timestamp("started_at").defaultNow(),
  endsAt: timestamp("ends_at"),
  completedAt: timestamp("completed_at"),
  status: text("status", { enum: ["active", "completed", "cancelled"] }).notNull().default("active"),
});

export const lostItems = pgTable("lost_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clothingType: text("clothing_type").notNull(),
  color: text("color").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["searching", "matched", "resolved"] }).notNull().default("searching"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const foundItems = pgTable("found_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportedByUserId: varchar("reported_by_user_id").notNull().references(() => users.id),
  clothingType: text("clothing_type").notNull(),
  color: text("color").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  status: text("status", { enum: ["unclaimed", "claimed", "resolved"] }).notNull().default("unclaimed"),
  claimedByUserId: varchar("claimed_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type", { enum: ["info", "success", "warning", "match"] }).notNull().default("info"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const itemMatches = pgTable("item_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lostItemId: varchar("lost_item_id").notNull().references(() => lostItems.id),
  foundItemId: varchar("found_item_id").notNull().references(() => foundItems.id),
  matchPercentage: integer("match_percentage").notNull(),
  reasoning: text("reasoning").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniquePair: uniqueIndex("item_matches_pair_idx").on(table.lostItemId, table.foundItemId),
}));

export const laundryWorkflow = pgTable("laundry_workflow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  status: text("status").notNull().default("pending"),
  bagId: text("bag_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  displayName: true,
  email: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["student", "staff", "admin"]).default("student"),
});

export const insertMachineSchema = createInsertSchema(machines).omit({ id: true });

export const startSessionSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
});

export const insertLostItemSchema = z.object({
  clothingType: z.string().min(1, "Clothing type is required"),
  color: z.string().min(1, "Color is required"),
  description: z.string().min(1, "Description is required"),
});

export const insertFoundItemSchema = z.object({
  clothingType: z.string().min(1, "Clothing type is required"),
  color: z.string().min(1, "Color is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  imageUrl: z.string().optional(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Machine = typeof machines.$inferSelect;
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type LaundrySession = typeof laundrySessions.$inferSelect;
export type LostItem = typeof lostItems.$inferSelect;
export type FoundItem = typeof foundItems.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ItemMatch = typeof itemMatches.$inferSelect;
export type LaundryWorkflow = typeof laundryWorkflow.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
