import { useRef, useState } from 'react'
import './App.css'

const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/

function App() {
  const [result, setResult] = useState(false)
  const [page, setPage] = useState('intro')
  const [field, setField] = useState('name')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [actualTick, setActualTick] = useState(0)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)

  const value = field === 'name' ? name : location
  const setValue = field === 'name' ? setName : setLocation
  const placeholder = field === 'name' ? 'Introduce Yourself' : 'Where are you from?'

  const submitField = async () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('This field cannot be empty')
      return
    }
    if (!NAME_PATTERN.test(trimmed)) {
      setError('Please enter letters only (no numbers or symbols)')
      return
    }
    setError('')

    if (field === 'name') {
      localStorage.setItem('skinstric-name', trimmed)
      setField('location')
      return
    }

    localStorage.setItem('skinstric-location', trimmed)
    setSubmitting(true)
    try {
      await fetch('https://us-central1-frontend-simplified.cloudfunctions.net/skinstricPhaseOne', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: localStorage.getItem('skinstric-name'),
          location: trimmed,
        }),
      })
      setPage('scan')
    } catch {
      setError('Could not reach the server. Your info is saved locally.')
    } finally {
      setSubmitting(false)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  const sendImage = async (base64) => {
    localStorage.setItem('skinstric-image', base64)
    setPage('preparing')
    try {
      const res = await fetch(
        'https://us-central1-frontend-simplified.cloudfunctions.net/skinstricPhaseTwo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        }
      )
      const data = await res.json().catch(() => null)
      if (data?.data) {
        localStorage.setItem('skinstric-results', JSON.stringify(data.data))
      }
    } catch {
      setCameraError('Could not upload the image. It is saved locally.')
    } finally {
      setPage('results')
    }
  }

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setCameraOn(true)
    } catch {
      setCameraError('Camera access was denied or is unavailable.')
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg')
    stopCamera()
    sendImage(base64)
  }

  const pickFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => sendImage(reader.result)
    reader.readAsDataURL(file)
  }

  if (page === 'demographics') {
    const stored = JSON.parse(localStorage.getItem('skinstric-results') || '{}')
    const categories = [
      { key: 'race', label: 'Race' },
      { key: 'age', label: 'Age' },
      { key: 'gender', label: 'Gender' },
    ]

    const sortedEntries = (obj) =>
      Object.entries(obj || {}).sort((a, b) => b[1] - a[1])

    const topOf = (key) => sortedEntries(stored[key])[0]?.[0] || ''

    const actuals = JSON.parse(localStorage.getItem('skinstric-actuals') || '{}')
    const actualOf = (key) => actuals[key] || topOf(key)

    const pick = (key, value) => {
      const next = { ...actuals, [key]: value }
      localStorage.setItem('skinstric-actuals', JSON.stringify(next))
      setActualTick((t) => t + 1)
    }

    return (
      <div className="intro-page analysis-page">
        <header className="intro-header">
          <div className="brand-block">
            <span className="brand-name">Skinstric</span>
            <button type="button" className="intro-tag">
              <span className="bracket bracket--left" aria-hidden="true" />
              <span className="intro-tag-text">Analysis</span>
              <span className="bracket bracket--right" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="results-copy">
          <p className="analysis-caption results-title">A. I. Analysis</p>
          <p className="results-sub">Demographics</p>
        </div>

        <div className="demo-layout">
          <aside className="demo-sidebar">
            {categories.map(({ key, label }) => (
              <div key={key} className="demo-sidebar-block">
                <span className="demo-sidebar-label">{label}</span>
                <strong className="demo-sidebar-value">{actualOf(key)}</strong>
              </div>
            ))}
          </aside>

          <div className="demo-lists">
            {categories.map(({ key, label }) => (
              <div key={key} className="demo-list">
                <p className="demo-list-title">{label}</p>
                {sortedEntries(stored[key]).map(([name, score]) => (
                  <button
                    key={name}
                    type="button"
                    className={
                      actualOf(key) === name ? 'demo-row demo-row--selected' : 'demo-row'
                    }
                    onClick={() => pick(key, name)}
                  >
                    <span className="demo-row-name">{name}</span>
                    <span className="demo-row-score">{(score * 100).toFixed(2)}%</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="side-action back-action">
          <button type="button" className="side-button" onClick={() => setPage('results')}>
            <span className="diamond-icon" aria-hidden="true">
              <span className="diamond-caret diamond-caret--left" />
            </span>
            <span className="side-label">Back</span>
          </button>
        </div>
      </div>
    )
  }

  if (page === 'results') {
    return (
      <div className="intro-page analysis-page">
        <header className="intro-header">
          <div className="brand-block">
            <span className="brand-name">Skinstric</span>
            <button type="button" className="intro-tag">
              <span className="bracket bracket--left" aria-hidden="true" />
              <span className="intro-tag-text">Analysis</span>
              <span className="bracket bracket--right" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="results-copy">
          <p className="analysis-caption results-title">A. I. Analysis</p>
          <p className="results-sub">
            A. I. has estimated the following.
            <br />
            Fix estimated information if needed.
          </p>
        </div>

        <div className="dashed-diamond analysis-diamond analysis-diamond--inner" aria-hidden="true" />
        <div className="dashed-diamond analysis-diamond analysis-diamond--outer" aria-hidden="true" />

        <div className="results-grid">
          <button
            type="button"
            className="results-cell results-cell--active"
            onClick={() => setPage('demographics')}
          >
            <span>Demographics</span>
          </button>
          <button type="button" className="results-cell">
            <span>
              Skin type
              <br />
              details
            </span>
          </button>
          <button type="button" className="results-cell">
            <span>
              Cosmetic
              <br />
              concerns
            </span>
          </button>
          <button type="button" className="results-cell">
            <span>Weather</span>
          </button>
        </div>

        <div className="side-action back-action">
          <button type="button" className="side-button" onClick={() => setPage('scan')}>
            <span className="diamond-icon" aria-hidden="true">
              <span className="diamond-caret diamond-caret--left" />
            </span>
            <span className="side-label">Back</span>
          </button>
        </div>

        <div className="side-action proceed-action">
          <button type="button" className="side-button" onClick={() => setPage('demographics')}>
            <span className="side-label">Get Summary</span>
            <span className="diamond-icon" aria-hidden="true">
              <span className="diamond-caret diamond-caret--right" />
            </span>
          </button>
        </div>
      </div>
    )
  }

  if (page === 'preparing') {
    return (
      <div className="intro-page analysis-page">
        <div className="dashed-diamond prep-square prep-square--1" aria-hidden="true" />
        <div className="dashed-diamond prep-square prep-square--2" aria-hidden="true" />
        <div className="dashed-diamond prep-square prep-square--3" aria-hidden="true" />
        <p className="prep-text">Preparing your analysis ...</p>
      </div>
    )
  }

  if (page === 'scan') {
    return (
      <div className="intro-page analysis-page">
        <header className="intro-header">
          <div className="brand-block">
            <span className="brand-name">Skinstric</span>
            <button type="button" className="intro-tag">
              <span className="bracket bracket--left" aria-hidden="true" />
              <span className="intro-tag-text">Intro</span>
              <span className="bracket bracket--right" aria-hidden="true" />
            </button>
          </div>
        </header>

        <p className="analysis-caption">To start analysis</p>

        <div className="scan-options">
          <div className="scan-option">
            <div className="dashed-diamond scan-diamond scan-diamond--inner" aria-hidden="true" />
            <div className="dashed-diamond scan-diamond scan-diamond--outer" aria-hidden="true" />
            {cameraOn ? (
              <div className="camera-box">
                <video
                  ref={(el) => {
                    videoRef.current = el
                    if (el && streamRef.current) {
                      el.srcObject = streamRef.current
                    }
                  }}
                  autoPlay
                  playsInline
                  className="camera-video"
                />
                <button type="button" className="analysis-submit" onClick={capturePhoto}>
                  Capture
                </button>
              </div>
            ) : (
              <button type="button" className="scan-button" onClick={startCamera}>
                <svg viewBox="0 0 64 64" className="scan-icon" aria-hidden="true">
                  <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
                  <g stroke="currentColor" strokeWidth="2">
                    <line x1="32" y1="10" x2="32" y2="24" />
                    <line x1="32" y1="40" x2="32" y2="54" />
                    <line x1="10" y1="32" x2="24" y2="32" />
                    <line x1="40" y1="32" x2="54" y2="32" />
                  </g>
                </svg>
              </button>
            )}
            <p className="scan-label scan-label--camera">
              Allow A.I.
              <br />
              to scan your face
            </p>
          </div>

          <div className="scan-option">
            <div className="dashed-diamond scan-diamond scan-diamond--inner" aria-hidden="true" />
            <div className="dashed-diamond scan-diamond scan-diamond--outer" aria-hidden="true" />
            <button type="button" className="scan-button" onClick={() => fileRef.current?.click()}>
              <svg viewBox="0 0 64 64" className="scan-icon" aria-hidden="true">
                <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="32" cy="22" r="5" fill="currentColor" />
                <path d="M14 46 L26 32 L36 42 L44 34 L50 46 Z" fill="currentColor" />
              </svg>
            </button>
            <p className="scan-label scan-label--gallery">
              Allow A.I.
              <br />
              access gallery
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={pickFile}
            />
          </div>
        </div>

        {cameraError && <p className="analysis-error scan-error">{cameraError}</p>}

        <div className="side-action back-action">
          <button
            type="button"
            className="side-button"
            onClick={() => {
              stopCamera()
              setPage('analysis')
            }}
          >
            <span className="diamond-icon" aria-hidden="true">
              <span className="diamond-caret diamond-caret--left" />
            </span>
            <span className="side-label">Back</span>
          </button>
        </div>
      </div>
    )
  }

  if (page === 'analysis') {
    return (
      <div className="intro-page analysis-page">
        <header className="intro-header">
          <div className="brand-block">
            <span className="brand-name">Skinstric</span>
            <button type="button" className="intro-tag">
              <span className="bracket bracket--left" aria-hidden="true" />
              <span className="intro-tag-text">Intro</span>
              <span className="bracket bracket--right" aria-hidden="true" />
            </button>
          </div>
        </header>

        <p className="analysis-caption">To start analysis</p>

        <div className="dashed-diamond analysis-diamond analysis-diamond--inner" aria-hidden="true" />
        <div className="dashed-diamond analysis-diamond analysis-diamond--outer" aria-hidden="true" />

        <div className="analysis-form">
          <label className="analysis-label" htmlFor="analysis-input">
            Click to type
          </label>
          <input
            id="analysis-input"
            className="analysis-input"
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && submitField()}
            autoFocus
          />
          {error && <p className="analysis-error">{error}</p>}
          {field === 'name' && (
            <button
              type="button"
              className="analysis-submit"
              onClick={submitField}
              disabled={!value.trim()}
            >
              Next
            </button>
          )}
        </div>

        <div className="side-action back-action">
          <button
            type="button"
            className="side-button"
            onClick={() => (field === 'location' ? setField('name') : setPage('intro'))}
          >
            <span className="diamond-icon" aria-hidden="true">
              <span className="diamond-caret diamond-caret--left" />
            </span>
            <span className="side-label">Back</span>
          </button>
        </div>

        {field === 'location' && (
          <div className="side-action proceed-action">
            <button
              type="button"
              className="side-button"
              onClick={submitField}
              disabled={submitting || !value.trim()}
            >
              <span className="side-label">Proceed</span>
              <span className="diamond-icon" aria-hidden="true">
                <span className="diamond-caret diamond-caret--right" />
              </span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={result ? 'intro-page intro-page--result' : 'intro-page'}>
      <header className="intro-header">
        <div className="brand-block">
          <span className="brand-name">Skinstric</span>
          <button type="button" className="intro-tag">
            <span className="bracket bracket--left" aria-hidden="true" />
            <span className="intro-tag-text">Intro</span>
            <span className="bracket bracket--right" aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="code-button">
          Enter Code
        </button>
      </header>

      <h1 className="intro-title">
        Sophisticated
        <br />
        skincare
      </h1>

      <div className="dashed-diamond dashed-diamond--left" aria-hidden="true" />
      <div className="dashed-diamond dashed-diamond--right" aria-hidden="true" />
      <div className="dashed-diamond dashed-diamond--right-outer" aria-hidden="true" />

      <div className="side-action side-action--left">
        <button type="button" className="side-button">
          <span className="diamond-icon" aria-hidden="true">
            <span className="diamond-caret diamond-caret--left" />
          </span>
          <span className="side-label">Discover A.I.</span>
        </button>
      </div>

      <div
        className="side-action side-action--right"
        onMouseEnter={() => setResult(true)}
        onMouseLeave={() => setResult(false)}
      >
        <button type="button" className="side-button" onClick={() => setPage('analysis')}>
          <span className="side-label">Take Test</span>
          <span className="diamond-icon" aria-hidden="true">
            <span className="diamond-caret diamond-caret--right" />
          </span>
        </button>
      </div>

      <main className="intro-hero">
      </main>

      <p className="intro-footnote">
        Skinstric developed an A.I. that creates a highly-personalised routine tailored to
        what your skin needs.
      </p>
    </div>
  )
}

export default App
