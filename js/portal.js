/* Fundora portal — session guard + shared shell */
(function () {
  const USERS_KEY = "fundora_users";
  const SESSION_KEY = "fundora_session";

  /* Absolute paths so links work when URL is /portal (no trailing slash) */
  const NAV = [
    {
      id: "dashboard",
      href: "/portal/index.html",
      label: "Dashboard",
      icon: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/>',
    },
    {
      id: "challenges",
      href: "/portal/challenges.html",
      label: "Challenges",
      icon: '<path d="M4 19h16M7 16V9m5 7V5m5 11v-4"/>',
    },
    {
      id: "rewards",
      href: "/portal/rewards.html",
      label: "Rewards",
      icon: '<path d="M12 3v18M7 8h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8"/>',
    },
    {
      id: "platforms",
      href: "/portal/platforms.html",
      label: "Platforms",
      icon: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>',
    },
    {
      id: "rules",
      href: "/portal/rules.html",
      label: "Rules",
      icon: '<path d="M7 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2z"/>',
    },
    {
      id: "billing",
      href: "/portal/billing.html",
      label: "Billing",
      icon: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
    },
    {
      id: "certificates",
      href: "/portal/certificates.html",
      label: "Certificates",
      icon: '<circle cx="12" cy="12" r="8"/><path d="m9 12 2 2 4-4"/>',
    },
    {
      id: "support",
      href: "/portal/support.html",
      label: "Support",
      icon: '<path d="M8 10a4 4 0 0 1 8 0v2a4 4 0 0 1-8 0v-2z"/><path d="M4 12v1a8 8 0 0 0 16 0v-1M12 21v-2"/>',
    },
    {
      id: "account",
      href: "/portal/account.html",
      label: "Account",
      icon: '<circle cx="12" cy="8" r="3.5"/><path d="M5 19.5c1.6-3 4-4.5 7-4.5s5.4 1.5 7 4.5"/>',
    },
    {
      id: "settings",
      href: "/portal/settings.html",
      label: "Settings",
      icon: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    },
  ];

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session || !session.email) return null;
    const users = readUsers();
    return users.find((u) => u.email.toLowerCase() === session.email.toLowerCase()) || null;
  }

  function initials(name) {
    const parts = String(name || "F").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "F";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
      window.location.replace("/login.html");
      return null;
    }
    return user;
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
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = "/login.html";
      });
    }

    const brand = document.querySelector(".sidebar-brand");
    if (brand) brand.setAttribute("href", "/portal/index.html");
  }

  function bindAccountForms(user) {
    const profileForm = document.getElementById("profileForm");
    const passwordForm = document.getElementById("passwordForm");

    if (profileForm) {
      const map = ["name", "email", "country", "phone", "city", "experience", "platform", "referral"];
      map.forEach((key) => {
        const el = document.getElementById(key);
        if (el && user[key] != null) el.value = user[key];
      });

      profileForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const users = readUsers();
        const idx = users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
        if (idx < 0) return;

        const next = { ...users[idx] };
        map.forEach((key) => {
          const el = document.getElementById(key);
          if (el) next[key] = el.value.trim();
        });

        const emailChanged = next.email.toLowerCase() !== users[idx].email.toLowerCase();
        if (emailChanged) {
          const clash = users.some(
            (u, i) => i !== idx && u.email.toLowerCase() === next.email.toLowerCase()
          );
          if (clash) {
            const notice = document.getElementById("profileNotice");
            if (notice) {
              notice.hidden = false;
              notice.textContent = "That email is already registered.";
            }
            return;
          }
          localStorage.setItem(SESSION_KEY, JSON.stringify({ email: next.email }));
        }

        users[idx] = next;
        writeUsers(users);
        fillUser(next);
        const notice = document.getElementById("profileNotice");
        if (notice) {
          notice.hidden = false;
          notice.textContent = "Profile updated locally.";
        }
      });
    }

    if (passwordForm) {
      passwordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById("currentPassword");
        const newPassword = document.getElementById("newPassword");
        const confirmPassword = document.getElementById("confirmPassword");
        const notice = document.getElementById("passwordNotice");

        if (!currentPassword || !newPassword || !confirmPassword) return;

        if (currentPassword.value !== user.password) {
          if (notice) {
            notice.hidden = false;
            notice.textContent = "Current password is incorrect.";
          }
          return;
        }
        if (newPassword.value !== confirmPassword.value) {
          if (notice) {
            notice.hidden = false;
            notice.textContent = "New passwords do not match.";
          }
          return;
        }
        if (newPassword.value.length < 8) {
          if (notice) {
            notice.hidden = false;
            notice.textContent = "Password must be at least 8 characters.";
          }
          return;
        }

        const users = readUsers();
        const idx = users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
        if (idx < 0) return;
        users[idx].password = newPassword.value;
        writeUsers(users);
        passwordForm.reset();
        if (notice) {
          notice.hidden = false;
          notice.textContent = "Password updated locally.";
        }
      });
    }
  }

  function bindDemoForms() {
    const rewardForm = document.getElementById("rewardForm");
    if (rewardForm) {
      rewardForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const notice = document.getElementById("rewardNotice");
        if (notice) notice.hidden = false;
      });
    }

    const supportForm = document.getElementById("supportForm");
    if (supportForm) {
      supportForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const notice = document.getElementById("supportNotice");
        if (notice) notice.hidden = false;
        supportForm.reset();
      });
    }

    const settingsForm = document.getElementById("settingsForm");
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const notice = document.getElementById("settingsNotice");
        if (notice) notice.hidden = false;
      });
    }
  }

  const user = requireAuth();
  if (!user) return;

  renderNav();
  fillUser(user);
  bindShell();
  bindAccountForms(user);
  bindDemoForms();
})();
