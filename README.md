# letterfy

https://letterfyio.netlify.app

discover spotify playlists based on your letterboxd diary. letterfy bridges your film and music worlds. enter your letterboxd username to see your recent watches, then click any title to instantly find spotify playlists and soundtracks — and save them directly to your library.

## features

- **no credentials needed**: fetches your recent letterboxd activity using only your public username.
- **soundtrack search**: automatically queries the spotify web api for playlists and soundtracks related to each film.
- **instant saving**: save or follow playlists directly to your spotify library with a single click.
- **secure authorization**: authentication is handled securely on the client side using the oauth2 authorization code flow with pkce.
- **token refresh**: automatically refreshes expired spotify sessions in the background to ensure continuous usage.
- **search caching**: caches search queries in-memory during your session to avoid duplicate api requests and reduce rate limit issues.
- **integrated player**: preview playlists using the official spotify web embed player inside a responsive, glassmorphic modal lightbox.

## design system

built with a focus on modern web aesthetics, featuring:
- sleek glassmorphism panels and buttons
- responsive layout for mobile and desktop viewports
- scroll-locked modal overlays with absolute-center alignment
- smooth zoom scale transitions on interactive card covers

## dependencies

this project uses the following dependencies:
- **react & vite**: core framework and build toolchain
- **js-sha256**: cryptographic sha-256 hashing fallback for secure pkce authorization in insecure local contexts
- **lucide-react**: clean, responsive icons
- **netlify functions**: serverless backend endpoint used to proxy the letterboxd rss feed

## getting started

### 1. clone the repo
```bash
git clone https://github.com/jorgecerda/letterfy.git
cd letterfy
```

### 2. install dependencies
```bash
npm install
```

### 3. set up spotify credentials

create a `.env` file in the root of the project:

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
```

to get a client id:
1. go to the spotify developer dashboard
2. create a new app
3. set the redirect uri to `https://127.0.0.1:5173/` or `https://your-computer-name.local:5173/`
4. copy the client id into your `.env` file

### 4. run locally
```bash
npm run dev
```

open `https://127.0.0.1:5173/` in your browser.

> use `127.0.0.1` or your computer's `.local` hostname instead of `localhost` — spotify's oauth api requires loopback ip literals or secure domains for redirection.

## structure tree

```
letterfy/
├── .env                  # local environment variables configuration
├── .gitignore            # git ignore configuration
├── eslint.config.js      # eslint rules configuration
├── index.html            # html entry point
├── netlify.toml          # netlify configuration
├── package-lock.json     # lockfile
├── package.json          # dependencies and scripts config
├── vite.config.js        # vite configuration
├── public/               # static public assets
│   └── favicon.svg       # favicon logo
├── src/                  # source files
│   ├── App.css           # global application css styles
│   ├── App.jsx           # main application router & layout component
│   ├── index.css         # base css reset & variables
│   ├── main.jsx          # react mount entry point
│   ├── components/       # react subcomponents
│   │   ├── AccordionItem.jsx   # movie accordion wrapper component
│   │   ├── PlaylistGrid.jsx    # spotify playlist grid component
│   │   └── PreviewModal.jsx    # spotify player iframe modal component
│   └── utils/            # helper utility scripts
│       ├── letterboxd.js # letterboxd rss feed fetcher logic
│       └── spotify.js    # spotify api oauth & token manager logic
└── netlify/              # serverless netlify functions
    └── functions/
        └── rss.js        # letterboxd cors proxy serverless function
```

## deployment

this project is built to be hosted on any static hosting provider. it is currently configured for continuous deployment via netlify. simply push to the main branch, and the live site updates automatically.
