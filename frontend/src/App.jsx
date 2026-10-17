import { useState } from "react";
import Onboarding from "./components/Onboarding";
import DemographicForm from "./components/DemographicForm";
import Assessment from "./components/Assessment";
import ResultScreen from "./components/ResultScreen";
import QrEntryPage from "./components/QrEntryPage";
import AdminPanel from "./components/AdminPanel";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [hasConsent, setHasConsent] = useState(false);
  const [demographics, setDemographics] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);

  if (window.location.pathname === "/qr") {
    return <QrEntryPage />;
  }

  if (
    window.location.pathname === "/admin" ||
    window.location.pathname === "/admin/"
  ) {
    return <AdminPanel />;
  }

  const handleDemographicComplete = (data) => {
    setDemographics(data);
  };

  const handleAssessmentComplete = (result) => {
    setAssessmentResult(result);
  };

  const handleRestart = () => {
    setAssessmentResult(null);
    setShowDashboard(false);
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

  if (showDashboard) {
    return (
      <Dashboard
        result={assessmentResult}
        onBack={() => setShowDashboard(false)}
      />
    );
  }

  return (
    <ResultScreen
      score={assessmentResult.score}
      totalQuestions={assessmentResult.totalQuestions}
      onRestart={handleRestart}
      onViewResults={() => setShowDashboard(true)}
    />
  );
}

export default App;
