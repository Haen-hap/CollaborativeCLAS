import { useState } from "react";
import Onboarding from "./components/Onboarding";
import DemographicForm from "./components/DemographicForm";
import Assessment from "./components/Assessment";
import ResultScreen from "./components/ResultScreen";
import QrEntryPage from "./components/QrEntryPage";
import "./App.css";

function App() {
  const [hasConsent, setHasConsent] = useState(false);
  const [demographics, setDemographics] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);

  if (window.location.pathname === "/qr") {
    return <QrEntryPage />;
  }

  const handleDemographicComplete = (data) => {
    setDemographics(data);
  };

  const handleAssessmentComplete = (result) => {
    setAssessmentResult(result);
  };

  const handleRestart = () => {
    setAssessmentResult(null);
  };

  if (!hasConsent) {
    return <Onboarding onComplete={() => setHasConsent(true)} />;
  }

  if (demographics === null) {
    return <DemographicForm onComplete={handleDemographicComplete} />;
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
