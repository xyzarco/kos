import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { memberships, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
const COOKIE = "session";

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export type Session = { userId: string; orgId: string; role: string; orgName: string };

// Validasi keanggotaan user pada organisasi (prinsip bagian 7.2 dokumen)
export async function requireSession(): Promise<Session | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const rows = await db
    .select({
      orgId: organizations.id, orgName: organizations.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, userId))
    .limit(1);
  if (!rows.length) return null;
  return { userId, orgId: rows[0].orgId, role: rows[0].role, orgName: rows[0].orgName };
}
