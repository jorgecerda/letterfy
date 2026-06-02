// Netlify serverless function to fetch Letterboxd RSS feed and bypass CORS in production
export async function handler(event, context) {
  // Extract username from query parameters
  const username = event.queryStringParameters?.username;

  if (!username) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Username query parameter is required' })
    };
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
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: `Letterboxd RSS returned status ${response.status}` })
      };
    }

    // Read feed as text XML
    const xmlText = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/xml; charset=utf-8'
      },
      body: xmlText
    };
  } catch (error) {
    console.error('Error in rss serverless function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error fetching RSS' })
    };
  }
}
