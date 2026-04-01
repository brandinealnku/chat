(() => {
  const script = document.currentScript;
  const chatbotName = script?.dataset?.chatbot || "itsbad-chat";
  const projectId = script?.dataset?.projectId || "demo-project";

  const launcher = document.createElement("button");
  launcher.textContent = "Chat";
  Object.assign(launcher.style, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: 999999,
    border: "0",
    borderRadius: "999px",
    padding: "14px 18px",
    fontFamily: "Inter, sans-serif",
    fontWeight: "800",
    cursor: "pointer",
    color: "white",
    background: "linear-gradient(135deg, #ff66c4, #3a3b78)",
    boxShadow: "0 12px 24px rgba(240,76,180,.24)"
  });

  const panel = document.createElement("div");
  Object.assign(panel.style, {
    position: "fixed",
    right: "20px",
    bottom: "84px",
    width: "340px",
    maxWidth: "calc(100vw - 32px)",
    height: "480px",
    background: "white",
    border: "1px solid rgba(58,59,120,.12)",
    borderRadius: "20px",
    boxShadow: "0 16px 40px rgba(58,59,120,.12)",
    overflow: "hidden",
    display: "none",
    zIndex: 999999,
    fontFamily: "Inter, sans-serif"
  });

  panel.innerHTML = `
    <div style="padding:14px 16px;background:linear-gradient(135deg,#ff66c4,#3a3b78);color:white;font-weight:800;display:flex;justify-content:space-between;align-items:center;">
      <span>${chatbotName}</span>
      <button id="itsbad-widget-close" style="background:transparent;border:0;color:white;font-size:18px;cursor:pointer;">×</button>
    </div>
    <div id="itsbad-widget-thread" style="padding:14px;height:360px;overflow:auto;background:#fff9fd;display:grid;gap:10px;align-content:start;">
      <div style="max-width:85%;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,#ff66c4,#3a3b78);color:white;">Hi — I’m your AI assistant for project ${projectId}. Connect me to your backend to make this live.</div>
    </div>
    <div style="padding:12px;border-top:1px solid rgba(58,59,120,.08);display:flex;gap:8px;">
      <input id="itsbad-widget-input" type="text" placeholder="Ask a question..." style="flex:1;min-height:44px;border:1px solid rgba(58,59,120,.12);border-radius:12px;padding:0 12px;outline:none;" />
      <button id="itsbad-widget-send" style="border:0;border-radius:12px;padding:0 14px;font-weight:800;cursor:pointer;color:white;background:linear-gradient(135deg,#ff66c4,#3a3b78);">Send</button>
    </div>
  `;

  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  const closeBtn = panel.querySelector("#itsbad-widget-close");
  const input = panel.querySelector("#itsbad-widget-input");
  const send = panel.querySelector("#itsbad-widget-send");
  const thread = panel.querySelector("#itsbad-widget-thread");

  function bubble(message, role = "bot") {
    const el = document.createElement("div");
    el.textContent = message;
    Object.assign(el.style, {
      maxWidth: "85%",
      padding: "12px 14px",
      borderRadius: "16px",
      lineHeight: "1.5",
      fontSize: "14px",
      justifySelf: role === "user" ? "end" : "start",
      background: role === "user" ? "rgba(58,59,120,.08)" : "linear-gradient(135deg,#ff66c4,#3a3b78)",
      color: role === "user" ? "#3a3b78" : "white"
    });
    thread.appendChild(el);
    thread.scrollTop = thread.scrollHeight;
  }

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    bubble(text, "user");
    input.value = "";
    setTimeout(() => bubble("This is the demo widget response. Wire this to your chat endpoint for live answers."), 400);
  }

  launcher.addEventListener("click", () => { panel.style.display = panel.style.display === "none" ? "block" : "none"; });
  closeBtn.addEventListener("click", () => { panel.style.display = "none"; });
  send.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
})();
