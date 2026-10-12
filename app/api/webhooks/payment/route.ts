import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { webhookEvents } from "@/db/extra";
import { eq } from "drizzle-orm";

// Verifikasi sesuai dokumentasi gateway (Svix):
// 1) X-Webhook-Token (whtok_...) — perbandingan langsung
// 2) atau signature svix-id/svix-timestamp/svix-signature (HMAC-SHA256 base64)
function verifySvix(secret: string, id: string, ts: string, signatureHeader: string, rawBody: string): boolean {
  const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64");
  const signedContent = `${id}.${ts}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const signatures = signatureHeader.split(" ").map((s) => s.split(",")[1]);
  return signatures.includes(expected);
}

type AuthResult = { ok: true } | { ok: false; reason: string };

function authenticate(req: Request, raw: string): AuthResult {
  const token = process.env.PAYMENT_WEBHOOK_TOKEN;
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  const receivedToken = req.headers.get("x-webhook-token");
  if (token) {
    return receivedToken === token ? { ok: true } : { ok: false, reason: "invalid webhook token" };
  }
  const svixId = req.headers.get("svix-id");
  const svixTs = req.headers.get("svix-timestamp");
  const svixSig = req.headers.get("svix-signature");
  if (secret) {
    if (!svixId || !svixTs || !svixSig) return { ok: false, reason: "missing svix headers" };
    return verifySvix(secret, svixId, svixTs, svixSig, raw)
      ? { ok: true }
      : { ok: false, reason: "invalid svix signature" };
  }
  // Mode sandbox: belum ada token/secret di env — terima tapi tandai di log.
  console.warn("[webhook] VERIFIKASI MATI: set PAYMENT_WEBHOOK_TOKEN atau PAYMENT_WEBHOOK_SECRET di .env");
  return { ok: true };
}

// Map status gateway → aksi. Fleksibel: cek beberapa nama field.
function extractStatus(body: Record<string, unknown>): string {
  const evt = String(body.event_type ?? body.event ?? "");
  const s = String(body.status ?? body.event_status ?? body.payment_status ?? "");
  if (evt.includes("paid") || evt.includes("succeeded") || evt.includes("settled") || evt.includes("completed")) return "paid";
  if (evt.includes("expire")) return "expired";
  if (evt.includes("cancel")) return "cancelled";
  if (evt.includes("fail")) return "failed";
  return s.toLowerCase();
}

export async function POST(req: Request) {
  const raw = await req.text();
  const auth = authenticate(req, raw);
  if (!auth.ok) {
    console.warn("[webhook] ditolak:", auth.reason);
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  // Simpan payload mentah dulu (idempotensi per event_id / svix-id)
  const eventId = String(
    body.event_id ?? req.headers.get("svix-id") ?? body.payment_id ?? `${Date.now()}-${Math.random()}`
  );
  const inserted = await db.insert(webhookEvents).values({
    provider: "sumopod", eventId, payload: raw,
  }).onConflictDoNothing().returning();
  if (!inserted.length) return NextResponse.json({ ok: true, duplicate: true });

  const data = (body.data ?? body) as Record<string, unknown>;
  const orderId = (data.order_id ?? body.order_id) as string | undefined;
  const paymentId = (data.payment_id ?? body.payment_id) as string | undefined;
  const status = extractStatus(body);

  await db.update(webhookEvents).set({ processedAt: new Date() })
    .where(eq(webhookEvents.eventId, eventId));

  if (!orderId) {
    console.warn("[webhook] order_id tidak ada di payload:", raw.slice(0, 500));
    return NextResponse.json({ ok: true, ignored: "no order_id" });
  }

  const invPrefix = orderId.replace(/^INV-/, "").split("-")[0].toLowerCase();
  const rows = await db.select().from(invoices);
  const inv = rows.find(r => r.id.startsWith(invPrefix));
  if (!inv) {
    console.warn("[webhook] invoice tidak ditemukan utk order_id:", orderId);
    return NextResponse.json({ ok: true, ignored: "invoice not found" });
  }

  if (status === "paid") {
    const amount = Number(data.amount ?? body.amount ?? inv.total) || inv.total;
    await db.insert(payments).values({
      orgId: inv.orgId, invoiceId: inv.id, amount,
      method: String(data.payment_method_type_code ?? data.method ?? "qris"),
      source: "gateway", gatewayRef: paymentId ?? null, status: "berhasil", paidAt: new Date(),
    });
    const paid = inv.paidAmount + amount;
    await db.update(invoices).set({
      paidAmount: paid, status: paid >= inv.total ? "lunas" : "sebagian", linkStatus: "paid",
    }).where(eq(invoices.id, inv.id));
  } else if (["expired", "cancelled", "canceled", "failed"].includes(status)) {
    // link mati: catat statusnya, tombol buat-link-baru muncul di dashboard
    await db.update(invoices).set({ linkStatus: status === "cancelled" || status === "canceled" ? "cancelled" : "expired" })
      .where(eq(invoices.id, inv.id));
    console.log("[webhook] link", status, ":", orderId);
  } else if (status) {
    console.log("[webhook] status lain:", orderId, status);
  }

  return NextResponse.json({ ok: true });
}
