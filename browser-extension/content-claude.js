// Theo dõi trực tiếp DOM của claude.ai — không cần server local. Chỉ chạy trên
// claude.ai (xem manifest.json). Gửi trạng thái lên background qua
// chrome.runtime.sendMessage; background gộp trạng thái từ mọi tab claude.ai
// đang mở rồi cập nhật icon + widget (giống hệt cơ chế cũ, chỉ đổi nguồn dữ liệu).
//
// ponytail: heuristic dựa trên aria-label/text hiện tại của claude.ai, không có
// API chính thức để đọc trạng thái generate. Nếu Anthropic đổi UI, cập nhật lại
// các regex bên dưới (STOP_RE / NEED_INPUT_RE).

(() => {
  const STOP_RE = /stop (response|generating|streaming)/i;
  // Nút xin quyền (tool/connector permission) HOẶC banner "cần input" — không
  // còn giới hạn trong [role=dialog] vì claude.ai cũng hiện dạng banner/inline.
  const NEED_INPUT_RE =
    /\ballow\b|\bapprove\b|\bdeny\b|needs? (your )?(input|permission|confirmation|response)|waiting for (your )?(input|response)|cho phép|xác nhận|cần (bạn )?(xác nhận|nhập|phản hồi)/i;

  let lastStatus = null;

  function isGenerating() {
    return Array.from(document.querySelectorAll("button[aria-label]")).some((b) =>
      STOP_RE.test(b.getAttribute("aria-label") || ""),
    );
  }

  // Nút bấm khớp regex (Allow/Approve/Deny/Cho phép...) ở bất kỳ đâu trên trang.
  function hasMatchingButton() {
    return Array.from(document.querySelectorAll('button, [role="button"]')).some((b) =>
      NEED_INPUT_RE.test((b.textContent || "").trim()),
    );
  }

  // Banner/chip trạng thái dạng text ngắn (vd "Needs your input") — giới hạn độ
  // dài để không match nhầm vào nội dung tin nhắn dài của cuộc hội thoại.
  function hasMatchingBanner() {
    return Array.from(document.querySelectorAll("div, span, p")).some((el) => {
      if (el.children.length > 0) return false; // chỉ xét node lá
      const text = (el.textContent || "").trim();
      return text.length > 0 && text.length <= 80 && NEED_INPUT_RE.test(text);
    });
  }

  // claude.ai đổi document.title (vd "Need inputs...") khi cần người dùng phản
  // hồi — tab observer ở body không bắt được thay đổi trong <head>, nên check riêng.
  function isTitleWaiting() {
    return NEED_INPUT_RE.test(document.title || "");
  }

  function isWaitingConfirmation() {
    return isTitleWaiting() || hasMatchingButton() || hasMatchingBanner();
  }

  function detect() {
    if (isWaitingConfirmation()) return "waiting";
    if (isGenerating()) return "running";
    return "idle_or_done";
  }

  function report() {
    const raw = detect();
    let next;
    if (raw === "waiting" || raw === "running") {
      next = raw;
    } else {
      // idle_or_done: giữ nguyên trạng thái cuối (done ở lại "done" cho tới khi
      // có hoạt động mới — không tự revert theo timer).
      next = lastStatus === "running" || lastStatus === "waiting" ? "done" : lastStatus || "idle";
    }
    if (next !== lastStatus) {
      lastStatus = next;
      chrome.runtime.sendMessage({ type: "claude-status", status: next }).catch(() => {});
    }
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      report();
    }, 200);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "disabled", "aria-disabled"],
  });

  // <title> nằm trong <head>, ngoài phạm vi observer ở body — theo dõi riêng.
  const titleObserver = new MutationObserver(schedule);
  titleObserver.observe(document.head, { childList: true, subtree: true, characterData: true });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "request-claude-status") report();
  });

  report();
})();
