/**
 * Popup：保存设置，向当前 Tab 的 content 发送开始/停止指令
 */
const TARGET_LANG_KEY = "targetLang";
const WS_URL_KEY = "wsUrl";

document.getElementById("targetLang").addEventListener("change", (e) => {
  chrome.storage.local.set({ [TARGET_LANG_KEY]: e.target.value });
});

document.getElementById("toggleBtn").addEventListener("click", async () => {
  const btn = document.getElementById("toggleBtn");
  const targetLang = document.getElementById("targetLang").value;
  const wsUrl = document.getElementById("wsUrl")?.value || "ws://localhost:8765/ws";

  chrome.storage.local.set({ [TARGET_LANG_KEY]: targetLang, [WS_URL_KEY]: wsUrl });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    alert("请先打开要捕获的标签页（如 Zoom/Teams 会议）");
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: "TOGGLE_CAPTURE",
    targetLang,
    wsUrl,
  }).then((res) => {
    if (res?.capturing) {
      btn.textContent = "停止捕获";
      btn.classList.add("active");
    } else {
      btn.textContent = "开始捕获";
      btn.classList.remove("active");
    }
  }).catch(() => {
    alert("请刷新会议页面后重试");
  });
});

// 初始化
chrome.storage.local.get([TARGET_LANG_KEY, WS_URL_KEY], (data) => {
  if (data[TARGET_LANG_KEY]) document.getElementById("targetLang").value = data[TARGET_LANG_KEY];
  if (data[WS_URL_KEY] && document.getElementById("wsUrl")) document.getElementById("wsUrl").value = data[WS_URL_KEY];
});
