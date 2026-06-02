export const fetchLetterboxdRSS = async (username) => {
  try {
    let url;
    if (import.meta.env.DEV) {
      // In development, use corsproxy.io to bypass CORS in the browser directly
      const rssUrl = `https://letterboxd.com/${username}/rss/`;
      url = `https://corsproxy.io/?url=${encodeURIComponent(rssUrl)}`;
    } else {
      // In production, fetch via our Netlify function (rewritten through /api/* redirect)
      url = `/api/rss?username=${encodeURIComponent(username)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) throw new Error('User not found');
      throw new Error(`HTTP ${response.status}`);
    }
    
    // Read the raw XML text
    const xmlText = await response.text();
    
    // Parse the XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Detect XML parse errors (e.g. 404 page returned as HTML)
    if (xmlDoc.querySelector('parsererror') || xmlDoc.querySelector('html')) {
      throw new Error('User not found or profile is private');
    }
    
    // Extract items
    const items = Array.from(xmlDoc.querySelectorAll('item')).map(item => {
      // Extract film year and title which is usually formatted in the title as "Title, Year - Rating"
      // Letterboxd RSS also has specific letterboxd:filmTitle and letterboxd:filmYear tags if we use getElementsByTagNameNS
      
      let title = item.querySelector('title')?.textContent || 'Unknown Title';
      const link = item.querySelector('link')?.textContent || '';
      
      // Attempt to get the actual film title if available
      const letterboxdTitle = item.getElementsByTagNameNS('https://letterboxd.com', 'filmTitle')[0]?.textContent;
      const letterboxdYear = item.getElementsByTagNameNS('https://letterboxd.com', 'filmYear')[0]?.textContent;
      
      // For display we'll use the specific tags if available, otherwise fallback to the main title
      const displayTitle = letterboxdTitle ? `${letterboxdTitle} (${letterboxdYear})` : title;
      const searchTitle = letterboxdTitle || title.split(', ')[0]; // Basic fallback
      
      // Extract the poster image from description CDATA
      const description = item.querySelector('description')?.textContent || '';
      const imgMatch = description.match(/src="([^"]+)"/);
      const posterUrl = imgMatch ? imgMatch[1] : null;

      return {
        title: displayTitle,
        searchTitle: searchTitle,
        link,
        posterUrl
      };
    });
    
    return items;
  } catch (error) {
    console.error("Error fetching Letterboxd RSS:", error);
    throw error; // Re-throw so the UI can show the error
  }
};
