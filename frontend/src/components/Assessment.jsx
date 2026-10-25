import { useRef } from "react";
import {
  recordAssessmentActivity,
  updateAssessmentProgress,
} from "../utils/assessmentSession";

export default function Assessment({
  session,
  questions,
  persistenceAvailable,
  onSessionChange,
  onComplete,
  isSubmitting = false,
  submissionError = null,
  onRetry,
}) {
  const completionRequested = useRef(false);
  const totalQuestions = questions.length;
  const currentQuestionIndex = session.currentQuestionIndex;
  const currentQuestion = questions[currentQuestionIndex];
  const selectedOption = session.answers[currentQuestion.question_id];
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleSelectOption = (optionId) => {
    onSessionChange((current) =>
      updateAssessmentProgress(current, {
        answers: {
          ...current.answers,
          [currentQuestion.question_id]: optionId,
        },
      }),
    );
  };

  const handleNext = async () => {
    if (selectedOption === undefined || isSubmitting) {
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

    completionRequested.current = true;

    const completed = await onComplete();

    if (!completed) {
      completionRequested.current = false;
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
            <h2 className="session-warning-title">
              Still working on your assessment?
            </h2>
            <p>
              Your session may expire due to inactivity. Continue the session
              now if you’re still working.
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
          This browser can’t save your progress. If you reload this page, you
          may need to start the assessment again.
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

      <section
        className="assessment-question-card"
        aria-labelledby="assessment-question"
      >
        <h1 id="assessment-question" className="assessment-question-text">
          {currentQuestion.question_text}
        </h1>

        <div className="assessment-options">
          {currentQuestion.options.map((option) => (
            <label
              key={option.option_id}
              className={`assessment-option ${
                selectedOption === option.option_id ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name={`question-${currentQuestion.question_id}`}
                checked={selectedOption === option.option_id}
                onChange={() => handleSelectOption(option.option_id)}
              />
              <span className="option-text">{option.option_text}</span>
            </label>
          ))}
        </div>
      </section>

      {isSubmitting && (
        <p className="assessment-status" role="status">
          Saving your assessment…
        </p>
      )}

      {submissionError && (
        <section className="assessment-error" role="alert">
          <p>{submissionError}</p>
          <button
            type="button"
            className="assessment-nav-button secondary"
            onClick={onRetry}
          >
            Try again
          </button>
        </section>
      )}

      <nav className="assessment-navigation" aria-label="Assessment questions">
        <button
          type="button"
          className="assessment-nav-button secondary"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || isSubmitting}
        >
          Previous
        </button>

        <button
          type="button"
          className="assessment-nav-button primary"
          onClick={handleNext}
          disabled={selectedOption === undefined || isSubmitting}
        >
          {isSubmitting
            ? "Saving…"
            : currentQuestionIndex === totalQuestions - 1
              ? "Finish"
              : "Next"}
        </button>
      </nav>
    </main>
  );
}
