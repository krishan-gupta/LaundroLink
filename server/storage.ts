import { db } from "./db";
import { pool } from "./db";
import { users, machines, laundrySessions, lostItems, foundItems, notifications } from "@shared/schema";
import { eq, and, desc, ne, isNotNull, ilike } from "drizzle-orm";
import {
  type User, type InsertUser,
  type Machine, type InsertMachine,
  type LaundrySession,
  type LostItem, type FoundItem, type Notification,
} from "@shared/schema";
import { addMinutes } from "date-fns";

export interface ItemMatch {
  id: string;
  lostItemId: string;
  foundItemId: string;
  matchPercentage: number;
  reasoning: string | null;
  notified: boolean;
  createdAt: Date;
}

export interface MatchedFoundItem extends FoundItem {
  matchPercentage: number;
  reasoning: string | null;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, data: { displayName?: string; email?: string }): Promise<User | undefined>;

  getMachines(): Promise<Machine[]>;
  getMachine(id: string): Promise<Machine | undefined>;
  updateMachineStatus(id: string, status: Machine["status"]): Promise<Machine | undefined>;
  seedMachines(): Promise<void>;

  getActiveSessions(userId: string): Promise<LaundrySession[]>;
  getUserSessions(userId: string): Promise<LaundrySession[]>;
  startSession(userId: string, machineId: string): Promise<LaundrySession>;
  completeSession(sessionId: string): Promise<LaundrySession | undefined>;
  cancelSession(sessionId: string, userId: string): Promise<LaundrySession | undefined>;

  getLostItems(userId: string): Promise<LostItem[]>;
  createLostItem(userId: string, data: { clothingType: string; color: string; description: string }): Promise<LostItem>;

  getFoundItems(): Promise<FoundItem[]>;
  getFoundItem(id: string): Promise<FoundItem | undefined>;
  createFoundItem(userId: string, data: { clothingType: string; color: string; description: string; location: string; imageUrl?: string }): Promise<FoundItem>;
  claimFoundItem(id: string, userId: string): Promise<FoundItem | undefined>;

  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(userId: string, data: { title: string; message: string; type: Notification["type"] }): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  getAllActiveLostItems(): Promise<LostItem[]>;
  getAllFoundItemsWithImages(): Promise<FoundItem[]>;
  saveMatch(lostItemId: string, foundItemId: string, matchPercentage: number, reasoning: string): Promise<ItemMatch>;
  getMatchedFoundItemsForUser(userId: string): Promise<MatchedFoundItem[]>;
  markLostItemMatched(id: string): Promise<void>;

  // Admin / Staff methods
  getAllNotifications(): Promise<any[]>;
  getAllLostItems(): Promise<any[]>;
  getAllFoundItems(): Promise<any[]>;
  getAllStudentsWithWorkflow(): Promise<any[]>;
  getAllWorkflows(): Promise<any[]>;
  getStudentByUsername(username: string): Promise<User | undefined>;
  getWorkflowByUserId(userId: string): Promise<any | null>;
  getQueuePosition(userId: string): Promise<{ aheadCount: number; position: number }>;
  upsertWorkflow(userId: string, status: string, bagId?: string): Promise<any>;
}

export class DrizzleStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      ilike(users.username, username.trim())
    );
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(id: string, data: { displayName?: string; email?: string }): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getMachines(): Promise<Machine[]> {
    return db.select().from(machines);
  }

  async getMachine(id: string): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines).where(eq(machines.id, id));
    return machine;
  }

  async updateMachineStatus(id: string, status: Machine["status"]): Promise<Machine | undefined> {
    const [machine] = await db.update(machines).set({ status }).where(eq(machines.id, id)).returning();
    return machine;
  }

  async seedMachines(): Promise<void> {
    const existing = await db.select().from(machines);
    if (existing.length > 0) return;
    await db.insert(machines).values([
      { name: "Washer A1", type: "washer", location: "Building A - Ground Floor", status: "available", cycleTimeMinutes: 30 },
      { name: "Washer A2", type: "washer", location: "Building A - Ground Floor", status: "available", cycleTimeMinutes: 30 },
      { name: "Dryer A1", type: "dryer", location: "Building A - Ground Floor", status: "available", cycleTimeMinutes: 45 },
      { name: "Washer B1", type: "washer", location: "Building B - Level 1", status: "available", cycleTimeMinutes: 30 },
      { name: "Washer B2", type: "washer", location: "Building B - Level 1", status: "maintenance", cycleTimeMinutes: 30 },
      { name: "Dryer B1", type: "dryer", location: "Building B - Level 1", status: "available", cycleTimeMinutes: 45 },
    ]);
  }

  async getActiveSessions(userId: string): Promise<LaundrySession[]> {
    return db.select().from(laundrySessions).where(
      and(eq(laundrySessions.userId, userId), eq(laundrySessions.status, "active"))
    );
  }

  async getUserSessions(userId: string): Promise<LaundrySession[]> {
    return db.select().from(laundrySessions)
      .where(eq(laundrySessions.userId, userId))
      .orderBy(desc(laundrySessions.startedAt));
  }

  async startSession(userId: string, machineId: string): Promise<LaundrySession> {
    const machine = await this.getMachine(machineId);
    if (!machine) throw new Error("Machine not found");
    if (machine.status !== "available") throw new Error("Machine is not available");
    const endsAt = addMinutes(new Date(), machine.cycleTimeMinutes);
    const [session] = await db.insert(laundrySessions).values({ userId, machineId, endsAt, status: "active" }).returning();
    await this.updateMachineStatus(machineId, "in_use");
    await this.createNotification(userId, {
      title: "Laundry cycle started",
      message: `Your cycle on ${machine.name} has started. It should be done in ${machine.cycleTimeMinutes} minutes.`,
      type: "info",
    });
    return session;
  }

  async completeSession(sessionId: string): Promise<LaundrySession | undefined> {
    const [session] = await db.update(laundrySessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(laundrySessions.id, sessionId))
      .returning();
    if (session) {
      await this.updateMachineStatus(session.machineId, "available");
      await this.createNotification(session.userId, {
        title: "Laundry cycle complete",
        message: "Your clothes are ready for pickup. Please collect them from the collection point.",
        type: "success",
      });
    }
    return session;
  }

  async cancelSession(sessionId: string, userId: string): Promise<LaundrySession | undefined> {
    const [session] = await db.update(laundrySessions)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(and(eq(laundrySessions.id, sessionId), eq(laundrySessions.userId, userId)))
      .returning();
    if (session) await this.updateMachineStatus(session.machineId, "available");
    return session;
  }

  async getLostItems(userId: string): Promise<LostItem[]> {
    return db.select().from(lostItems)
      .where(eq(lostItems.userId, userId))
      .orderBy(desc(lostItems.createdAt));
  }

  async createLostItem(userId: string, data: { clothingType: string; color: string; description: string }): Promise<LostItem> {
    const [item] = await db.insert(lostItems).values({ userId, ...data, status: "searching" }).returning();
    await this.createNotification(userId, {
      title: "Lost item reported",
      message: `Your report for a ${data.color} ${data.clothingType} is now active. We'll notify you if a match is found.`,
      type: "info",
    });
    return item;
  }

  async getFoundItems(): Promise<FoundItem[]> {
    return db.select().from(foundItems)
      .where(eq(foundItems.status, "unclaimed"))
      .orderBy(desc(foundItems.createdAt));
  }

  async getFoundItem(id: string): Promise<FoundItem | undefined> {
    const [item] = await db.select().from(foundItems).where(eq(foundItems.id, id));
    return item;
  }

  async createFoundItem(userId: string, data: { clothingType: string; color: string; description: string; location: string; imageUrl?: string }): Promise<FoundItem> {
    const [item] = await db.insert(foundItems).values({ reportedByUserId: userId, ...data, status: "unclaimed" }).returning();
    return item;
  }

  async claimFoundItem(id: string, userId: string): Promise<FoundItem | undefined> {
    const [item] = await db.update(foundItems)
      .set({ status: "claimed", claimedByUserId: userId })
      .where(and(eq(foundItems.id, id), eq(foundItems.status, "unclaimed")))
      .returning();
    if (item) {
      await this.createNotification(userId, {
        title: "Item claim submitted",
        message: `Your claim for the ${item.color} ${item.clothingType} has been submitted. Staff will verify and contact you.`,
        type: "success",
      });
    }
    return item;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(userId: string, data: { title: string; message: string; type: Notification["type"] }): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({ userId, ...data }).returning();
    return notification;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [notification] = await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return notification;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async getAllActiveLostItems(): Promise<LostItem[]> {
    return db.select().from(lostItems).where(ne(lostItems.status, "resolved"));
  }

  async getAllFoundItemsWithImages(): Promise<FoundItem[]> {
    return db.select().from(foundItems)
      .where(and(eq(foundItems.status, "unclaimed"), isNotNull(foundItems.imageUrl)));
  }

  async saveMatch(lostItemId: string, foundItemId: string, matchPercentage: number, reasoning: string): Promise<ItemMatch> {
    const res = await pool.query(
      `INSERT INTO item_matches (lost_item_id, found_item_id, match_percentage, reasoning)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (lost_item_id, found_item_id) DO UPDATE
          SET match_percentage = EXCLUDED.match_percentage,
              reasoning = EXCLUDED.reasoning
       RETURNING *`,
      [lostItemId, foundItemId, matchPercentage, reasoning]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      lostItemId: row.lost_item_id,
      foundItemId: row.found_item_id,
      matchPercentage: row.match_percentage,
      reasoning: row.reasoning,
      notified: row.notified,
      createdAt: row.created_at,
    };
  }

  async getMatchedFoundItemsForUser(userId: string): Promise<MatchedFoundItem[]> {
    const res = await pool.query(
      `SELECT fi.*, im.match_percentage, im.reasoning
       FROM item_matches im
       JOIN lost_items li ON li.id = im.lost_item_id
       JOIN found_items fi ON fi.id = im.found_item_id
       WHERE li.user_id = $1
         AND fi.status = 'unclaimed'
         AND im.match_percentage >= 60
       ORDER BY im.match_percentage DESC, fi.created_at DESC`,
      [userId]
    );
    return res.rows.map((row: any) => ({
      ...row,
      reportedByUserId: row.reported_by_user_id,
      clothingType: row.clothing_type,
      claimedByUserId: row.claimed_by_user_id,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      matchPercentage: row.match_percentage,
      reasoning: row.reasoning,
    }));
  }

  async markLostItemMatched(id: string): Promise<void> {
    await db.update(lostItems).set({ status: "matched" }).where(eq(lostItems.id, id));
  }

  async getAllNotifications(): Promise<any[]> {
    const res = await pool.query(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100`);
    return res.rows;
  }

  async getAllLostItems(): Promise<any[]> {
    const res = await pool.query(`SELECT * FROM lost_items ORDER BY created_at DESC`);
    return res.rows;
  }

  async getAllFoundItems(): Promise<any[]> {
    const res = await pool.query(`SELECT * FROM found_items ORDER BY created_at DESC`);
    return res.rows;
  }

  async getAllStudentsWithWorkflow(): Promise<any[]> {
    const res = await pool.query(`
      SELECT u.id, u.username, u.display_name, u.email, u.created_at,
             w.status as workflow_status, w.bag_id, w.updated_at as workflow_updated_at
      FROM users u
      LEFT JOIN laundry_workflow w ON w.user_id = u.id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `);
    return res.rows;
  }

  async getAllWorkflows(): Promise<any[]> {
    const res = await pool.query(`
      SELECT w.*, u.username, u.display_name
      FROM laundry_workflow w
      JOIN users u ON u.id = w.user_id
      ORDER BY w.updated_at DESC
    `);
    return res.rows;
  }

  async getStudentByUsername(username: string): Promise<User | undefined> {
    return this.getUserByUsername(username);
  }

  async getWorkflowByUserId(userId: string): Promise<any | null> {
    const res = await pool.query(
      `SELECT * FROM laundry_workflow WHERE user_id = $1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  async getQueuePosition(userId: string): Promise<{ aheadCount: number; position: number }> {
    const myRes = await pool.query(
      `SELECT created_at FROM laundry_workflow WHERE user_id = $1`,
      [userId]
    );
    if (!myRes.rows[0]) return { aheadCount: 0, position: 1 };
    const myCreatedAt = myRes.rows[0].created_at;

    const aheadRes = await pool.query(
      `SELECT COUNT(*) FROM laundry_workflow
       WHERE status IN ('hand_in', 'washing')
         AND user_id != $1
         AND created_at < $2`,
      [userId, myCreatedAt]
    );
    const aheadCount = parseInt(aheadRes.rows[0].count, 10);
    return { aheadCount, position: aheadCount + 1 };
  }

  async upsertWorkflow(userId: string, status: string, bagId?: string): Promise<any> {
    const res = await pool.query(
      `INSERT INTO laundry_workflow (user_id, status, bag_id, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id) DO UPDATE
          SET status = EXCLUDED.status,
              bag_id = COALESCE(EXCLUDED.bag_id, laundry_workflow.bag_id),
              updated_at = now()
       RETURNING *`,
      [userId, status, bagId || null]
    );
    return res.rows[0];
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private machines: Map<string, Machine> = new Map();
  private sessions: Map<string, LaundrySession> = new Map();
  private lostItems: Map<string, LostItem> = new Map();
  private foundItems: Map<string, FoundItem> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private itemMatches: Map<string, ItemMatch> = new Map();
  private workflows: Map<string, any> = new Map();
  private nextId = 1;

  constructor() {
    this.seedMachines();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = String(this.nextId++);
    const user: User = { ...insertUser, id, createdAt: new Date(), displayName: insertUser.displayName || null, email: insertUser.email || null };
    this.users.set(id, user);
    return user;
  }

  async updateUserProfile(id: string, data: { displayName?: string; email?: string }): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async getMachines(): Promise<Machine[]> {
    return Array.from(this.machines.values());
  }

  async getMachine(id: string): Promise<Machine | undefined> {
    return this.machines.get(id);
  }

  async updateMachineStatus(id: string, status: Machine["status"]): Promise<Machine | undefined> {
    const machine = this.machines.get(id);
    if (!machine) return undefined;
    const updated = { ...machine, status };
    this.machines.set(id, updated);
    return updated;
  }

  async seedMachines(): Promise<void> {
    const defaultMachines: Machine[] = [
      { id: "1", name: "Washer A1", type: "washer", location: "Building A - Ground Floor", status: "available", cycleTimeMinutes: 30 },
      { id: "2", name: "Washer A2", type: "washer", location: "Building A - Ground Floor", status: "available", cycleTimeMinutes: 30 },
      { id: "3", name: "Dryer A1", type: "dryer", location: "Building A - Ground Floor", status: "available", cycleTimeMinutes: 45 },
      { id: "4", name: "Washer B1", type: "washer", location: "Building B - Level 1", status: "available", cycleTimeMinutes: 30 },
      { id: "5", name: "Washer B2", type: "washer", location: "Building B - Level 1", status: "maintenance", cycleTimeMinutes: 30 },
      { id: "6", name: "Dryer B1", type: "dryer", location: "Building B - Level 1", status: "available", cycleTimeMinutes: 45 },
    ];
    defaultMachines.forEach(m => this.machines.set(m.id, m));
  }

  async getActiveSessions(userId: string): Promise<LaundrySession[]> {
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId && s.status === "active"
    );
  }

  async getUserSessions(userId: string): Promise<LaundrySession[]> {
    return Array.from(this.sessions.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.startedAt!.getTime() - a.startedAt!.getTime());
  }

  async startSession(userId: string, machineId: string): Promise<LaundrySession> {
    const machine = await this.getMachine(machineId);
    if (!machine) throw new Error("Machine not found");
    if (machine.status !== "available") throw new Error("Machine is not available");
    const endsAt = addMinutes(new Date(), machine.cycleTimeMinutes);
    const id = String(this.nextId++);
    const session: LaundrySession = { id, userId, machineId, startedAt: new Date(), endsAt, completedAt: null, status: "active" };
    this.sessions.set(id, session);
    await this.updateMachineStatus(machineId, "in_use");
    await this.createNotification(userId, {
      title: "Laundry cycle started",
      message: `Your cycle on ${machine.name} has started. It should be done in ${machine.cycleTimeMinutes} minutes.`,
      type: "info",
    });
    return session;
  }

  async completeSession(sessionId: string): Promise<LaundrySession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    const updated = { ...session, status: "completed" as const, completedAt: new Date() };
    this.sessions.set(sessionId, updated);
    await this.updateMachineStatus(session.machineId, "available");
    await this.createNotification(session.userId, {
      title: "Laundry cycle complete",
      message: "Your clothes are ready for pickup. Please collect them from the collection point.",
      type: "success",
    });
    return updated;
  }

  async cancelSession(sessionId: string, userId: string): Promise<LaundrySession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) return undefined;
    const updated = { ...session, status: "cancelled" as const, completedAt: new Date() };
    this.sessions.set(sessionId, updated);
    await this.updateMachineStatus(session.machineId, "available");
    return updated;
  }

  async getLostItems(userId: string): Promise<LostItem[]> {
    return Array.from(this.lostItems.values())
      .filter((i) => i.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createLostItem(userId: string, data: { clothingType: string; color: string; description: string }): Promise<LostItem> {
    const id = String(this.nextId++);
    const item: LostItem = { id, userId, ...data, status: "searching", createdAt: new Date() };
    this.lostItems.set(id, item);
    await this.createNotification(userId, {
      title: "Lost item reported",
      message: `Your report for a ${data.color} ${data.clothingType} is now active. We'll notify you if a match is found.`,
      type: "info",
    });
    return item;
  }

  async getFoundItems(): Promise<FoundItem[]> {
    return Array.from(this.foundItems.values())
      .filter((i) => i.status === "unclaimed")
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getFoundItem(id: string): Promise<FoundItem | undefined> {
    return this.foundItems.get(id);
  }

  async createFoundItem(userId: string, data: { clothingType: string; color: string; description: string; location: string; imageUrl?: string }): Promise<FoundItem> {
    const id = String(this.nextId++);
    const item: FoundItem = { id, reportedByUserId: userId, ...data, imageUrl: data.imageUrl || null, status: "unclaimed", claimedByUserId: null, createdAt: new Date() };
    this.foundItems.set(id, item);
    return item;
  }

  async claimFoundItem(id: string, userId: string): Promise<FoundItem | undefined> {
    const item = this.foundItems.get(id);
    if (!item || item.status !== "unclaimed") return undefined;
    const updated = { ...item, status: "claimed" as const, claimedByUserId: userId };
    this.foundItems.set(id, updated);
    await this.createNotification(userId, {
      title: "Item claim submitted",
      message: `Your claim for the ${item.color} ${item.clothingType} has been submitted. Staff will verify and contact you.`,
      type: "success",
    });
    return updated;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async createNotification(userId: string, data: { title: string; message: string; type: Notification["type"] }): Promise<Notification> {
    const id = String(this.nextId++);
    const notification: Notification = { id, userId, ...data, read: false, createdAt: new Date() };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const n = this.notifications.get(id);
    if (!n || n.userId !== userId) return undefined;
    const updated = { ...n, read: true };
    this.notifications.set(id, updated);
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    Array.from(this.notifications.values()).forEach(n => {
      if (n.userId === userId) n.read = true;
    });
  }

  async getAllActiveLostItems(): Promise<LostItem[]> {
    return Array.from(this.lostItems.values()).filter(i => i.status !== "resolved");
  }

  async getAllFoundItemsWithImages(): Promise<FoundItem[]> {
    return Array.from(this.foundItems.values()).filter(i => i.status === "unclaimed" && !!i.imageUrl);
  }

  async saveMatch(lostItemId: string, foundItemId: string, matchPercentage: number, reasoning: string): Promise<ItemMatch> {
    const id = `${lostItemId}-${foundItemId}`;
    const match: ItemMatch = { id, lostItemId, foundItemId, matchPercentage, reasoning, notified: false, createdAt: new Date() };
    this.itemMatches.set(id, match);
    return match;
  }

  async getMatchedFoundItemsForUser(userId: string): Promise<MatchedFoundItem[]> {
    const userLostItems = Array.from(this.lostItems.values()).filter(li => li.userId === userId);
    const matches: MatchedFoundItem[] = [];
    for (const li of userLostItems) {
      for (const m of this.itemMatches.values()) {
        if (m.lostItemId === li.id && m.matchPercentage >= 60) {
          const fi = this.foundItems.get(m.foundItemId);
          if (fi && fi.status === 'unclaimed') {
            matches.push({ ...fi, matchPercentage: m.matchPercentage, reasoning: m.reasoning });
          }
        }
      }
    }
    return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  async markLostItemMatched(id: string): Promise<void> {
    const li = this.lostItems.get(id);
    if (li) li.status = "matched";
  }

  async getAllNotifications(): Promise<any[]> {
    return Array.from(this.notifications.values()).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime()).slice(0, 100);
  }

  async getAllLostItems(): Promise<any[]> {
    return Array.from(this.lostItems.values()).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getAllFoundItems(): Promise<any[]> {
    return Array.from(this.foundItems.values()).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getAllStudentsWithWorkflow(): Promise<any[]> {
    const students = Array.from(this.users.values()).filter(u => u.role === 'student');
    return students.map(u => {
      const w = this.workflows.get(u.id);
      return {
        ...u,
        workflow_status: w?.status || null,
        bag_id: w?.bagId || null,
        workflow_updated_at: w?.updatedAt || null
      };
    }).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getAllWorkflows(): Promise<any[]> {
    return Array.from(this.workflows.values()).map(w => {
      const u = this.users.get(w.userId);
      return { ...w, username: u?.username, display_name: u?.displayName };
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getStudentByUsername(username: string): Promise<User | undefined> {
    return this.getUserByUsername(username);
  }

  async getWorkflowByUserId(userId: string): Promise<any | null> {
    return this.workflows.get(userId) || null;
  }

  async getQueuePosition(userId: string): Promise<{ aheadCount: number; position: number }> {
    const myW = this.workflows.get(userId);
    if (!myW) return { aheadCount: 0, position: 1 };
    const ahead = Array.from(this.workflows.values()).filter(w => 
      (w.status === 'hand_in' || w.status === 'washing') && 
      w.userId !== userId && 
      w.createdAt.getTime() < myW.createdAt.getTime()
    );
    return { aheadCount: ahead.length, position: ahead.length + 1 };
  }

  async upsertWorkflow(userId: string, status: string, bagId?: string): Promise<any> {
    const existing = this.workflows.get(userId);
    const w = {
      userId,
      status,
      bagId: bagId || existing?.bagId || null,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.workflows.set(userId, w);
    return w;
  }
}

export const storage = process.env.DATABASE_URL ? new DrizzleStorage() : new MemStorage();
