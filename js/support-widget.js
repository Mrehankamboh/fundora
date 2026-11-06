/* Fundora floating support widget — live Neon tickets ↔ admin Call desk */
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
        <a class="fw-brand" href="/index.html"><img class="fw-mark" src="/images/logo-fundora.jpg" alt="" width="22" height="22" />Fundora</a>
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
          <ul class="fw-thread" id="fwThread" aria-live="polite"></ul>
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

  const STORAGE_KEY = "fundora_support_ticket";
  const GREETING =
    "Hi — welcome to Fundora support. Ask about challenges, rewards, or your account.";
  let ticketId = "";
  let visitorKey = "";
  let knownIds = new Set();
  let pollTimer = null;
  let sending = false;

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && saved.ticketId) {
      ticketId = String(saved.ticketId);
      visitorKey = String(saved.visitorKey || "");
    }
  } catch (_) {
    /* ignore */
  }

  const setOpen = (open) => {
    panel.classList.toggle("is-open", open);
    launcher.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    launcher.setAttribute("aria-label", "Open support chat");
    launcher.hidden = !!open;
    if (open) syncMessages(true);
  };

  const setView = (name) => {
    views.forEach((view) =>
      view.classList.toggle("is-active", view.dataset.view === name)
    );
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.classList.toggle("is-active", on);
      if (on) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    if (name === "messages") {
      window.setTimeout(() => input.focus(), 120);
      syncMessages(true);
    }
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

  launcher.addEventListener("click", () =>
    setOpen(!panel.classList.contains("is-open"))
  );
  closeBtn.addEventListener("click", () => setOpen(false));
  startChat.addEventListener("click", () => setView("messages"));
  tabs.forEach((tab) =>
    tab.addEventListener("click", () => setView(tab.dataset.tab))
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) setOpen(false);
  });

  document
    .querySelectorAll('[href="support.html"], [data-open-support]')
    .forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        setOpen(true);
        setView("home");
      });
    });

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const stamp = (value) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const addBubble = (text, who, meta) => {
    const id = meta && meta.id ? String(meta.id) : "";
    if (id && knownIds.has(id)) return;
    if (id) knownIds.add(id);
    const li = document.createElement("li");
    li.className = `fw-bubble fw-${who}`;
    if (id) li.dataset.msgId = id;
    li.innerHTML = `<p>${escapeHtml(text)}</p><time>${stamp(
      meta && meta.createdAt
    )}</time>`;
    thread.appendChild(li);
    thread.scrollTop = thread.scrollHeight;
  };

  const showGreeting = () => {
    thread.innerHTML = "";
    knownIds = new Set();
    addBubble(GREETING, "agent");
  };

  const persistTicket = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ticketId, visitorKey })
      );
    } catch (_) {
      /* ignore */
    }
  };

  const renderMessages = (messages) => {
    const list = Array.isArray(messages) ? messages : [];
    if (!list.length) {
      if (!thread.children.length) showGreeting();
      return;
    }
    const nextIds = new Set(list.map((m) => String(m.id)));
    const changed =
      nextIds.size !== knownIds.size ||
      [...nextIds].some((id) => !knownIds.has(id));
    if (!changed && thread.children.length) return;

    thread.innerHTML = "";
    knownIds = new Set();
    list.forEach((m) => {
      addBubble(m.body, m.author === "admin" ? "agent" : "user", {
        id: m.id,
        createdAt: m.createdAt,
      });
    });
  };

  const syncMessages = async (force) => {
    if (!ticketId) {
      if (force || !thread.children.length) showGreeting();
      return;
    }
    try {
      const q = new URLSearchParams({ id: ticketId });
      if (visitorKey) q.set("visitorKey", visitorKey);
      const res = await fetch(`/api/tickets?${q}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (force) showGreeting();
        return;
      }
      renderMessages(data.messages || []);
    } catch (_) {
      if (force && !thread.children.length) showGreeting();
    }
  };

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = window.setInterval(() => {
      if (!ticketId) return;
      if (
        document.hidden &&
        !panel.classList.contains("is-open")
      )
        return;
      syncMessages(false);
    }, 4000);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;
    sending = true;
    addBubble(text, "user");
    input.value = "";
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticketId || undefined,
          visitorKey: visitorKey || undefined,
          message: text,
          subject: "Website support",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        addBubble(data.error || "Could not send — try again shortly.", "agent");
        return;
      }
      ticketId = String(data.ticketId || ticketId);
      if (data.visitorKey) visitorKey = String(data.visitorKey);
      persistTicket();
      startPolling();
      await syncMessages(true);
    } catch (_) {
      addBubble("Network error — please try again.", "agent");
    } finally {
      sending = false;
    }
  });

  showGreeting();
  if (ticketId) {
    syncMessages(true);
    startPolling();
  }

  const bootOpen = () => {
    if (!wantOpen()) return;
    setOpen(true);
    setView("home");
  };

  bootOpen();
  window.addEventListener("hashchange", bootOpen);
  window.setTimeout(bootOpen, 0);
})();
