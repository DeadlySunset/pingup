import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// --- Auth.js tables ---

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  subscriptionTier: text("subscriptionTier")
    .$type<"free" | "pro">()
    .notNull()
    .default("free"),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  onboardingDismissed: boolean("onboardingDismissed").notNull().default(false),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// --- App tables ---

export type MonitorType = "heartbeat" | "ping";
export type MonitorStatus = "up" | "down" | "unknown";

export const monitors = pgTable("monitor", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").$type<MonitorType>().notNull(),
  enabled: boolean("enabled").notNull().default(true),

  // Heartbeat fields (null for ping monitors)
  // pingToken: unguessable path segment, user POSTs to /p/{token} on schedule
  pingToken: text("pingToken").unique(),
  // expectedIntervalSec: if no ping arrives within (expectedInterval + grace), flag down
  expectedIntervalSec: integer("expectedIntervalSec"),
  graceSec: integer("graceSec"),
  lastPingAt: timestamp("lastPingAt"),

  // Ping fields (null for heartbeat monitors)
  url: text("url"),
  expectedStatus: integer("expectedStatus"),
  intervalSec: integer("intervalSec"),
  timeoutMs: integer("timeoutMs"),
  lastCheckedAt: timestamp("lastCheckedAt"),

  // Shared state
  currentStatus: text("currentStatus").$type<MonitorStatus>().notNull().default("unknown"),
  lastStatusChangeAt: timestamp("lastStatusChangeAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const checks = pgTable("check", {
  id: uuid("id").primaryKey().defaultRandom(),
  monitorId: uuid("monitorId")
    .notNull()
    .references(() => monitors.id, { onDelete: "cascade" }),
  at: timestamp("at").notNull().defaultNow(),
  status: text("status").$type<"up" | "down">().notNull(),
  responseMs: integer("responseMs"),
  statusCode: integer("statusCode"),
  error: text("error"),
});

export type AlertChannelKind = "email" | "telegram";

export const alertChannels = pgTable("alert_channel", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").$type<AlertChannelKind>().notNull(),
  // email address OR telegram chat_id (as text)
  target: text("target").notNull(),
  // null = pending verification; non-null = active
  verifiedAt: timestamp("verifiedAt"),
  // one-time secret: for telegram, user sends /verify <code> to bot
  verificationCode: text("verificationCode"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const monitorChannels = pgTable(
  "monitor_channel",
  {
    monitorId: uuid("monitorId")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    alertChannelId: uuid("alertChannelId")
      .notNull()
      .references(() => alertChannels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.monitorId, t.alertChannelId] })],
);
