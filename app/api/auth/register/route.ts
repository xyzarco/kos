import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, organizations, memberships } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password, name, orgName } = await req.json();
  if (!email || !password || !name || !orgName) {
    return NextResponse.json({ error: "Lengkapi semua field" }, { status: 400 });
  }
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({ email, name, passwordHash }).returning();
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + user.id.slice(0, 6);
  const [org] = await db.insert(organizations).values({ name: orgName, slug }).returning();
  await db.insert(memberships).values({ userId: user.id, orgId: org.id, role: "owner" });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
