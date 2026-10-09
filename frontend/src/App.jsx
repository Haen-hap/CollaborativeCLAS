import { useState } from "react";
import Onboarding from "./components/Onboarding";
import Assessment from "./components/Assessment";
import ResultScreen from "./components/ResultScreen";
import QrEntryPage from "./components/QrEntryPage";
import "./App.css";

function App() {
  const [hasConsent, setHasConsent] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);

  if (window.location.pathname === "/qr") {
    return <QrEntryPage />;
  }

  const handleAssessmentComplete = (result) => {
    setAssessmentResult(result);
  };

  const handleRestart = () => {
    setAssessmentResult(null);
  };

  if (!hasConsent) {
    return <Onboarding onComplete={() => setHasConsent(true)} />;
  }

  if (!assessmentResult) {
    return <Assessment onComplete={handleAssessmentComplete} />;
  }

  return (
    <ResultScreen
      score={assessmentResult.score}
      totalQuestions={assessmentResult.totalQuestions}
      onRestart={handleRestart}
    />
  );
}

export default App;
