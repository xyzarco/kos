import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].passwordHash))) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }
  await createSession(rows[0].id);
  return NextResponse.json({ ok: true });
}
