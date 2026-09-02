const LABELS = {
  idle: "Chưa hoạt động",
  running: "Claude đang trả lời",
  waiting: "Chờ xác nhận",
  done: "Đã xong",
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

chrome.storage.local.get("lastState").then(({ lastState }) => {
  render(lastState || { status: "idle" });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.lastState) render(changes.lastState.newValue);
});

document.getElementById("openOptions").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
