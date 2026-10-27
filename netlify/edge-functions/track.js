// Netlify Edge Function: har bir tashrifchini Telegram botga yuborish
export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const data = await req.json().catch(() => ({}));
    const botToken = "8494194867:AAEOGjz24XXO6Tgl1bm-XUIj8ryTU7fPQc8";
    const chatId = "7979995418";

    const ip = context.ip || "Noma'lum IP";
    const geo = context.geo || {};
    const country = geo.country?.name || geo.country?.code || "Noma'lum mamlakat";
    const city = geo.city || "Noma'lum shahar";
    const userAgent = req.headers.get("user-agent") || "Noma'lum qurilma";
    const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    const isNew = data.isNewVisitor ? "🆕 Yangi tashrifchi" : "🔄 Qaytgan tashrifchi";
    const visitCount = data.visitCount || 1;
    const visitorId = data.visitorId || "Noma'lum";

    const text = `🔔 <b>AkademAI — Saytga tashrif!</b>\n\n` +
      `👤 <b>Holati:</b> ${isNew}\n` +
      `🆔 <b>Visitor ID:</b> <code>${visitorId}</code>\n` +
      `🔢 <b>Tashriflar soni:</b> ${visitCount}\n` +
      `🕒 <b>Vaqt:</b> ${time}\n` +
      `📍 <b>Joylashuv:</b> ${city}, ${country}\n` +
      `🌐 <b>IP:</b> <code>${ip}</code>\n` +
      `📱 <b>User-Agent:</b> <code>${userAgent}</code>`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML"
      })
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = { path: "/api/track" };
