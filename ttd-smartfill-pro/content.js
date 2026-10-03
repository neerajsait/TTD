(function () {
  "use strict";

  const ROOT_ID = "ttd-smartfill-pro-root";
  let state;
  let autoFillTimer;
  let autoFillStarted = false;
  const AUTO_FILL_POLL_MS = 350;
  const AUTO_FILL_SETTLE_MS = 900;
  const AUTO_FILL_MAX_WAIT_MS = 30000;

  function toast(message, tone = "success") {
    let host = document.getElementById(ROOT_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = ROOT_ID;
      host.style.position = "fixed";
      host.style.inset = "0";
      host.style.zIndex = "2147483647";
      host.style.pointerEvents = "none";
      document.documentElement.appendChild(host);
    }
    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    shadow.querySelector(".ttd-toast")?.remove();
    const node = document.createElement("div");
    node.className = `ttd-toast ${tone}`;
    node.textContent = message;
    shadow.appendChild(node);
    if (!shadow.querySelector("style")) {
      const style = document.createElement("style");
      style.textContent = `
        .ttd-toast {
          position: fixed; right: 22px; bottom: 22px; max-width: 360px;
          padding: 13px 16px; border-radius: 12px; color: #fff;
          font: 600 13px/1.4 system-ui, sans-serif; letter-spacing: .01em;
          box-shadow: 0 12px 32px rgba(20, 29, 45, .24);
          animation: ttd-toast-in .2s ease-out;
        }
        .ttd-toast.success { background: #176b54; }
        .ttd-toast.info { background: #174e78; }
        .ttd-toast.error { background: #a33c49; }
        @keyframes ttd-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `;
      shadow.appendChild(style);
    }
    window.setTimeout(() => node.remove(), 4200);
  }

  function getDefaultProfile() {
    return state?.profiles.find((profile) => profile.id === state.defaultProfileId) || state?.profiles[0] || null;
  }

  function getProfilesInFillOrder() {
    const defaultProfile = getDefaultProfile();
    const remaining = (state?.profiles || []).filter((profile) => profile.id !== defaultProfile?.id);
    return defaultProfile ? [defaultProfile, ...remaining] : remaining;
  }

  async function runFill(profileOrProfiles = null, allVisible = false) {
    if (!state) state = await TTDStorage.getState();
    if (window.__ttdSmartFillDone || autoFillStarted) {
      return { skipped: true, filled: 0, profilesUsed: 0 };
    }
    const profiles = Array.isArray(profileOrProfiles)
      ? profileOrProfiles
      : profileOrProfiles
        ? [profileOrProfiles]
        : getProfilesInFillOrder();
    const generalSaved = Object.values(state.general).some(Boolean);
    if (!profiles.length && !generalSaved) {
      toast("Add General Details and at least one pilgrim profile in SmartFill.", "info");
      return;
    }
    autoFillStarted = true;
    window.clearTimeout(autoFillTimer);
    window.__ttdSmartFillDone = false;
    try {
      const result = await TTDFiller.fill({
        general: state.general,
        profiles,
        allVisible,
        speed: state.settings.fillSpeed,
        overwriteExisting: state.settings.overwriteExisting
      });
      window.__ttdSmartFillDone = true;
      const rowMessage = result.profilesUsed
        ? ` Used ${result.profilesUsed} profile${result.profilesUsed === 1 ? "" : "s"} for ${result.profilesUsed === 1 ? "the first row" : "the first rows"}.`
        : "";
      toast(result.filled
        ? `Filled ${result.filled} field${result.filled === 1 ? "" : "s"}.${rowMessage} Review before continuing.`
        : "No empty supported fields were found.", result.filled ? "success" : "info");
    } catch (error) {
      autoFillStarted = false;
      window.__ttdSmartFillDone = false;
      toast("SmartFill could not complete this form. Try the manual button again.", "error");
      console.error("[TTD SmartFill]", error);
    }
  }

  async function autoFill() {
    state = await TTDStorage.getState();
    if (!state.settings.autoFillOnLoad) return;
    if (!state.profiles.length && !Object.values(state.general).some(Boolean)) return;
    scheduleInitialFill();
  }

  function bookingFormIsPresent() {
    const groups = TTDFields.profileFieldGroups();
    const generalFields = TTDFields.GENERAL_KEYS.filter((key) => TTDFields.findFirst(key));
    return {
      ready: groups.length > 0 || generalFields.length > 0,
      signature: [
        groups.length,
        groups.map((group) => TTDFields.PROFILE_KEYS
          .map((key) => group.fields?.[key] ? "1" : "0")
          .join(""))
          .join("|"),
        generalFields.join(",")
      ].join(":")
    };
  }

  function scheduleInitialFill(startedAt = Date.now(), previousSignature = "", stableSince = 0) {
    if (autoFillStarted || !state?.settings.autoFillOnLoad) return;
    if (window.__ttdSmartFillDone) return;
    if (Date.now() - startedAt >= AUTO_FILL_MAX_WAIT_MS) return;

    const form = bookingFormIsPresent();
    if (form.ready) {
      const now = Date.now();
      const nextStableSince = form.signature === previousSignature && stableSince
        ? stableSince
        : now;
      if (now - nextStableSince >= AUTO_FILL_SETTLE_MS) {
        autoFillTimer = window.setTimeout(() => runFill(null, true), 0);
        return;
      }
      window.clearTimeout(autoFillTimer);
      autoFillTimer = window.setTimeout(
        () => scheduleInitialFill(startedAt, form.signature, nextStableSince),
        AUTO_FILL_POLL_MS
      );
      return;
    }
    autoFillTimer = window.setTimeout(
      () => scheduleInitialFill(startedAt, "", 0),
      AUTO_FILL_POLL_MS
    );
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "FILL_SELECTED") {
      TTDStorage.getState().then((next) => {
        state = next;
        const profile = state.profiles.find((item) => item.id === message.profileId) || getDefaultProfile();
        runFill(profile, false).then((result) => sendResponse({ ok: !result?.skipped, ...result }));
      });
      return true;
    }
    if (message?.type === "FILL_ALL_VISIBLE") {
      TTDStorage.getState().then((next) => {
        state = next;
        runFill(null, true).then((result) => sendResponse({ ok: !result?.skipped, ...result }));
      });
      return true;
    }
    if (message?.type === "PING") {
      sendResponse({ ok: true, supported: true, title: document.title });
    }
  });

  window.addEventListener("keydown", (event) => {
    if (!state?.settings.shortcut) return;
    const shortcut = state.settings.shortcut.toLowerCase().replace(/\s/g, "");
    const current = [
      event.ctrlKey ? "ctrl" : "",
      event.metaKey ? "meta" : "",
      event.shiftKey ? "shift" : "",
      event.altKey ? "alt" : "",
      event.key.toLowerCase()
    ].join("");
    if (shortcut.replace(/\+/g, "") === current) {
      event.preventDefault();
      runFill(null, true);
    }
  });

  autoFill();
})();