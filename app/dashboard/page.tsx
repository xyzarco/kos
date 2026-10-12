import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { properties, rooms, residents, tenancies } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import DashboardHome from "./DashboardHome";

async function Summary() {
  const s = await requireSession();
  if (!s) redirect("/login");
  const [props, rms, res, ten] = await Promise.all([
    db.select({ id: properties.id, name: properties.name }).from(properties).where(eq(properties.orgId, s.orgId)),
    db.select({ id: rooms.id, code: rooms.code, status: rooms.status, basePrice: rooms.basePrice, propertyId: rooms.propertyId }).from(rooms).where(eq(rooms.orgId, s.orgId)),
    db.select({ id: residents.id, name: residents.name }).from(residents).where(and(eq(residents.orgId, s.orgId), isNull(residents.deletedAt))),
    db.select({ id: tenancies.id, roomCode: rooms.code, residentName: residents.name, rentAmount: tenancies.rentAmount })
      .from(tenancies)
      .innerJoin(rooms, eq(tenancies.roomId, rooms.id))
      .innerJoin(residents, eq(tenancies.residentId, residents.id))
      .where(eq(tenancies.orgId, s.orgId)),
  ]);
  return <DashboardHome properties={props} rooms={rms} residents={res} tenancies={ten} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Memuat ringkasan…</p>}>
      <Summary />
    </Suspense>
  );
}
