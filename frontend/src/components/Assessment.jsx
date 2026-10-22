import { useRef } from "react";
import { assessmentQuestions } from "../data/assessmentData";
import {
  recordAssessmentActivity,
  updateAssessmentProgress,
} from "../utils/assessmentSession";

export default function Assessment({
  session,
  persistenceAvailable,
  onSessionChange,
  onComplete,
}) {
  const completionRequested = useRef(false);
  const totalQuestions = assessmentQuestions.length;
  const currentQuestionIndex = session.currentQuestionIndex;
  const currentQuestion = assessmentQuestions[currentQuestionIndex];
  const selectedOption = session.answers[currentQuestion.id];
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleSelectOption = (optionIndex) => {
    onSessionChange((current) =>
      updateAssessmentProgress(current, {
        answers: {
          ...current.answers,
          [currentQuestion.id]: optionIndex,
        },
      }),
    );
  };

  const handleNext = () => {
    if (selectedOption === undefined) {
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      onSessionChange((current) =>
        updateAssessmentProgress(current, {
          currentQuestionIndex: current.currentQuestionIndex + 1,
        }),
      );
      return;
    }

    if (completionRequested.current) {
      return;
    }

    if (onComplete() !== false) {
      completionRequested.current = true;
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      onSessionChange((current) =>
        updateAssessmentProgress(current, {
          currentQuestionIndex: current.currentQuestionIndex - 1,
        }),
      );
    }
  };

  const handleContinue = () => {
    onSessionChange((current) => recordAssessmentActivity(current));
  };

  return (
    <main className="assessment-container">
      {session.status === "warning" && (
        <section className="session-warning" role="alert">
          <div>
            <h2 className="session-warning-title">Still working on your assessment?</h2>
            <p>
              Your session may expire due to inactivity. Continue the session now
              if you’re still working.
            </p>
          </div>
          <button
            type="button"
            className="session-warning-button"
            onClick={handleContinue}
          >
            Continue session
          </button>
        </section>
      )}

      {!persistenceAvailable && (
        <p className="session-storage-notice" role="status">
          This browser can’t save your progress. If you reload this page, you may
          need to start the assessment again.
        </p>
      )}

      <header className="assessment-header">
        <div
          className="assessment-progress-bar"
          role="progressbar"
          aria-label="Assessment progress"
          aria-valuemin="1"
          aria-valuemax={totalQuestions}
          aria-valuenow={currentQuestionIndex + 1}
        >
          <div
            className="assessment-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="assessment-progress-text" aria-live="polite">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
      </header>

      <section className="assessment-question-card" aria-labelledby="assessment-question">
        <h1 id="assessment-question" className="assessment-question-text">
          {currentQuestion.text}
        </h1>

        <div className="assessment-options">
          {currentQuestion.options.map((option, index) => (
            <label
              key={index}
              className={`assessment-option ${
                selectedOption === index ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name={`question-${currentQuestion.id}`}
                checked={selectedOption === index}
                onChange={() => handleSelectOption(index)}
              />
              <span className="option-text">{option}</span>
            </label>
          ))}
        </div>
      </section>

      <nav className="assessment-navigation" aria-label="Assessment questions">
        <button
          type="button"
          className="assessment-nav-button secondary"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </button>

        <button
          type="button"
          className="assessment-nav-button primary"
          onClick={handleNext}
          disabled={selectedOption === undefined}
        >
          {currentQuestionIndex === totalQuestions - 1 ? "Finish" : "Next"}
        </button>
      </nav>
    </main>
  );
}
