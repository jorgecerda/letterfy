// Utility for interacting with Spotify Web API using PKCE flow
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = window.location.origin + '/';

const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
];

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

const sha256 = async (plain) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export const loginToSpotify = async () => {
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
    return data.access_token;
  }
  return null;
}

export const getStoredToken = () => {
  return localStorage.getItem('spotify_access_token');
}

export const searchSpotifyPlaylists = async (token, query) => {
  if (!token) throw new Error("No Spotify token");
  
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query + ' soundtrack')}&type=playlist&limit=6`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
      if (response.status === 401) {
          // Token expired
          localStorage.removeItem('spotify_access_token');
          throw new Error("Token expired");
      }
      throw new Error('Failed to fetch from Spotify');
  }
  const data = await response.json();
  return data.playlists.items;
};

export const followPlaylist = async (token, playlistId) => {
  if (!token) throw new Error("No Spotify token");
  
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) throw new Error('Failed to follow playlist');
  return true;
};
