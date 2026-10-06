import { useState } from "react";
import { assessmentQuestions } from "../data/assessmentData";
import { calculateAssessmentResult } from "../utils/assessmentScoring";

export default function Assessment({ onComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const totalQuestions = assessmentQuestions.length;
  const currentQuestion = assessmentQuestions[currentQuestionIndex];
  const selectedOption = answers[currentQuestion.id];
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleSelectOption = (optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (selectedOption === undefined) {
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return;
    }

    onComplete(calculateAssessmentResult(assessmentQuestions, answers));
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="assessment-container">
      <div className="assessment-header">
        <div className="assessment-progress-bar">
          <div
            className="assessment-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="assessment-progress-text">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
      </div>

      <div className="assessment-question-card">
        <h2 className="assessment-question-text">{currentQuestion.text}</h2>

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
      </div>

      <div className="assessment-navigation">
        <button
          className="assessment-nav-button secondary"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </button>

        <button
          className="assessment-nav-button primary"
          onClick={handleNext}
          disabled={selectedOption === undefined}
        >
          {currentQuestionIndex === totalQuestions - 1 ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
