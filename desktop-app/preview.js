// Sandbox thuần HTML/JS, không có Electron/IPC — chỉ lấy WidgetRender (widget-render.js)
// để vẽ đúng y hệt widget thật, và tự nối các control trên trang vào đó.

const refs = WidgetRender.getRefs();

let currentMode = 1;
let currentStatus = "waiting";

// 5 mức 20/40/60/80/100 — mỗi mức có cặp opacity (đèn/nền) riêng, chỉnh độc lập.
// Mặc định nền = đèn - 20% (giống công thức hiện tại trong main.js), nhưng sửa được
// tự do cho từng mức. Lưu lại trong localStorage để không mất khi tải lại trang.
const STORAGE_KEY = "widgetOpacityLevels";
const STEPS = [100, 80, 60, 40, 20];

function defaultLevels() {
  return STEPS.map((step) => ({ step, dot: step, bg: Math.max(0, step - 20) }));
}

function loadLevels() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // đảm bảo đủ 5 mức kể cả khi format cũ bị thiếu field
      return STEPS.map((step) => {
        const found = saved.find((l) => l.step === step);
        return found ? { step, dot: found.dot, bg: found.bg } : { step, dot: step, bg: Math.max(0, step - 20) };
      });
    }
  } catch (e) { /* localStorage lỗi/không có -> dùng mặc định */ }
  return defaultLevels();
}

function saveLevels() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(levels)); } catch (e) { /* non-fatal */ }
}

let levels = loadLevels();
let activeStep = 100;

const levelConfigEl = document.getElementById("levelConfig");

function renderLevelConfig() {
  levelConfigEl.innerHTML = levels.map((l) => `
    <div class="level-row${l.step === activeStep ? " active" : ""}" data-step="${l.step}">
      <div class="level-btn" data-action="select">${l.step}%</div>
      <label>Đèn <input type="number" min="0" max="100" step="1" data-field="dot" value="${l.dot}"></label>
      <label>Nền <input type="number" min="0" max="100" step="1" data-field="bg" value="${l.bg}"></label>
    </div>
  `).join("");
}

function applyActiveLevel() {
  const level = levels.find((l) => l.step === activeStep);
  WidgetRender.applyOpacity(level.dot / 100, level.bg / 100);
  WidgetRender.applyState(refs, currentStatus, level.dot / 100, level.bg / 100);
}

levelConfigEl.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="select"]');
  if (!btn) return;
  activeStep = Number(btn.closest(".level-row").dataset.step);
  renderLevelConfig();
  applyActiveLevel();
});

levelConfigEl.addEventListener("input", (e) => {
  const input = e.target.closest("input[data-field]");
  if (!input) return;
  const row = input.closest(".level-row");
  const step = Number(row.dataset.step);
  const level = levels.find((l) => l.step === step);
  level[input.dataset.field] = Math.min(100, Math.max(0, Number(input.value) || 0));
  saveLevels();
  if (step === activeStep) applyActiveLevel();
});

function applyAll() {
  applyActiveLevel();
}

document.getElementById("modeRow").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-mode]");
  if (!btn) return;
  currentMode = Number(btn.dataset.mode);
  document.querySelectorAll("#modeRow button").forEach((b) => b.classList.toggle("active", b === btn));
  WidgetRender.applyMode(refs, currentMode);
});

document.getElementById("statusRow").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-status]");
  if (!btn) return;
  currentStatus = btn.dataset.status;
  document.querySelectorAll("#statusRow button").forEach((b) => b.classList.toggle("active", b === btn));
  applyAll();
});

document.getElementById("videoToggle").addEventListener("change", (e) => {
  document.getElementById("videoBg").classList.toggle("hidden", !e.target.checked);
});

WidgetRender.applyMode(refs, currentMode);
renderLevelConfig();
applyAll();
