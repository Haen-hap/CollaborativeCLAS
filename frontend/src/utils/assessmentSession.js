export const ASSESSMENT_SESSION_STORAGE_KEY = "cclas.assessment-session";
export const ASSESSMENT_SESSION_VERSION = 1;
export const INACTIVITY_WARNING_MS = 45_000;
export const SESSION_ABANDONMENT_MS = 90_000;

const ACTIVE_SESSION_STATUSES = new Set(["active", "warning"]);
const TERMINAL_SESSION_STATUSES = new Set(["abandoned", "submitted"]);
const ACTIVITY_EVENTS = [
  "pointerdown",
  "click",
  "keydown",
  "touchstart",
  "input",
  "change",
  "wheel",
];

function getBrowserStorage(storage) {
  if (storage !== undefined) {
    return storage;
  }

  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function createSessionId() {
  try {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Use the non-cryptographic fallback when the browser blocks crypto access.
  }

  return `cclas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isFiniteTimestamp(value) {
  return Number.isFinite(value) && value >= 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidAnswers(answers, questions, currentQuestionIndex) {
  if (!isPlainObject(answers)) {
    return false;
  }

  const questionIndexes = new Map(
    questions.map((question, index) => [String(question.id), index]),
  );

  for (const [questionId, answerIndex] of Object.entries(answers)) {
    const questionIndex = questionIndexes.get(questionId);
    if (questionIndex === undefined || questionIndex > currentQuestionIndex) {
      return false;
    }

    const question = questions[questionIndex];
    if (
      !Number.isInteger(answerIndex) ||
      answerIndex < 0 ||
      answerIndex >= question.options.length
    ) {
      return false;
    }
  }

  for (let index = 0; index < currentQuestionIndex; index += 1) {
    if (!Object.hasOwn(answers, String(questions[index].id))) {
      return false;
    }
  }

  return true;
}

function normalizeStoredSession(value, questions, now) {
  if (
    !isPlainObject(value) ||
    value.version !== ASSESSMENT_SESSION_VERSION ||
    typeof value.sessionId !== "string" ||
    value.sessionId.length < 8 ||
    value.sessionId.length > 128 ||
    !isFiniteTimestamp(value.startedAt) ||
    !isFiniteTimestamp(value.lastActivityAt) ||
    value.startedAt > value.lastActivityAt ||
    value.lastActivityAt > now + 1_000 ||
    value.startedAt > now + 1_000
  ) {
    return null;
  }

  if (value.status === "submitted") {
    if (!isFiniteTimestamp(value.submittedAt) || value.submittedAt > now + 1_000) {
      return null;
    }

    return {
      version: ASSESSMENT_SESSION_VERSION,
      sessionId: value.sessionId,
      startedAt: value.startedAt,
      lastActivityAt: value.lastActivityAt,
      currentQuestionIndex: questions.length - 1,
      answers: {},
      status: "submitted",
      submittedAt: value.submittedAt,
    };
  }

  if (value.status === "abandoned") {
    if (!isFiniteTimestamp(value.abandonedAt) || value.abandonedAt > now + 1_000) {
      return null;
    }

    return {
      version: ASSESSMENT_SESSION_VERSION,
      sessionId: value.sessionId,
      startedAt: value.startedAt,
      lastActivityAt: value.lastActivityAt,
      currentQuestionIndex: 0,
      answers: {},
      status: "abandoned",
      abandonedAt: value.abandonedAt,
    };
  }

  if (
    !ACTIVE_SESSION_STATUSES.has(value.status) ||
    !Number.isInteger(value.currentQuestionIndex) ||
    value.currentQuestionIndex < 0 ||
    value.currentQuestionIndex >= questions.length ||
    !isValidAnswers(value.answers, questions, value.currentQuestionIndex)
  ) {
    return null;
  }

  const normalized = {
    version: ASSESSMENT_SESSION_VERSION,
    sessionId: value.sessionId,
    startedAt: value.startedAt,
    lastActivityAt: value.lastActivityAt,
    currentQuestionIndex: value.currentQuestionIndex,
    answers: Object.fromEntries(
      Object.entries(value.answers).map(([questionId, answer]) => [
        questionId,
        answer,
      ]),
    ),
    status: value.status,
  };

  const phase = getAssessmentSessionPhase(normalized, now);
  if (phase === "abandoned") {
    return abandonAssessmentSession(normalized, now);
  }

  normalized.status = phase;
  return normalized;
}

export function createAssessmentSession(questions, now = Date.now()) {
  if (!questions.length) {
    throw new Error("An assessment session requires at least one question.");
  }

  return {
    version: ASSESSMENT_SESSION_VERSION,
    sessionId: createSessionId(),
    startedAt: now,
    lastActivityAt: now,
    currentQuestionIndex: 0,
    answers: {},
    status: "active",
  };
}

export function getAssessmentSessionPhase(session, now = Date.now()) {
  if (!session) {
    return "none";
  }

  if (TERMINAL_SESSION_STATUSES.has(session.status)) {
    return session.status;
  }

  const inactiveFor = Math.max(0, now - session.lastActivityAt);
  if (inactiveFor >= SESSION_ABANDONMENT_MS) {
    return "abandoned";
  }
  if (inactiveFor >= INACTIVITY_WARNING_MS) {
    return "warning";
  }

  return "active";
}

export function recordAssessmentActivity(session, now = Date.now()) {
  if (!session || TERMINAL_SESSION_STATUSES.has(session.status)) {
    return session;
  }

  if (getAssessmentSessionPhase(session, now) === "abandoned") {
    return abandonAssessmentSession(session, now);
  }

  return {
    ...session,
    lastActivityAt: now,
    status: "active",
  };
}

export function updateAssessmentProgress(session, update) {
  if (!session || TERMINAL_SESSION_STATUSES.has(session.status)) {
    return session;
  }

  const next = {
    ...session,
    ...update,
  };

  return {
    ...next,
    answers: { ...next.answers },
  };
}

export function abandonAssessmentSession(session, now = Date.now()) {
  if (!session || session.status === "submitted") {
    return session;
  }

  return {
    version: ASSESSMENT_SESSION_VERSION,
    sessionId: session.sessionId,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    currentQuestionIndex: 0,
    answers: {},
    status: "abandoned",
    abandonedAt: now,
  };
}

export function submitAssessmentSession(session, questions, now = Date.now()) {
  if (!session || TERMINAL_SESSION_STATUSES.has(session.status)) {
    return null;
  }

  if (getAssessmentSessionPhase(session, now) === "abandoned") {
    return abandonAssessmentSession(session, now);
  }

  if (
    !isValidAnswers(session.answers, questions, questions.length - 1) ||
    Object.keys(session.answers).length !== questions.length
  ) {
    return null;
  }

  return {
    version: ASSESSMENT_SESSION_VERSION,
    sessionId: session.sessionId,
    startedAt: session.startedAt,
    lastActivityAt: now,
    currentQuestionIndex: questions.length - 1,
    answers: {},
    status: "submitted",
    submittedAt: now,
  };
}

export function saveAssessmentSession(session, storage) {
  const browserStorage = getBrowserStorage(storage);
  if (!browserStorage) {
    return false;
  }

  try {
    browserStorage.setItem(ASSESSMENT_SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearAssessmentSession(storage) {
  const browserStorage = getBrowserStorage(storage);
  if (!browserStorage) {
    return false;
  }

  try {
    browserStorage.removeItem(ASSESSMENT_SESSION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadAssessmentSession(
  questions,
  { storage, now = Date.now() } = {},
) {
  const browserStorage = getBrowserStorage(storage);
  if (!browserStorage) {
    return {
      session: null,
      storageAvailable: false,
      recoveryIssue: null,
      needsStorageSync: false,
    };
  }

  let serialized;
  try {
    serialized = browserStorage.getItem(ASSESSMENT_SESSION_STORAGE_KEY);
  } catch {
    return {
      session: null,
      storageAvailable: false,
      recoveryIssue: null,
      needsStorageSync: false,
    };
  }

  if (serialized === null) {
    return {
      session: null,
      storageAvailable: true,
      recoveryIssue: null,
      needsStorageSync: false,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return {
      session: null,
      storageAvailable: true,
      recoveryIssue: "invalid",
      needsStorageSync: true,
    };
  }

  const session = normalizeStoredSession(parsed, questions, now);
  if (!session) {
    return {
      session: null,
      storageAvailable: true,
      recoveryIssue: "invalid",
      needsStorageSync: true,
    };
  }

  return {
    session,
    storageAvailable: true,
    recoveryIssue: null,
    needsStorageSync:
      session.status === "abandoned" ||
      session.status === "submitted" ||
      JSON.stringify(parsed) !== JSON.stringify(session),
  };
}

export function synchronizeRecoveredAssessmentSession(recovery, storage) {
  if (!recovery?.storageAvailable) {
    return false;
  }
  if (recovery.recoveryIssue) {
    return clearAssessmentSession(storage);
  }
  if (recovery.session && recovery.needsStorageSync) {
    return saveAssessmentSession(recovery.session, storage);
  }
  return true;
}

export function startAssessmentInactivityMonitor({
  getSession,
  onSessionChange,
  eventTarget = globalThis.document,
  now = Date.now,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
}) {
  let timerId = null;
  let stopped = false;

  const scheduleNextCheck = () => {
    if (stopped) {
      return;
    }

    if (timerId !== null) {
      clearTimer(timerId);
      timerId = null;
    }

    const session = getSession();
    if (!session || !ACTIVE_SESSION_STATUSES.has(session.status)) {
      return;
    }

    const currentTime = now();
    const phase = getAssessmentSessionPhase(session, currentTime);
    if (phase === "abandoned") {
      onSessionChange(abandonAssessmentSession(session, currentTime));
      return;
    }

    if (phase === "warning" && session.status !== "warning") {
      onSessionChange({ ...session, status: "warning" });
    }

    const threshold =
      phase === "warning"
        ? SESSION_ABANDONMENT_MS
        : INACTIVITY_WARNING_MS;
    const delay = Math.max(
      1,
      session.lastActivityAt + threshold - currentTime,
    );
    timerId = setTimer(scheduleNextCheck, delay);
  };

  const handleActivity = () => {
    const session = getSession();
    if (!session || !ACTIVE_SESSION_STATUSES.has(session.status)) {
      return;
    }

    const updated = recordAssessmentActivity(session, now());
    onSessionChange(updated);
    scheduleNextCheck();
  };

  if (eventTarget?.addEventListener) {
    for (const eventName of ACTIVITY_EVENTS) {
      eventTarget.addEventListener(eventName, handleActivity, { passive: true });
    }
  }

  scheduleNextCheck();

  return () => {
    stopped = true;
    if (timerId !== null) {
      clearTimer(timerId);
    }
    if (eventTarget?.removeEventListener) {
      for (const eventName of ACTIVITY_EVENTS) {
        eventTarget.removeEventListener(eventName, handleActivity);
      }
    }
  };
}
