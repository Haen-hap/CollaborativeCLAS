import "./App.css";

function App() {
  return (
    <main className="app-shell">
      <section className="welcome-card">
        <p className="eyebrow">CCLAS</p>

        <h1>Collaborative Community Literacy Assessment</h1>

        <p className="intro-text">
          A short, mobile-friendly assessment that helps communities understand
          their digital readiness and identify where support may be needed.
        </p>

        <div className="status-card">
          <span className="status-icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <h2>React frontend is ready</h2>
            <p>
              The application foundation has been initialized successfully with
              React and Vite.
            </p>
          </div>
        </div>

        <button type="button" className="primary-button">
          Start assessment
        </button>
      </section>
    </main>
  );
}

export default App;
