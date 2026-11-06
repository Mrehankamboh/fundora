/* Fundora portal — Neon session + shared shell */
(function () {
  const NAV = [
    { id: "dashboard", href: "/portal/index.html", label: "Dashboard", icon: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/>' },
    { id: "challenges", href: "/portal/challenges.html", label: "Challenges", icon: '<path d="M4 19h16M7 16V9m5 7V5m5 11v-4"/>' },
    { id: "rewards", href: "/portal/rewards.html", label: "Rewards", icon: '<path d="M12 3v18M7 8h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8"/>' },
    { id: "platforms", href: "/portal/platforms.html", label: "Platforms", icon: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>' },
    { id: "rules", href: "/portal/rules.html", label: "Rules", icon: '<path d="M7 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2z"/>' },
    { id: "billing", href: "/portal/billing.html", label: "Billing", icon: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>' },
    { id: "certificates", href: "/portal/certificates.html", label: "Certificates", icon: '<circle cx="12" cy="12" r="8"/><path d="m9 12 2 2 4-4"/>' },
    { id: "support", href: "/portal/support.html", label: "Support", icon: '<path d="M8 10a4 4 0 0 1 8 0v2a4 4 0 0 1-8 0v-2z"/><path d="M4 12v1a8 8 0 0 0 16 0v-1M12 21v-2"/>' },
    { id: "account", href: "/portal/account.html", label: "Account", icon: '<circle cx="12" cy="8" r="3.5"/><path d="M5 19.5c1.6-3 4-4.5 7-4.5s5.4 1.5 7 4.5"/>' },
    { id: "settings", href: "/portal/settings.html", label: "Settings", icon: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
  ];

  function initials(name) {
    const parts = String(name || "F").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "F";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function currentPageId() {
    return document.body.getAttribute("data-page") || "dashboard";
  }

  function renderNav() {
    const nav = document.getElementById("sidebarNav") || document.querySelector(".sidebar-nav");
    if (!nav) return;
    const active = currentPageId();
    nav.innerHTML = NAV.map((item) => {
      const on = item.id === active ? " is-active" : "";
      return `<a class="${on.trim()}" href="${item.href}" data-nav="${item.id}">
        <svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${item.icon}</svg>
        ${item.label}
      </a>`;
    }).join("");
  }

  function fillUser(user) {
    const nameEl = document.getElementById("userName");
    const emailEl = document.getElementById("userEmail");
    const avatarEl = document.getElementById("userAvatar");
    const welcomeEl = document.getElementById("welcomeName");
    if (nameEl) nameEl.textContent = user.name || "Trader";
    if (emailEl) emailEl.textContent = user.email || "—";
    if (avatarEl) avatarEl.textContent = initials(user.name);
    if (welcomeEl) welcomeEl.textContent = (user.name || "Trader").split(/\s+/)[0];
  }

  function bindShell() {
    const toggle = document.getElementById("sidebarToggle");
    const backdrop = document.getElementById("sidebarBackdrop");
    const logoutBtn = document.getElementById("logoutBtn");

    const closeSidebar = () => {
      document.body.classList.remove("sidebar-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (backdrop) backdrop.hidden = true;
    };
    const openSidebar = () => {
      document.body.classList.add("sidebar-open");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
      if (backdrop) backdrop.hidden = false;
    };

    if (toggle) {
      toggle.addEventListener("click", () => {
        if (document.body.classList.contains("sidebar-open")) closeSidebar();
        else openSidebar();
      });
    }
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.addEventListener("click", closeSidebar);
    }
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        } catch (_) {}
        window.location.href = "/login.html";
      });
    }
    const brand = document.querySelector(".sidebar-brand");
    if (brand) brand.setAttribute("href", "/portal/index.html");

    const topbar = document.querySelector(".topbar");
    if (topbar && !topbar.querySelector(".topbar-support")) {
      const actions = document.createElement("div");
      actions.className = "topbar-actions";
      const supportBtn = document.createElement("button");
      supportBtn.type = "button";
      supportBtn.className = "topbar-support";
      supportBtn.setAttribute("data-open-support", "");
      supportBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 10a4 4 0 0 1 8 0v2a4 4 0 0 1-8 0v-2z"/><path d="M4 12v1a8 8 0 0 0 16 0v-1M12 21v-2"/></svg><span>Support</span>';
      supportBtn.addEventListener("click", () => {
        if (window.FundoraSupport && typeof window.FundoraSupport.messages === "function") {
          window.FundoraSupport.messages();
          return;
        }
        window.location.href = "/portal/support.html";
      });
      actions.appendChild(supportBtn);
      topbar.appendChild(actions);
    }
  }

  function bindAccountForms(user) {
    const profileForm = document.getElementById("profileForm");
    const passwordForm = document.getElementById("passwordForm");

    if (profileForm) {
      ["name", "email", "country", "phone", "city", "experience", "platform", "referral"].forEach((key) => {
        const el = document.getElementById(key);
        if (el && user[key] != null) el.value = user[key];
      });

      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const body = {};
        ["name", "email", "country", "phone", "city", "experience", "platform", "referral"].forEach((key) => {
          const el = document.getElementById(key);
          if (el) body[key] = el.value.trim();
        });
        const res = await fetch("/api/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        const notice = document.getElementById("profileNotice");
        if (notice) {
          notice.hidden = false;
          notice.textContent = data.ok ? "Profile updated." : data.error || "Update failed";
        }
        if (data.ok && data.user) fillUser(data.user);
      });
    }

    if (passwordForm) {
      passwordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const res = await fetch("/api/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            currentPassword: document.getElementById("currentPassword").value,
            newPassword: document.getElementById("newPassword").value,
            confirmPassword: document.getElementById("confirmPassword").value,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const notice = document.getElementById("passwordNotice");
        if (notice) {
          notice.hidden = false;
          notice.textContent = data.ok ? "Password updated." : data.error || "Update failed";
        }
        if (data.ok) passwordForm.reset();
      });
    }
  }

  async function bindChallengesPage() {
    const listHost = document.querySelector(".card .empty");
    const startBtns = document.querySelectorAll("[data-start-challenge]");
    startBtns.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const type = btn.getAttribute("data-start-challenge");
        const size = Number(btn.getAttribute("data-size") || 25000);
        const res = await fetch("/api/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ evaluationType: type, accountSize: size }),
        });
        const data = await res.json().catch(() => ({}));
        if (!data.ok) {
          alert(data.error || "Could not start challenge");
          return;
        }
        location.reload();
      });
    });

    try {
      const res = await fetch("/api/challenges", { credentials: "same-origin" });
      const data = await res.json();
      if (!data.ok || !data.challenges || !data.challenges.length) return;
      const card = document.querySelector(".content .card:last-of-type");
      if (!card) return;
      card.innerHTML = `<div class="card-head"><div><h2>Your challenges</h2><p class="card-sub">Saved in Neon.</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>Type</th><th>Size</th><th>Fee</th><th>Status</th></tr></thead><tbody>
        ${data.challenges
          .map(
            (c) =>
              `<tr><td>${c.evaluationType}</td><td>$${Number(c.accountSize).toLocaleString()}</td><td>$${c.fee}</td><td><span class="pill pill-ok">${c.status}</span></td></tr>`
          )
          .join("")}
        </tbody></table></div>`;
    } catch (_) {}
  }

  async function bindRewardsPage() {
    const form = document.getElementById("rewardForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const res = await fetch("/api/rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            amount: document.getElementById("amount").value,
            method: document.getElementById("method").value,
            notes: document.getElementById("notes").value,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const notice = document.getElementById("rewardNotice");
        if (notice) {
          notice.hidden = false;
          notice.textContent = data.ok ? "Reward request saved." : data.error || "Failed";
        }
        if (data.ok) location.reload();
      });
    }

    try {
      const res = await fetch("/api/rewards", { credentials: "same-origin" });
      const data = await res.json();
      if (!data.ok || !data.rewards || !data.rewards.length) return;
      const tbody = document.querySelector(".table-wrap tbody");
      if (!tbody) return;
      tbody.innerHTML = data.rewards
        .map(
          (r) =>
            `<tr><td>${new Date(r.createdAt).toLocaleDateString()}</td><td>${r.method}</td><td>$${r.amount}</td><td><span class="pill pill-pending">${r.status}</span></td></tr>`
        )
        .join("");
    } catch (_) {}
  }

  function bindDemoForms() {
    const supportForm = document.getElementById("supportForm");
    const ticketList = document.getElementById("supportTicketList");
    const notice = document.getElementById("supportNotice");

    async function loadSupportTickets() {
      if (!ticketList) return;
      try {
        const res = await fetch("/api/tickets", { credentials: "same-origin" });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          ticketList.innerHTML =
            '<div class="empty"><strong>Could not load tickets</strong><p>Try again shortly.</p></div>';
          return;
        }
        const tickets = data.tickets || [];
        if (!tickets.length) {
          ticketList.innerHTML =
            '<div class="empty"><strong>No tickets</strong><p>Send a message to open a conversation with support.</p></div>';
          return;
        }
        ticketList.innerHTML = `
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>Subject</th><th>Status</th><th>Updated</th><th>Last message</th></tr></thead>
              <tbody>
                ${tickets
                  .map(
                    (t) =>
                      `<tr>
                        <td>${t.subject || "Support"}</td>
                        <td><span class="pill">${String(t.status || "").replace("_", " ")}</span></td>
                        <td>${t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "—"}</td>
                        <td>${t.lastMessage || "—"}</td>
                      </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>`;
      } catch (_) {
        ticketList.innerHTML =
          '<div class="empty"><strong>Network error</strong><p>Could not reach support API.</p></div>';
      }
    }

    if (supportForm) {
      supportForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const subjectEl = document.getElementById("subject");
        const messageEl = document.getElementById("message");
        const topicEl = document.getElementById("topic");
        const subject = (subjectEl && subjectEl.value.trim()) || "Portal support";
        const message = messageEl ? messageEl.value.trim() : "";
        const topic = topicEl ? topicEl.value : "";
        if (!message) return;
        try {
          const res = await fetch("/api/tickets", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: topic ? `${topic}: ${subject}` : subject,
              message,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            if (notice) {
              notice.hidden = false;
              notice.textContent = data.error || "Could not send ticket.";
            }
            return;
          }
          supportForm.reset();
          if (notice) {
            notice.hidden = false;
            notice.textContent =
              "Ticket sent — support will reply in Call. Check Messages on the site chat too.";
          }
          await loadSupportTickets();
        } catch (_) {
          if (notice) {
            notice.hidden = false;
            notice.textContent = "Network error — try again.";
          }
        }
      });
      loadSupportTickets();
    }

    const settingsForm = document.getElementById("settingsForm");
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const settingsNotice = document.getElementById("settingsNotice");
        if (settingsNotice) settingsNotice.hidden = false;
      });
    }
  }

  async function boot() {
    let user = null;
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      const data = await res.json();
      if (!data.ok || !data.user) {
        location.replace("/login.html");
        return;
      }
      user = data.user;
    } catch {
      location.replace("/login.html");
      return;
    }

    renderNav();
    fillUser(user);
    bindShell();
    bindAccountForms(user);
    bindDemoForms();
    if (currentPageId() === "challenges") bindChallengesPage();
    if (currentPageId() === "rewards") bindRewardsPage();
  }

  boot();
})();
