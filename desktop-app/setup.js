const promptTextarea = document.getElementById("promptText");

window.trafficLight.getHooksJson().then((hooksJson) => {
  promptTextarea.value =
    'Hãy thêm các hooks sau vào file ~/.claude/settings.json của tôi (tạo file/thư mục nếu ' +
    'chưa có, GIỮ NGUYÊN các cấu hình khác đã có trong file, chỉ merge thêm object "hooks" ' +
    "bên dưới — nếu event nào đã có hook thì thêm nối vào mảng, đừng ghi đè). Sau khi xong, " +
    "nhắc tôi khởi động lại Claude Code.\n\n" +
    hooksJson;
});

document.getElementById("btnConnect").addEventListener("click", async () => {
  const resultEl = document.getElementById("connectResult");
  resultEl.textContent = "Đang xử lý...";
  resultEl.className = "result";
  const res = await window.trafficLight.connectClaude();
  if (res.success) {
    resultEl.textContent = `Đã kết nối thành công! (${res.path})`;
    resultEl.className = "result ok";
  } else {
    resultEl.textContent = `Không thành công (${res.reason || "lỗi không rõ"}). Thử Cách 2 hoặc Cách 3 bên dưới.`;
    resultEl.className = "result err";
  }
});

document.getElementById("btnShowScript").addEventListener("click", async () => {
  const scriptPath = await window.trafficLight.getScriptPath();
  window.trafficLight.showItemInFolder(scriptPath);
});

document.getElementById("btnCopyCmd").addEventListener("click", async () => {
  const scriptPath = await window.trafficLight.getScriptPath();
  window.trafficLight.copyText(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
  const resultEl = document.getElementById("scriptResult");
  resultEl.textContent = "Đã copy lệnh, dán vào PowerShell rồi Enter.";
  resultEl.className = "result ok";
});

document.getElementById("btnCopyPrompt").addEventListener("click", () => {
  window.trafficLight.copyText(promptTextarea.value);
  const resultEl = document.getElementById("promptResult");
  resultEl.textContent = "Đã copy, dán vào Claude Code.";
  resultEl.className = "result ok";
});
