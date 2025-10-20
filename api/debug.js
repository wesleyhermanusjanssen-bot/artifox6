// Vercel Serverless Function — helpt debuggen wat de mirror terugstuurt.
// Voorbeeld: /api/debug?url=https://gamefound.com/en/projects/artifox/artifox
export default async function handler(req, res) {
  try {
    const url = req.query.url || "https://gamefound.com/en/projects/artifox/artifox";
    const mirrorUrl = "https://r.jina.ai/" + url + "?no_cache=1";

    const r = await fetch(mirrorUrl, {
      headers: { "Accept": "text/plain" },
      cache: "no-store"
    });

    const text = await r.text();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: r.ok,
      status: r.status,
      length: text.length,
      head: text.slice(0, 1500) // eerste 1500 tekens ter inspectie
    });
  } catch (e) {
    return res.status(502).json({ error: "debug fetch failed", detail: String(e) });
  }
}
