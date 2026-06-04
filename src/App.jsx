import { useState, useEffect, useCallback, useRef } from 'react'
import { Music, Film, ArrowRight, CheckCircle, ExternalLink, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { fetchLetterboxdRSS } from './utils/letterboxd'
import { loginToSpotify, getTokenFromCode, getStoredToken, searchSpotifyPlaylists, followPlaylist } from './utils/spotify'
import './App.css'

function PlaylistGrid({ movie, username, spotifyToken, savedPlaylists, onSave, isOpen, headerRef, onPreview }) {
  const [playlists, setPlaylists] = useState(null) // null = not fetched yet
  const [loading, setLoading] = useState(false)
  const openTimeRef = useRef(0)

  // Track the timestamp when this accordion was expanded
  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now()
    } else {
      openTimeRef.current = 0
    }
  }, [isOpen])

  useEffect(() => {
    if (!spotifyToken || !isOpen || playlists !== null) return
    setLoading(true)
    searchSpotifyPlaylists(spotifyToken, movie.searchTitle)
      .then(results => setPlaylists(results))
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false))
  }, [movie.searchTitle, spotifyToken, isOpen, playlists])

  // Coordinated scroll: scroll only when the transition has finished and playlists are rendered
  useEffect(() => {
    if (isOpen && playlists !== null && !loading && spotifyToken && headerRef) {
      const elapsed = Date.now() - openTimeRef.current
      // Ensure we wait at least 300ms since expansion started, and at least 100ms for painting
      const delay = Math.max(300 - elapsed, 100)

      const timer = setTimeout(() => {
        if (headerRef.current) {
          headerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [isOpen, playlists, loading, spotifyToken, headerRef])

  if (!spotifyToken) {
    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', padding: '20px 24px', alignItems: 'center', flexWrap: 'wrap' }}>
        {movie.posterUrl && (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            style={{
              width: '90px',
              aspectRatio: '2/3',
              borderRadius: '6px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
              border: '1px solid var(--glass-border)',
              objectFit: 'cover'
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Connect Spotify to find playlists for <strong>{movie.title}</strong>.
          </p>
          <button className="btn btn-primary" onClick={() => loginToSpotify(username, movie.title)}>
            <Music size={18} /> Connect Spotify
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <p style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>Searching Spotify...</p>
  }

  if (!playlists || playlists.length === 0) {
    return <p style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>No playlists found for this title.</p>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', padding: '16px 24px 24px' }}>
      {playlists.filter(p => p != null).map(playlist => (
        <div key={playlist.id} className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.04)' }}>
          {playlist.images && playlist.images.length > 0 ? (
            <img
              src={playlist.images[0]?.url}
              alt={playlist.name}
              style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', aspectRatio: '1/1', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', aspectRatio: '1/1', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music size={36} color="var(--text-secondary)" />
            </div>
          )}
          <h4 style={{ fontSize: '0.9rem', marginBottom: '4px', lineHeight: '1.3' }}>{playlist.name}</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', flex: 1 }}>
            By {playlist.owner?.display_name || 'Spotify'}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem' }}
              onClick={() => onPreview(playlist.id)}
            >
              Preview
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem' }}
              onClick={() => onSave(playlist.id)}
              disabled={savedPlaylists.has(playlist.id)}
            >
              {savedPlaylists.has(playlist.id) ? '✓ Saved' : 'Save'}
            </button>
            <a
              href={playlist.external_urls?.spotify}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ padding: '6px 8px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

function AccordionItem({ movie, username, spotifyToken, savedPlaylists, onSave, isOpen, onToggle, onPreview }) {
  const headerRef = useRef(null)

  useEffect(() => {
    // Only scroll directly from AccordionItem if NOT connected to Spotify.
    // If connected to Spotify, PlaylistGrid will coordinate the scroll after loading content.
    if (isOpen && !spotifyToken) {
      const timer = setTimeout(() => {
        if (headerRef.current) {
          headerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300) // Wait 300ms for height transitions to complete
      return () => clearTimeout(timer)
    }
  }, [isOpen, spotifyToken])

  return (
    <div
      className="glass-panel"
      style={{
        width: '100%',
        border: isOpen ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
        transition: 'border-color 0.2s ease',
        overflow: 'hidden'
      }}
    >
      {/* Header row */}
      <div
        ref={headerRef}
        onClick={onToggle}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          scrollMarginTop: '24px' // Breathing room at top of viewport
        }}
      >
        <h3 style={{ fontSize: '1.05rem', margin: 0, lineHeight: '1.3' }}>{movie.title}</h3>
        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', flexShrink: 0, marginLeft: '16px' }}>
          {isOpen ? <><ChevronUp size={18} /> Hide playlists</> : <><ChevronDown size={18} /> Find playlists</>}
        </span>
      </div>

      {/* Expandable content wrapper with CSS Grid Height Animation */}
      <div 
        className={`accordion-content ${isOpen ? 'expanded' : ''}`}
        style={{ borderTop: isOpen ? '1px solid var(--glass-border)' : '1px solid transparent' }}
      >
        <div style={{ minHeight: 0 }}>
          <PlaylistGrid
            movie={movie}
            username={username}
            spotifyToken={spotifyToken}
            savedPlaylists={savedPlaylists}
            onSave={onSave}
            isOpen={isOpen}
            headerRef={headerRef}
            onPreview={onPreview}
          />
        </div>
      </div>
    </div>
  )
}

function App() {
  const [username, setUsername] = useState('')
  const [spotifyToken, setSpotifyToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [movies, setMovies] = useState([])
  const [error, setError] = useState(null)
  const [savedPlaylists, setSavedPlaylists] = useState(new Set())
  const [expandedMovieTitle, setExpandedMovieTitle] = useState(null)
  const [demoUser, setDemoUser] = useState('')
  const [previewPlaylistId, setPreviewPlaylistId] = useState(null)

  // Prevent background body scroll when the modal lightbox is open
  useEffect(() => {
    if (previewPlaylistId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [previewPlaylistId])

  // Select a random popular user on mount to offer a demo experience
  useEffect(() => {
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
      'bratpitt',
      'demiadejuyigbe',
      'gemmacr',
      'silentdawn',
      'zoerosebryant',
      'blankcheck',
      'insomniac',
      'scruffy',
      'hoops',
      'monika',
      'sallyjaneblack',
      'lucy',
      'jokerswild',
      'davidl',
      'kyleharris'
    ]
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
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = window.location.origin + '/';
    console.log("=== Letterfy Config Info ===");
    console.log("Vite Mode:", import.meta.env.MODE);
    console.log("Spotify Client ID:", clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : "MISSING ❌");
    console.log("Spotify Redirect URI:", redirectUri);
    console.log("============================");
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
            <div className="btn btn-secondary" style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>
              <CheckCircle size={18} />
              Spotify Connected
            </div>
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
      <div className="modal-overlay" onClick={() => setPreviewPlaylistId(null)}>
        <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={() => setPreviewPlaylistId(null)} aria-label="Close Preview">
            &times;
          </button>
          <iframe
            src={`https://open.spotify.com/embed/playlist/${previewPlaylistId}?utm_source=generator`}
            width="100%"
            height="380"
            frameBorder="0"
            allowFullScreen=""
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: '12px', border: 'none' }}
          ></iframe>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginTop: '12px',
            lineHeight: '1.4',
            padding: '0 8px'
          }}>
            Note: On mobile, Spotify requires you to be logged in to Spotify in your mobile browser, or it may redirect to the Spotify app to play previews.
          </p>
        </div>
      </div>
    )}
  </>
)
}

export default App
