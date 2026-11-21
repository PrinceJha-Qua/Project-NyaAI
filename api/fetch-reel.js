module.exports = async (req, res) => {
  // Support both GET and POST
  const { code, url } = req.query || req.body || {};
  let shortcode = code;

  if (!shortcode && url) {
    const m = url.match(/(?:reels?|p|tv|share\/reel|share\/p)\/([A-Za-z0-9_-]+)/i);
    if (m) shortcode = m[1];
  }

  if (!shortcode) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    return res.status(400).json({ error: "Missing Instagram shortcode or URL" });
  }

  try {
    const targetUrl = `https://www.instagram.com/reel/${shortcode}/`;
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    const html = await response.text();

    const ogImg = html.match(/property=["']og:image["']\s*content=["']([^"']+)["']/i) ||
                  html.match(/content=["']([^"']+)["']\s*property=["']og:image["']/i);
    const ogDesc = html.match(/property=["']og:description["']\s*content=["']([^"']+)["']/i) ||
                   html.match(/content=["']([^"']+)["']\s*property=["']og:description["']/i);
    const ogTitle = html.match(/property=["']og:title["']\s*content=["']([^"']+)["']/i) ||
                    html.match(/content=["']([^"']+)["']\s*property=["']og:title["']/i);

    const thumbnail = ogImg ? ogImg[1].replace(/&amp;/g, '&') : `https://www.instagram.com/p/${shortcode}/media/?size=l`;
    const descText = ogDesc ? ogDesc[1] : "";

    let likes = 0;
    let comments = 0;
    const lm = descText.match(/([0-9KMkm.,]+)\s*likes?/i);
    if (lm) {
      let ls = lm[1].replace(/,/g, '').trim().toLowerCase();
      let mult = 1;
      if (ls.endsWith('k')) { mult = 1000; ls = ls.slice(0, -1); }
      else if (ls.endsWith('m')) { mult = 1000000; ls = ls.slice(0, -1); }
      likes = parseFloat(ls) * mult;
    }

    const cm = descText.match(/([0-9KMkm.,]+)\s*comments?/i);
    if (cm) {
      let cs = cm[1].replace(/,/g, '').trim().toLowerCase();
      let mult = 1;
      if (cs.endsWith('k')) { mult = 1000; cs = cs.slice(0, -1); }
      else if (cs.endsWith('m')) { mult = 1000000; cs = cs.slice(0, -1); }
      comments = parseFloat(cs) * mult;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    return res.status(200).json({
      success: true,
      shortcode,
      likes,
      comments,
      thumbnail,
      title: ogTitle ? ogTitle[1] : ""
    });
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({
      success: false,
      shortcode,
      likes: 0,
      comments: 0,
      thumbnail: `https://www.instagram.com/p/${shortcode}/media/?size=l`,
      error: err.message
    });
  }
};
