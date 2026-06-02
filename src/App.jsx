import { useState, useEffect, useCallback } from 'react'
import { Music, Film, ArrowRight, CheckCircle, ExternalLink, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { fetchLetterboxdRSS } from './utils/letterboxd'
import { loginToSpotify, getTokenFromCode, getStoredToken, searchSpotifyPlaylists, followPlaylist } from './utils/spotify'
import './App.css'

function PlaylistGrid({ movie, spotifyToken, savedPlaylists, onSave }) {
  const [playlists, setPlaylists] = useState(null) // null = not fetched yet
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!spotifyToken) return
    setLoading(true)
    searchSpotifyPlaylists(spotifyToken, movie.searchTitle)
      .then(results => setPlaylists(results))
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false))
  }, [movie.searchTitle, spotifyToken])

  if (!spotifyToken) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Connect Spotify to find playlists.</p>
        <button className="btn btn-primary" onClick={loginToSpotify}>Connect Spotify</button>
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
              style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
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
              style={{ padding: '6px 10px', borderRadius: '8px' }}
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

function AccordionItem({ movie, spotifyToken, savedPlaylists, onSave }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="glass-panel"
      style={{
        width: '100%',
        border: open ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
        transition: 'border-color 0.2s ease',
        overflow: 'hidden'
      }}
    >
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <h3 style={{ fontSize: '1.05rem', margin: 0, lineHeight: '1.3' }}>{movie.title}</h3>
        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', flexShrink: 0, marginLeft: '16px' }}>
          {open ? <><ChevronUp size={18} /> Hide playlists</> : <><ChevronDown size={18} /> Find playlists</>}
        </span>
      </div>

      {/* Expandable content */}
      {open && (
        <div style={{ borderTop: '1px solid var(--glass-border)' }}>
          <PlaylistGrid
            movie={movie}
            spotifyToken={spotifyToken}
            savedPlaylists={savedPlaylists}
            onSave={onSave}
          />
        </div>
      )}
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

  // Check for Spotify token on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    if (code) {
      getTokenFromCode(code).then(token => {
        if (token) setSpotifyToken(token)
        window.history.replaceState({}, document.title, window.location.pathname)
      })
    } else {
      const stored = getStoredToken()
      if (stored) setSpotifyToken(stored)
    }
  }, [])

  const handleConnect = async (e) => {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true)
    setError(null)
    setMovies([])
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

  const handleSavePlaylist = useCallback(async (playlistId) => {
    try {
      await followPlaylist(spotifyToken, playlistId)
      setSavedPlaylists(prev => new Set(prev).add(playlistId))
    } catch {
      alert('Failed to save playlist.')
    }
  }, [spotifyToken])

  return (
    <div className="app-container">
      <div className="container">
        <nav className="navbar">
          <div className="logo text-gradient" style={{ cursor: movies.length > 0 ? 'pointer' : 'default' }} onClick={() => { setMovies([]); setError(null) }}>
            <Film size={28} />
            Letterfy
          </div>
          {!spotifyToken ? (
            <button className="btn btn-secondary" onClick={loginToSpotify}>
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

                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 80, 80, 0.1)', border: '1px solid rgba(255, 80, 80, 0.3)' }}>
                    <AlertCircle size={18} color="#ff5050" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '0.875rem', color: '#ff8080', margin: 0 }}>{error}</p>
                  </div>
                )}

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  We'll fetch your recent watches via your public profile. No Letterboxd login required.
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
                    spotifyToken={spotifyToken}
                    savedPlaylists={savedPlaylists}
                    onSave={handleSavePlaylist}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
