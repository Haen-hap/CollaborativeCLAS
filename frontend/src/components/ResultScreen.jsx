export default function ResultScreen({ score, totalQuestions, onRestart }) {
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

  return (
    <div className="result-container">
      <div className="result-card">
        <h2 className="result-title">Assessment Complete</h2>

        <div className="result-score-section">
          <div className="result-score-circle">
            <span className="result-score-number">{score}</span>
            <span className="result-score-total">/ {totalQuestions}</span>
          </div>
          <div className="result-percentage">{percentage}% correct</div>
        </div>

        <div
          className="result-classification"
          style={{
            borderColor: classificationColor,
            color: classificationColor,
          }}
        >
          <div className="classification-label">Classification</div>
          <div
            className="classification-value"
            style={{ color: classificationColor }}
          >
            {classification}
          </div>
        </div>

        <div className="result-message">
          {classification === "Green" && (
            <p>Great job! You have strong literacy skills.</p>
          )}
          {classification === "Yellow" && (
            <p>
              Good effort! You have a solid foundation with room to improve.
            </p>
          )}
          {classification === "Red" && (
            <p>Keep practicing! Your skills will improve with time.</p>
          )}
        </div>

        <button className="result-button" onClick={onRestart}>
          Restart Assessment
        </button>
      </div>
    </div>
  );
}
