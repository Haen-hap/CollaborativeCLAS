import { useEffect, useState } from "react";
import { assessmentQuestions } from "./data/assessmentData";
import {
  createAssessmentSession,
  submitAssessmentSession,
  saveAssessmentSession,
  clearAssessmentSession,
} from "./utils/assessmentSession";
import { calculateAssessmentResult } from "./utils/assessmentScoring";
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
  const [session, setSession] = useState(() =>
    createAssessmentSession(assessmentQuestions),
  );

  const persistenceAvailable =
    typeof window !== "undefined" && Boolean(window.localStorage);

  useEffect(() => {
    if (persistenceAvailable) {
      saveAssessmentSession(session);
    }
  }, [session, persistenceAvailable]);

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

  const handleAssessmentComplete = () => {
    const submittedSession = submitAssessmentSession(
      session,
      assessmentQuestions,
    );

    if (!submittedSession) {
      return false;
    }

    const result = calculateAssessmentResult(
      assessmentQuestions,
      session.answers,
    );

    if (persistenceAvailable) {
      clearAssessmentSession();
    }

    setAssessmentResult(result);
    return true;
  };

  const handleRestart = () => {
    setAssessmentResult(null);
    setShowDashboard(false);
    setSession(createAssessmentSession(assessmentQuestions));
  };

  if (!hasConsent) {
    return <Onboarding onComplete={() => setHasConsent(true)} />;
  }

  if (demographics === null) {
    return <DemographicForm onComplete={handleDemographicComplete} />;
  }

  if (!assessmentResult) {
    return (
      <Assessment
        session={session}
        persistenceAvailable={persistenceAvailable}
        onSessionChange={setSession}
        onComplete={handleAssessmentComplete}
      />
    );
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
