import {
  pgTable, pgEnum, uuid, text, integer, timestamp, boolean, date, uniqueIndex, index,
} from "drizzle-orm/pg-core";

// ---------- enums ----------
export const orgStatusEnum = pgEnum("org_status", ["trial", "active", "suspended", "cancelled"]);
export const roleEnum = pgEnum("member_role", ["owner", "staff"]);
export const roomStatusEnum = pgEnum("room_status", ["kosong", "terisi", "perbaikan"]);
export const tenancyStatusEnum = pgEnum("tenancy_status", ["aktif", "selesai"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft", "terbit", "sebagian", "lunas", "terlambat", "dibatalkan",
]);
export const paymentSourceEnum = pgEnum("payment_source", ["gateway", "manual"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "berhasil", "gagal"]);
export const itemTypeEnum = pgEnum("item_type", ["sewa", "listrik", "air", "denda", "lain"]);

// ---------- identity & tenant ----------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: orgStatusEnum("status").default("trial").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  role: roleEnum("role").default("owner").notNull(),
}, (t) => [uniqueIndex("memberships_user_org_uq").on(t.userId, t.orgId)]);

// ---------- property ----------
export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("properties_org_idx").on(t.orgId)]);

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  propertyId: uuid("property_id").notNull().references(() => properties.id),
  code: text("code").notNull(),
  type: text("type"),
  basePrice: integer("base_price").notNull().default(0), // rupiah integer
  status: roomStatusEnum("status").default("kosong").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("rooms_org_idx").on(t.orgId),
  uniqueIndex("rooms_org_property_code_uq").on(t.orgId, t.propertyId, t.code),
]);

// ---------- residents & tenancy ----------
export const residents = pgTable("residents", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  waNumber: text("wa_number").notNull(),
  emergencyContact: text("emergency_contact"),
  waOptInAt: timestamp("wa_opt_in_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("residents_org_idx").on(t.orgId)]);

export const tenancies = pgTable("tenancies", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  roomId: uuid("room_id").notNull().references(() => rooms.id),
  residentId: uuid("resident_id").notNull().references(() => residents.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  rentAmount: integer("rent_amount").notNull(),
  billingDay: integer("billing_day").notNull().default(1),
  deposit: integer("deposit").notNull().default(0),
  status: tenancyStatusEnum("status").default("aktif").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("tenancies_org_idx").on(t.orgId)]);

// ---------- billing ----------
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  tenancyId: uuid("tenancy_id").notNull().references(() => tenancies.id),
  period: text("period").notNull(), // "2026-10"
  dueDate: date("due_date").notNull(),
  total: integer("total").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  paymentLink: text("payment_link"),
  linkStatus: text("link_status").default("none").notNull(), // none|pending|paid|expired|cancelled
  publicToken: text("public_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("invoices_org_idx").on(t.orgId),
  uniqueIndex("invoices_tenancy_period_uq").on(t.tenancyId, t.period),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  type: itemTypeEnum("type").default("sewa").notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  source: paymentSourceEnum("source").notNull(),
  gatewayRef: text("gateway_ref"),
  status: paymentStatusEnum("status").default("pending").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("payments_org_idx").on(t.orgId)]);

// ---------- whatsapp (simulasi dulu) ----------
export const reminderLogs = pgTable("reminder_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  channel: text("channel").notNull().default("whatsapp"),
  template: text("template").notNull(),
  toNumber: text("to_number").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("simulated"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("reminder_logs_invoice_idx").on(t.invoiceId)]);

// ---------- audit ----------
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});
