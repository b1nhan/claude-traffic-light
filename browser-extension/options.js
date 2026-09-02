const DEFAULTS = { enabled: true, mode: 1, opacity: 1, position: "top-right" };

const toggleEl = document.getElementById("toggleEnabled");
const modePreviewsEl = document.querySelector(".mode-previews");
const opacityGridEl = document.getElementById("opacityGrid");
const opacityLabelEl = document.getElementById("opacityLabel");
const positionGridEl = document.getElementById("positionGrid");

async function save(patch) {
  const { widgetSettings } = await chrome.storage.local.get("widgetSettings");
  const next = { ...(widgetSettings || DEFAULTS), ...patch };
  await chrome.storage.local.set({ widgetSettings: next });
  return next;
}

function renderUI(s) {
  toggleEl.classList.toggle("on", s.enabled);
  toggleEl.classList.toggle("off", !s.enabled);

  modePreviewsEl.querySelectorAll(".mode-card").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.mode) === s.mode);
  });

  const step = Math.round((s.opacity ?? 1) * 5);
  opacityGridEl.querySelectorAll(".op-cell").forEach((cell) => {
    cell.classList.toggle("active", Number(cell.dataset.step) <= step);
  });
  opacityLabelEl.textContent = `${Math.round((s.opacity ?? 1) * 100)}%`;

  positionGridEl.querySelectorAll(".pos-cell").forEach((cell) => {
    cell.classList.toggle("active", cell.dataset.pos === s.position);
  });
}

toggleEl.addEventListener("click", async () => {
  const { widgetSettings } = await chrome.storage.local.get("widgetSettings");
  const next = await save({ enabled: !(widgetSettings || DEFAULTS).enabled });
  renderUI(next);
});

modePreviewsEl.addEventListener("click", async (e) => {
  const cell = e.target.closest(".mode-card");
  if (!cell) return;
  const next = await save({ mode: Number(cell.dataset.mode) });
  renderUI(next);
});

opacityGridEl.addEventListener("click", async (e) => {
  const cell = e.target.closest(".op-cell");
  if (!cell) return;
  const next = await save({ opacity: Number(cell.dataset.step) / 5 });
  renderUI(next);
});

positionGridEl.addEventListener("click", async (e) => {
  const cell = e.target.closest(".pos-cell");
  if (!cell) return;
  const next = await save({ position: cell.dataset.pos });
  renderUI(next);
});

chrome.storage.local.get("widgetSettings").then(({ widgetSettings }) => {
  renderUI(widgetSettings || DEFAULTS);
});
