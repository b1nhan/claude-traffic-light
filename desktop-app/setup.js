const promptTextarea = document.getElementById("promptText");

// Load hooks configuration for Step 3
window.trafficLight.getHooksJson().then((hooksJson) => {
  promptTextarea.value =
    'Hãy thêm các hooks sau vào file ~/.claude/settings.json của tôi (tạo file/thư mục nếu ' +
    'chưa có, GIỮ NGUYÊN các cấu hình khác đã có trong file, chỉ merge thêm object "hooks" ' +
    "bên dưới — nếu event nào đã có hook thì thêm nối vào mảng, đừng ghi đè). Sau khi xong, " +
    "nhắc tôi khởi động lại Claude Code.\n\n" +
    hooksJson;
});

// Step 1: Tự động kết nối
document.getElementById("btnConnect").addEventListener("click", async () => {
  const resultEl = document.getElementById("connectResult");
  const dotEl = document.getElementById("connectResultDot");
  resultEl.textContent = "Đang xử lý...";
  dotEl.classList.add("hidden");
  const res = await window.trafficLight.connectClaude();
  if (res.success) {
    resultEl.textContent = `Kết nối xong rồi! (${res.path})`;
    resultEl.style.color = "#5E7A50";
    dotEl.classList.remove("hidden");
    dotEl.style.background = "#7A9E6B";
  } else {
    resultEl.textContent = `Chưa được (${res.reason || "lỗi không rõ"}) — thử Cách 2 hoặc Cách 3 bên dưới nhé.`;
    resultEl.style.color = "#C6553F";
    dotEl.classList.remove("hidden");
    dotEl.style.background = "#C6553F";
  }
});

// Step 2: Script PowerShell
document.getElementById("btnShowScript").addEventListener("click", async () => {
  const scriptPath = await window.trafficLight.getScriptPath();
  window.trafficLight.showItemInFolder(scriptPath);
});

document.getElementById("btnCopyCmd").addEventListener("click", async () => {
  const scriptPath = await window.trafficLight.getScriptPath();
  window.trafficLight.copyText(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
  const resultEl = document.getElementById("scriptResult");
  resultEl.textContent = "Copy xong rồi, dán vào PowerShell rồi Enter là chạy.";
  setTimeout(() => resultEl.textContent = "", 3000);
});

// Step 3: Copy Prompt
document.getElementById("btnCopyPrompt").addEventListener("click", () => {
  window.trafficLight.copyText(promptTextarea.value);
  const resultEl = document.getElementById("promptResult");
  resultEl.textContent = "Copy xong rồi, dán vào Claude Code là được.";
  setTimeout(() => resultEl.textContent = "", 3000);
});

// Accordion Logic
function setupAccordion(id) {
  const head = document.getElementById(`acc${id}-head`);
  const body = document.getElementById(`acc${id}-body`);
  const icon = document.getElementById(`acc${id}-icon`);
  head.addEventListener('click', () => {
    const isHidden = body.classList.contains('hidden');
    // Hide all
    for (let i = 1; i <= 3; i++) {
      document.getElementById(`acc${i}-body`).classList.add('hidden');
      document.getElementById(`acc${i}-icon`).textContent = "▶";
    }
    // Toggle current
    if (isHidden) {
      body.classList.remove('hidden');
      icon.textContent = "▼";
    }
  });
}
setupAccordion(1);
setupAccordion(2);
setupAccordion(3);

// Mode Tabs Logic
const OFF = { red: "#4A3B37", yellow: "#463D2C", green: "#334030" };
const ON = { red: "#C6553F", yellow: "#D9A441", green: "#7A9E6B" };
const INFO = {
  waiting: { label: "CHỜ XÁC NHẬN", color: "#E08A72" },
  running: { label: "ĐANG CHẠY", color: "#D9A441" },
  done: { label: "XONG VIỆC", color: "#8FB57F" },
  idle: { label: "ĐANG NGHỈ", color: "#7E776B" },
};
const MODE_DESCS = [
  "3 ô đèn kèm nhãn trạng thái. Đây là dáng widget sẽ nằm trên desktop của bạn.",
  "Vẫn 3 ô đèn nhưng bỏ chữ cho gọn — rê chuột vào là thấy trạng thái ngay.",
  "Chỉ còn 1 ô đèn đổi màu. Nhỏ gọn nhất, hợp lúc màn hình đang chật chỗ."
];

let currentMode = 1;
let currentPreviewStatus = "waiting";

function updateMode(mode) {
  currentMode = mode;
  // Update Tab active state
  for (let i = 1; i <= 3; i++) {
    const tab = document.getElementById(`tab-mode-${i}`);
    if (i === mode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
    
    // Update preview visibility
    const preview = document.getElementById(`preview-mode-${i}`);
    if (i === mode) {
      preview.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
    }
  }
  
  // Update description
  document.getElementById("mode-desc").textContent = MODE_DESCS[mode - 1];
  
  // Update backend (if full feature supported)
  if (window.trafficLight && window.trafficLight.setMode) {
    window.trafficLight.setMode(mode);
  }
}

document.getElementById("tab-mode-1").addEventListener('click', () => updateMode(1));
document.getElementById("tab-mode-2").addEventListener('click', () => updateMode(2));
document.getElementById("tab-mode-3").addEventListener('click', () => updateMode(3));

// Preview Status Update Logic (Test buttons)
function updatePreviewStatus(status) {
  currentPreviewStatus = status;
  const info = INFO[status] || INFO.idle;

  // Mode 1 updates
  document.getElementById("m1-dot-red").style.background = status === "waiting" ? ON.red : OFF.red;
  document.getElementById("m1-dot-yellow").style.background = status === "running" ? ON.yellow : OFF.yellow;
  document.getElementById("m1-dot-green").style.background = status === "done" ? ON.green : OFF.green;

  const m1LabelBox = document.getElementById("m1-label-box");
  const m1Label = document.getElementById("m1-label");
  m1LabelBox.style.borderColor = info.color;
  m1Label.style.color = info.color;
  m1Label.textContent = info.label;

  // Mode 2 updates
  document.getElementById("m2-dot-red").style.background = status === "waiting" ? ON.red : OFF.red;
  document.getElementById("m2-dot-yellow").style.background = status === "running" ? ON.yellow : OFF.yellow;
  document.getElementById("m2-dot-green").style.background = status === "done" ? ON.green : OFF.green;

  // Mode 3 updates
  const activeColor = status === "waiting" ? ON.red : (status === "running" ? ON.yellow : (status === "done" ? ON.green : "#5C564C"));
  document.getElementById("m3-dot").style.background = activeColor;

  // Test button selected state
  document.getElementById("test-red").classList.toggle("selected", status === "waiting");
  document.getElementById("test-yellow").classList.toggle("selected", status === "running");
  document.getElementById("test-green").classList.toggle("selected", status === "done");
}

document.getElementById("test-red").addEventListener('click', () => updatePreviewStatus('waiting'));
document.getElementById("test-yellow").addEventListener('click', () => updatePreviewStatus('running'));
document.getElementById("test-green").addEventListener('click', () => updatePreviewStatus('done'));

// Nút thứ 4: đồng bộ preview về đúng trạng thái thật hiện tại của Claude
document.getElementById("test-sync").addEventListener('click', () => {
  window.trafficLight && window.trafficLight.requestCurrentState();
});

// Widget Settings — Luôn nổi / Độ mờ / Vị trí
const toggleTopEl = document.getElementById("toggleTop");
const opacityGridEl = document.getElementById("opacityGrid");
const opacityLabelEl = document.getElementById("opacityLabel");
const positionGridEl = document.getElementById("positionGrid");

function setToggleUI(on) {
  toggleTopEl.classList.toggle("on", on);
  toggleTopEl.classList.toggle("off", !on);
}

function setOpacityUI(opacity) {
  const step = Math.round((opacity || 1) * 5);
  opacityGridEl.querySelectorAll(".op-cell").forEach((cell) => {
    cell.classList.toggle("active", Number(cell.dataset.step) <= step);
  });
  opacityLabelEl.textContent = `${Math.round((opacity || 1) * 100)}%`;
}

function setPositionUI(position) {
  positionGridEl.querySelectorAll(".pos-grid-cell").forEach((cell) => {
    cell.classList.toggle("active", cell.dataset.pos === position);
  });
}

toggleTopEl.addEventListener("click", () => {
  const next = !toggleTopEl.classList.contains("on");
  setToggleUI(next);
  window.trafficLight && window.trafficLight.setAlwaysOnTop(next);
});

opacityGridEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".op-cell");
  if (!cell) return;
  const opacity = Number(cell.dataset.step) / 5;
  setOpacityUI(opacity);
  window.trafficLight && window.trafficLight.setOpacity(opacity);
});

positionGridEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".pos-grid-cell");
  if (!cell) return;
  setPositionUI(cell.dataset.pos);
  window.trafficLight && window.trafficLight.setPosition(cell.dataset.pos);
});

// Sync initial mode + widget settings from backend
if (window.trafficLight) {
  window.trafficLight.onModeUpdate && window.trafficLight.onModeUpdate((mode) => {
    updateMode(mode);
  });
  window.trafficLight.onStateUpdate && window.trafficLight.onStateUpdate((state) => {
    updatePreviewStatus(state.status || "idle");
  });
  window.trafficLight.requestCurrentState && window.trafficLight.requestCurrentState();
  window.trafficLight.getWidgetSettings && window.trafficLight.getWidgetSettings().then((settings) => {
    setToggleUI(settings.alwaysOnTop);
    setOpacityUI(settings.opacity);
    setPositionUI(settings.position);
  });
}
