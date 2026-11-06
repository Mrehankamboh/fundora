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

  function showGoogleNote(message, isError) {
    const glass = document.querySelector(".glass");
    if (!glass) return;
    let el = glass.querySelector(".auth-google-note");
    if (!el) {
      el = document.createElement("p");
      el.className = "auth-google-note";
      const btn = glass.querySelector("[data-google-auth], .btn-google");
      if (btn && btn.parentNode) btn.parentNode.insertBefore(el, btn.nextSibling);
      else glass.prepend(el);
    }
    el.textContent = message;
    el.style.cssText = isError
      ? "color:#f87171;font-size:0.88rem;margin:0.75rem 0 0;padding:0.65rem 0.8rem;border:1px solid rgba(248,113,113,0.35);border-radius:10px;background:rgba(248,113,113,0.08)"
      : "color:#7eb6ff;font-size:0.88rem;margin:0.75rem 0 0;padding:0.65rem 0.8rem;border:1px solid rgba(126,182,255,0.28);border-radius:10px;background:rgba(59,130,246,0.08)";
  }

  const params = new URLSearchParams(location.search);
  const google = params.get("google");
  if (google === "denied") {
    showGoogleNote("Google sign-in was cancelled.", true);
  } else if (google === "config") {
    showGoogleNote(
      "Google login is not set up yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local, then restart the server.",
      true
    );
  } else if (google === "invalid") {
    showGoogleNote(
      "Google sign-in expired or origin mismatch. Open http://127.0.0.1:5173 (not localhost) and try again.",
      true
    );
  } else if (google === "secret") {
    showGoogleNote(
      "Google Client Secret is invalid. Reset the secret in Google Cloud and paste the new value in .env.local.",
      true
    );
  } else if (google === "redirect") {
    showGoogleNote(
      "Google redirect URI mismatch. Add http://127.0.0.1:5173/api/auth/google/callback in Google Cloud OAuth settings.",
      true
    );
  } else if (google === "blocked") {
    showGoogleNote("This account is blocked. Contact support.", true);
  } else if (google) {
    showGoogleNote(
      "Google sign-in failed. Add your Gmail as a Test user in Google Cloud (if app is in Testing), then try again.",
      true
    );
  }

  document.querySelectorAll("[data-google-auth], .btn-google").forEach((btn) => {
    btn.addEventListener("click", () => {
      location.href = "/api/auth/google";
    });
  });
})();
