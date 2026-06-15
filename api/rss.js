// Vercel serverless function to fetch Letterboxd RSS feed and bypass CORS in production
export default async function handler(req, res) {
  // Add CORS headers for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username query parameter is required' });
  }

  try {
    const rssUrl = `https://letterboxd.com/${username}/rss/`;
    
    // Fetch RSS feed directly from Letterboxd
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      }
    });

    if (response.status === 404) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `Letterboxd RSS returned status ${response.status}` });
    }

    // Read feed as text XML
    const xmlText = await response.text();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send(xmlText);
  } catch (error) {
    console.error('Error in rss serverless function:', error);
    return res.status(500).json({ error: 'Internal server error fetching RSS' });
  }
}
