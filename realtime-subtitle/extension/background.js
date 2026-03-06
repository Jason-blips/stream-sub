/**
 * Service Worker：在 popup 与 content 之间转发消息
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "RELAY_TO_CONTENT") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, msg.payload).then(sendResponse).catch(() => sendResponse({ ok: false }));
      } else {
        sendResponse({ ok: false });
      }
    });
    return true; // 异步 sendResponse
  }
});
