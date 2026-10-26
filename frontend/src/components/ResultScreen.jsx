export default function ResultScreen({ onRestart }) {
  return (
    <main className="result-container">
      <section className="result-card" aria-labelledby="completion-title">
        <h1 id="completion-title" className="result-title">
          Thank you for taking part!
        </h1>

        <div className="result-message" aria-live="polite">
          <p>Your responses have been saved. You may now finish this assessment.</p>
        </div>

        <aside className="completion-tip" aria-label="Cybersecurity tip">
          <strong>Stay safe online:</strong> Never share your password in a
          message or with someone you do not trust.
        </aside>

        <div className="result-actions">
          <button className="result-button" type="button" onClick={onRestart}>
            Finish
          </button>
        </div>
      </section>
    </main>
  );
}
