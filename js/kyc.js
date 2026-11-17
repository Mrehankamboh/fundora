(function () {
  const form = document.getElementById("kycForm");
  if (!form) return;

  const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];

  const countryInput = document.getElementById("country");
  const countryBtn = document.getElementById("countryBtn");
  const countryMenu = document.getElementById("countryMenu");
  const countryList = document.getElementById("countryList");
  const countryFilter = document.getElementById("countryFilter");

  function paintCountries(query) {
    if (!countryList) return;
    const q = String(query || "").trim().toLowerCase();
    const rows = COUNTRIES.filter((name) => name.toLowerCase().includes(q));
    countryList.innerHTML = "";
    rows.forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = name;
      button.setAttribute("role", "option");
      if (countryInput && countryInput.value === name) button.classList.add("is-on");
      button.addEventListener("click", () => chooseCountry(name));
      countryList.appendChild(button);
    });
  }

  function chooseCountry(name) {
    if (countryInput) countryInput.value = name;
    if (countryBtn) {
      countryBtn.textContent = name;
      countryBtn.classList.remove("is-empty");
      countryBtn.setAttribute("aria-expanded", "false");
    }
    if (countryMenu) countryMenu.hidden = true;
  }

  function syncCountryButton() {
    const name = countryInput ? countryInput.value : "";
    if (!countryBtn) return;
    countryBtn.textContent = name || "Select country";
    countryBtn.classList.toggle("is-empty", !name);
  }

  if (countryBtn && countryMenu) {
    countryBtn.classList.add("is-empty");
    paintCountries("");
    countryBtn.addEventListener("click", () => {
      const open = countryMenu.hidden;
      countryMenu.hidden = !open;
      countryBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && countryFilter) {
        countryFilter.value = "";
        paintCountries("");
        countryFilter.focus();
      }
    });
    if (countryFilter) {
      countryFilter.addEventListener("input", () => paintCountries(countryFilter.value));
    }
    document.addEventListener("click", (event) => {
      if (!countryMenu.hidden && !event.target.closest(".country-pick")) {
        countryMenu.hidden = true;
        countryBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  const statusCard = document.getElementById("kycStatus");
  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const notice = document.getElementById("kycNotice");
  const continueBtn = document.getElementById("kycContinue");

  function setNotice(text, kind) {
    if (!notice) return;
    notice.hidden = !text;
    notice.textContent = text || "";
    notice.classList.toggle("is-error", kind === "error");
    notice.classList.toggle("is-ok", kind === "ok");
  }

  function fieldError(name, message) {
    const field = form.querySelector('[data-field="' + name + '"]');
    if (!field) return;
    field.classList.toggle("is-error", Boolean(message));
    const el = field.querySelector(".field-error");
    if (el) el.textContent = message || "";
  }

  function clearErrors() {
    form.querySelectorAll("[data-field]").forEach((field) => {
      field.classList.remove("is-error");
      const el = field.querySelector(".field-error");
      if (el) el.textContent = "";
    });
  }

  function markSteps(current, doneThrough) {
    steps.forEach((step) => {
      const n = Number(step.getAttribute("data-step"));
      step.classList.toggle("is-current", n === current);
      step.classList.toggle("is-done", n <= doneThrough);
    });
  }

  function personalValue() {
    return {
      fullName: String(form.elements.fullName.value || "").trim(),
      dateOfBirth: String(form.elements.dateOfBirth.value || ""),
      country: String(form.elements.country.value || ""),
      address: String(form.elements.address.value || "").trim(),
      city: String(form.elements.city.value || "").trim(),
      postalCode: String(form.elements.postalCode.value || "").trim(),
    };
  }

  function localErrors() {
    const value = personalValue();
    const errors = {};
    if (!/^[\p{L}][\p{L}\s.'-]{1,119}$/u.test(value.fullName)) errors.fullName = "Enter your full legal name.";
    const born = new Date(value.dateOfBirth + "T00:00:00");
    const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    const month = now.getMonth() - born.getMonth();
    if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1;
    if (!value.dateOfBirth || age < 18) errors.dateOfBirth = "You must be at least 18 years old.";
    if (!value.country) errors.country = "Select your country of residence.";
    if (value.address.length < 8) errors.address = "Enter your full residential address.";
    if (value.city.length < 2) errors.city = "Enter your city.";
    if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,15}$/.test(value.postalCode)) errors.postalCode = "Enter a valid postal code.";
    return errors;
  }

  function fill(application) {
    if (!application) return;
    ["fullName", "dateOfBirth", "country", "address", "city", "postalCode"].forEach((key) => {
      if (form.elements[key]) form.elements[key].value = application[key] || "";
    });
    syncCountryButton();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function showLocked(application) {
    const approved = application.status === "approved";
    form.hidden = true;
    statusCard.hidden = false;
    markSteps(4, approved ? 4 : 3);
    statusCard.innerHTML =
      "<h3>" +
      (approved ? "Approved" : "Pending") +
      "</h3><p>" +
      (approved
        ? "An administrator verified this identity. A photo does not approve the account by itself."
        : "Your application is with Fundora compliance. You cannot send another application while this one is under review.") +
      "</p>";
  }

  function showRejected(application) {
    form.hidden = false;
    statusCard.hidden = false;
    markSteps(1, 0);
    statusCard.innerHTML =
      "<h3>Rejected</h3><p>Correct your details, then continue to the identity document page.</p><p><strong>Reason:</strong> " +
      escapeHtml(application.rejectionReason || "The reviewer did not include a reason.") +
      "</p>";
    fill(application);
  }

  function render(data) {
    const application = data.application;
    if (!application || data.status === "not_started") {
      form.hidden = false;
      statusCard.hidden = true;
      markSteps(1, 0);
      return;
    }
    if (application.status === "pending" || application.status === "approved") {
      showLocked(application);
      return;
    }
    if (application.status === "rejected") showRejected(application);
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      clearErrors();
      setNotice("");
      const errors = localErrors();
      if (Object.keys(errors).length) {
        Object.keys(errors).forEach((key) => fieldError(key, errors[key]));
        setNotice("Check the highlighted fields.", "error");
        return;
      }
      sessionStorage.setItem("fundoraKycPersonal", JSON.stringify(personalValue()));
      window.location.href = "/portal/kyc-document.html";
    });
  }

  fetch("/api/kyc", { credentials: "same-origin" })
    .then((res) => res.json())
    .then((data) => {
      if (!data.ok) {
        setNotice(data.error || "Could not load verification.", "error");
        return;
      }
      render(data);
    })
    .catch(() => setNotice("Could not load verification.", "error"));

  markSteps(1, 0);
})();
