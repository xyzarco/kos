import {
  pgTable, uuid, text, timestamp, jsonb, uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  payload: jsonb("payload"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("webhook_events_provider_event_uq").on(t.provider, t.eventId)]);

export const waOutbox = pgTable("wa_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id"),
  toNumber: text("to_number").notNull(),
  template: text("template").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("simulated"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("wa_outbox_org_idx").on(t.orgId)]);
