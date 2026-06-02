# Letterfy

> Discover Spotify playlists based on your Letterboxd diary.

🌐 **Live at [letterfyio.netlify.app](https://letterfyio.netlify.app/)**

## About

**Letterfy** bridges your film and music worlds. Enter your Letterboxd username to see your recent watches, then click any title to instantly find Spotify playlists and soundtracks — and save them directly to your Spotify library.

## Features

- 🎬 Fetches your recent Letterboxd activity (no Letterboxd login required — just your username)
- 🎵 Searches Spotify for soundtracks and playlists related to each film
- 💾 Save playlists to your Spotify library in one click
- 🔐 Secure Spotify authentication via PKCE OAuth2

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/jorgecerda/letterfy.git
cd letterfy
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Spotify credentials

Create a `.env` file in the root of the project:

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
```

To get a Client ID:
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Set the **Redirect URI** to `http://127.0.0.1:5173/`
4. Copy the **Client ID** into your `.env` file

### 4. Run locally
```bash
npm run dev
```

Open **http://127.0.0.1:5173/** in your browser.

> ⚠️ Use `127.0.0.1` instead of `localhost` — Spotify's API requires the loopback IP for local development.

## Tech Stack

- **React** + **Vite**
- **Spotify Web API** (PKCE OAuth2)
- **Letterboxd RSS Feed**
- **Vanilla CSS** with glassmorphism design
