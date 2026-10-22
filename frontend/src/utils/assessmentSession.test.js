import assert from "node:assert/strict";
import test from "node:test";
import { assessmentQuestions } from "../data/assessmentData.js";
import {
  ASSESSMENT_SESSION_STORAGE_KEY,
  INACTIVITY_WARNING_MS,
  SESSION_ABANDONMENT_MS,
  abandonAssessmentSession,
  createAssessmentSession,
  getAssessmentSessionPhase,
  loadAssessmentSession,
  recordAssessmentActivity,
  saveAssessmentSession,
  startAssessmentInactivityMonitor,
  submitAssessmentSession,
  synchronizeRecoveredAssessmentSession,
} from "./assessmentSession.js";

const BASE_TIME = 1_800_000_000_000;

function makeCompleteSession() {
  return {
    ...createAssessmentSession(assessmentQuestions, BASE_TIME),
    currentQuestionIndex: assessmentQuestions.length - 1,
    answers: Object.fromEntries(
      assessmentQuestions.map((question) => [String(question.id), 0]),
    ),
  };
}

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    values,
  };
}

class FakeEventTarget {
  listeners = new Map();

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ type });
    }
  }

  listenerCount() {
    return [...this.listeners.values()].reduce(
      (total, listeners) => total + listeners.size,
      0,
    );
  }
}

class FakeClock {
  time = BASE_TIME;
  nextId = 1;
  jobs = new Map();

  setTimeout = (callback, delay) => {
    const id = this.nextId++;
    this.jobs.set(id, { callback, dueAt: this.time + delay });
    return id;
  };

  clearTimeout = (id) => {
    this.jobs.delete(id);
  };

  advance(milliseconds) {
    const targetTime = this.time + milliseconds;
    while (true) {
      const next = [...this.jobs.entries()]
        .filter(([, job]) => job.dueAt <= targetTime)
        .sort((left, right) => left[1].dueAt - right[1].dueAt)[0];
      if (!next) {
        break;
      }

      const [id, job] = next;
      this.jobs.delete(id);
      this.time = job.dueAt;
      job.callback();
    }
    this.time = targetTime;
  }
}

test("inactivity phases change at 45 seconds and 90 seconds", () => {
  const session = createAssessmentSession(assessmentQuestions, BASE_TIME);

  assert.equal(
    getAssessmentSessionPhase(session, BASE_TIME + INACTIVITY_WARNING_MS - 1),
    "active",
  );
  assert.equal(
    getAssessmentSessionPhase(session, BASE_TIME + INACTIVITY_WARNING_MS),
    "warning",
  );
  assert.equal(
    getAssessmentSessionPhase(session, BASE_TIME + SESSION_ABANDONMENT_MS),
    "abandoned",
  );
});

test("qualifying activity resets a warning but cannot revive an expired session", () => {
  const session = createAssessmentSession(assessmentQuestions, BASE_TIME);
  const continued = recordAssessmentActivity(
    { ...session, status: "warning" },
    BASE_TIME + INACTIVITY_WARNING_MS,
  );

  assert.equal(continued.status, "active");
  assert.equal(continued.lastActivityAt, BASE_TIME + INACTIVITY_WARNING_MS);
  assert.equal(
    getAssessmentSessionPhase(continued, BASE_TIME + INACTIVITY_WARNING_MS),
    "active",
  );

  const expired = recordAssessmentActivity(
    session,
    BASE_TIME + SESSION_ABANDONMENT_MS,
  );
  assert.equal(expired.status, "abandoned");
  assert.deepEqual(expired.answers, {});
});

test("valid saved progress restores the question index and answers", () => {
  const storage = createStorage();
  const session = {
    ...createAssessmentSession(assessmentQuestions, BASE_TIME),
    currentQuestionIndex: 2,
    answers: { "1": 0, "2": 1, "3": 2 },
  };
  assert.equal(saveAssessmentSession(session, storage), true);

  const restored = loadAssessmentSession(assessmentQuestions, {
    storage,
    now: BASE_TIME + 10_000,
  });
  assert.equal(restored.storageAvailable, true);
  assert.equal(restored.session.status, "active");
  assert.equal(restored.session.currentQuestionIndex, 2);
  assert.deepEqual(restored.session.answers, session.answers);
  assert.equal(restored.needsStorageSync, false);
});

test("reload after 45 seconds restores the warning without extending inactivity", () => {
  const storage = createStorage();
  const session = createAssessmentSession(assessmentQuestions, BASE_TIME);
  saveAssessmentSession(session, storage);

  const restored = loadAssessmentSession(assessmentQuestions, {
    storage,
    now: BASE_TIME + INACTIVITY_WARNING_MS,
  });
  assert.equal(restored.session.status, "warning");
  assert.equal(restored.session.lastActivityAt, BASE_TIME);
});

test("reload after 90 seconds expires the session and clears saved answers", () => {
  const storage = createStorage();
  const session = {
    ...createAssessmentSession(assessmentQuestions, BASE_TIME),
    currentQuestionIndex: 1,
    answers: { "1": 0, "2": 1 },
  };
  saveAssessmentSession(session, storage);

  const restored = loadAssessmentSession(assessmentQuestions, {
    storage,
    now: BASE_TIME + SESSION_ABANDONMENT_MS,
  });
  assert.equal(restored.session.status, "abandoned");
  assert.deepEqual(restored.session.answers, {});
  assert.equal(restored.session.currentQuestionIndex, 0);
  assert.equal(restored.needsStorageSync, true);
  assert.deepEqual(
    JSON.parse(storage.getItem(ASSESSMENT_SESSION_STORAGE_KEY)).answers,
    { "1": 0, "2": 1 },
  );
  assert.equal(synchronizeRecoveredAssessmentSession(restored, storage), true);
  assert.deepEqual(
    JSON.parse(storage.getItem(ASSESSMENT_SESSION_STORAGE_KEY)).answers,
    {},
  );
});

test("malformed or invalid saved state is discarded", () => {
  const storage = createStorage();
  storage.setItem(ASSESSMENT_SESSION_STORAGE_KEY, "{");

  const restored = loadAssessmentSession(assessmentQuestions, {
    storage,
    now: BASE_TIME,
  });
  assert.equal(restored.session, null);
  assert.equal(restored.recoveryIssue, "invalid");
  assert.equal(restored.needsStorageSync, true);
  assert.equal(synchronizeRecoveredAssessmentSession(restored, storage), true);
  assert.equal(storage.getItem(ASSESSMENT_SESSION_STORAGE_KEY), null);

  storage.setItem(
    ASSESSMENT_SESSION_STORAGE_KEY,
    JSON.stringify({
      ...createAssessmentSession(assessmentQuestions, BASE_TIME),
      answers: { "1": 99 },
    }),
  );
  const invalidAnswer = loadAssessmentSession(assessmentQuestions, {
    storage,
    now: BASE_TIME,
  });
  assert.equal(invalidAnswer.session, null);
  assert.equal(invalidAnswer.recoveryIssue, "invalid");
  synchronizeRecoveredAssessmentSession(invalidAnswer, storage);
  assert.equal(storage.getItem(ASSESSMENT_SESSION_STORAGE_KEY), null);
});

test("a submitted assessment is marked once and cannot be submitted again", () => {
  const complete = makeCompleteSession();
  const submitted = submitAssessmentSession(
    complete,
    assessmentQuestions,
    BASE_TIME + 5_000,
  );

  assert.equal(submitted.status, "submitted");
  assert.deepEqual(submitted.answers, {});
  assert.equal(
    submitAssessmentSession(submitted, assessmentQuestions, BASE_TIME + 6_000),
    null,
  );

  const storage = createStorage();
  saveAssessmentSession(submitted, storage);
  const restored = loadAssessmentSession(assessmentQuestions, {
    storage,
    now: BASE_TIME + 7_000,
  });
  assert.equal(restored.session.status, "submitted");
});

test("the inactivity monitor warns, expires, and cleans up timers and listeners", () => {
  const clock = new FakeClock();
  const target = new FakeEventTarget();
  let session = createAssessmentSession(assessmentQuestions, BASE_TIME);
  const phases = [];
  const stop = startAssessmentInactivityMonitor({
    getSession: () => session,
    onSessionChange: (next) => {
      session = next;
      phases.push(next.status);
    },
    eventTarget: target,
    now: () => clock.time,
    setTimer: clock.setTimeout,
    clearTimer: clock.clearTimeout,
  });

  clock.advance(INACTIVITY_WARNING_MS);
  assert.equal(session.status, "warning");
  clock.advance(SESSION_ABANDONMENT_MS - INACTIVITY_WARNING_MS);
  assert.equal(session.status, "abandoned");
  assert.deepEqual(phases, ["warning", "abandoned"]);

  stop();
  assert.equal(clock.jobs.size, 0);
  assert.equal(target.listenerCount(), 0);
});

test("activity events restart the warning timer; unrelated events do not", () => {
  const clock = new FakeClock();
  const target = new FakeEventTarget();
  let session = createAssessmentSession(assessmentQuestions, BASE_TIME);
  const stop = startAssessmentInactivityMonitor({
    getSession: () => session,
    onSessionChange: (next) => {
      session = next;
    },
    eventTarget: target,
    now: () => clock.time,
    setTimer: clock.setTimeout,
    clearTimer: clock.clearTimeout,
  });

  clock.advance(INACTIVITY_WARNING_MS - 1);
  target.dispatch("pointerdown");
  assert.equal(session.lastActivityAt, BASE_TIME + INACTIVITY_WARNING_MS - 1);
  target.dispatch("visibilitychange");
  assert.equal(session.lastActivityAt, BASE_TIME + INACTIVITY_WARNING_MS - 1);

  clock.advance(INACTIVITY_WARNING_MS - 1);
  assert.equal(session.status, "active");
  clock.advance(1);
  assert.equal(session.status, "warning");
  stop();
});

test("unavailable browser storage is reported without throwing", () => {
  const storage = {
    getItem() {
      throw new Error("Storage is unavailable");
    },
  };
  const restored = loadAssessmentSession(assessmentQuestions, {
    storage,
    now: BASE_TIME,
  });
  assert.equal(restored.session, null);
  assert.equal(restored.storageAvailable, false);
});

test("explicit abandonment clears answers while retaining a terminal marker", () => {
  const session = makeCompleteSession();
  const abandoned = abandonAssessmentSession(session, BASE_TIME + 90_000);
  assert.equal(abandoned.status, "abandoned");
  assert.deepEqual(abandoned.answers, {});
});
