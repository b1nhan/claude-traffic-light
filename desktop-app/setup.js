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
    resultEl.textContent = `Đã kết nối thành công! (${res.path})`;
    resultEl.style.color = "#5E7A50";
    dotEl.classList.remove("hidden");
    dotEl.style.background = "#7A9E6B";
  } else {
    resultEl.textContent = `Không thành công (${res.reason || "lỗi không rõ"}).`;
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
  resultEl.textContent = "Đã copy lệnh, dán vào PowerShell rồi Enter.";
  setTimeout(() => resultEl.textContent = "", 3000);
});

// Step 3: Copy Prompt
document.getElementById("btnCopyPrompt").addEventListener("click", () => {
  window.trafficLight.copyText(promptTextarea.value);
  const resultEl = document.getElementById("promptResult");
  resultEl.textContent = "Đã copy, dán vào Claude Code.";
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
  idle: { label: "CHƯA HOẠT ĐỘNG", color: "#7E776B" },
};
const MODE_DESCS = [
  "Đầy đủ — 3 ô đèn kèm nhãn trạng thái. Đây chính là widget sẽ hiện trên desktop.",
  "Gọn — 3 ô đèn, không chữ. Rê chuột lên widget vẫn hiện tooltip trạng thái.",
  "Tối giản — 1 ô đèn duy nhất đổi màu, chiếm ít chỗ nhất khi làm việc."
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
  const info = INFO[status];
  
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
}

document.getElementById("test-red").addEventListener('click', () => updatePreviewStatus('waiting'));
document.getElementById("test-yellow").addEventListener('click', () => updatePreviewStatus('running'));
document.getElementById("test-green").addEventListener('click', () => updatePreviewStatus('done'));
document.getElementById("test-idle").addEventListener('click', () => updatePreviewStatus('idle'));

// Sync initial mode from backend if possible
if (window.trafficLight && window.trafficLight.requestCurrentState) {
    window.trafficLight.onModeUpdate && window.trafficLight.onModeUpdate((mode) => {
        updateMode(mode);
    });
}
