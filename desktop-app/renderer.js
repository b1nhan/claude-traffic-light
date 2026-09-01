const dot = document.getElementById("dot");
const title = document.getElementById("title");
const message = document.getElementById("message");

const LABELS = {
  idle: "Chưa hoạt động",
  running: "Claude Code đang chạy",
  waiting: "Chờ xác nhận",
  done: "Task đã xong",
};

function render(state) {
  const status = state.status || "idle";
  dot.className = "dot " + status;
  title.textContent = LABELS[status] || status;
  message.textContent = state.message || "";
}

window.trafficLight.onStateUpdate(render);
window.trafficLight.requestCurrentState();
