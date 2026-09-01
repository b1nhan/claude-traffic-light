const layoutFull = document.getElementById("layout-full");
const layoutMinimal = document.getElementById("layout-minimal");

const dotRed = document.getElementById("dot-red");
const dotYellow = document.getElementById("dot-yellow");
const dotGreen = document.getElementById("dot-green");
const labelBox = document.getElementById("label-box");
const statusLabel = document.getElementById("status-label");

const dotMinimal = document.getElementById("dot-minimal");

const INFO = {
  waiting: { label: "CHỜ XÁC NHẬN", color: "#E08A72" },
  running: { label: "ĐANG CHẠY", color: "#D9A441" },
  done: { label: "XONG VIỆC", color: "#8FB57F" },
  idle: { label: "CHƯA HOẠT ĐỘNG", color: "#7E776B" },
};

let currentStatus = "idle";
let currentMode = 1;

function updateModeUI() {
  if (currentMode === 1) {
    layoutFull.classList.remove("hidden");
    layoutMinimal.classList.add("hidden");
    labelBox.classList.remove("hidden");
  } else if (currentMode === 2) {
    layoutFull.classList.remove("hidden");
    layoutMinimal.classList.add("hidden");
    labelBox.classList.add("hidden");
  } else if (currentMode === 3) {
    layoutFull.classList.add("hidden");
    layoutMinimal.classList.remove("hidden");
  }
}

function renderState() {
  const info = INFO[currentStatus] || INFO.idle;
  
  // Mode 1 & 2
  dotRed.classList.toggle("on", currentStatus === "waiting");
  dotYellow.classList.toggle("on", currentStatus === "running");
  dotGreen.classList.toggle("on", currentStatus === "done");
  
  // Mode 1 Label
  statusLabel.textContent = info.label;
  statusLabel.style.color = info.color;
  
  // Mode 3
  if (currentStatus === "waiting") {
    dotMinimal.style.background = "#C6553F"; // ON.red
  } else if (currentStatus === "running") {
    dotMinimal.style.background = "#D9A441"; // ON.yellow
  } else if (currentStatus === "done") {
    dotMinimal.style.background = "#7A9E6B"; // ON.green
  } else {
    dotMinimal.style.background = "#5C564C"; // Idle
  }
}

window.trafficLight.onStateUpdate((state) => {
  currentStatus = state.status || "idle";
  renderState();
});

window.trafficLight.onModeUpdate && window.trafficLight.onModeUpdate((mode) => {
  currentMode = mode;
  updateModeUI();
});

// Initial requests
window.trafficLight.requestCurrentState();
