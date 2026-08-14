/*
 * examples/voice-form-filling/app.js
 * -----------------------------------------------------------------------------
 * Plain-JavaScript contact form with light validation.
 *
 * The whole point of this example is that the form is driven through ONE small
 * public API — `window.TTPFormFiller` — rather than by poking the DOM directly.
 *
 *   Phase 1 (this file):  a human fills the form and clicks Submit.
 *   Phase 2 (later):      a TTP voice agent client tool calls
 *                         TTPFormFiller.setField(name, value) to fill the form
 *                         field by field as the user speaks.
 *   Phase 3 (later):      the agent calls TTPFormFiller.submit() by voice and
 *                         the submitted data is shown on screen.
 *
 * Keeping that API stable and DOM details private is what makes the later
 * phases a drop-in: the voice client tool never needs to know the markup.
 * -----------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ---- Field definitions -----------------------------------------------------
  // The `name` of each control is the canonical key used everywhere: in the
  // returned data object, and as the argument a voice client tool will pass to
  // setField(). Cities are constrained to a known set (a <select>).

  var CITY_OPTIONS = ["istanbul", "ankara", "izmir", "antalya"];

  var FIELDS = ["firstName", "lastName", "phone", "city"];

  // ---- Element lookups -------------------------------------------------------

  var form = document.getElementById("contact-form");
  var resultPanel = document.getElementById("result");
  var resultJson = document.getElementById("result-json");
  var resetBtn = document.getElementById("reset-btn");

  function control(name) {
    return form.elements[name];
  }

  function fieldBlock(name) {
    var el = control(name);
    return el ? el.closest(".field") : null;
  }

  function errorEl(name) {
    return form.querySelector('[data-error-for="' + name + '"]');
  }

  // ---- Validation ------------------------------------------------------------
  // "Light" validation: every field is required, and the phone must look like a
  // plausible Turkish number. We normalise the phone before validating so the
  // agent (or a human) can type it in many shapes.

  /**
   * Normalise a Turkish phone number to +90XXXXXXXXXX where possible.
   * Accepts input like: "0532 123 45 67", "+90 532 123 45 67", "905321234567",
   * "532 123 4567". Returns the cleaned string (may still be invalid).
   */
  function normalizePhone(raw) {
    if (!raw) return "";
    var digits = String(raw).replace(/[^\d+]/g, "");

    // Strip a leading +90 / 90 / 0 country/trunk prefix down to the 10 national
    // digits, then re-attach +90.
    if (digits.indexOf("+90") === 0) {
      digits = digits.slice(3);
    } else if (digits.indexOf("90") === 0 && digits.length === 12) {
      digits = digits.slice(2);
    } else if (digits.indexOf("0") === 0) {
      digits = digits.slice(1);
    }
    digits = digits.replace(/\D/g, "");

    if (digits.length === 10) {
      return "+90" + digits;
    }
    // Not a clean 10-digit national number — return what we have for the
    // validator to reject.
    return String(raw).trim();
  }

  function isValidTurkishPhone(raw) {
    var norm = normalizePhone(raw);
    // +90 followed by 10 national digits; mobiles start with 5, landlines with
    // an area code 2-4. We keep it permissive: any 10-digit national number.
    return /^\+90\d{10}$/.test(norm);
  }

  /**
   * Validate one field. Returns an error string, or "" when valid.
   */
  function validateField(name, value) {
    var v = (value == null ? "" : String(value)).trim();

    switch (name) {
      case "firstName":
        return v ? "" : "First name is required.";
      case "lastName":
        return v ? "" : "Last name is required.";
      case "phone":
        if (!v) return "Phone number is required.";
        return isValidTurkishPhone(v)
          ? ""
          : "Enter a valid Turkish phone number (e.g. +90 532 123 45 67).";
      case "city":
        if (!v) return "Please select a city.";
        return CITY_OPTIONS.indexOf(v) === -1 ? "Unknown city." : "";
      default:
        return "";
    }
  }

  function showError(name, message) {
    var block = fieldBlock(name);
    var err = errorEl(name);
    if (block) block.classList.toggle("invalid", !!message);
    if (err) err.textContent = message || "";
  }

  function clearErrors() {
    FIELDS.forEach(function (name) {
      showError(name, "");
    });
  }

  // ---- Public API ------------------------------------------------------------
  // window.TTPFormFiller — the surface the voice client tool (phase 2) and the
  // voice submit flow (phase 3) will call. Everything above is private detail.

  var TTPFormFiller = {
    /** List of valid field keys. */
    fields: FIELDS.slice(),

    /** Allowed city values (lowercase). */
    cityOptions: CITY_OPTIONS.slice(),

    /**
     * Set a single field's value. This is what a voice agent calls to fill the
     * form field by field.
     *
     * @param {string} name  one of `fields`
     * @param {string} value the value to set
     * @returns {{ok: boolean, name: string, value: string, error: string}}
     */
    setField: function (name, value) {
      var el = control(name);
      if (!el || FIELDS.indexOf(name) === -1) {
        return { ok: false, name: name, value: value, error: "Unknown field: " + name };
      }

      var normalized = value == null ? "" : String(value).trim();

      if (name === "phone") {
        normalized = normalizePhone(normalized);
      }

      if (name === "city") {
        // Accept city by display name or value, case-insensitively.
        normalized = normalized.toLowerCase();
        if (CITY_OPTIONS.indexOf(normalized) === -1) {
          return {
            ok: false,
            name: name,
            value: value,
            error:
              "City must be one of: " + CITY_OPTIONS.join(", ") + ".",
          };
        }
      }

      el.value = normalized;

      // Live-validate this field and give a brief visual cue that it was filled
      // (nice when the agent is filling fields one at a time).
      var errMsg = validateField(name, normalized);
      showError(name, errMsg);
      flashFilled(name);

      return { ok: !errMsg, name: name, value: normalized, error: errMsg };
    },

    /**
     * Set several fields at once. Returns a per-field result map.
     * @param {Object} values e.g. { firstName: "Mehmet", city: "izmir" }
     */
    setFields: function (values) {
      var results = {};
      Object.keys(values || {}).forEach(function (name) {
        results[name] = TTPFormFiller.setField(name, values[name]);
      });
      return results;
    },

    /** Read the current form data as a plain object. */
    getData: function () {
      var data = {};
      FIELDS.forEach(function (name) {
        data[name] = (control(name).value || "").trim();
      });
      return data;
    },

    /**
     * Validate every field. Returns { valid, errors } where errors is a map of
     * field -> message for the invalid fields only.
     */
    validate: function () {
      var data = TTPFormFiller.getData();
      var errors = {};
      FIELDS.forEach(function (name) {
        var msg = validateField(name, data[name]);
        showError(name, msg);
        if (msg) errors[name] = msg;
      });
      return { valid: Object.keys(errors).length === 0, errors: errors };
    },

    /**
     * Validate and "submit". In this example there is no backend — we simply
     * render the collected data on screen. A real integration would POST
     * getData() somewhere here.
     *
     * @returns {{ok: boolean, data: Object, errors: Object}}
     */
    submit: function () {
      var check = TTPFormFiller.validate();
      if (!check.valid) {
        // Focus the first invalid field for convenience.
        var firstBad = FIELDS.filter(function (n) {
          return check.errors[n];
        })[0];
        if (firstBad) control(firstBad).focus();
        return { ok: false, data: TTPFormFiller.getData(), errors: check.errors };
      }

      var data = TTPFormFiller.getData();
      renderResult(data);
      return { ok: true, data: data, errors: {} };
    },

    /** Clear all fields, errors, and the result panel. */
    reset: function () {
      form.reset();
      clearErrors();
      resultPanel.hidden = true;
      resultJson.textContent = "";
      return { ok: true };
    },
  };

  // ---- View helpers ----------------------------------------------------------

  function flashFilled(name) {
    var block = fieldBlock(name);
    if (!block) return;
    block.classList.remove("just-filled");
    // Force reflow so the animation can restart if the same field is refilled.
    void block.offsetWidth;
    block.classList.add("just-filled");
  }

  function renderResult(data) {
    resultJson.textContent = JSON.stringify(data, null, 2);
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---- Wire up DOM events ----------------------------------------------------

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    TTPFormFiller.submit();
  });

  resetBtn.addEventListener("click", function () {
    TTPFormFiller.reset();
  });

  // Clear a field's error as the user edits it.
  FIELDS.forEach(function (name) {
    var el = control(name);
    if (!el) return;
    el.addEventListener("input", function () {
      showError(name, "");
    });
    el.addEventListener("change", function () {
      showError(name, "");
    });
  });

  // Expose the API.
  window.TTPFormFiller = TTPFormFiller;

  // Small convenience for manual testing from the console, e.g.:
  //   TTPFormFiller.setFields({ firstName: "Mehmet", lastName: "Yılmaz",
  //     phone: "0532 123 45 67", city: "izmir" });
  //   TTPFormFiller.submit();
})();
