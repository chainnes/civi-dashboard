/**
 * Waitlist messages live here so they are easy to translate.
 * The rest of the page copy lives in index.html.
 *
 * Replace the two placeholders before the form can save a row.
 * Use the Supabase anon key only. Never put the service role key here.
 */
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";

const COPY = {
  nameRequired: "Enter your name.",
  nameInvalid: "Use letters in the name you want us to call you by.",
  emailRequired: "Enter your email.",
  emailInvalid: "That email does not look complete.",
  locationInvalid: "Use a province or city name, or leave this blank.",
  roleRequired: "Choose a role.",
  success: "Salamat. You're on the list. We'll write when there's news.",
  duplicate: "That email is already on the waitlist.",
  notConfigured:
    "The waitlist is not connected yet. The Supabase URL and anon key are still placeholders.",
  denied: "The waitlist did not accept this submission. Check the Supabase URL and anon key.",
  error: "We could not save your details. Check your connection and try again.",
  sending: "Sending…",
};

const ROLES = new Set([
  "resident",
  "commuter",
  "OFW family",
  "small business",
  "journalist",
  "researcher",
]);

const form = document.querySelector("#waitlist-form");
const statusEl = document.querySelector("#form-status");

function isPlaceholderConfig() {
  return (
    !SUPABASE_URL ||
    SUPABASE_URL.includes("YOUR_PROJECT") ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY === "your-anon-key"
  );
}

function setFieldError(input, message) {
  const error = document.getElementById(`${input.id}-error`);
  if (!error) return;
  if (message) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", error.id);
    error.hidden = false;
    error.textContent = message;
  } else {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
    error.hidden = true;
    error.textContent = "";
  }
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = message ? `form-status is-${kind}` : "form-status";
  statusEl.setAttribute("role", kind === "error" ? "alert" : "status");
  if (message) statusEl.focus();
}

function validate(fields) {
  let firstInvalid = null;

  const name = fields.name.value.trim();
  let nameMessage = "";
  if (!name) nameMessage = COPY.nameRequired;
  else if (!/^[\p{L}][\p{L}\s.'’-]{1,79}$/u.test(name)) nameMessage = COPY.nameInvalid;
  setFieldError(fields.name, nameMessage);
  if (nameMessage) firstInvalid = firstInvalid || fields.name;

  const email = fields.email.value.trim();
  let emailMessage = "";
  if (!email) emailMessage = COPY.emailRequired;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    emailMessage = COPY.emailInvalid;
  }
  setFieldError(fields.email, emailMessage);
  if (emailMessage) firstInvalid = firstInvalid || fields.email;

  const location = fields.location.value.trim();
  let locationMessage = "";
  if (location && (location.length > 120 || !/^[\p{L}\p{N}\s.,'’/-]{1,120}$/u.test(location))) {
    locationMessage = COPY.locationInvalid;
  }
  setFieldError(fields.location, locationMessage);
  if (locationMessage) firstInvalid = firstInvalid || fields.location;

  const roleMessage = ROLES.has(fields.role.value) ? "" : COPY.roleRequired;
  setFieldError(fields.role, roleMessage);
  if (roleMessage) firstInvalid = firstInvalid || fields.role;

  return {
    ok: !firstInvalid,
    firstInvalid,
    payload: {
      name,
      email: email.toLowerCase(),
      location: location || null,
      role: fields.role.value,
    },
  };
}

async function submitWaitlist(payload) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) return "ok";
  if (response.status === 409) return "duplicate";
  if (response.status === 401 || response.status === 403) return "denied";
  return "error";
}

if (form && statusEl) {
  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = submitButton.textContent;
  const fields = {
    name: form.elements.name,
    email: form.elements.email,
    location: form.elements.location,
    role: form.elements.role,
  };

  Object.values(fields).forEach((input) => {
    input.addEventListener("input", () => setFieldError(input, ""));
    input.addEventListener("change", () => setFieldError(input, ""));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", "");

    const result = validate(fields);
    if (!result.ok) {
      result.firstInvalid.focus();
      return;
    }

    if (isPlaceholderConfig()) {
      setStatus(COPY.notConfigured, "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = COPY.sending;

    try {
      const outcome = await submitWaitlist(result.payload);
      if (outcome === "ok") {
        form.reset();
        setStatus(COPY.success, "success");
      } else if (outcome === "duplicate") {
        setStatus(COPY.duplicate, "error");
      } else if (outcome === "denied") {
        setStatus(COPY.denied, "error");
      } else {
        setStatus(COPY.error, "error");
      }
    } catch {
      setStatus(COPY.error, "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitLabel;
    }
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* The page still works if the worker does not install. */
    });
  });
}
