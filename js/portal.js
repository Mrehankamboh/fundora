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

  function money(n) {
    return `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  async function bindChallengesPage() {
    document.querySelectorAll("[data-checkout-challenge]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const type = btn.getAttribute("data-checkout-challenge") || "1-step";
        const select = document.querySelector(`[data-challenge-size="${type}"]`);
        const size = Number((select && select.value) || 25000);
        location.href = `/portal/checkout.html?type=${encodeURIComponent(type)}&size=${size}`;
      });
    });

    // Legacy free-start buttons (if any remain) also go to checkout
    document.querySelectorAll("[data-start-challenge]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const type = btn.getAttribute("data-start-challenge") || "1-step";
        const size = Number(btn.getAttribute("data-size") || 25000);
        location.href = `/portal/checkout.html?type=${encodeURIComponent(type)}&size=${size}`;
      });
    });

    try {
      const res = await fetch("/api/challenges", { credentials: "same-origin" });
      const data = await res.json();
      if (!data.ok || !data.challenges || !data.challenges.length) return;
      const card = document.getElementById("yourChallengesCard") || document.querySelector(".content .card:last-of-type");
      if (!card) return;
      card.innerHTML = `<div class="card-head"><div><h2>Your challenges</h2><p class="card-sub">Activated after successful payment.</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>Type</th><th>Size</th><th>Fee</th><th>Status</th></tr></thead><tbody>
        ${data.challenges
          .map(
            (c) =>
              `<tr><td>${c.evaluationType}</td><td>$${Number(c.accountSize).toLocaleString()}</td><td>${money(c.fee)}</td><td><span class="pill pill-ok">${c.status}</span></td></tr>`
          )
          .join("")}
        </tbody></table></div>`;
    } catch (_) {}
  }

  function showCheckoutNotice(text, kind) {
    const el = document.getElementById("checkoutNotice");
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || "";
    el.classList.remove("is-error", "is-ok");
    if (kind) el.classList.add(kind);
  }

  function renderOrderSummary(order) {
    const summary = document.getElementById("orderSummary");
    const total = document.getElementById("orderTotal");
    if (!summary || !order) return;
    summary.innerHTML = `
      <li><span>Challenge</span><strong>${order.evaluationType}</strong></li>
      <li><span>Account size</span><strong>$${Number(order.accountSize).toLocaleString()}</strong></li>
      <li><span>Platform</span><strong>${order.platform}</strong></li>
      <li><span>Payment status</span><strong>${order.status}</strong></li>`;
    if (total) total.textContent = money(order.fee);
    const cryptoAmount = document.getElementById("cryptoAmount");
    if (cryptoAmount) cryptoAmount.textContent = `${money(order.fee)} USDT`;
  }

  function setPayMethod(method) {
    document.querySelectorAll(".pay-method").forEach((btn) => {
      btn.classList.toggle("is-on", btn.getAttribute("data-method") === method);
    });
    const panelCard = document.getElementById("panelCard");
    const panelCrypto = document.getElementById("panelCrypto");
    if (panelCard) panelCard.hidden = method !== "card";
    if (panelCrypto) panelCrypto.hidden = method !== "crypto";
  }

  function showPaidSuccess(challenge, order) {
    const payPanel = document.getElementById("payPanel");
    const successPanel = document.getElementById("successPanel");
    const detail = document.getElementById("successDetail");
    if (payPanel) payPanel.hidden = true;
    if (successPanel) successPanel.hidden = false;
    if (detail) {
      detail.textContent = challenge
        ? `${challenge.evaluationType} · $${Number(challenge.accountSize).toLocaleString()} is now ${challenge.status}. Fee ${money(challenge.fee)}.`
        : `Order ${order && order.id ? order.id.slice(0, 8) : ""} paid.`;
    }
    showCheckoutNotice("Payment confirmed.", "is-ok");
  }

  async function confirmCheckout({ orderId, sessionId, mode }) {
    const res = await fetch("/api/checkout/confirm", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, sessionId, mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(data.error || "Confirmation failed");
    if (data.pendingReview) {
      showCheckoutNotice(data.message || "Awaiting crypto confirmation.", "");
      if (data.order) renderOrderSummary(data.order);
      return data;
    }
    if (data.order) renderOrderSummary(data.order);
    showPaidSuccess(data.challenge, data.order);
    return data;
  }

  async function bindCheckoutPage() {
    const params = new URLSearchParams(location.search);
    let orderId = params.get("order") || "";
    const type = params.get("type") || "1-step";
    const size = Number(params.get("size") || 25000);
    const sessionId = params.get("session_id") || "";
    const success = params.get("success") === "1";
    const canceled = params.get("canceled") === "1";
    let currentOrder = null;
    let stripeConfigured = false;
    let selectedMethod = "card";

    document.querySelectorAll(".pay-method").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedMethod = btn.getAttribute("data-method") || "card";
        setPayMethod(selectedMethod);
      });
    });
    setPayMethod("card");

    async function ensureOrder(method) {
      // Reuse unpaid order when method unchanged; otherwise create a fresh order
      if (
        currentOrder &&
        orderId &&
        currentOrder.status === "pending" &&
        currentOrder.paymentMethod === method
      ) {
        return { ok: true, order: currentOrder, stripeConfigured, mode: method };
      }

      const createRes = await fetch("/api/checkout/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationType: (currentOrder && currentOrder.evaluationType) || type,
          accountSize: (currentOrder && currentOrder.accountSize) || size,
          platform: (currentOrder && currentOrder.platform) || "MetaTrader 5",
          paymentMethod: method,
        }),
      });
      const data = await createRes.json().catch(() => ({}));
      if (!data.ok) throw new Error(data.error || "Could not create order");
      currentOrder = data.order;
      orderId = data.order.id;
      stripeConfigured = Boolean(data.stripeConfigured);
      renderOrderSummary(currentOrder);
      if (data.crypto) {
        const addr = document.getElementById("cryptoAddress");
        const net = document.getElementById("cryptoNetwork");
        if (net) net.textContent = data.crypto.network || "TRC20";
        if (addr) {
          addr.value = data.crypto.usdtAddress || "Not configured — set CRYPTO_USDT_ADDRESS";
        }
      }
      history.replaceState({}, "", `/portal/checkout.html?order=${orderId}`);
      return data;
    }

    // Load existing order or seed summary from query
    if (orderId) {
      try {
        const res = await fetch(`/api/checkout/order?id=${encodeURIComponent(orderId)}`, {
          credentials: "same-origin",
        });
        const data = await res.json();
        if (data.ok && data.order) {
          currentOrder = data.order;
          stripeConfigured = Boolean(data.stripeConfigured);
          renderOrderSummary(currentOrder);
          const addr = document.getElementById("cryptoAddress");
          const net = document.getElementById("cryptoNetwork");
          if (net && data.crypto) net.textContent = data.crypto.network || "TRC20";
          if (addr && data.crypto) {
            addr.value = data.crypto.usdtAddress || "Not configured — set CRYPTO_USDT_ADDRESS";
          }
          if (currentOrder.status === "paid") {
            showPaidSuccess(
              {
                evaluationType: currentOrder.evaluationType,
                accountSize: currentOrder.accountSize,
                fee: currentOrder.fee,
                status: "active",
              },
              currentOrder
            );
          }
        }
      } catch (_) {
        showCheckoutNotice("Could not load order.", "is-error");
      }
    } else {
      renderOrderSummary({
        evaluationType: type.includes("2") ? "2-Step" : "1-Step",
        accountSize: size,
        platform: "MetaTrader 5",
        fee: "—",
        status: "draft",
      });
      try {
        const quote = await ensureOrder("card");
        if (quote.crypto && quote.crypto.usdtAddress) {
          const addr = document.getElementById("cryptoAddress");
          if (addr) addr.value = quote.crypto.usdtAddress;
        }
        if (quote.mode === "demo" || !quote.stripeConfigured) {
          const demoBtn = document.getElementById("payDemoBtn");
          const hint = document.getElementById("demoCardHint");
          if (demoBtn) demoBtn.hidden = false;
          if (hint) hint.hidden = false;
        }
      } catch (err) {
        showCheckoutNotice(err.message || "Could not start checkout", "is-error");
      }
    }

    if (canceled) showCheckoutNotice("Payment canceled. You can try again.", "is-error");

    if (success && (sessionId || orderId)) {
      try {
        await confirmCheckout({ orderId, sessionId, mode: "stripe" });
      } catch (err) {
        showCheckoutNotice(err.message || "Could not confirm Stripe payment", "is-error");
      }
    }

    const demoBtn = document.getElementById("payDemoBtn");
    const cardBtn = document.getElementById("payCardBtn");
    const cryptoBtn = document.getElementById("payCryptoBtn");
    const copyBtn = document.getElementById("copyCryptoBtn");

    if (!stripeConfigured) {
      if (demoBtn) demoBtn.hidden = false;
      const hint = document.getElementById("demoCardHint");
      if (hint) hint.hidden = false;
    }

    if (cardBtn) {
      cardBtn.addEventListener("click", async () => {
        try {
          showCheckoutNotice("Starting card checkout…");
          const data = await ensureOrder("card");
          if (data.checkoutUrl) {
            location.href = data.checkoutUrl;
            return;
          }
          if (demoBtn) demoBtn.hidden = false;
          const hint = document.getElementById("demoCardHint");
          if (hint) hint.hidden = false;
          showCheckoutNotice("Stripe not configured — use Demo pay.", "");
        } catch (err) {
          showCheckoutNotice(err.message || "Card checkout failed", "is-error");
        }
      });
    }

    if (demoBtn) {
      demoBtn.addEventListener("click", async () => {
        try {
          if (!orderId) await ensureOrder("demo");
          await confirmCheckout({ orderId, mode: "demo" });
        } catch (err) {
          showCheckoutNotice(err.message || "Demo pay failed", "is-error");
        }
      });
    }

    if (cryptoBtn) {
      cryptoBtn.addEventListener("click", async () => {
        try {
          const data = await ensureOrder("crypto");
          const addr = document.getElementById("cryptoAddress");
          const net = document.getElementById("cryptoNetwork");
          if (net && data.crypto) net.textContent = data.crypto.network || "TRC20";
          if (addr && data.crypto) {
            addr.value = data.crypto.usdtAddress || "Not configured — set CRYPTO_USDT_ADDRESS";
          }
          await confirmCheckout({ orderId: data.order.id, mode: "crypto" });
        } catch (err) {
          showCheckoutNotice(err.message || "Crypto confirm failed", "is-error");
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const addr = document.getElementById("cryptoAddress");
        if (!addr || !addr.value) return;
        try {
          await navigator.clipboard.writeText(addr.value);
          showCheckoutNotice("Address copied.", "is-ok");
        } catch (_) {
          addr.select();
          showCheckoutNotice("Select and copy the address manually.", "");
        }
      });
    }
  }

  async function bindBillingPage() {
    try {
      const res = await fetch("/api/billing", { credentials: "same-origin" });
      const data = await res.json();
      if (!data.ok) return;

      const stats = document.querySelectorAll(".content .stat .stat-value");
      if (stats[0]) stats[0].textContent = money(data.summary.openBalance || 0);
      if (stats[1]) stats[1].textContent = String(data.summary.paid || 0);
      if (stats[2]) {
        stats[2].textContent = data.summary.lastPayment
          ? money(data.summary.lastPayment.amount)
          : "—";
      }
      const notes = document.querySelectorAll(".content .stat .stat-note");
      if (notes[2] && data.summary.lastPayment) {
        notes[2].textContent = `${data.summary.lastPayment.method} · ${new Date(
          data.summary.lastPayment.at
        ).toLocaleString()}`;
      }

      const tbody = document.querySelector(".table-wrap tbody");
      if (tbody && data.orders && data.orders.length) {
        tbody.innerHTML = data.orders
          .map((o) => {
            const pill =
              o.status === "paid" ? "pill-ok" : o.status === "pending" ? "pill-pending" : "pill-pending";
            return `<tr>
              <td>${new Date(o.createdAt).toLocaleString()}</td>
              <td>${o.evaluationType} · $${Number(o.accountSize).toLocaleString()}</td>
              <td>${money(o.fee)}</td>
              <td><span class="pill ${pill}">${o.status}</span></td>
            </tr>`;
          })
          .join("");
      }

      const methods = document.querySelector(".quick-list");
      if (methods && data.methods) {
        methods.innerHTML = data.methods
          .map(
            (m) =>
              `<div class="quick-item">${m.label} <span>${m.available ? "Available at checkout" : "Soon"}</span></div>`
          )
          .join("");
      }
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
    if (currentPageId() === "checkout") bindCheckoutPage();
    if (currentPageId() === "billing") bindBillingPage();
    if (currentPageId() === "rewards") bindRewardsPage();
  }

  boot();
})();
