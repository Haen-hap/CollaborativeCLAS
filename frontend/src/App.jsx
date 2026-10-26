import { useEffect, useState } from "react";
import {
  createAssessmentSession,
  saveAssessmentSession,
  clearAssessmentSession,
} from "./utils/assessmentSession";
import {
  createAssessmentSession as createBackendSession,
  getAssessmentQuestions,
  submitAssessmentAnswer,
  completeAssessmentSession,
} from "./api/api";
import Onboarding from "./components/Onboarding";
import DemographicForm from "./components/DemographicForm";
import Assessment from "./components/Assessment";
import ResultScreen from "./components/ResultScreen";
import QrEntryPage from "./components/QrEntryPage";
import AdminPanel from "./components/AdminPanel";
import "./App.css";

function App() {
  const [hasConsent, setHasConsent] = useState(false);
  const [demographics, setDemographics] = useState(null);
  const [backendSession, setBackendSession] = useState(null);
  const [backendQuestions, setBackendQuestions] = useState([]);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [session, setSession] = useState(null);

  const persistenceAvailable =
    typeof window !== "undefined" && Boolean(window.sessionStorage);

  useEffect(() => {
    if (session && persistenceAvailable) {
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

  const handleDemographicComplete = async (data) => {
    setSubmissionError(null);

    const zoneDeclined = data.zoneCode === "DECLINED";

    const payload = {
      access_point_code: "DIRECT_WEB",
      assisted_mode: false,
      age_range: data.ageRange,
      work_status: data.workStatus,
      schooling_level: data.schoolingLevel,
      zone_code: data.zoneCode,
      location_declined: zoneDeclined,
    };

    try {
      const createdSession = await createBackendSession(payload);
      const questions = await getAssessmentQuestions(createdSession.session_id);

      setBackendSession(createdSession);
      setBackendQuestions(questions);
      setDemographics(data);
      setSession(
        createAssessmentSession(
          questions.map((question) => ({
            id: question.question_id,
            options: question.options,
          })),
        ),
      );
    } catch (error) {
      setSubmissionError(error.message);
    }
  };

  const handleAssessmentComplete = async () => {
    if (isSubmitting || !backendSession) {
      return false;
    }

    const answeredQuestionIds = Object.keys(session.answers);

    if (answeredQuestionIds.length !== backendQuestions.length) {
      return false;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      for (const [questionId, optionId] of Object.entries(session.answers)) {
        await submitAssessmentAnswer(backendSession.session_id, {
          question_id: Number(questionId),
          option_id: optionId,
        });
      }

      const completion = await completeAssessmentSession(
        backendSession.session_id,
      );

      if (persistenceAvailable) {
        clearAssessmentSession();
      }

      setAssessmentResult({
        score: completion.total_literacy_score,
        totalQuestions: backendQuestions.length,
        percentage: Math.round(
          (completion.total_literacy_score / backendQuestions.length) * 100,
        ),
        classification: completion.literacy_classification,
      });

      return true;
    } catch (error) {
      setSubmissionError(error.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    if (persistenceAvailable) {
      clearAssessmentSession();
    }
    setHasConsent(false);
    setAssessmentResult(null);
    setBackendSession(null);
    setBackendQuestions([]);
    setSession(null);
    setDemographics(null);
  };

  if (!hasConsent) {
    return <Onboarding onComplete={() => setHasConsent(true)} />;
  }

  if (demographics === null) {
    return (
      <DemographicForm
        onComplete={handleDemographicComplete}
        submissionError={submissionError}
      />
    );
  }

  if (!assessmentResult) {
    if (!session || backendQuestions.length === 0) {
      return (
        <main className="assessment-container">
          <p className="assessment-status" role="status">
            Loading your assessment…
          </p>
        </main>
      );
    }

    return (
      <Assessment
        session={session}
        questions={backendQuestions}
        persistenceAvailable={persistenceAvailable}
        onSessionChange={setSession}
        onComplete={handleAssessmentComplete}
        isSubmitting={isSubmitting}
        submissionError={submissionError}
        onRetry={() => setSubmissionError(null)}
      />
    );
  }

  return (
    <ResultScreen
      onRestart={handleRestart}
    />
  );
}

export default App;
