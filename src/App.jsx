import { useState } from 'react'
import './App.css'

function App() {
  const [result, setResult] = useState(false)

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

      <div className="side-action side-action--right">
        <button type="button" className="side-button" onClick={() => setResult(true)}>
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
