/**
 * Content Script：捕获 Tab 音频，WebSocket 连接后端，展示字幕
 */
(function () {
  let ws = null;
  let mediaRecorder = null;
  let stream = null;
  let capturing = false;

  function ensureOverlay() {
    let el = document.getElementById("realtime-subtitle-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "realtime-subtitle-overlay";
      document.body.appendChild(el);
    }
    return el;
  }

  function showSubtitle(text) {
    const el = ensureOverlay();
    el.textContent = text;
    el.classList.add("visible");
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove("visible"), 5000);
  }

  function stopCapture() {
    capturing = false;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    ws = null;
    mediaRecorder = null;
  }

  async function startCapture(targetLang, wsUrl) {
    if (capturing) {
      stopCapture();
      return false;
    }

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
    } catch (e) {
      showSubtitle("未选择共享源，请重试");
      return false;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      showSubtitle("未捕获到音频");
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }

    capturing = true;
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "config", targetLang }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "subtitle" && msg.translated) {
          showSubtitle(msg.translated);
        }
      } catch (_) {}
    };
    ws.onerror = () => showSubtitle("连接后端失败，请确认服务已启动");
    ws.onclose = () => stopCapture();

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 16000 });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = btoa(
            new Uint8Array(reader.result).reduce((s, b) => s + String.fromCharCode(b), "")
          );
          ws.send(JSON.stringify({ type: "audio", data: base64 }));
        };
        reader.readAsArrayBuffer(e.data);
      }
    };

    mediaRecorder.start(3000); // 每 3 秒一个 chunk
    showSubtitle("字幕已开启");
    return true;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "TOGGLE_CAPTURE") {
      if (capturing) {
        stopCapture();
        sendResponse({ capturing: false });
      } else {
        startCapture(msg.targetLang || "zh", msg.wsUrl || "ws://localhost:8765/ws").then(
          (ok) => sendResponse({ capturing: ok })
        );
      }
      return true; // 保持通道开放以支持异步 sendResponse
    }
  });
})();
