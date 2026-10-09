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
    try {
      await fetch(
        'https://us-central1-frontend-simplified.cloudfunctions.net/skinstricPhaseTwo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        }
      )
    } catch {
      setCameraError('Could not upload the image. It is saved locally.')
    }
  }

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setCameraOn(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
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
                <video ref={videoRef} autoPlay playsInline className="camera-video" />
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
