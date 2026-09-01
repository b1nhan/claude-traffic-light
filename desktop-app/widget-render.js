// Logic render cụm đèn + nhãn — dùng chung giữa widget thật (renderer.js, chạy trong
// Electron qua IPC) và preview.html (sandbox chỉnh opacity qua Live Server, không có
// Electron/IPC). Chỉ thao tác DOM thuần, không đụng tới window.trafficLight ở đây.

const INFO = {
  waiting: { label: "CHỜ XÁC NHẬN", color: "#E08A72" },
  running: { label: "ĐANG CHẠY", color: "#D9A441" },
  done: { label: "XONG VIỆC", color: "#8FB57F" },
  idle: { label: "ĐANG NGHỈ", color: "#7E776B" },
};

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getRefs() {
  return {
    layoutFull: document.getElementById("layout-full"),
    layoutMinimal: document.getElementById("layout-minimal"),
    dotRed: document.getElementById("dot-red"),
    dotYellow: document.getElementById("dot-yellow"),
    dotGreen: document.getElementById("dot-green"),
    labelBox: document.getElementById("label-box"),
    statusLabel: document.getElementById("status-label"),
    dotMinimal: document.getElementById("dot-minimal"),
  };
}

function applyMode(refs, mode) {
  if (mode === 1) {
    refs.layoutFull.classList.remove("hidden");
    refs.layoutMinimal.classList.add("hidden");
    refs.labelBox.classList.remove("hidden");
  } else if (mode === 2) {
    refs.layoutFull.classList.remove("hidden");
    refs.layoutMinimal.classList.add("hidden");
    refs.labelBox.classList.add("hidden");
  } else if (mode === 3) {
    refs.layoutFull.classList.add("hidden");
    refs.layoutMinimal.classList.remove("hidden");
  }
}

// dotAlpha: opacity đèn + chữ. bgAlpha: opacity khung/nền (thường thấp hơn dotAlpha).
function applyState(refs, status, dotAlpha, bgAlpha) {
  const info = INFO[status] || INFO.idle;

  refs.dotRed.classList.toggle("on", status === "waiting");
  refs.dotYellow.classList.toggle("on", status === "running");
  refs.dotGreen.classList.toggle("on", status === "done");

  refs.statusLabel.textContent = info.label;
  refs.statusLabel.style.color = hexToRgba(info.color, dotAlpha);
  refs.labelBox.style.borderColor = hexToRgba(info.color, bgAlpha);

  const dotMinimalColor =
    status === "waiting" ? "#C6553F" :
    status === "running" ? "#D9A441" :
    status === "done" ? "#7A9E6B" : "#5C564C";
  refs.dotMinimal.style.background = dotMinimalColor;
}

function applyOpacity(dotAlpha, bgAlpha) {
  document.documentElement.style.setProperty("--dot-alpha", dotAlpha);
  document.documentElement.style.setProperty("--bg-alpha", bgAlpha);
}

window.WidgetRender = { INFO, hexToRgba, getRefs, applyMode, applyState, applyOpacity };
