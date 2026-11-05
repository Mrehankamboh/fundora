/* Auth — password toggle + Neon API register/login/forgot */
(function () {
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

  async function api(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  const isRegisterPage =
    /register\.html$/i.test(location.pathname) || document.title.includes("Create account");
  const isLoginPage =
    /login\.html$/i.test(location.pathname) || document.title.includes("Sign in");
  const isForgotPage =
    /forgot\.html$/i.test(location.pathname) || document.title.includes("Forgot password");

  /* If already signed in, go to portal */
  if (isRegisterPage || isLoginPage) {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.ok) location.replace("/portal/index.html");
      })
      .catch(() => {});
  }

  if (isRegisterPage) {
    const form = document.querySelector("main form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormError(form);
        const payload = {
          name: val("name"),
          email: val("email"),
          country: val("country"),
          phone: val("phone"),
          city: val("city"),
          experience: val("experience"),
          platform: val("platform"),
          referral: val("referral"),
          password: val("password"),
          confirm: val("confirm"),
        };
        try {
          const { res, data } = await api("/api/auth/register", payload);
          if (!res.ok || !data.ok) {
            showFormError(form, data.error || "Registration failed");
            return;
          }
          location.href = data.redirect || "/portal/index.html";
        } catch {
          showFormError(form, "Could not reach server. Start with npm run dev.");
        }
      });
    }
  }

  if (isLoginPage) {
    const form = document.querySelector("main form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormError(form);
        try {
          const { res, data } = await api("/api/auth/login", {
            email: val("email"),
            password: val("password"),
          });
          if (!res.ok || !data.ok) {
            showFormError(form, data.error || "Invalid email or password");
            return;
          }
          location.href = data.redirect || "/portal/index.html";
        } catch {
          showFormError(form, "Could not reach server. Start with npm run dev.");
        }
      });
    }
  }

  if (isForgotPage) {
    const form = document.querySelector("main form");
    const params = new URLSearchParams(location.search);
    const resetToken = params.get("token");

    if (form && resetToken) {
      const title = document.querySelector(".glass h2");
      const sub = document.querySelector(".glass .sub");
      if (title) title.textContent = "Choose a new password";
      if (sub) sub.textContent = "Enter and confirm your new password.";
      form.innerHTML = `
        <input type="hidden" id="resetToken" value="${resetToken.replace(/"/g, "")}" />
        <div class="field">
          <label for="password">New password</label>
          <input id="password" type="password" required minlength="8" autocomplete="new-password" />
        </div>
        <div class="field">
          <label for="confirm">Confirm password</label>
          <input id="confirm" type="password" required minlength="8" autocomplete="new-password" />
        </div>
        <button class="btn" type="submit">Update password</button>
      `;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormError(form);
        try {
          const { res, data } = await api("/api/auth/reset", {
            token: resetToken,
            password: val("password"),
            confirm: val("confirm"),
          });
          if (!res.ok || !data.ok) {
            showFormError(form, data.error || "Reset failed");
            return;
          }
          location.href = data.redirect || "/login.html";
        } catch {
          showFormError(form, "Could not reach server.");
        }
      });
    } else if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearFormError(form);
        try {
          const { res, data } = await api("/api/auth/forgot", { email: val("email") });
          if (!res.ok || !data.ok) {
            showFormError(form, data.error || "Request failed");
            return;
          }
          let msg = data.message || "Check your email.";
          if (data.devResetPath) msg += ` Dev link: ${data.devResetPath}`;
          showFormError(form, msg);
          const err = form.querySelector(".auth-error");
          if (err) err.style.color = "#7eb6ff";
        } catch {
          showFormError(form, "Could not reach server. Start with npm run dev.");
        }
      });
    }
  }

  /* Google button — demo notice until OAuth wired */
  document.querySelectorAll("[data-google-auth]").forEach((btn) => {
    btn.addEventListener("click", () => {
      alert("Google sign-in will connect after OAuth credentials are added. Use email register/login for now.");
    });
  });
})();
