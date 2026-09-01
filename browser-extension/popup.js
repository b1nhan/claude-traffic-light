const LABELS = {
  idle: "Chưa hoạt động",
  running: "Claude Code đang chạy",
  waiting: "Chờ xác nhận",
  done: "Task đã xong",
};

const dot = document.getElementById("dot");
const title = document.getElementById("title");
const message = document.getElementById("message");

function render(state) {
  const status = state.status || "idle";
  dot.className = "dot " + status;
  title.textContent = LABELS[status] || status;
  message.textContent = state.message || "";
}

async function load() {
  try {
    const res = await fetch("http://localhost:7317/status");
    const state = await res.json();
    render(state);
  } catch (e) {
    title.textContent = "Không kết nối được server";
    message.textContent = "Hãy chắc chắn server đang chạy ở port 7317";
  }
}

load();
