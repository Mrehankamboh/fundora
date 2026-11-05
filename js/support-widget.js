/* Fundora floating support widget — FO / Intercom layout on full site pages */
(function () {
  if (document.querySelector(".fw-root")) return;

  const params = new URLSearchParams(window.location.search);
  const wantOpen = () =>
    document.body.hasAttribute("data-support-open") ||
    params.get("support") === "1" ||
    params.get("support") === "open" ||
    /#support\b/i.test(window.location.hash);

  const root = document.createElement("div");
  root.className = "fw-root";
  root.innerHTML = `
    <div class="fw-panel" id="fwPanel" role="dialog" aria-label="Fundora support" aria-hidden="true">
      <header class="fw-head">
        <a class="fw-brand" href="index.html"><span class="fw-mark" aria-hidden="true"></span>Fundora</a>
        <button class="fw-close" type="button" id="fwClose" aria-label="Close chat">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </header>
      <div class="fw-body">
        <section class="fw-view fw-home is-active" data-view="home">
          <h2 class="fw-hello"><span>Hi there 👋</span><span>How can we help?</span></h2>
          <button class="fw-cta" type="button" id="fwStartChat">
            <span>
              <strong>Send us a message</strong>
              <small>Chat with the team right here</small>
            </span>
            <span class="fw-cta-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </span>
          </button>
        </section>
        <section class="fw-view fw-messages" data-view="messages">
          <ul class="fw-thread" id="fwThread" aria-live="polite">
            <li class="fw-bubble fw-agent">
              <p>Hi — welcome to Fundora support. Ask about challenges, rewards, or your account.</p>
              <time>Now</time>
            </li>
          </ul>
          <form class="fw-form" id="fwForm">
            <label class="sr-only" for="fwInput">Message</label>
            <input id="fwInput" type="text" placeholder="Write a reply…" autocomplete="off" required />
            <button class="fw-send" type="submit" aria-label="Send message">
              <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </form>
        </section>
      </div>
      <nav class="fw-tabs" aria-label="Widget sections">
        <button class="fw-tab is-active" type="button" data-tab="home" aria-current="page">
          <svg viewBox="0 0 24 24"><path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z"/></svg>
          Home
        </button>
        <button class="fw-tab" type="button" data-tab="messages">
          <svg viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm3 4v2h10V9H7zm0 4v2h7v-2H7z"/></svg>
          Messages
        </button>
      </nav>
    </div>
    <button class="fw-launcher" type="button" id="fwLauncher" aria-label="Open support chat" aria-expanded="false">
      <svg class="fw-ico-chat" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15A1.5 1.5 0 0 1 21 7v9a1.5 1.5 0 0 1-1.5 1.5H9.2L5 21v-3.5H4.5A1.5 1.5 0 0 1 3 16V7a1.5 1.5 0 0 1 1.5-1.5zm2.2 4.2v1.8h10.6V9.7H6.7zm0 3.6v1.8h7.4v-1.8H6.7z"/></svg>
    </button>
  `;

  if (!document.getElementById("fw-sr-only")) {
    const style = document.createElement("style");
    style.id = "fw-sr-only";
    style.textContent =
      ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}";
    document.head.appendChild(style);
  }

  document.body.appendChild(root);

  const panel = root.querySelector("#fwPanel");
  const launcher = root.querySelector("#fwLauncher");
  const closeBtn = root.querySelector("#fwClose");
  const startChat = root.querySelector("#fwStartChat");
  const tabs = root.querySelectorAll(".fw-tab");
  const views = root.querySelectorAll(".fw-view");
  const thread = root.querySelector("#fwThread");
  const form = root.querySelector("#fwForm");
  const input = root.querySelector("#fwInput");

  const setOpen = (open) => {
    panel.classList.toggle("is-open", open);
    launcher.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    launcher.setAttribute("aria-label", "Open support chat");
    launcher.hidden = !!open;
  };

  const setView = (name) => {
    views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.classList.toggle("is-active", on);
      if (on) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    if (name === "messages") window.setTimeout(() => input.focus(), 120);
  };

  window.FundoraSupport = {
    open: () => {
      setOpen(true);
      setView("home");
    },
    close: () => setOpen(false),
    messages: () => {
      setOpen(true);
      setView("messages");
    },
  };

  launcher.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
  closeBtn.addEventListener("click", () => setOpen(false));
  startChat.addEventListener("click", () => setView("messages"));
  tabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.tab)));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) setOpen(false);
  });

  document.querySelectorAll('[href="support.html"], [data-open-support]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      setOpen(true);
      setView("home");
    });
  });

  const replies = [
    "Thanks — a Fundora specialist will reply shortly during support hours.",
    "You can also check Challenges and FAQ on the homepage while you wait.",
    "For account access issues, use Forgot password or email support@fundora.com.",
  ];
  let replyIndex = 0;

  const escapeHtml = (value) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const addBubble = (text, who) => {
    const li = document.createElement("li");
    li.className = `fw-bubble fw-${who}`;
    li.innerHTML = `<p>${escapeHtml(text)}</p><time>${new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}</time>`;
    thread.appendChild(li);
    thread.scrollTop = thread.scrollHeight;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addBubble(text, "user");
    input.value = "";
    window.setTimeout(() => {
      addBubble(replies[replyIndex % replies.length], "agent");
      replyIndex += 1;
    }, 700);
  });

  const bootOpen = () => {
    if (!wantOpen()) return;
    setOpen(true);
    setView("home");
  };

  bootOpen();
  window.addEventListener("hashchange", bootOpen);
  window.setTimeout(bootOpen, 0);
})();
