const DOC_TYPES = new Set(["national_id", "passport", "driving_licence"]);
const MAX_FILE = 4 * 1024 * 1024;

const DOC_LABELS = {
  national_id: "National ID Card",
  passport: "Passport",
  driving_licence: "Driving Licence",
};

function cleanText(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isoDate(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function ageYears(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return -1;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const now = new Date();
  let age = now.getUTCFullYear() - year;
  const m = now.getUTCMonth() + 1 - month;
  if (m < 0 || (m === 0 && now.getUTCDate() < day)) age -= 1;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return -1;
  }
  return age;
}

function detectMime(buf) {
  if (!buf || buf.length < 12) return "";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return "";
}

function safeName(name, fallback) {
  const base = String(name || fallback)
    .split(/[/\\]/)
    .pop()
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .slice(0, 120);
  return base || fallback;
}

function validatePersonal(fields) {
  const errors = {};
  const fullName = cleanText(fields.fullName, 120);
  const dateOfBirth = isoDate(fields.dateOfBirth);
  const country = cleanText(fields.country, 80);
  const address = cleanText(fields.address, 240);
  const city = cleanText(fields.city, 80);
  const postalCode = cleanText(fields.postalCode, 16);
  const documentType = String(fields.documentType || "").trim();

  if (!/^[\p{L}][\p{L}\s.'-]{1,119}$/u.test(fullName)) {
    errors.fullName = "Enter your full legal name.";
  }
  const age = ageYears(dateOfBirth);
  if (age < 18 || age > 120) {
    errors.dateOfBirth = "You must be at least 18 years old.";
  }
  if (country.length < 2) errors.country = "Select your country of residence.";
  if (address.length < 8) errors.address = "Enter your full residential address.";
  if (city.length < 2) errors.city = "Enter your city.";
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,15}$/.test(postalCode)) {
    errors.postalCode = "Enter a valid postal code.";
  }
  if (!DOC_TYPES.has(documentType)) {
    errors.documentType = "Select a document type.";
  }

  return {
    errors,
    value: { fullName, dateOfBirth, country, address, city, postalCode, documentType },
  };
}

function validateLocation(fields) {
  const latitude = Number(fields.latitude);
  const longitude = Number(fields.longitude);
  const accuracy = Number(fields.accuracy);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: "Share your location before submitting." };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: "Share your location before submitting." };
  }
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
  };
}

function checkFile(file, slot, { imageOnly }) {
  if (!file || !file.buffer || !file.buffer.length) {
    return { error: slot === "selfie" ? "Add a selfie photo." : "Add this document image." };
  }
  if (file.buffer.length > MAX_FILE) {
    return { error: "This file is larger than 4 MB." };
  }
  const mime = detectMime(file.buffer);
  if (!mime) {
    return { error: "Use a JPG, PNG, WEBP, or PDF file." };
  }
  if (imageOnly && mime === "application/pdf") {
    return { error: "The selfie must be a photo, not a PDF." };
  }
  return {
    file: {
      slot,
      mime,
      size: file.buffer.length,
      name: safeName(file.filename, slot),
      buffer: file.buffer,
    },
  };
}

function validateFiles(files, documentType) {
  const errors = {};
  const accepted = [];
  const front = checkFile(files.front, "front", { imageOnly: false });
  if (front.error) errors.front = front.error;
  else accepted.push(front.file);

  if (documentType !== "passport") {
    const back = checkFile(files.back, "back", { imageOnly: false });
    if (back.error) errors.back = "Add the back of the document.";
    else accepted.push(back.file);
  } else if (files.back && files.back.buffer && files.back.buffer.length) {
    const back = checkFile(files.back, "back", { imageOnly: false });
    if (back.error) errors.back = back.error;
    else accepted.push(back.file);
  }

  const selfie = checkFile(files.selfie, "selfie", { imageOnly: true });
  if (selfie.error) errors.selfie = selfie.error;
  else accepted.push(selfie.file);

  return { errors, files: accepted };
}

function mapApplication(row, documents) {
  if (!row) return null;
  return {
    id: String(row.id),
    status: String(row.status),
    fullName: String(row.full_name || ""),
    dateOfBirth: isoDate(row.date_of_birth),
    country: String(row.country || ""),
    address: String(row.address || ""),
    city: String(row.city || ""),
    postalCode: String(row.postal_code || ""),
    documentType: String(row.document_type || ""),
    documentLabel: DOC_LABELS[row.document_type] || String(row.document_type || ""),
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : "",
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at || null,
    documents: (documents || []).map((doc) => ({
      id: String(doc.id),
      slot: String(doc.slot),
      fileName: String(doc.file_name || ""),
      mime: String(doc.mime || ""),
      sizeBytes: Number(doc.size_bytes || 0),
    })),
  };
}

module.exports = {
  DOC_TYPES,
  DOC_LABELS,
  MAX_FILE,
  validatePersonal,
  validateLocation,
  validateFiles,
  mapApplication,
  detectMime,
};
