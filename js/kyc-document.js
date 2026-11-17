(function () {
  const wizard = document.getElementById("docWizard");
  if (!wizard) return;

  const statusCard = document.getElementById("kycStatus");
  const notice = document.getElementById("docNotice");
  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const panels = {
    choose: document.getElementById("panelChoose"),
    front: document.getElementById("panelFront"),
    back: document.getElementById("panelBack"),
    selfie: document.getElementById("panelSelfie"),
    review: document.getElementById("panelReview"),
  };
  const shots = { front: null, back: null, selfie: null };
  const MAX = 4 * 1024 * 1024;
  let docType = "";
  let camStream = null;
  let camSlot = "";

  const camModal = document.getElementById("camModal");
  const camVideo = document.getElementById("camVideo");
  const camTitle = document.getElementById("camTitle");
  const camHint = document.getElementById("camHint");
  const camError = document.getElementById("camError");
  const camGuide = document.getElementById("camGuide");

  function setNotice(text, kind) {
    if (!notice) return;
    notice.hidden = !text;
    notice.textContent = text || "";
    notice.classList.toggle("is-error", kind === "error");
    notice.classList.toggle("is-ok", kind === "ok");
  }

  function needsBack() {
    return true;
  }

  function markSteps(name) {
    const current = name === "front" ? 1 : name === "back" ? 2 : 3;
    steps.forEach((step) => {
      const n = Number(step.getAttribute("data-step"));
      step.classList.toggle("is-current", n === current && name !== "review");
      step.classList.toggle("is-done", n < current || name === "review");
    });
  }

  function showPanel(name) {
    ["front", "back", "selfie", "review"].forEach((key) => {
      if (panels[key]) panels[key].hidden = key !== name;
    });
    const system = document.getElementById("pictureSystem");
    if (system) system.hidden = false;
    markSteps(name);
    setNotice("");
  }

  function clearShots() {
    ["front", "back", "selfie"].forEach((slot) => {
      shots[slot] = null;
      const img = document.querySelector('[data-shot="' + slot + '"]');
      const empty = document.querySelector('[data-empty="' + slot + '"]');
      if (img) {
        if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
        img.hidden = true;
        img.removeAttribute("src");
      }
      if (empty) empty.hidden = false;
    });
  }

  function personal() {
    try {
      return JSON.parse(sessionStorage.getItem("fundoraKycPersonal") || "null");
    } catch (_) {
      return null;
    }
  }

  function isPhone() {
    return document.documentElement.dataset.kycDevice === "phone";
  }

  function savedLocation() {
    try {
      const loc = JSON.parse(sessionStorage.getItem("fundoraKycLocation") || "null");
      const latitude = Number(loc && loc.latitude);
      const longitude = Number(loc && loc.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
      return loc;
    } catch (_) {
      return null;
    }
  }

  async function phoneLink() {
    const path = "/portal/kyc.html";
    try {
      const res = await fetch("/api/network", { credentials: "same-origin" });
      const data = await res.json();
      if (data && data.origin) return String(data.origin).replace(/\/$/, "") + path;
    } catch (_) {}
    return location.origin + path;
  }

  async function showDesktopLink() {
    const box = document.getElementById("deskHandoff");
    const link = document.getElementById("kycQrLink");
    const qr = document.getElementById("kycQr");
    const url = await phoneLink();
    if (link) {
      link.href = url;
      link.textContent = url;
    }
    const hint = document.getElementById("kycQrHint");
    let host = location.hostname;
    try {
      host = new URL(url).hostname;
    } catch (_) {}
    if (hint) hint.hidden = host !== "localhost" && host !== "127.0.0.1";
    const img = document.getElementById("kycQrImg");
    if (img) img.src = "/api/qr?t=" + Date.now();
    if (box) box.hidden = false;
    wizard.hidden = true;
    const blurb = document.querySelector(".kyc-hero p:not(.kyc-kicker)");
    if (blurb) {
      blurb.textContent = "On a laptop, scan the QR code or open the link. Verification opens on your phone.";
    }
  }

  function stopCamera() {
    if (camStream) {
      camStream.getTracks().forEach((track) => track.stop());
      camStream = null;
    }
    if (camVideo) camVideo.srcObject = null;
  }

  function closeCamera() {
    stopCamera();
    camSlot = "";
    if (camModal) camModal.hidden = true;
  }

  async function openCamera(slot) {
    camSlot = slot;
    if (camError) camError.textContent = "";
    const selfie = slot === "selfie";
    if (camTitle) {
      camTitle.textContent = selfie ? "Take your selfie" : slot === "back" ? "Photograph the back" : "Photograph the front";
    }
    if (camHint) {
      camHint.textContent = selfie
        ? "Fit your face inside the oval, then press Capture."
        : "Fit the whole document inside the frame, then press Capture.";
    }
    if (camGuide) camGuide.classList.toggle("is-face", selfie);
    if (camVideo && camVideo.parentElement) camVideo.parentElement.classList.toggle("is-selfie", selfie);
    if (camModal) camModal.hidden = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) {
      if (camError) camError.textContent = "Open this page at http://127.0.0.1:5173 so the camera can start.";
      return;
    }
    try {
      stopCamera();
      camStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: selfie ? "user" : "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      camVideo.srcObject = camStream;
      await camVideo.play();
    } catch (_) {
      if (camError) camError.textContent = "The camera could not open. Allow camera access and try again.";
    }
  }

  function showShot(slot, file) {
    shots[slot] = file;
    const img = document.querySelector('[data-shot="' + slot + '"]');
    const empty = document.querySelector('[data-empty="' + slot + '"]');
    if (img) {
      if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
      const url = URL.createObjectURL(file);
      img.dataset.url = url;
      img.src = url;
      img.hidden = false;
    }
    if (empty) empty.hidden = true;
  }

  function capturePhoto() {
    if (!camVideo || !camVideo.videoWidth || !camSlot) {
      if (camError) camError.textContent = "Wait for the live camera, then press Capture.";
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = camVideo.videoWidth;
    canvas.height = camVideo.videoHeight;
    const ctx = canvas.getContext("2d");
    if (camSlot === "selfie") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(camVideo, 0, 0);
    const slot = camSlot;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (blob.size > MAX) {
          if (camError) camError.textContent = "This photo is larger than 4 MB. Try again in better light.";
          return;
        }
        showShot(slot, new File([blob], slot + "-live.jpg", { type: "image/jpeg" }));
        closeCamera();
        if (slot === "front") showPanel("back");
        else if (slot === "back") showPanel("selfie");
        else openReview();
      },
      "image/jpeg",
      0.9
    );
  }

  wizard.querySelectorAll('input[name="documentType"]').forEach((input) => {
    input.addEventListener("change", () => {
      docType = input.value;
      const label = input.parentElement.querySelector("strong").textContent;
      document.getElementById("frontDocName").textContent = label;
      document.getElementById("backDocName").textContent = label;
      clearShots();
      showPanel("front");
    });
  });

  function openReview() {
    if (!shots.selfie) {
      setNotice("Take a live selfie before continuing.", "error");
      return;
    }
    const review = document.getElementById("reviewShots");
    review.innerHTML = "";
    ["front", "back", "selfie"].forEach((slot) => {
      if (!shots[slot]) return;
      const img = document.createElement("img");
      img.alt = slot + " preview";
      img.src = document.querySelector('[data-shot="' + slot + '"]').src;
      review.appendChild(img);
    });
    showPanel("review");
  }

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showPanel(button.getAttribute("data-back")));
  });
  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => openCamera(button.getAttribute("data-open")));
  });
  const copyBtn = document.getElementById("kycQrCopy");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const url = await phoneLink();
      try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = "Copied";
      } catch (_) {
        copyBtn.textContent = "Copy the link above";
      }
    });
  }

  document.getElementById("camShutter").addEventListener("click", capturePhoto);
  document.getElementById("camClose").addEventListener("click", closeCamera);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && camModal && !camModal.hidden) closeCamera();
  });
  window.addEventListener("pagehide", stopCamera);

  document.getElementById("docSubmit").addEventListener("click", () => {
    const details = personal();
    const place = savedLocation();
    if (!details || (isPhone() && !place)) {
      window.location.href = "/portal/kyc.html";
      return;
    }
    if (!docType || !shots.front || !shots.selfie || (needsBack() && !shots.back)) {
      setNotice("Finish each photo step before submitting.", "error");
      return;
    }
    const body = new FormData();
    Object.keys(details).forEach((key) => body.set(key, details[key]));
    body.set("documentType", docType);
    if (place) {
      body.set("latitude", String(place.latitude));
      body.set("longitude", String(place.longitude));
      if (place.accuracy != null) body.set("accuracy", String(place.accuracy));
    }
    body.set("front", shots.front);
    body.set("selfie", shots.selfie);
    if (needsBack()) body.set("back", shots.back);

    const button = document.getElementById("docSubmit");
    const progress = document.getElementById("kycProgress");
    button.disabled = true;
    progress.hidden = false;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/kyc");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      progress.firstElementChild.style.width = Math.round((ev.loaded / ev.total) * 100) + "%";
    };
    xhr.onerror = () => {
      button.disabled = false;
      setNotice("Network error. Try again.", "error");
    };
    xhr.onload = () => {
      button.disabled = false;
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch (_) {}
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
        sessionStorage.removeItem("fundoraKycPersonal");
        wizard.hidden = true;
        statusCard.hidden = false;
        statusCard.innerHTML = "<h3>Pending</h3><p>Your identity document and selfie were submitted. An administrator still has to review them.</p>";
        markSteps("review");
        steps.forEach((step) => step.classList.add("is-done"));
        setNotice("");
        return;
      }
      setNotice(data.error || "Verification could not be saved.", "error");
    };
    xhr.send(body);
  });

  if (isPhone() && !savedLocation()) {
    wizard.hidden = true;
    window.location.replace("/portal/kyc.html");
  } else if (!isPhone()) showDesktopLink();

  fetch("/api/kyc", { credentials: "same-origin" })
    .then((res) => res.json())
    .then((data) => {
      if (!data.ok) {
        setNotice(data.error || "Could not load verification.", "error");
        return;
      }
      if (data.status === "pending" || data.status === "approved") {
        wizard.hidden = true;
        const handoff = document.getElementById("deskHandoff");
        if (handoff) handoff.hidden = true;
        statusCard.hidden = false;
        statusCard.innerHTML =
          "<h3>" +
          (data.status === "approved" ? "Approved" : "Pending") +
          "</h3><p>" +
          (data.status === "approved"
            ? "This identity is already verified."
            : "This application is already under review.") +
          '</p><p><a class="btn btn-ghost" href="/portal/kyc.html">Back to verification</a></p>';
        return;
      }
      if (!personal() || (isPhone() && !savedLocation())) {
        window.location.replace("/portal/kyc.html");
        return;
      }
      if (!isPhone()) showDesktopLink();
    })
    .catch(() => setNotice("Could not load verification.", "error"));
})();
