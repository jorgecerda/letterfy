// Utility for interacting with Spotify Web API using PKCE flow
import { sha256 as jsSha256 } from 'js-sha256';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = window.location.origin + '/';

const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
];

const searchCache = new Map();

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

const sha256 = async (plain) => {
  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return window.crypto.subtle.digest('SHA-256', data)
  }
  // Fallback for insecure contexts (like testing on local network Wi-Fi)
  return jsSha256.arrayBuffer(plain);
}

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export const loginToSpotify = async (username = '', activeMovieTitle = '') => {
  if (!CLIENT_ID) {
    const errorMsg = "Spotify Client ID (VITE_SPOTIFY_CLIENT_ID) is missing! Please set this variable in your Netlify Environment Variables (and trigger a redeploy) or local .env file.";
    alert(errorMsg);
    console.error(errorMsg);
    return;
  }

  // Save state for restoration after authentication redirect
  if (username) {
    window.localStorage.setItem('restore_letterboxd_username', username);
  }
  if (activeMovieTitle) {
    window.localStorage.setItem('restore_active_movie_title', activeMovieTitle);
  }

  const codeVerifier = generateRandomString(64);
  window.localStorage.setItem('code_verifier', codeVerifier);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  const authUrl = new URL("https://accounts.spotify.com/authorize")

  const params =  {
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: REDIRECT_URI,
  }

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
}

export const getTokenFromCode = async (code) => {
  const codeVerifier = localStorage.getItem('code_verifier');

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  }

  const response = await fetch("https://accounts.spotify.com/api/token", payload);
  const data = await response.json();
  
  if (data.access_token) {
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    const expiresAt = Date.now() + (data.expires_in * 1000);
    localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
    return data.access_token;
  }
  return null;
}

export const getStoredToken = () => {
  return localStorage.getItem('spotify_access_token');
}

export const logoutFromSpotify = () => {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires_at');
  localStorage.removeItem('restore_letterboxd_username');
  localStorage.removeItem('restore_active_movie_title');
};

export const refreshSpotifyToken = async () => {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  };

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", payload);
    const data = await response.json();
    
    if (data.access_token) {
      localStorage.setItem('spotify_access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
      }
      const expiresAt = Date.now() + (data.expires_in * 1000);
      localStorage.setItem('spotify_token_expires_at', expiresAt.toString());
      return data.access_token;
    } else {
      logoutFromSpotify();
      return null;
    }
  } catch (err) {
    console.error("Failed to refresh Spotify token:", err);
    return null;
  }
};

export const getValidToken = async () => {
  const token = localStorage.getItem('spotify_access_token');
  const expiresAt = localStorage.getItem('spotify_token_expires_at');
  const refreshToken = localStorage.getItem('spotify_refresh_token');

  if (!token) return null;

  // Refresh if token has expired or expires in the next 60 seconds
  if (expiresAt && Date.now() > parseInt(expiresAt, 10) - 60000) {
    if (refreshToken) {
      console.log("Spotify token expired or expiring soon, refreshing...");
      return await refreshSpotifyToken();
    }
  }

  return token;
};

export const searchSpotifyPlaylists = async (token, query) => {
  const cacheKey = query.toLowerCase().trim();
  if (searchCache.has(cacheKey)) {
    console.log(`Returning cached Spotify search results for: "${query}"`);
    return searchCache.get(cacheKey);
  }

  const validToken = await getValidToken() || token;
  if (!validToken) throw new Error("No Spotify token");
  
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query + ' soundtrack')}&type=playlist&limit=6`, {
    headers: {
      Authorization: `Bearer ${validToken}`
    }
  });

  if (!response.ok) {
      if (response.status === 401) {
          // Token expired unexpectedly, try refreshing and retrying once
          const refreshedToken = await refreshSpotifyToken();
          if (refreshedToken) {
              const retryResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query + ' soundtrack')}&type=playlist&limit=6`, {
                  headers: {
                      Authorization: `Bearer ${refreshedToken}`
                  }
              });
              if (retryResponse.ok) {
                  const data = await retryResponse.json();
                  searchCache.set(cacheKey, data.playlists.items);
                  return data.playlists.items;
              }
          }
          logoutFromSpotify();
          throw new Error("Token expired");
      }
      throw new Error('Failed to fetch from Spotify');
  }
  const data = await response.json();
  searchCache.set(cacheKey, data.playlists.items);
  return data.playlists.items;
};

export const followPlaylist = async (token, playlistId) => {
  const validToken = await getValidToken() || token;
  if (!validToken) throw new Error("No Spotify token");
  
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${validToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
      if (response.status === 401) {
          // Token expired unexpectedly, try refreshing and retrying once
          const refreshedToken = await refreshSpotifyToken();
          if (refreshedToken) {
              const retryResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
                  method: 'PUT',
                  headers: {
                      Authorization: `Bearer ${refreshedToken}`,
                      'Content-Type': 'application/json'
                  }
              });
              if (retryResponse.ok) return true;
          }
          logoutFromSpotify();
          throw new Error('Failed to follow playlist');
      }
      throw new Error('Failed to follow playlist');
  }
  return true;
};
