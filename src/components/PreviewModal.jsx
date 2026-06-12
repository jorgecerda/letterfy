import { useEffect } from 'react'

export default function PreviewModal({ playlistId, onClose }) {
  // Prevent background body scroll when the modal lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close Preview">
          &times;
        </button>
        <div className="spotify-embed-wrapper">
          <iframe
            src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`}
            height="380"
            frameBorder="0"
            allowFullScreen=""
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ border: 'none' }}
          ></iframe>
        </div>
      </div>
    </div>
  )
}
