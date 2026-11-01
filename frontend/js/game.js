// ---- state and route
const Q = new URLSearchParams(location.search);
let S, steps, idx = 0, idle = {}, t0 = Date.now();
let currentView = "home", currentGemStage = 0, resultPresentation = null;
const kq = Q.get("kiosk"), known = /^PTYK00[1-3]$/.test(kq || "");
const kiosk = known ? kq : "DIRECT_WEB", origin = known ? "KIOSK" : "UNKNOWN";
const assisted = Q.get("assisted") === "1";
const ACTIVE_SESSION_KEY = "cclas_active_session";
const P_ = $("#panel");
if (assisted) $("#asst").style.display = "block";

// ---- scene
const bld = (w, h, c, x) => `<svg style="left:${x}px" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${c}"/><rect x="-4" y="0" width="${w + 8}" height="9" fill="#2F4A72"/>${Array.from({ length: Math.floor(h / 26) * Math.floor(w / 26) }, (_, i) => `<rect x="${10 + (i % Math.floor(w / 26)) * 26}" y="${22 + Math.floor(i / Math.floor(w / 26)) * 26}" width="13" height="13" rx="3" fill="#fff" opacity=".28"/>`).join("")}</svg>`;
let fx = "", nx = "";
for (let i = 0; i < 14; i++) {
  fx += `<svg style="left:${i * 260 + 20}px;bottom:34px" width="200" height="130" viewBox="0 0 200 130"><path d="M0 130L100 20L200 130z" fill="#fff" opacity=".35"/></svg>`;
  nx += bld(80 + (i * 37 % 50), 90 + (i * 53 % 80), i % 2 ? "#46648C" : "#3C5983", i * 190 + 160) +
    (i % 3 === 0 ? `<svg style="left:${i * 190 + 60}px" width="40" height="80" viewBox="0 0 40 80"><rect x="18" y="40" width="5" height="40" fill="#46648C"/><circle cx="20" cy="30" r="22" fill="#6E8FB8"/></svg>` : "");
}
$("#far").innerHTML = fx;
$("#near").innerHTML = nx;
const pose = (p, f, ms, l) => {
  const h = $("#hero"); clearTimeout(pose.t); h.dataset.pose = p; h.dataset.face = f || "smile"; h.dataset.look = l || "";
  if (ms) pose.t = setTimeout(() => { h.dataset.pose = "idle"; h.dataset.face = "smile"; h.dataset.look = ""; }, ms);
};
let walked = 0;
const walk = () => {
  pose("idle"); walked++; $("#hero").classList.add("walk");
  $("#near").style.transform = `translateX(${-walked * 150}px)`;
  $("#far").style.transform = `translateX(${-walked * 60}px)`;
  setTimeout(() => $("#hero").classList.remove("walk"), 900);
};
const say2 = text => { $("#bubble").textContent = text; };
const burst = () => {
  for (let i = 0; i < 18; i++) {
    const star = document.createElement("i"); star.className = "star"; star.style.left = "50%"; star.style.top = "50%";
    star.style.setProperty("--x", `${Math.random() * 300 - 150}px`); star.style.setProperty("--y", `${Math.random() * -200}px`);
    $("#scene").appendChild(star); setTimeout(() => star.remove(), 1700);
  }
};
const tier = ratio => ratio >= .75 ? "g" : ratio >= .45 ? "y" : "r";
const stageKeys = ["stage.profile", "stage.signs", "stage.sentences", "stage.phone", "stage.security"];
const gems = stage => {
  currentGemStage = stage;
  $("#gems").innerHTML = stageKeys.map((key, i) => {
    let color = "";
    if (i < stage || (i === stage && S && i > 0 && S.tot[i] > 0)) color = i && S && S.tot[i] ? tier(S.sc[`c${i}`] / S.tot[i]) : "on";
    const label = i < stage ? t("progress.completed", { stage: t(key) }) : t("progress.current", { stage: t(key) });
    return `<svg viewBox="0 0 24 24" class="${color}" role="img" aria-label="${label}"><path d="M6 3h12l4 6-10 12L2 9z"/></svg>`;
  }).join("");
};

// ---- progress persistence. This snapshot is separate from the API outbox and language preference.
const readActiveProgress = () => {
  try { return JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || "null"); }
  catch (error) { return null; }
};
const clearActiveProgress = () => { try { localStorage.removeItem(ACTIVE_SESSION_KEY); } catch (error) {} };
const saveProgress = () => {
  if (!S || S.done || S.status !== "IN_PROGRESS" || !Array.isArray(steps)) return;
  const progress = {
    version: 1,
    session: {
      id: S.id, d: S.d, sc: S.sc, tot: S.tot, status: S.status, done: S.done,
      answers: S.answers, completedQuestionIds: S.completedQuestionIds,
      kiosk: S.kiosk, origin: S.origin, assisted: S.assisted, reward: S.reward || null
    },
    steps, currentQuestionId: idx, elapsedSeconds: Math.max(0, Math.round((Date.now() - t0) / 1000))
  };
  try { localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(progress)); } catch (error) {}
};
const restoreActiveProgress = () => {
  const saved = readActiveProgress();
  if (!saved || saved.version !== 1 || !saved.session || !Array.isArray(saved.steps) ||
      !saved.steps.length || !Number.isInteger(saved.currentQuestionId) || saved.currentQuestionId < 0 ||
      saved.currentQuestionId > saved.steps.length) return false;
  const session = saved.session;
  if (session.status !== "IN_PROGRESS" || !session.id || !session.d || !session.sc || !Array.isArray(session.tot)) return false;
  S = {
    ...session,
    answers: Array.isArray(session.answers) ? session.answers : [],
    completedQuestionIds: Array.isArray(session.completedQuestionIds) ? session.completedQuestionIds : [],
    out: () => sessionOutput()
  };
  steps = saved.steps; idx = saved.currentQuestionId;
  t0 = Date.now() - Math.max(0, Number(saved.elapsedSeconds) || 0) * 1000;
  return true;
};

// ---- inactivity
const poke = () => {
  $("#modal").style.display = "none"; clearTimeout(idle.a); clearTimeout(idle.b);
  if (steps && S && !S.done) {
    idle.a = setTimeout(() => { $("#modal").style.display = "grid"; tone(520, .4); }, 45000);
    idle.b = setTimeout(() => { S.status = "ABANDONED"; save(); home(); }, 90000);
  }
};
["pointerdown", "keydown"].forEach(eventName => addEventListener(eventName, () => {
  if (S && !S.done && $("#modal").style.display !== "grid") poke();
}));

// ---- API session output and local completed-session history
const sessionOutput = () => {
  const scores = {
    c1: Math.round(S.sc.c1 * 2 / 3), c2: Math.round(S.sc.c2 * 2 / 3),
    c3: Math.round(S.sc.c3 * 2 / 3), c4: Math.round(S.sc.c4 * 3 / 4)
  };
  const total = scores.c1 + scores.c2 + scores.c3 + scores.c4, reward = S.reward || {};
  return {
    session_id: S.id, kiosk_id: S.kiosk || kiosk, origin: S.origin || origin, assisted_mode: S.assisted ?? assisted,
    age_range: S.d.age, work_status: S.d.work, schooling_level: S.d.school, zone_code: S.d.zone,
    c1_visual_signs_score: scores.c1, c2_sentence_comprehension_score: scores.c2,
    c3_mobile_icons_score: scores.c3, c4_cybersecurity_score: scores.c4, total_literacy_score: total,
    internal_zone_classification: total <= 3 ? "RED" : total <= 6 ? "YELLOW" : "GREEN",
    completion_status: S.status === "COMPLETED" ? "COMPLETED" : "ABANDONED", last_step: `step_${idx}`,
    duration_seconds: Math.min(7200, Math.round((Date.now() - t0) / 1000)), reward_issued: !!reward.issued,
    iot_trigger_type: reward.type || "NONE", repeat_device: !!reward.repeat
  };
};
const save = () => {
  const output = S.out();
  try {
    const history = JSON.parse(localStorage.getItem("cclas_sessions") || "[]");
    const existing = history.findIndex(item => item.session_id === output.session_id);
    if (existing < 0) history.push(output); else history[existing] = output;
    localStorage.setItem("cclas_sessions", JSON.stringify(history));
  } catch (error) {}
  clearActiveProgress();
  sendSession(output);
};

// ---- assessment setup
const fresh = () => {
  const sc = { c1: 0, c2: 0, c3: 0, c4: 0 };
  S = {
    id: `SES-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    d: { age: null, work: null, school: null, zone: null }, sc, tot: [0, 0, 0, 0, 0],
    status: "IN_PROGRESS", done: false, answers: [], completedQuestionIds: [],
    kiosk, origin, assisted, out: () => sessionOutput()
  };
  steps = [
    { k: "age", stage: 0 }, { k: "work", stage: 0 }, { k: "school", stage: 0 }, { k: "zone", stage: 0 },
    ...pick(SIGNS, 3).map(sign => ({ k: "sign", stage: 1, s: sign, o: sh([sign, ...pick(SIGNS.filter(item => item !== sign), 2)]) })),
    ...pick(SENT, 3).map(sentence => ({ k: "sent", stage: 2, s: sentence })),
    ...pick(ICONS, 3).map(icon => ({ k: "icon", stage: 3, t: icon, o: sh(pick(ICONS, 4).includes(icon) ? pick(ICONS, 4) : [icon, ...pick(ICONS.filter(item => item !== icon), 3)]) })),
    ...pick(SCEN, 4).map(scenario => ({ k: "swipe", stage: 4, s: scenario }))
  ];
  steps.forEach(step => {
    if (step.k === "icon" && !step.o.includes(step.t)) step.o[0] = step.t;
    if (step.k === "icon") step.o = sh(step.o);
  });
  idx = 0; t0 = Date.now();
};
const show = html => { P_.innerHTML = `<div class="fade" style="display:contents">${html}</div>`; P_.scrollTop = 0; };

// ---- language selector and screen rendering
const updateLanguageControls = () => {
  document.documentElement.lang = currentLanguage;
  const selector = $("#language-selector");
  selector.setAttribute("aria-label", t("language.group"));
  selector.querySelector('[data-language="es"]').setAttribute("aria-label", t("language.spanish"));
  selector.querySelector('[data-language="en"]').setAttribute("aria-label", t("language.english"));
  selector.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage)));
  if (assisted) $("#asst").textContent = t("mode.assisted");
  $("#modal-message").textContent = t("modal.stillThere");
  $("#modal-button").textContent = t("modal.yes");
  document.title = t("app.title");
};
const renderHome = () => {
  pose("wave", "open", 3000); clearInterval(window.cd); gems(0); say2(t("welcome.greeting"));
  show(`<div class="q">${t(kiosk !== "DIRECT_WEB" ? "welcome.kiosk" : "welcome.web")}</div><p class="sub">${t("welcome.subtitle")}</p><button class="audio" aria-label="${t("audio.readAloud")}" onclick="say('${t("welcome.web")}')">${spk}</button><div style="flex:1"></div><button class="btn" onclick="privacy()"><svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true"><path d="M6 3l15 9-15 9z"/></svg>${t("welcome.play")}</button>`);
};
const renderPrivacy = () => {
  say2(t("privacy.bubble"));
  show(`<div class="q">${t("privacy.title")}</div><div class="pts"><div>${ic("no")} ${t("privacy.noName")}</div><div>${ic("user")} ${t("privacy.noId")}</div><div>${ic("lock")} ${t("privacy.noStorage")}</div></div><p class="sub">${t("privacy.description")}</p><div style="flex:1"></div><button class="btn" onclick="age18()">${t("privacy.agree")}</button><button class="btn alt" onclick="bye('goodbye.noThanks')">${t("privacy.decline")}</button>`);
};
let goodbyeKey = "goodbye.noThanks";
const renderGoodbye = () => {
  pose("wave", "smile", 2600); say2(t("goodbye.title"));
  show(`<div class="q">${t(goodbyeKey)}</div><div style="flex:1"></div><button class="btn" onclick="home()">${t("goodbye.return")}</button>`);
};
const renderAgeGate = () => {
  say2(t("age.quick"));
  show(`<div class="q">${t("age.adultQuestion")}</div><div style="flex:1"></div><button class="btn" onclick="tone(760);next()">${t("age.yes")}</button><button class="btn alt" onclick="bye('goodbye.underage')">${t("age.no")}</button>`);
};
const home = () => {
  S = null; currentView = "home"; resultPresentation = null; poke(); clearInterval(window.cd); gems(0); renderHome();
};
const privacy = () => { tone(700); currentView = "privacy"; renderPrivacy(); };
const bye = key => { S = null; currentView = "goodbye"; goodbyeKey = key; renderGoodbye(); setTimeout(() => { if (!S && currentView === "goodbye") home(); }, 10000); };
const age18 = () => { tone(700); fresh(); currentView = "ageGate"; poke(); renderAgeGate(); };
const changeLanguage = language => {
  const scrollTop = P_.scrollTop;
  setLanguage(language); updateLanguageControls(); renderCurrent(); gems(currentGemStage); P_.scrollTop = scrollTop;
};
const renderCurrent = () => {
  if (currentView === "home") renderHome();
  else if (currentView === "privacy") renderPrivacy();
  else if (currentView === "goodbye") renderGoodbye();
  else if (currentView === "ageGate") renderAgeGate();
  else if (currentView === "question" && steps && idx < steps.length) renderQuestion(steps[idx]);
  else if (currentView === "finish" && resultPresentation) renderFinish();
};

// ---- assessment flow
const next = () => {
  if (idx >= steps.length) return finish();
  const step = steps[idx]; currentView = "question"; gems(step.stage); poke(); saveProgress();
  renderQuestion(step); pose(step.stage ? "watch" : "idle", "smile", 0, step.stage ? "down" : "");
  const voiceHint = step.k === "sent" ? t("interaction.fillWord") : step.k === "sign" ? tContent(step.s[4]) :
    step.k === "icon" ? t("interaction.tapIcon", { label: tContent(step.t[1]).toLowerCase() }) : "";
  if (voiceHint) setTimeout(() => say(voiceHint), 400);
};
const go = () => {
  tone(660, .1); tone(880, .12, .09); idx++; saveProgress();
  setTimeout(walk, 380); setTimeout(next, 1330);
};
const set = (key, value) => {
  S.d[key] = value;
  S.answers.push({ questionIndex: idx, answerId: `profile:${key}:${value}` });
  S.completedQuestionIds.push(`step_${idx}`);
  pose("nod", "open", 380); go();
};
const cards = (questionKey, options, key, iconFn) => `<div class="q">${t(questionKey)}</div><div class="opts ${options.length === 5 && key === "age" ? "" : ""}">${options.map(option => `<button class="opt" onclick="set('${key}','${option[0]}')">${iconFn ? ic(option[2]) : ic("cal")}${tContent(option[1])}</button>`).join("")}</div>`;
const renderQuestion = step => R[step.k](step);
const R = {
  age: () => { say2(t("question.age")); show(cards("question.age", AGE, "age")); },
  work: () => { say2(t("question.work")); show(cards("question.work", WORK, "work", 1)); },
  school: () => { say2(t("question.school")); show(cards("question.school", SCH, "school", 1)); },
  zone: () => {
    say2(t("question.zone"));
    show(`<div class="q">${t("question.zone")}</div><input class="srch" id="zi" aria-label="${t("zone.search")}" placeholder="${t("zone.search")}" autocomplete="off" oninput="zs(this.value)"><div class="chips" id="zr"></div><div style="flex:1"></div><button class="btn alt" onclick="set('zone','DECLINED')">${t("zone.decline")}</button>`);
    zs("");
  },
  sign: step => {
    say2(t("interaction.findSign"));
    show(`<div class="q">${tContent(step.s[4])}</div><button class="audio" aria-label="${t("audio.readAloud")}" onclick="say('${tContent(step.s[4])}')">${spk}</button><div class="opts">${step.o.map(option => `<button class="opt" style="padding:8px" onclick="ans(1,${option[0] === step.s[0] ? 1 : 0},'sign:${option[0]}')"><div class="sign" style="background:${option[3]};width:100%">${ic(option[2], "ico").replace('class="ico"', 'class="ico" style="stroke:#fff;width:30px;height:30px;vertical-align:-6px;margin-right:8px"')}${tContent(option[1])}</div></button>`).join("")}</div>`);
  },
  sent: step => {
    say2(t("interaction.fillWord")); const [sentence, correct, incorrect] = step.s;
    show(`<div class="sent">${tContent(sentence).replace("___", "<u>&nbsp;</u>")}</div><button class="audio" aria-label="${t("audio.readAloud")}" onclick="say('${t("interaction.fillWord")}')">${spk}</button><div class="opts g2" style="grid-template-columns:repeat(3,1fr)">${sh([correct, ...incorrect]).map(word => `<button class="opt" onclick="ans(2,${word === correct ? 1 : 0},'word:${word}')">${ic(WORDS[word])}${tContent(word)}</button>`).join("")}</div>`);
  },
  icon: step => {
    say2(t("interaction.phone"));
    const label = tContent(step.t[1]).toLowerCase();
    show(`<div class="q">${t("interaction.tapFor", { label })}</div><button class="audio" aria-label="${t("audio.readAloud")}" onclick="say('${t("interaction.tapIcon", { label })}')">${spk}</button><div class="opts g2">${step.o.map(option => `<button class="opt" aria-label="${tContent(option[1])}" onclick="ans(3,${option[0] === step.t[0] ? 1 : 0},'icon:${option[0]}')">${ic(option[2])}</button>`).join("")}</div>`);
  },
  swipe: step => {
    say2(t("interaction.safeRisk"));
    show(`<div class="q">${t("interaction.safeRiskQuestion")}</div><div id="card">${ic(step.s[0])}${tContent(step.s[1])}</div><p class="sub">${t("interaction.drag")}</p><div class="row"><button class="btn risk" onclick="ans(4,${step.s[2] ? 1 : 0},'scenario:risk')">${t("answer.risk")}</button><button class="btn safe" onclick="ans(4,${step.s[2] ? 0 : 1},'scenario:safe')">${t("answer.safe")}</button></div>`);
    drag(step);
  }
};
const ans = (category, correct, answerId) => {
  pose(correct ? "cheer" : "shrug", correct ? "open" : "smile", 380);
  S.sc[`c${category}`] += correct; S.tot[category]++;
  S.answers.push({ questionIndex: idx, answerId }); S.completedQuestionIds.push(`step_${idx}`);
  gems(steps[idx].stage);
  if (!correct) say2(t("feedback.encouragement"));
  if (idx + 1 < steps.length && steps[idx + 1].stage !== steps[idx].stage) {
    gems(steps[idx].stage + 1); burst(); tone(988, .2, .15); say2(t("feedback.stageComplete")); pose("cheer", "open", 380);
  }
  go();
};
const drag = step => {
  const card = $("#card"); let startX = null;
  card.onpointerdown = event => { startX = event.clientX; card.setPointerCapture(event.pointerId); card.style.transition = "none"; };
  card.onpointermove = event => {
    if (startX == null) return;
    const distance = event.clientX - startX; card.style.transform = `translateX(${distance}px) rotate(${distance / 12}deg)`;
    card.style.background = distance > 0 ? `rgba(16,185,129,${Math.min(distance / 200, .4)})` : `rgba(239,68,68,${Math.min(-distance / 200, .4)})`;
  };
  card.onpointerup = event => {
    if (startX == null) return;
    const distance = event.clientX - startX; startX = null; card.style.transition = "";
    if (Math.abs(distance) > 90) {
      const safe = distance > 0; ans(4, (safe !== !!step.s[2]) ? 1 : 0, `scenario:${safe ? "safe" : "risk"}`);
    } else { card.style.transform = ""; card.style.background = ""; }
  };
};

// ---- results and reward
const semaforo = () => {
  const classification = S.out().internal_zone_classification;
  const keys = {
    GREEN: ["result.green.title", "result.green.description"],
    YELLOW: ["result.yellow.title", "result.yellow.description"],
    RED: ["result.red.title", "result.red.description"]
  }[classification];
  const colors = { RED: "#EF4444", YELLOW: "#F59E0B", GREEN: "#10B981" };
  return `<div class="lights" aria-label="${t(`result.${classification.toLowerCase()}.title`)}">${["RED", "YELLOW", "GREEN"].map(color => `<i class="${color === classification ? "on" : ""}" style="background:${colors[color]};color:${colors[color]}" aria-hidden="true"></i>`).join("")}</div><div class="res"><b>${t(keys[0])}</b><span>${t(keys[1])}</span></div>`;
};
const renderFinish = () => {
  if (!resultPresentation) return;
  const { repeat, code, tip, ready, countdown } = resultPresentation;
  let reward = t("reward.preparing");
  if (ready) reward = repeat ? `<p class="q">${t("reward.alreadyReceived")}</p>` : `<p class="sub">${t("reward.code")}</p><div class="big">${code}</div>`;
  if (ready) reward += `<button class="btn" onclick="home()">${t("reward.finish")} <span id="n">${countdown}</span></button>`;
  show(`<div class="q">${t("result.complete")}</div>${semaforo()}<p class="sub" style="font-size:17px;opacity:1">${t("result.tip", { tip: tContent(tip) })}</p><div style="flex:1"></div><div id="rw" class="sub">${reward}</div>`);
};
const finish = () => {
  S.status = "COMPLETED"; S.done = true; clearTimeout(idle.a); clearTimeout(idle.b); gems(5); walk(); say2(t("result.arrival")); burst();
  setTimeout(() => pose("cheer", "open", 900), 950); setTimeout(() => pose("wave", "open", 5000), 1950);
  const last = +localStorage.getItem("cclas_last") || 0, repeat = Date.now() - last < 864e5;
  const offline = !navigator.onLine, code = repeat ? null : String(1000 + Math.random() * 9000 | 0);
  S.reward = { issued: !repeat, repeat, type: repeat ? "NONE" : ["BEVERAGE_DISPENSER", "WIFI_CREDENTIAL", "POWER_STATION"][Math.random() * 3 | 0] };
  save();
  resultPresentation = { repeat, code, tip: T(TIPS), ready: false, countdown: 10 };
  currentView = "finish"; renderFinish();
  setTimeout(() => {
    if (currentView !== "finish" || !resultPresentation) return;
    resultPresentation.ready = true;
    if (!repeat) localStorage.setItem("cclas_last", Date.now());
    renderFinish();
    window.cd = setInterval(() => {
      if (!resultPresentation) return clearInterval(window.cd);
      resultPresentation.countdown--;
      const counter = $("#n"); if (counter) counter.textContent = resultPresentation.countdown;
      if (resultPresentation.countdown <= 0) { clearInterval(window.cd); home(); }
    }, 1000);
  }, offline ? 0 : 1500);
};

// Initialize language before showing a screen, then restore any saved assessment.
updateLanguageControls();
if (restoreActiveProgress()) {
  currentView = "question"; say2(t("session.resumed")); poke();
  if (idx === steps.length) finish(); else renderCurrent();
} else {
  home();
}
