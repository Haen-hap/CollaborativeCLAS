const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const frontend = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(frontend, relative), "utf8");

function createBrowser(savedStorage = new Map()) {
  class Element {
    constructor(dataset = {}) {
      this.dataset = dataset; this.style = { setProperty() {} }; this.attrs = {}; this.classList = { add() {}, remove() {} };
      this.scrollTop = 0; this.innerHTML = ""; this.textContent = ""; this.children = [];
    }
    setAttribute(key, value) { this.attrs[key] = value; }
    appendChild(child) { this.children.push(child); }
    querySelector(selector) { return this.children.find(child => child.selector === selector) || null; }
    querySelectorAll() { return this.children; }
  }
  const byId = new Map();
  ["asst", "panel", "far", "near", "hero", "bubble", "gems", "scene", "modal", "modal-message", "modal-button", "zr", "card"]
    .forEach(id => byId.set(id, new Element()));
  const selector = new Element();
  selector.children = [new Element({ language: "es" }), new Element({ language: "en" })];
  selector.children.forEach(button => { button.selector = `[data-language="${button.dataset.language}"]`; });
  byId.set("language-selector", selector);
  const document = {
    title: "",
    documentElement: { lang: "" },
    querySelector(query) { return query.startsWith("#") ? byId.get(query.slice(1)) || null : null; },
    createElement() { return new Element(); }
  };
  const localStorage = {
    getItem(key) { return savedStorage.has(key) ? savedStorage.get(key) : null; },
    setItem(key, value) { savedStorage.set(key, String(value)); },
    removeItem(key) { savedStorage.delete(key); }
  };
  const context = vm.createContext({
    document, localStorage, URLSearchParams, location: { search: "" }, navigator: { onLine: true },
    window: {}, console, Math, Date, JSON, Array, String, Number, RegExp, Object,
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    addEventListener() {}, tone() {}, say() {}, sendSession() {},
    $: query => document.querySelector(query), spk: "<svg></svg>",
    ic: () => "<svg></svg>", T: items => items[0],
    sh: items => [...items], pick: (items, count) => items.slice(0, count)
  });
  vm.runInContext(read("js/i18n.js"), context, { filename: "i18n.js" });
  vm.runInContext(read("js/data.js"), context, { filename: "data.js" });
  vm.runInContext(read("js/game.js"), context, { filename: "game.js" });
  return { context, document, localStorage, panel: byId.get("panel"), selector };
}

test("centralized translation resources cover every message and assessment copy key", () => {
  const { context } = createBrowser();
  const missing = vm.runInContext(`JSON.stringify({
    enMessages: Object.keys(MESSAGES.es).filter(key => !(key in MESSAGES.en)),
    esMessages: Object.keys(MESSAGES.en).filter(key => !(key in MESSAGES.es)),
    content: Object.values(ASSESSMENT_COPY_KEYS).filter(key => !(key in CONTENT_MESSAGES.en) || !(key in CONTENT_MESSAGES.es)),
    datasetValues: [...SIGNS.flatMap(item => [item[1], item[4]]), ...SENT.flatMap(item => [item[0], item[1], ...item[2]]),
      ...ICONS.map(item => item[1]), ...SCEN.map(item => item[1]), ...TIPS,
      ...AGE.map(item => item[1]), ...WORK.map(item => item[1]), ...SCH.map(item => item[1])]
      .filter(value => !(value in ASSESSMENT_COPY_KEYS))
  })`, context);
  assert.deepEqual(JSON.parse(missing), { enMessages: [], esMessages: [], content: [], datasetValues: [] });
});

test("Spanish is the default and language changes update the current screen and persist", () => {
  const app = createBrowser();
  assert.equal(app.document.documentElement.lang, "es");
  assert.match(app.panel.innerHTML, /Juega 2 minutos/);
  vm.runInContext('changeLanguage("en")', app.context);
  assert.equal(app.document.documentElement.lang, "en");
  assert.match(app.panel.innerHTML, /Play for 2 minutes/);
  assert.equal(app.localStorage.getItem("cclas_language"), "en");
  assert.equal(app.selector.children[1].attrs["aria-pressed"], "true");
  vm.runInContext('changeLanguage("es")', app.context);
  assert.match(app.panel.innerHTML, /Juega 2 minutos/);
});

test("missing English message uses Spanish fallback", () => {
  const app = createBrowser();
  vm.runInContext('MESSAGES.es["test.fallback"] = "Texto en español"; delete MESSAGES.en["test.fallback"]; changeLanguage("en")', app.context);
  assert.equal(vm.runInContext('t("test.fallback")', app.context), "Texto en español");
});

test("PWA cache includes translations and removes only older CCLAS caches", () => {
  const sw = read("sw.js");
  assert.match(sw, /cclas-nina-v3/);
  assert.match(sw, /js\/i18n\.js/);
  assert.match(sw, /startsWith\("cclas-nina-"\)/);
});

test("switching and restoring language preserves assessment progress and answers", () => {
  const storage = new Map();
  const first = createBrowser(storage);
  vm.runInContext('privacy(); changeLanguage("en")', first.context);
  assert.match(first.panel.innerHTML, /Your information belongs to you/);
  assert.match(first.panel.innerHTML, /We don't ask for your name/);
  vm.runInContext(`
    age18(); next();
    set("age", "18_24"); next(); set("work", "FORMAL"); next();
    set("school", "PRIMARY_COMPLETE"); next(); set("zone", "Z001"); next();
    ans(1, 1, "sign:" + steps[idx].s[0]); changeLanguage("es"); changeLanguage("en");
  `, first.context);
  const beforeReload = JSON.parse(vm.runInContext(`JSON.stringify({id:S.id, idx, d:S.d, sc:S.sc, tot:S.tot, answers:S.answers, completed:S.completedQuestionIds})`, first.context));
  assert.equal(beforeReload.idx, 5);
  assert.equal(beforeReload.sc.c1, 1);
  assert.equal(beforeReload.d.zone, "Z001");
  assert.match(first.panel.innerHTML, /PHARMACY|WET FLOOR|BUS STOP|EXIT|HOSPITAL|RESTROOMS|DO NOT ENTER/);

  const recovered = createBrowser(storage);
  const afterReload = JSON.parse(vm.runInContext(`JSON.stringify({id:S.id, idx, d:S.d, sc:S.sc, tot:S.tot, answers:S.answers, completed:S.completedQuestionIds})`, recovered.context));
  assert.deepEqual(afterReload, beforeReload);
  assert.equal(recovered.document.documentElement.lang, "en");
  assert.match(recovered.panel.innerHTML, /PHARMACY|WET FLOOR|BUS STOP|EXIT|HOSPITAL|RESTROOMS|DO NOT ENTER/);
  const outputBefore = vm.runInContext('JSON.stringify(S.out())', recovered.context);
  vm.runInContext('changeLanguage("es")', recovered.context);
  assert.equal(vm.runInContext('JSON.stringify(S.out())', recovered.context), outputBefore);
  assert.equal(recovered.localStorage.getItem("cclas_language"), "es");
});

test("English assessment copy keeps canonical Spanish source values and equivalent answer values", () => {
  const app = createBrowser();
  vm.runInContext('changeLanguage("en")', app.context);
  assert.equal(vm.runInContext('tContent("FARMACIA")', app.context), "PHARMACY");
  assert.equal(vm.runInContext('tContent("agua")', app.context), "water");
  assert.equal(vm.runInContext('SIGNS[0][1]', app.context), "FARMACIA");
  assert.equal(vm.runInContext('SENT[0][1]', app.context), "agua");
});

test("assessment forms, activities, zone feedback, and result labels render in English", () => {
  const app = createBrowser();
  vm.runInContext('changeLanguage("en"); R.age()', app.context);
  assert.match(app.panel.innerHTML, /How old are you/);
  assert.match(app.panel.innerHTML, /18 to 24 years/);
  vm.runInContext('R.work()', app.context);
  assert.match(app.panel.innerHTML, /I work for a company/);
  vm.runInContext('R.school()', app.context);
  assert.match(app.panel.innerHTML, /Completed primary school/);
  vm.runInContext('R.zone(); zs("zzzzz")', app.context);
  assert.match(app.panel.innerHTML, /Search for your neighborhood/);
  assert.match(app.context.document?.querySelector?.("#zr")?.innerHTML || "", /We couldn't find that neighborhood/);
  vm.runInContext('zs("Zona")', app.context);
  assert.match(app.context.document?.querySelector?.("#zr")?.innerHTML || "", /Zone 035/);
  assert.equal(vm.runInContext('ZALL[34][0]', app.context), "Z035");
  vm.runInContext('R.sent({s:SENT[0]})', app.context);
  assert.match(app.panel.innerHTML, /I drink <u>/);
  assert.match(app.panel.innerHTML, /water/);
  vm.runInContext('R.icon({t:ICONS[0],o:ICONS})', app.context);
  assert.match(app.panel.innerHTML, /Tap to: make a phone call/);
  assert.match(app.panel.innerHTML, /Read aloud/);
  vm.runInContext('R.swipe({s:SCEN[0]})', app.context);
  assert.match(app.panel.innerHTML, /Is it safe or risky/);
  assert.match(app.panel.innerHTML, /Swipe the card or tap a button/);
  vm.runInContext('fresh()', app.context);
  assert.match(vm.runInContext('semaforo()', app.context), /A great start/);
  vm.runInContext('idx=4; ans(1, 0, "sign:wrong")', app.context);
  assert.equal(app.context.document.querySelector("#bubble").textContent, "Keep going. You can do it!");
  vm.runInContext('fresh(); finish()', app.context);
  assert.match(app.panel.innerHTML, /You did it! Thanks for helping your community/);
  assert.match(app.panel.innerHTML, /Getting your prize ready/);
});
