export default function ResultScreen({ score, totalQuestions, onRestart, onViewResults }) {
  const percentage = Math.round((score / totalQuestions) * 100);

  let classification = "Red";
  let classificationColor = "#ef4444";

  if (percentage >= 80) {
    classification = "Green";
    classificationColor = "#22c55e";
  } else if (percentage >= 50) {
    classification = "Yellow";
    classificationColor = "#eab308";
  }

  const resultExplanations = {
    Red: "Keep practising — every step helps.",
    Yellow: "A good start — a little more practice will help.",
    Green: "Excellent! You use digital tools with confidence.",
  };

  return (
    <div className="result-container">
      <div className="result-card">
        <h2 className="result-title">You’re all done!</h2>

        <div className="result-score-section">
          <div className="result-score-circle">
            <span className="result-score-number">{score}</span>
            <span className="result-score-total">/ {totalQuestions}</span>
          </div>
          <div className="result-percentage">You answered {score} of {totalQuestions} correctly ({percentage}%).</div>
        </div>

        <div
          className="result-classification"
          style={{
            borderColor: classificationColor,
            color: classificationColor,
          }}
        >
          <div className="classification-label">Your result</div>
          <div
            className="classification-value"
            style={{ color: classificationColor }}
          >
            {classification}
          </div>
        </div>

        <div className="result-message" aria-live="polite">
          <p>{resultExplanations[classification]}</p>
        </div>

        <div className="result-actions">
          <button className="result-button" onClick={onRestart}>
            Start again
          </button>
          <button className="result-button secondary" onClick={onViewResults}>
            Review your answers
          </button>
        </div>
      </div>
    </div>
  );
}
