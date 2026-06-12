import { useState, useEffect, useRef } from 'react'
import { Music, ExternalLink } from 'lucide-react'
import { searchSpotifyPlaylists, loginToSpotify } from '../utils/spotify'

export default function PlaylistGrid({ movie, username, spotifyToken, savedPlaylists, onSave, isOpen, headerRef, onPreview }) {
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
              onClick={() => onPreview(playlist.id)}
              className="playlist-cover-clickable"
              style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', aspectRatio: '1/1', objectFit: 'cover' }}
            />
          ) : (
            <div
              onClick={() => onPreview(playlist.id)}
              className="playlist-cover-clickable"
              style={{ width: '100%', borderRadius: '8px', marginBottom: '12px', aspectRatio: '1/1', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Music size={36} color="var(--text-secondary)" />
            </div>
          )}
          <h4 style={{ fontSize: '0.9rem', marginBottom: '4px', lineHeight: '1.3' }}>{playlist.name}</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', flex: 1 }}>
            By {playlist.owner?.display_name || 'Spotify'}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem' }}
              onClick={() => onPreview(playlist.id)}
            >
              Preview
            </button>
            <button
              className="btn btn-primary"
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
