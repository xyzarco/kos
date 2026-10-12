const API_URL = process.env.PAYMENT_API_URL!;
const API_KEY = process.env.PAYMENT_API_KEY!;

export type CreatePaymentResult = {
  payment_id: string;
  order_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  payment_link_url: string;
  status: string;
  expires_at: string;
};

export async function createPayment(opts: {
  orderId: string;
  amount: number;
  successUrl?: string;
  cancelUrl?: string;
  method?: string;
}): Promise<CreatePaymentResult> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": API_KEY },
    body: JSON.stringify({
      order_id: opts.orderId,
      amount: opts.amount,
      currency: "IDR",
      expires_in_hours: 24,
      payment_method_type_code: opts.method ?? "QRIS",
      callback_url: process.env.PUBLIC_BASE_URL
        ? `${process.env.PUBLIC_BASE_URL}/api/webhooks/payment`
        : undefined,
      webhook_url: process.env.PUBLIC_BASE_URL
        ? `${process.env.PUBLIC_BASE_URL}/api/webhooks/payment`
        : undefined,
      success_return_url: opts.successUrl,
      cancel_return_url: opts.cancelUrl,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gateway error ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}
