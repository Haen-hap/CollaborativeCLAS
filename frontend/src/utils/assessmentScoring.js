// Temporary frontend thresholds. Replace these with the backend methodology
// once the final assessment rules are available.
export const CLASSIFICATION_THRESHOLDS = {
  green: 80,
  yellow: 50,
};

export function calculateScore(questions, answers) {
  return questions.reduce((score, question) => {
    return score + (answers[question.id] === question.correctIndex ? 1 : 0);
  }, 0);
}

export function getClassification(percentage) {
  if (percentage >= CLASSIFICATION_THRESHOLDS.green) {
    return "Green";
  }

  if (percentage >= CLASSIFICATION_THRESHOLDS.yellow) {
    return "Yellow";
  }

  return "Red";
}

export function calculateAssessmentResult(questions, answers) {
  const totalQuestions = questions.length;
  const score = calculateScore(questions, answers);
  const percentage = totalQuestions
    ? Math.round((score / totalQuestions) * 100)
    : 0;

  return {
    answers,
    score,
    totalQuestions,
    percentage,
    classification: getClassification(percentage),
  };
}
