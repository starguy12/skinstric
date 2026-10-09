import { useState } from 'react'
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
    } catch {
      setError('Could not reach the server. Your info is saved locally.')
    } finally {
      setSubmitting(false)
    }
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
          <button
            type="button"
            className="analysis-submit"
            onClick={submitField}
            disabled={submitting || !value.trim()}
          >
            {submitting ? 'Sending…' : field === 'name' ? 'Next' : 'Submit'}
          </button>
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
