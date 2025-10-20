// Vercel Serverless Function — geeft het actuele aantal followers terug als JSON.
// Voorbeeld: /api/followers.js?url=https://gamefound.com/en/projects/artifox/artifox
export default async function handler(req, res) {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "Missing url" });

    // Gebruik een serverless-vriendelijke mirror van de HTML
    // zodat we geen CORS/JS-rendering issues hebben.
    const mirrorUrl = "https://r.jina.ai/" + url + "?no_cache=1";

    const r = await fetch(mirrorUrl, {
      headers: { "Accept": "text/plain" },
      cache: "no-store"
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(502).json({ error: "Mirror fetch failed", status: r.status, length: text.length });
    }

    // Probeer meerdere patronen te herkennen:
    // 1) "Join 254 followers"
    // 2) "Follow (254)" of "(254) Follow"
    // 3) "254 followers" of "254 volgers"
    // 4) getal dichtbij het woord "followers"
    let followers = null;
    let m;

    // 1) "Join 254 followers"
    m = text.match(/Join\s+(\d{1,3}(?:[.,]\d{3})*|\d+)\s+followers/i);
    if (m) followers = parseInt(m[1].replace(/[^\d]/g, ""), 10);

    // 2) "(254) Follow" of "Follow (254)"
    if (followers === null) {
      m = text.match(/Follow\s*[\(\[]\s*(\d{1,3}(?:[.,]\d{3})*|\d+)\s*[\)\]]/i)
        || text.match(/[\(\[]\s*(\d{1,3}(?:[.,]\d{3})*|\d+)\s*[\)\]]\s*Follow/i);
      if (m) followers = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    }

    // 3) "254 followers" of "254 volgers"
    if (followers === null) {
      m = text.match(/(\d{1,3}(?:[.,]\d{3})*|\d+)\s+(followers|volgers)/i);
      if (m) followers = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    }

    // 4) Nabijheid van "followers" (getal ±5 tekens vóór/na)
    if (followers === null) {
      m = text.match(/followers.{0,5}(\d{1,3}(?:[.,]\d{3})*|\d+)/i) 
        || text.match(/(\d{1,3}(?:[.,]\d{3})*|\d+).{0,5}followers/i);
      if (m) followers = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    }

    if (followers === null) {
      return res.status(502).json({ error: "Could not parse followers" });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ followers });
  } catch (e) {
    return res.status(502).json({ error: "Server error", detail: String(e) });
  }
}
