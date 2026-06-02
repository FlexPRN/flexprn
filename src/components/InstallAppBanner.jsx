import { useState, useEffect } from 'react'
import { Download, Smartphone, X, Share2, Plus } from 'lucide-react'

function InstallAppBanner() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showIosInstructions, setShowIosInstructions] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Detect if user already installed (running as PWA)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
    setIsStandalone(standalone)

    if (standalone) return  // Already installed — don't show

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    // Check if user previously dismissed (within 30 days)
    const dismissed = localStorage.getItem('flexprn_install_dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const daysSince = (new Date() - dismissedDate) / (1000 * 60 * 60 * 24)
      if (daysSince < 30) return
    }

    // Listen for Android/Chrome install prompt
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: show the banner anyway (no install API exists)
    if (ios) {
      setShowBanner(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (isIOS) {
      setShowIosInstructions(true)
      return
    }

    if (!installPrompt) return

    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setInstallPrompt(null)
  }

  function dismiss() {
    setShowBanner(false)
    localStorage.setItem('flexprn_install_dismissed', new Date().toISOString())
  }

  if (isStandalone || !showBanner) return null

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        maxWidth: '500px',
        margin: '0 auto',
        background: 'linear-gradient(135deg, #1B3A6B 0%, #0A7E8C 100%)',
        color: 'white',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '10px',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Smartphone size={22} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.15rem' }}>
            Install Flexprn
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, lineHeight: 1.35 }}>
            Add Flexprn to your home screen for faster access.
          </div>
        </div>

        <button
          onClick={handleInstall}
          style={{
            background: 'white',
            color: '#1B3A6B',
            border: 'none',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexShrink: 0
          }}
        >
          <Download size={15} /> Install
        </button>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            opacity: 0.7,
            cursor: 'pointer',
            padding: '0.3rem',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* iOS instructions modal */}
      {showIosInstructions && (
        <div
          onClick={() => setShowIosInstructions(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '14px',
              padding: '1.5rem',
              maxWidth: '380px',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#1B3A6B', fontSize: '1.15rem' }}>Install on iPhone</h3>
              <button
                onClick={() => setShowIosInstructions(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Add Flexprn to your home screen in 3 quick steps:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#0A7E8C', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>1</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                  Tap the <Share2 size={16} style={{ color: '#0A7E8C' }} /> <strong>Share</strong> button in Safari
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#0A7E8C', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>2</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                  Scroll and tap <Plus size={16} style={{ color: '#0A7E8C' }} /> <strong>Add to Home Screen</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#0A7E8C', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>3</div>
                <div style={{ fontSize: '0.9rem' }}>
                  Tap <strong>Add</strong> — done! 🎉
                </div>
              </div>
            </div>

            <div style={{ background: '#FEF9F0', border: '1px solid #FBBF24', borderRadius: '8px', padding: '0.75rem', marginTop: '1.25rem', fontSize: '0.85rem', color: '#92400E' }}>
              ⚠️ iPhone install works in <strong>Safari only</strong> — not Chrome or Firefox.
            </div>

            <button
              onClick={() => setShowIosInstructions(false)}
              className="primary-btn"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default InstallAppBanner