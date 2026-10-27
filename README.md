# AkademAI — AI referat generatori

Mavzuni kiritasiz: AI reja tuzadi, kirish, paragraflar, xulosa va adabiyotlar ro'yxatini yozadi. Natijani A4 ko'rinishida ko'rasiz, Word (.doc) yoki PDF qilib yuklab olasiz. AI so'rovlari OpenRouter orqali yuboriladi.

## Netlify'ga joylash
1. Netlify → **Add new site → Import from Git** → shu repozitoriyni tanlang. Build sozlamalari `netlify.toml` da bor, hech narsani o'zgartirmang.
2. **Site configuration → Environment variables** bo'limiga qo'shing:
   - `OPENROUTER_API_KEY` — kalit. Zaxira kalit bo'lsa, vergul bilan: `kalit1,kalit2`
   - `AI_MODEL` (ixtiyoriy) — masalan `google/gemini-3.7-flash`. Bo'sh qoldirilsa, bepul modellar ishlatiladi.
3. **Deploys → Trigger deploy** tugmasini bosing.

`/api/generate` so'rovlari `netlify/edge-functions/generate.js` orqali ishlaydi. Bepul modellar bitta qismni 1–2 daqiqa yozadi, shuning uchun bu yerda Edge Function ishlatilgan: u ulanishni uzilib qolishdan saqlaydi.

## Kompyuterda ishga tushirish
1. Node.js 18 yoki undan yangi versiya kerak.
2. `keys.example.js` faylidan nusxa olib, `keys.local.js` deb nomlang va kalitlarni yozing. Bu fayl GitHub'ga yuklanmaydi.
3. `npm install`, keyin `npm start` buyrug'ini bering va brauzerda http://localhost:3000 ni oching.

## Modellar
- Bepul (`:free`) modellar sekin ishlaydi: bitta referatga 5–6 daqiqa ketadi. O'zbek tilidagi sifati ham o'rtacha.
- OpenRouter hisobini to'ldirgandan keyin `AI_MODEL=google/gemini-3.7-flash` qilib qo'ying. Bitta referat taxminan $0.08 turadi.

AI ba'zan mavjud bo'lmagan manbani keltirishi mumkin. Topshirishdan oldin adabiyotlar ro'yxatini tekshirib chiqing.

## Tuzilishi
```
public/index.html                   sahifa (UI, promptlar, Word eksport)
lib/ai.js                           tizim prompti va OpenRouter so'rovi (umumiy)
server.js                           lokal Express server
netlify/edge-functions/generate.js  Netlify'dagi /api/generate
netlify.toml                        Netlify sozlamalari
```
