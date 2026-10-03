import { useState } from "react";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [hasConsent, setHasConsent] = useState(false);

  return (
    <div className="app">
      {!hasConsent ? (
        <Onboarding onComplete={() => setHasConsent(true)} />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}

export default App;
