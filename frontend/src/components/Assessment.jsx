import { useState } from "react";
import { assessmentQuestions } from "../data/assessmentData";

export default function Assessment({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const totalQuestions = assessmentQuestions.length;
  const currentQuestion = assessmentQuestions[currentIndex];
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleSelectOption = (optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Finish assessment
      const score = calculateScore();
      onComplete({ score, totalQuestions, answers });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    assessmentQuestions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) {
        correct++;
      }
    });
    return correct;
  };

  const selectedOption = answers[currentQuestion.id];

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
          Question {currentIndex + 1} of {totalQuestions}
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
          disabled={currentIndex === 0}
        >
          Previous
        </button>

        <button
          className="assessment-nav-button primary"
          onClick={handleNext}
          disabled={selectedOption === undefined}
        >
          {currentIndex === totalQuestions - 1 ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
