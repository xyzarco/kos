require("dotenv").config();
const base = process.env.PUBLIC_BASE_URL;
console.log("PUBLIC_BASE_URL:", base);
fetch(process.env.PAYMENT_API_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Api-Key": process.env.PAYMENT_API_KEY },
  body: JSON.stringify({
    order_id: "TEST-DUAL-" + Date.now(), amount: 10000, currency: "IDR", expires_in_hours: 1,
    payment_method_type_code: "QRIS",
    callback_url: base + "/api/webhooks/payment",
    success_return_url: base + "/pay/abc?status=success",
    cancel_return_url: base + "/pay/abc?status=cancel",
  }),
}).then(r => r.json()).then(d => console.log("ok:", d.status, d.payment_link_url?.slice(0, 50))).catch(e => console.error("ERR", e.message));
