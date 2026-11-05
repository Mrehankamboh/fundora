/* Auth helpers — password toggle + demo register/login → portal */
(function () {
  const USERS_KEY = "fundora_users";
  const SESSION_KEY = "fundora_session";

  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    const target = document.getElementById(btn.getAttribute("data-toggle-password"));
    if (!target) return;

    btn.addEventListener("click", () => {
      const show = target.type === "password";
      target.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", show ? "true" : "false");
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.classList.toggle("is-visible", show);
    });
  });

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

  function setSession(email) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email, at: Date.now() }));
  }

  function showFormError(form, message) {
    let el = form.querySelector(".auth-error");
    if (!el) {
      el = document.createElement("p");
      el.className = "auth-error";
      el.style.cssText =
        "color:#f87171;font-size:0.88rem;margin:0 0 1rem;padding:0.65rem 0.8rem;border:1px solid rgba(248,113,113,0.35);border-radius:10px;background:rgba(248,113,113,0.08)";
      const submit = form.querySelector('button[type="submit"]');
      form.insertBefore(el, submit || null);
    }
    el.textContent = message;
    el.hidden = false;
  }

  function clearFormError(form) {
    const el = form.querySelector(".auth-error");
    if (el) el.hidden = true;
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function hasSession() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!session || !session.email) return false;
      return readUsers().some((u) => u.email.toLowerCase() === session.email.toLowerCase());
    } catch {
      return false;
    }
  }

  /* Register → portal */
  const isRegisterPage = /register\.html$/i.test(location.pathname) || document.title.includes("Create account");
  const isLoginPage = /login\.html$/i.test(location.pathname) || document.title.includes("Sign in");

  if ((isRegisterPage || isLoginPage) && hasSession()) {
    window.location.replace("/portal/index.html");
    return;
  }

  if (isRegisterPage) {
    const form = document.querySelector("main form");
    if (form) {
      form.removeAttribute("onsubmit");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        clearFormError(form);

        const name = val("name");
        const email = val("email");
        const country = val("country");
        const phone = val("phone");
        const city = val("city");
        const experience = val("experience");
        const platform = val("platform");
        const referral = val("referral");
        const password = val("password");
        const confirm = val("confirm");

        if (!name || !email || !password) {
          showFormError(form, "Please fill in the required fields.");
          return;
        }
        if (password.length < 8) {
          showFormError(form, "Password must be at least 8 characters.");
          return;
        }
        if (password !== confirm) {
          showFormError(form, "Passwords do not match.");
          return;
        }

        const users = readUsers();
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          showFormError(form, "An account with this email already exists. Sign in instead.");
          return;
        }

        users.push({
          name,
          email,
          country,
          phone,
          city,
          experience,
          platform,
          referral,
          password,
          createdAt: Date.now(),
        });
        writeUsers(users);
        setSession(email);
        window.location.href = "/portal/index.html";
      });
    }
  }

  /* Login → portal */
  if (isLoginPage) {
    const form = document.querySelector("main form");
    if (form) {
      form.removeAttribute("onsubmit");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        clearFormError(form);

        const email = val("email");
        const password = val("password");
        const users = readUsers();
        const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

        if (!user || user.password !== password) {
          showFormError(form, "Invalid email or password.");
          return;
        }

        setSession(user.email);
        window.location.href = "/portal/index.html";
      });
    }
  }

  /* Continue with Google (UI demo — real OAuth later) */
  function continueWithGoogle(btn) {
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.textContent = "Connecting…";

    window.setTimeout(() => {
      const email = "google.trader@fundora.app";
      const users = readUsers();
      let user = users.find((u) => u.email.toLowerCase() === email);

      if (!user) {
        user = {
          name: "Google Trader",
          email,
          country: "",
          phone: "",
          city: "",
          experience: "",
          platform: "",
          referral: "",
          password: "",
          provider: "google",
          createdAt: Date.now(),
        };
        users.push(user);
        writeUsers(users);
      } else if (!user.provider) {
        user.provider = "google";
        writeUsers(users);
      }

      setSession(user.email);
      window.location.href = "/portal/index.html";
      btn.disabled = false;
      btn.innerHTML = original;
    }, 650);
  }

  document.querySelectorAll("[data-google-auth]").forEach((btn) => {
    btn.addEventListener("click", () => continueWithGoogle(btn));
  });
})();
