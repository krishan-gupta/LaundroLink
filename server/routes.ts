import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import MemoryStoreFactory from "memorystore";

import { storage } from "./storage";
import { comparePasswords } from "./auth";
import { pool } from "./db";
import { type User } from "@shared/schema";
import { UPLOADS_DIR } from "./routes/upload";

// Import modular routers
import authRouter from "./routes/auth";
import machinesRouter from "./routes/machines";
import sessionsRouter from "./routes/sessions";
import itemsRouter from "./routes/items";
import notificationsRouter from "./routes/notifications";
import staffRouter from "./routes/staff";
import adminRouter from "./routes/admin";
import uploadRouter from "./routes/upload";

const PgSession = connectPgSimple(session);

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const MemoryStore = MemoryStoreFactory(session);
  const sessionStore = process.env.DATABASE_URL
    ? new PgSession({ pool, createTableIfMissing: true })
    : new MemoryStore({ checkPeriod: 86400000 });

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "washtrack-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Invalid username or password" });
        const valid = await comparePasswords(password, user.password);
        if (!valid) return done(null, false, { message: "Invalid username or password" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  await storage.seedMachines();

  // Mount modular routers
  app.use("/api", authRouter);
  app.use("/api/machines", machinesRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api", itemsRouter); // Items router handles /api/lost-items and /api/found-items
  app.use("/api/notifications", notificationsRouter);
  app.use("/api", staffRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/upload", uploadRouter);

  app.use("/uploads", (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    next();
  }, express.static(UPLOADS_DIR));

  return httpServer;
}
