const express = require('express');
const router = express.Router();

// Simple in-memory cache with TTL
const cache = new Map(); // key -> { value, expiresAt }
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Optional auth guard via static token or skip in dev
function checkAuth(req, res, next) {
  const staticToken = process.env.TRANSLATION_ACCESS_TOKEN;
  if (!staticToken) return next();
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token && token === staticToken) return next();
  return res.status(401).json({ message: 'Unauthorized' });
}

async function translateWithGemini(segments, targetLang) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback: echo original for local/dev without key
    const result = {};
    for (const s of segments) result[s] = s;
    return result;
  }

  // Batch into one prompt to reduce calls
  const prompt = `Translate the following UI strings into ${targetLang}.
Return ONLY a valid JSON object mapping original->translated (no code block fences, no commentary).\n\n` +
    segments.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Gemini error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try {
    const parsed = JSON.parse(textOut);
    // Ensure all segments are present; fallback to original if missing
    const result = {};
    for (const s of segments) result[s] = parsed[s] || parsed[s.trim()] || s;
    return result;
  } catch (_) {
    const result = {};
    for (const s of segments) result[s] = s;
    return result;
  }
}

// POST /api/translate
router.post('/', checkAuth, async (req, res) => {
  try {
    const { segments, targetLang = 'hi' } = req.body || {};
    if (!Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ message: 'segments array required' });
    }
    const key = `${targetLang}::${segments.join('|')}`;
    const cached = getCache(key);
    if (cached) {
      return res.json({ translations: cached, cached: true });
    }
    const translations = await translateWithGemini(segments, targetLang);
    setCache(key, translations);
    return res.json({ translations, cached: false });
  } catch (err) {
    console.error('Translation error:', err);
    return res.status(500).json({ message: 'Translation failed' });
  }
});

// SSE stream: GET /api/translate/stream?targetLang=hi
router.get('/stream', checkAuth, async (req, res) => {
  try {
    const segments = (req.query.segments || '')
      .split('|')
      .map(s => s.trim())
      .filter(Boolean);
    const targetLang = req.query.targetLang || 'hi';
    if (segments.length === 0) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('segments query param required');
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Check cache first
    const results = {};
    for (const s of segments) {
      const key = `${targetLang}::${s}`;
      const cached = getCache(key);
      if (cached && cached[s]) {
        results[s] = cached[s];
        res.write(`event: chunk\n`);
        res.write(`data: ${JSON.stringify({ key: s, value: cached[s], cached: true })}\n\n`);
      }
    }
    const remaining = segments.filter(s => results[s] == null);
    if (remaining.length > 0) {
      const translated = await translateWithGemini(remaining, targetLang);
      for (const s of remaining) {
        const key = `${targetLang}::${s}`;
        setCache(key, { [s]: translated[s] });
        res.write(`event: chunk\n`);
        res.write(`data: ${JSON.stringify({ key: s, value: translated[s], cached: false })}\n\n`);
      }
    }
    res.write('event: end\n');
    res.write('data: done\n\n');
    res.end();
  } catch (err) {
    console.error('SSE translation error:', err);
    try {
      res.write('event: error\n');
      res.write(`data: ${JSON.stringify({ message: 'Translation failed' })}\n\n`);
    } catch (_) {}
    res.end();
  }
});

module.exports = router;












