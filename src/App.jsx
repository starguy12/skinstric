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
  const [showCameraPrompt, setShowCameraPrompt] = useState(false)
  const [actualTick, setActualTick] = useState(0)
  const [focusKey, setFocusKey] = useState('age')
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
    setPage('camera-setup')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setCameraOn(true)
      setPage('scan')
    } catch {
      setCameraError(
        'Camera unavailable. Check browser permission for this site and Windows camera settings, then try again.'
      )
      setPage('scan')
    }
  }

  const requestCamera = () => setShowCameraPrompt(true)

  const allowCamera = () => {
    setShowCameraPrompt(false)
    startCamera()
  }

  const denyCamera = () => {
    setShowCameraPrompt(false)
    setCameraError('Camera access was denied.')
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
      { key: 'gender', label: 'Sex' },
    ]

    const sortedEntries = (obj) =>
      Object.entries(obj || {}).sort((a, b) => b[1] - a[1])

    const topOf = (key) => sortedEntries(stored[key])[0]?.[0] || ''
    const topScoreOf = (key) => sortedEntries(stored[key])[0]?.[1] || 0

    const actuals = JSON.parse(localStorage.getItem('skinstric-actuals') || '{}')
    const actualOf = (key) => actuals[key] || topOf(key)

    const pick = (key, value) => {
      const next = { ...actuals, [key]: value }
      localStorage.setItem('skinstric-actuals', JSON.stringify(next))
      setActualTick((t) => t + 1)
    }

    const reset = () => {
      localStorage.removeItem('skinstric-actuals')
      setActualTick((t) => t + 1)
    }

    const focusValue = actualOf(focusKey)
    const focusScore =
      actuals[focusKey] && stored[focusKey]?.[actuals[focusKey]] !== undefined
        ? stored[focusKey][actuals[focusKey]]
        : topScoreOf(focusKey)

    const focusSuffix = focusKey === 'age' ? ' y.o.' : ''

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

        <div className="demo-heading">
          <p className="analysis-caption results-title">A. I. Analysis</p>
          <div className="demo-title-row">
            <h1 className="demo-title">Demographics</h1>
          </div>
          <p className="demo-subtitle">Predicted race & age</p>
        </div>

        <div className="demo-layout">
          <aside className="demo-sidebar">
            {categories.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={
                  key === focusKey
                    ? 'demo-sidebar-block demo-sidebar-block--active'
                    : 'demo-sidebar-block'
                }
                onClick={() => setFocusKey(key)}
              >
                <span className="demo-sidebar-value">{actualOf(key)}</span>
                <span className="demo-sidebar-label">{label}</span>
              </button>
            ))}
          </aside>

          <div className="demo-center">
            <p className="demo-focus-value">
              {focusValue}
              {focusSuffix}
            </p>
            <div className="demo-ring">
              <svg viewBox="0 0 200 200" className="demo-ring-svg">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="#1A1B1C"
                  strokeWidth="1.5"
                  strokeDasharray={`${focusScore * 565.5} 565.5`}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                />
              </svg>
              <span className="demo-ring-text">{(focusScore * 100).toFixed(0)} %</span>
            </div>
          </div>

          <div className="demo-confidence">
            <div className="demo-confidence-head">
              <span>{categories.find((c) => c.key === focusKey)?.label}</span>
              <span>A. I. confidence</span>
            </div>
            {sortedEntries(stored[focusKey]).map(([name, score]) => (
              <button
                key={name}
                type="button"
                className={
                  actualOf(focusKey) === name ? 'demo-row demo-row--selected' : 'demo-row'
                }
                onClick={() => pick(focusKey, name)}
              >
                <span className="demo-row-name">
                  <span className="demo-row-diamond" aria-hidden="true" />
                  {name}
                </span>
                <span className="demo-row-score">{(score * 100).toFixed(0)} %</span>
              </button>
            ))}
          </div>
        </div>

        <p className="demo-hint">If A.I. estimate is wrong, select the correct one.</p>

        <div className="side-action back-action">
          <button type="button" className="side-button" onClick={() => setPage('results')}>
            <span className="diamond-icon" aria-hidden="true">
              <span className="diamond-caret diamond-caret--left" />
            </span>
            <span className="side-label">Back</span>
          </button>
        </div>

        <div className="demo-actions">
          <button type="button" className="demo-action-btn" onClick={reset}>
            Reset
          </button>
          <button
            type="button"
            className="demo-action-btn demo-action-btn--solid"
            onClick={() => setPage('final')}
          >
            Confirm
          </button>
        </div>
      </div>
    )
  }

  if (page === 'final') {
    const image = localStorage.getItem('skinstric-image')
    const actuals = JSON.parse(localStorage.getItem('skinstric-actuals') || '{}')
    const storedResults = JSON.parse(localStorage.getItem('skinstric-results') || '{}')
    const topOf = (key) =>
      Object.entries(storedResults[key] || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    const finalRace = actuals.race || topOf('race')
    const finalAge = actuals.age || topOf('age')
    const finalGender = actuals.gender || topOf('gender')
    const userName = localStorage.getItem('skinstric-name') || ''

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

        <div className="final-layout">
          {image && (
            <div className="final-photo-wrap">
              <img src={image} alt="Your captured face" className="final-photo" />
            </div>
          )}
          <div className="final-summary">
            <p className="analysis-caption results-title">A. I. Analysis</p>
            <h1 className="demo-title">
              {userName ? `${userName}’s profile` : 'Your profile'}
            </h1>
            <div className="final-rows">
              <div className="final-row">
                <span className="demo-sidebar-label">Race</span>
                <span className="demo-sidebar-value">{finalRace}</span>
              </div>
              <div className="final-row">
                <span className="demo-sidebar-label">Age</span>
                <span className="demo-sidebar-value">{finalAge}</span>
              </div>
              <div className="final-row">
                <span className="demo-sidebar-label">Sex</span>
                <span className="demo-sidebar-value">{finalGender}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="side-action back-action">
          <button type="button" className="side-button" onClick={() => setPage('demographics')}>
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

  if (page === 'camera-setup') {
    return (
      <div className="intro-page analysis-page">
        <div className="dashed-diamond prep-square prep-square--1" aria-hidden="true" />
        <div className="dashed-diamond prep-square prep-square--2" aria-hidden="true" />
        <div className="dashed-diamond prep-square prep-square--3" aria-hidden="true" />

        <div className="setup-camera">
          <svg viewBox="0 0 64 64" className="setup-camera-icon" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
            <g stroke="currentColor" strokeWidth="2">
              <line x1="32" y1="10" x2="32" y2="24" />
              <line x1="32" y1="40" x2="32" y2="54" />
              <line x1="10" y1="32" x2="24" y2="32" />
              <line x1="40" y1="32" x2="54" y2="32" />
            </g>
            <circle cx="32" cy="32" r="6" fill="currentColor" />
          </svg>
          <p className="setup-camera-text">Setting up camera ...</p>
        </div>

        <div className="setup-tips">
          <p className="setup-tips-title">To get better results make sure to have</p>
          <div className="setup-tips-row">
            <span className="setup-tip">
              <span className="demo-row-diamond" aria-hidden="true" />
              Neutral expression
            </span>
            <span className="setup-tip">
              <span className="demo-row-diamond" aria-hidden="true" />
              Frontal pose
            </span>
            <span className="setup-tip">
              <span className="demo-row-diamond" aria-hidden="true" />
              Adequate lighting
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (page === 'scan' && cameraOn) {
    return (
      <div className="intro-page camera-live">
        <header className="intro-header camera-live-header">
          <div className="brand-block">
            <span className="brand-name">Skinstric</span>
            <button type="button" className="intro-tag">
              <span className="bracket bracket--left" aria-hidden="true" />
              <span className="intro-tag-text">Intro</span>
              <span className="bracket bracket--right" aria-hidden="true" />
            </button>
          </div>
        </header>

        <video
          ref={(el) => {
            videoRef.current = el
            if (el && streamRef.current) {
              el.srcObject = streamRef.current
            }
          }}
          autoPlay
          playsInline
          className="camera-fullscreen"
        />

        <button type="button" className="shutter-button" onClick={capturePhoto}>
          <span className="shutter-label">Take picture</span>
          <span className="shutter-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="8" width="18" height="13" rx="2" />
              <circle cx="12" cy="14.5" r="3.5" />
              <path d="M8 8l1.5-2.5h5L16 8" />
            </svg>
          </span>
        </button>

        <div className="setup-tips setup-tips--live">
          <p className="setup-tips-title">To get better results make sure to have</p>
          <div className="setup-tips-row">
            <span className="setup-tip">
              <span className="demo-row-diamond" aria-hidden="true" />
              Neutral expression
            </span>
            <span className="setup-tip">
              <span className="demo-row-diamond" aria-hidden="true" />
              Frontal pose
            </span>
            <span className="setup-tip">
              <span className="demo-row-diamond" aria-hidden="true" />
              Adequate lighting
            </span>
          </div>
        </div>
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
            <button type="button" className="scan-button" onClick={requestCamera}>
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

        {showCameraPrompt && (
          <div className="camera-prompt">
            <p className="camera-prompt-title">Allow A.I. to access your camera</p>
            <div className="camera-prompt-actions">
              <button type="button" className="camera-prompt-btn" onClick={denyCamera}>
                Deny
              </button>
              <button type="button" className="camera-prompt-btn" onClick={allowCamera}>
                Allow
              </button>
            </div>
          </div>
        )}

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
