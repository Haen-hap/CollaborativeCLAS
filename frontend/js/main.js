// CCLAS frontend logic

"use strict";

const startButton = document.querySelector("#start-assessment-btn");

function startAssessment() {
  console.log("Assessment started.");

  // The onboarding flow will be added in SCRUM-17.
}

if (startButton) {
  startButton.addEventListener("click", startAssessment);
}
