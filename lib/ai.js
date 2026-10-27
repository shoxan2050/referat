// Umumiy AI mantiqi: lokal server (server.js) va Netlify (netlify/edge-functions/generate.js) ikkalasi shuni ishlatadi.
// Bu faylda Node yoki Deno'ga xos kod yo'q — faqat standart fetch.

// Modellar ro‘yxati: birinchisi band yoki xato bersa, OpenRouter avtomatik keyingisiga o‘tadi.
// Hisobda kredit yo‘q bo‘lsa — bepul (:free) modellar. Kredit qo‘shgach eng yaxshisi: google/gemini-3.7-flash
export const DEFAULT_MODELS = "google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,nvidia/nemotron-3-ultra-550b-a55b:free";

export const parseList = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

// ===== TIZIM PROMPTI: barcha so‘rovlar uchun umumiy "akademik muallif" roli =====
export const SYSTEM_PROMPT = `Siz O‘zbekiston oliy ta’lim muassasalari uchun ilmiy-akademik matnlar (referat, kurs ishi, maqola) yozadigan tajribali muallifsiz. Matnlaringiz professor-o‘qituvchi tekshiruvidan muammosiz o‘tadigan sifatda bo‘lishi shart.

TIL VA IMLO
- Faqat o‘zbek adabiy tilida, lotin yozuvida, amaldagi imlo qoidalari asosida yozing.
- O‘ va G‘ harflarini doim to‘g‘ri yozing (o‘, g‘), tutuq belgisini ham (ta’lim, e’tibor).
- Rus va ingliz tilidan so‘zma-so‘z o‘girilgan (kalka) iboralardan qoching.
- Xorijiy ilmiy atamani birinchi marta qo‘llaganda qavs ichida asl shaklini bering.

USLUB
- Ilmiy uslub: xolis, aniq, izchil. Shaxssiz shakllar yoki muallif ko‘pligidan foydalaning ("tahlil shuni ko‘rsatadiki", "fikrimizcha").
- Har bir xatboshi bitta asosiy fikrga qurilsin: tezis, uning izohi va dalili, oraliq xulosa. Xatboshi 4–7 gapdan iborat bo‘lsin.
- Xatboshilar mantiqiy bog‘lovchilar bilan ulansin ("shu bilan birga", "bundan farqli o‘laroq", "natijada").
- Bo‘sh umumiy gaplar ("Bugungi kunda bu juda dolzarb masala"), bir fikrni qayta-qayta takrorlash, maqtov va pafosdan qoching.
- Tushunchalar ta’rifi, tasnif, sabab-oqibat tahlili, qiyoslash va aniq misollarga tayaning.

FAKTLARGA HALOLLIK
- Ishonchingiz komil bo‘lmagan statistika, aniq raqam, sana, hujjat raqami, iqtibos yoki olim ismini to‘qimang.
- Raqam keltirsangiz, faqat keng ma’lum va umume’tirof etilgan ma’lumotni keltiring; aks holda tendensiyani so‘z bilan tavsiflang.
- Qonun, farmon va qarorlarni faqat ular haqiqatan mavjudligini aniq bilsangiz nomlang.

FORMAT
- Faqat sof matn qaytaring: markdown (#, *, ** kabi belgilar), jadval va emoji ishlatmang.
- Sarlavha yozmang — sarlavhalarni dastur o‘zi qo‘yadi.
- Xatboshilarni bitta bo‘sh qator bilan ajrating.
- "Albatta", "Mana", "Quyida keltirilgan" kabi kirish so‘zlari, o‘zingiz yoki topshiriq haqidagi izohlar bo‘lmasin — javob darhol asosiy matndan boshlansin.
- JSON so‘ralganda faqat toza, to‘g‘ri JSON qaytaring.`;

const ERRORS = {
  401: "API kalit noto‘g‘ri yoki o‘chirilgan (OPENROUTER_API_KEY ni tekshiring)",
  402: "OpenRouter hisobida kredit yo‘q — openrouter.ai/settings/credits da balansni to‘ldiring yoki bepul (:free) modelni tanlang",
  429: "Model hozir band (so‘rovlar limiti), birozdan so‘ng qayta urinib ko‘ring",
};

/**
 * Bitta AI so‘rovi. Natija: { status, text, finish, model, usage } yoki { status, error, raw }.
 * keys — bir nechta kalit: birinchisi kredit/limit/kalit xatosi bersa, keyingisi bilan qayta uriniladi.
 */
export async function generate({ prompt, json = false, maxTokens = 4000 } = {}, { keys, models, referer = "http://localhost:3000" }) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 30000) {
    return { status: 400, error: "Noto‘g‘ri so‘rov" };
  }
  const body = JSON.stringify({
    ...(models.length > 1 ? { models } : { model: models[0] }),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    // Gemini 3.x uchun temperature standart qiymatda qoldirilgani ma’qul
    max_tokens: Math.min(Number(maxTokens) || 4000, 8000),
    reasoning: { effort: "low", exclude: true },
    ...(json && { response_format: { type: "json_object" } }),
  });

  try {
    let r, data;
    for (const [i, key] of keys.entries()) {
      r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": referer,
          "X-Title": "AkademAI",
        },
        body,
      });
      data = await r.json().catch(() => ({}));
      // Kalit/hisob bilan bog‘liq xato bo‘lsa — zaxira kalit bilan qayta urinamiz
      if (![401, 402, 403, 429].includes(r.status) || i === keys.length - 1) break;
      console.warn(`… ${i + 1}-kalit ${r.status} qaytardi, zaxira kalitga o‘tilmoqda`);
    }

    if (!r.ok) {
      const raw = data.error?.metadata?.raw || data.error?.message || "";
      return { status: r.status, error: ERRORS[r.status] || raw || `OpenRouter xatosi (${r.status})`, raw };
    }
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { status: 502, error: "AI bo‘sh javob qaytardi" };
    return { status: 200, text, finish: data.choices[0].finish_reason, model: data.model, usage: data.usage };
  } catch (err) {
    return { status: 500, error: "Serverda xatolik: " + err.message };
  }
}
