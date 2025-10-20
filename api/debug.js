// Vercel Serverless Function — parse followers uit de r.jina.ai Markdown mirror
// Voorbeeld: /api/followers.js?url=https://gamefound.com/en/projects/artifox/artifox
export default async function handler(req, res) {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "Missing url" });

    // r.jina.ai geeft 'plain text / markdown' terug van de pagina
    const mirrorUrl = "https://r.jina.ai/" + url + "?no_cache=1";
    const r = await fetch(mirrorUrl, { headers: { "Accept": "text/plain" }, cache: "no-store" });
    const text = await r.text();

    if (!r.ok || !text || text.length < 500) {
      return res.status(502).json({ error: "Mirror fetch failed or too short", status: r.status, length: (text || "").length });
    }

    let followers = null, m;

    // --- Sterke patronen (meest voorkomend) ---
    // 1) "Join 254 followers"
    m = text.match(/Join\s+(\d{1,3}(?:[.,]\d{3})*|\d+)\s+followers\b/i);
    if (m) followers = parseInt(m[1].replace(/[^\d]/g, ""), 10);

    // 2) "Follow (254)" of "(254) Follow"
    if (followers === null) {
      m = text.match(/\bFollow\b[^\d]{0,20}[\(\[]\s*(\d{1,3}(?:[.,]\d{3})*|\d+)\s*[\)\]]/i)
       || text.match(/[\(\[]\s*(\d{1,3}(?:[.,]\d{3})*|\d+)\s*[\)\]][^\n]{0,20}\bFollow\b/i);
      if (m) followers = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    }

    // 3) "254 followers" of "254 volgers"
    if (followers === null) {
      m = text.match(/(\d{1,3}(?:[.,]\d{3})*|\d+)\s+(followers|volgers)\b/i);
      if (m) followers = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    }

    // 4) "followers" nabij een getal (getal vóór/na binnen ±40 tekens)
    if (followers === null) {
      m = text.match(/\bfollowers?\b.{0,40}?(\d{1,3}(?:[.,]\d{3})*|\d+)/i)
       || text.match(/(\d{1,3}(?:[.,]\d{3})*|\d+).{0,40}?\bfollowers?\b/i);
      if (m) followers = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    }

    // 5) "Follow" nabij een getal (soms staat het getal vlakbij de knop)
    if (followers === null) {
      m = text.match(/\bFollow\b.{0,60}?(\d{1,3}(?:[.,]\d{3})*|\d+)/i)
       || text.match(/(\d{1,3}(?:[.,]\d{3})*|\d+).{0,60}?\bFollow\b/i);
      if (m) followers = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    }

    if (Number.isFinite(followers)) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ followers });
    } else {
      // Stuur klein stukje sample terug ter debug (veilig, geen PII)
      return res.status(502).json({ error: "Could not parse followers", length: text.length, sample: text.slice(0, 1200) });
    }
  } catch (e) {
    return res.status(502).json({ error: "Server error", detail: String(e) });
  }
}
