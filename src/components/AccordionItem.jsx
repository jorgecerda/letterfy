import { useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import PlaylistGrid from './PlaylistGrid'

export default function AccordionItem({ movie, username, spotifyToken, savedPlaylists, onSave, isOpen, onToggle, onPreview }) {
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
