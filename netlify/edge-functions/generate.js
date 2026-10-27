// Netlify'dagi /api/generate. Kalit va model Netlify → Site configuration → Environment variables dan olinadi:
//   OPENROUTER_API_KEY = kalit1,kalit2   (zaxira kalit vergul bilan)
//   AI_MODEL           = ixtiyoriy, masalan google/gemini-3.7-flash
//
// Nega Edge Function: oddiy Netlify Functions 30–60 soniyada uziladi, bepul modellar esa bitta bo‘limni
// 1–2 daqiqa yozadi. Edge Function javobni darhol boshlab, kutish paytida bo‘sh joy (" ") yuborib turadi,
// shuning uchun ulanish uzilmaydi. JSON boshidagi bo‘sh joylar res.json() ga xalal bermaydi.
import { generate, DEFAULT_MODELS, parseList } from "../../lib/ai.js";

const env = (k) => globalThis.Netlify?.env.get(k) ?? globalThis.Deno?.env.get(k);

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const keys = parseList(env("OPENROUTER_API_KEY"));
  const models = parseList(env("AI_MODEL") || DEFAULT_MODELS);
  if (!keys.length) {
    return Response.json({ error: "Netlify'da OPENROUTER_API_KEY sozlanmagan (Environment variables)" }, { status: 500 });
  }

  let input;
  try { input = await req.json(); } catch { return Response.json({ error: "Noto‘g‘ri so‘rov" }, { status: 400 }); }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode(" "));
      const ping = setInterval(() => controller.enqueue(enc.encode(" ")), 10_000);
      try {
        const out = await generate(input, { keys, models, referer: new URL(req.url).origin });
        if (out.error) console.warn(`✗ ${out.status} ${out.raw || out.error}`);
        // Sarlavhalar allaqachon 200 bilan ketgan, shuning uchun xato kodi JSON ichida beriladi
        const payload = out.error ? { error: out.error, status: out.status } : { text: out.text, finish: out.finish };
        controller.enqueue(enc.encode(JSON.stringify(payload)));
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
};

export const config = { path: "/api/generate" };
