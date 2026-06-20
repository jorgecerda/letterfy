import { useState, useEffect, useCallback } from 'react'
import { Music, ArrowRight, AlertCircle, Power } from 'lucide-react'
import { fetchLetterboxdRSS } from './utils/letterboxd'
import { loginToSpotify, getTokenFromCode, getStoredToken, logoutFromSpotify, followPlaylist } from './utils/spotify'
import AccordionItem from './components/AccordionItem'
import PreviewModal from './components/PreviewModal'
import './App.css'

const popularUsers = [
  'karsten', 
  'mscorsese', 
  'girlactress', 
  'itscharlibb', 
  'tedsmovies', 
  'seanbaker', 
  'francisfcoppola', 
  'jimmycthatsme',
  'edgarwright',
  'davidehrlich',
  'demiadejuyigbe',
  'silentdawn',
  'zoerosebryant',
  'blankcheck',
  'scruffy',
  'hoops',
  'lucy',
  'jokerswild',
  'kyleharris'
]

function App() {
  const [username, setUsername] = useState('')
  const [spotifyToken, setSpotifyToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [movies, setMovies] = useState([])
  const [error, setError] = useState(null)
  const [savedPlaylists, setSavedPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem('spotify_saved_playlist_ids')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch (e) {
      return new Set()
    }
  })
  const [expandedMovieTitle, setExpandedMovieTitle] = useState(null)
  const [demoUser, setDemoUser] = useState('')
  const [previewPlaylistId, setPreviewPlaylistId] = useState(null)

  // Persist followed/saved playlist IDs locally to preserve UI state across reloads
  useEffect(() => {
    try {
      localStorage.setItem('spotify_saved_playlist_ids', JSON.stringify(Array.from(savedPlaylists)))
    } catch (e) {
      console.error("Failed to save playlist IDs to localStorage:", e)
    }
  }, [savedPlaylists])

  // Select a random popular user on mount to offer a demo experience
  useEffect(() => {
    const randomUser = popularUsers[Math.floor(Math.random() * popularUsers.length)]
    setDemoUser(randomUser)
  }, [])
  
  // Initialize restoring state synchronously to avoid flashing the home page
  const [isRestoring, setIsRestoring] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const savedUsername = window.localStorage.getItem('restore_letterboxd_username')
    return !!(code || savedUsername)
  })

  // Debug log on start to help identify config mismatches
  useEffect(() => {
    if (import.meta.env.DEV) {
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      const redirectUri = window.location.origin + '/';
      console.log("=== Letterfy Config Info ===");
      console.log("Vite Mode:", import.meta.env.MODE);
      console.log("Spotify Client ID:", clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : "MISSING ❌");
      console.log("Spotify Redirect URI:", redirectUri);
      console.log("============================");
    }
  }, []);

  // Check for Spotify token on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    
    const initializeToken = async () => {
      let token = null
      try {
        if (code) {
          token = await getTokenFromCode(code)
          window.history.replaceState({}, document.title, window.location.pathname)
        } else {
          token = getStoredToken()
        }

        if (token) {
          setSpotifyToken(token)

          // Restore username and expanded movie if they were stored prior to login redirect
          const savedUsername = window.localStorage.getItem('restore_letterboxd_username')
          const savedMovieTitle = window.localStorage.getItem('restore_active_movie_title')

          if (savedUsername) {
            setUsername(savedUsername)
            setLoading(true)
            setError(null)
            try {
              const items = await fetchLetterboxdRSS(savedUsername)
              if (items.length === 0) {
                setError(`No activity found for "${savedUsername}". Make sure the profile is public and the username is correct.`)
              } else {
                setMovies(items)
                if (savedMovieTitle) {
                  setExpandedMovieTitle(savedMovieTitle)
                }
              }
            } catch (err) {
              console.error("Auto-restore failed:", err)
            } finally {
              setLoading(false)
              // Clear restore state so it doesn't run again on reload
              window.localStorage.removeItem('restore_letterboxd_username')
              window.localStorage.removeItem('restore_active_movie_title')
            }
          }
        }
      } catch (err) {
        setError("Spotify authentication failed. Please try connecting your account again.")
        console.error("Token initialization failed:", err)
      } finally {
        setIsRestoring(false)
      }
    }

    initializeToken()
  }, [])

  const handleConnect = async (e) => {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true)
    setError(null)
    setMovies([])
    setExpandedMovieTitle(null) // Reset expanded movie on new search
    try {
      const items = await fetchLetterboxdRSS(username.trim())
      if (items.length === 0) {
        setError(`No activity found for "${username}". Make sure the profile is public and the username is correct.`)
      } else {
        setMovies(items)
      }
    } catch (err) {
      setError(`Could not find a Letterboxd account for "${username}". Please check the username and try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoClick = async (demoUsername) => {
    setUsername(demoUsername)
    setLoading(true)
    setError(null)
    setMovies([])
    setExpandedMovieTitle(null)
    try {
      const items = await fetchLetterboxdRSS(demoUsername)
      if (items.length === 0) {
        setError(`No activity found for "${demoUsername}". Make sure the profile is public and the username is correct.`)
      } else {
        setMovies(items)
      }
    } catch (err) {
      setError(`Could not find a Letterboxd account for "${demoUsername}". Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePlaylist = useCallback(async (playlistId) => {
    try {
      await followPlaylist(spotifyToken, playlistId)
      setSavedPlaylists(prev => new Set(prev).add(playlistId))
    } catch {
      alert('Failed to save playlist.')
    }
  }, [spotifyToken])

  const handleDisconnect = () => {
    logoutFromSpotify()
    setSpotifyToken(null)
    setSavedPlaylists(new Set())
  }

  if (isRestoring) {
    return (
      <div className="app-container">
        <div className="restore-loading-container">
          <div className="restore-loading-card glass-panel">
            <div className="restore-loading-icon">
              <div className="restore-loading-pulse"></div>
              <Music size={32} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Connecting Spotify</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Restoring your cinema diary and syncing playlists...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="app-container">
      <div className="container">
        <nav className="navbar">
          <div className="logo text-gradient" style={{ cursor: movies.length > 0 ? 'pointer' : 'default' }} onClick={() => { setMovies([]); setError(null); setExpandedMovieTitle(null) }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" width="28" height="28" style={{ flexShrink: 0 }}>
              <path d="M 80,284 A 176,176 0 0,1 432,284" stroke="#1db954" strokeWidth="44" strokeLinecap="round" />
              <rect x="44" y="254" width="72" height="150" rx="36" fill="#1db954" />
              <rect x="396" y="254" width="72" height="150" rx="36" fill="#1db954" />
            </svg>
            Letterfy
          </div>
          {!spotifyToken ? (
            <button className="btn btn-secondary" onClick={() => loginToSpotify(username, expandedMovieTitle)}>
              <Music size={18} />
              Login with Spotify
            </button>
          ) : (
            <button 
              className="btn btn-secondary" 
              onClick={handleDisconnect}
              style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', cursor: 'pointer' }}
              title="Click to disconnect Spotify"
            >
              <Power size={18} />
              Spotify Connected
            </button>
          )}
        </nav>

        <main className="hero-section">
          <div className="hero-bg-glow"></div>

          {movies.length === 0 ? (
            // Landing State
            <>
              <h1 className="hero-title animate-fade-in">
                Soundtrack your <br />
                <span className="text-gradient-alt">cinema experience.</span>
              </h1>

              <p className="hero-subtitle animate-fade-in delay-100">
                Connect your Letterboxd diary to automatically discover and save Spotify playlists based on the movies you watch.
              </p>

              <div className="action-card glass-panel animate-fade-in delay-200">
                <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter your Letterboxd username..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Fetching Diary...' : 'Get Started'}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                </form>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '-4px', lineHeight: '1.4' }}>
                  no account? try with{' '}
                  <button
                    type="button"
                    onClick={() => handleDemoClick(demoUser)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 'inherit', fontFamily: 'inherit', display: 'inline' }}
                  >
                    {demoUser}
                  </button>
                </p>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 80, 80, 0.1)', border: '1px solid rgba(255, 80, 80, 0.3)' }}>
                    <AlertCircle size={18} color="#ff5050" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '0.875rem', color: '#ff8080', margin: 0 }}>{error}</p>
                  </div>
                )}

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  We'll fetch recent watches via the public profile. No Letterboxd login required.
                </p>
              </div>
            </>
          ) : (
            // Dashboard State — Accordion
            <div className="animate-fade-in" style={{ width: '100%', textAlign: 'left', marginTop: '-40px' }}>
              <h2 style={{ marginBottom: '8px', fontSize: '2rem' }}>
                Recent Watches for <span className="text-gradient-alt">{username}</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
                Click any title to expand and discover Spotify playlists.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {movies.map((movie, idx) => (
                  <AccordionItem
                    key={idx}
                    movie={movie}
                    username={username}
                    spotifyToken={spotifyToken}
                    savedPlaylists={savedPlaylists}
                    onSave={handleSavePlaylist}
                    isOpen={expandedMovieTitle === movie.title}
                    onToggle={() => setExpandedMovieTitle(expandedMovieTitle === movie.title ? null : movie.title)}
                    onPreview={setPreviewPlaylistId}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>

    {previewPlaylistId && (
      <PreviewModal
        playlistId={previewPlaylistId}
        onClose={() => setPreviewPlaylistId(null)}
      />
    )}
  </>
)
}

export default App
