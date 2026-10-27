// Lokal server: npm start → http://localhost:3000
// Netlify'da bu fayl ishlatilmaydi — u yerda netlify/edge-functions/generate.js ishlaydi.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate, DEFAULT_MODELS, parseList } from "./lib/ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env fayli bo‘lsa, o‘qib olamiz
try { process.loadEnvFile?.(path.join(__dirname, ".env")); } catch {}

// OpenRouter kalitlari: .env dagi OPENROUTER_API_KEY (bir nechta bo‘lsa vergul bilan)
// yoki keys.local.js fayli (GitHub'ga yuklanmaydi). Namuna: keys.example.js
let LOCAL_KEYS = [];
try {
  LOCAL_KEYS = (await import("./keys.local.js")).default?.keys || [];
} catch (e) {
  if (e.code !== "ERR_MODULE_NOT_FOUND") console.warn("keys.local.js o‘qilmadi:", e.message);
}
const API_KEYS = parseList(process.env.OPENROUTER_API_KEY || LOCAL_KEYS.join(","));
const MODELS = parseList(process.env.AI_MODEL || DEFAULT_MODELS);
const PORT = process.env.PORT || 3000;

if (!API_KEYS.length) {
  console.error("OpenRouter kaliti topilmadi. keys.example.js dan nusxa olib keys.local.js yarating yoki .env ga OPENROUTER_API_KEY yozing.");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Oddiy himoya: bitta IP'dan 10 daqiqada 40 tagacha so‘rov (1 referat ≈ 8–9 so‘rov)
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const list = (hits.get(req.ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 40) {
    return res.status(429).json({ error: "So‘rovlar soni oshib ketdi. 10 daqiqadan so‘ng urinib ko‘ring." });
  }
  list.push(now);
  hits.set(req.ip, list);
  next();
}

app.post("/api/generate", rateLimit, async (req, res) => {
  const out = await generate(req.body, {
    keys: API_KEYS,
    models: MODELS,
    referer: process.env.SITE_URL || `http://localhost:${PORT}`,
  });
  if (out.error) {
    console.warn(`✗ ${out.status} ${out.raw || out.error}`);
    return res.status(out.status).json({ error: out.error });
  }
  console.log(`✓ ${out.model} · ${out.usage?.prompt_tokens ?? "?"}→${out.usage?.completion_tokens ?? "?"} token · ${out.text.length} belgi`);
  res.json({ text: out.text, finish: out.finish });
});

app.listen(PORT, () => console.log(`AkademAI: http://localhost:${PORT}  (model: ${MODELS.join(" → ")})`));
