// Envío de sesiones anónimas al backend (POST /api/sessions). Si no hay red, quedan en una cola y se reintentan.
const API = (window.CCLAS_API || "").replace(/\/$/, "");
const lsGet = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) || d;
  } catch (e) {
    return d;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};

const VALID_AGE_RANGES = ["18_24", "25_34", "35_49", "50_59", "60_PLUS"];
const VALID_WORK_STATUSES = ["FORMAL", "INFORMAL", "HOME", "STUDENT", "UNEMPLOYED"];
const VALID_SCHOOLING = [
  "PRIMARY_INCOMPLETE",
  "PRIMARY_COMPLETE",
  "SECONDARY_INCOMPLETE",
  "SECONDARY_COMPLETE",
  "TERTIARY",
];
const VALID_ORIGINS = ["KIOSK", "UNKNOWN", "MOCK"];
const VALID_REWARD_TYPES = ["NONE", "BEVERAGE_DISPENSER", "POWER_STATION", "WIFI_CREDENTIAL"];
const KIOSK_RE = /^(PTYK\d{3}|DIRECT_WEB)$/;
const ZONE_RE = /^(Z0(0[1-9]|[12][0-9]|3[0-6])|DECLINED)$/;

function clampInt(val, min, max) {
  const n = Math.round(Number(val) || 0);
  return Math.min(max, Math.max(min, n));
}

function normalizeSessionPayload(p = {}) {
  const rawId = String(p.session_id || `SES-${Date.now().toString(36)}`).replace(/[^A-Za-z0-9_-]/g, "");
  const session_id = (rawId.length >= 3 ? rawId : `SES-${rawId}`).slice(0, 40);
  const kioskCandidate = p.kiosk_id || p.access_point_code || "DIRECT_WEB";
  const zoneCandidate = p.zone_code || p.zone_id || "DECLINED";
  const rewardIssued = Boolean(p.reward_issued);
  const rawTrigger = p.iot_trigger_type || p.trigger_type || "NONE";
  const iotTriggerType =
    rewardIssued && VALID_REWARD_TYPES.includes(rawTrigger) && rawTrigger !== "NONE"
      ? rawTrigger
      : rewardIssued
        ? "WIFI_CREDENTIAL"
        : "NONE";

  return {
    session_id,
    kiosk_id: KIOSK_RE.test(kioskCandidate) ? kioskCandidate : "DIRECT_WEB",
    origin: VALID_ORIGINS.includes(p.origin) ? p.origin : "UNKNOWN",
    assisted_mode: Boolean(p.assisted_mode),
    age_range: VALID_AGE_RANGES.includes(p.age_range) ? p.age_range : null,
    work_status: VALID_WORK_STATUSES.includes(p.work_status) ? p.work_status : null,
    schooling_level: VALID_SCHOOLING.includes(p.schooling_level) ? p.schooling_level : null,
    zone_code: ZONE_RE.test(zoneCandidate) ? zoneCandidate : "DECLINED",
    c1_visual_signs_score: clampInt(p.c1_visual_signs_score ?? p.c1_score, 0, 2),
    c2_sentence_comprehension_score: clampInt(p.c2_sentence_comprehension_score ?? p.c2_score, 0, 2),
    c3_mobile_icons_score: clampInt(p.c3_mobile_icons_score ?? p.c3_score, 0, 2),
    c4_cybersecurity_score: clampInt(p.c4_cybersecurity_score ?? p.c4_score, 0, 3),
    completion_status: p.completion_status === "COMPLETED" ? "COMPLETED" : "ABANDONED",
    last_step: p.last_step ? String(p.last_step).slice(0, 15) : null,
    duration_seconds: clampInt(p.duration_seconds, 0, 7200),
    reward_issued: rewardIssued,
    iot_trigger_type: iotTriggerType,
    repeat_device: Boolean(p.repeat_device),
  };
}

let flushing = false;
async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  const left = [];
  for (const raw of lsGet("cclas_outbox", [])) {
    const payload = normalizeSessionPayload(raw);
    try {
      const r = await fetch(API + "/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok && r.status !== 422) left.push(payload);
    } catch (e) {
      left.push(payload);
    }
  }
  lsSet("cclas_outbox", left);
  flushing = false;
}

function sendSession(p) {
  const normalized = normalizeSessionPayload(p);
  const box = lsGet("cclas_outbox", []).filter((x) => x.session_id !== normalized.session_id);
  box.push(normalized);
  lsSet("cclas_outbox", box);
  flushOutbox();
}

addEventListener("online", flushOutbox);
addEventListener("load", flushOutbox);
