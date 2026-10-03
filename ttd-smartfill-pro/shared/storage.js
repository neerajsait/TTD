(function (root) {
  "use strict";

  const { DEFAULT_STATE, DEFAULT_SETTINGS, STORAGE_KEY, VERSION } = root.TTDConstants;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function mergeState(raw) {
    const state = raw && typeof raw === "object" ? raw : {};
    const settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };
    const general = { ...DEFAULT_STATE.general, ...(state.general || {}) };
    const profiles = Array.isArray(state.profiles)
      ? state.profiles
          .filter((profile) => profile && typeof profile === "object")
          .map((profile) => ({
            id: String(profile.id || createId()),
            fullName: String(profile.fullName || "").trim(),
            age: String(profile.age || "").trim(),
            gender: String(profile.gender || "").trim(),
            idProof: String(profile.idProof || "").trim(),
            idNumber: String(profile.idNumber || "").trim(),
            updatedAt: profile.updatedAt || new Date().toISOString()
          }))
      : [];

    return {
      version: VERSION,
      general: {
        email: String(general.email || "").trim(),
        city: String(general.city || "").trim(),
        state: String(general.state || "").trim(),
        country: String(general.country || "").trim(),
        pincode: String(general.pincode || "").trim()
      },
      profiles,
      defaultProfileId: profiles.some((profile) => profile.id === state.defaultProfileId)
        ? state.defaultProfileId
        : profiles[0]?.id || null,
      settings
    };
  }

  async function getState() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return mergeState(stored[STORAGE_KEY]);
  }

  async function saveState(next) {
    const state = mergeState(next);
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return state;
  }

  async function updateState(updater) {
    const current = await getState();
    const next = typeof updater === "function" ? updater(clone(current)) : { ...current, ...updater };
    return saveState(next);
  }

  async function saveGeneral(general) {
    return updateState((state) => ({ ...state, general: { ...state.general, ...general } }));
  }

  async function saveSettings(settings) {
    return updateState((state) => ({ ...state, settings: { ...state.settings, ...settings } }));
  }

  async function upsertProfile(profile) {
    return updateState((state) => {
      const normalized = {
        id: String(profile.id || createId()),
        fullName: String(profile.fullName || "").trim(),
        age: String(profile.age || "").trim(),
        gender: String(profile.gender || "").trim(),
        idProof: String(profile.idProof || "").trim(),
        idNumber: String(profile.idNumber || "").trim(),
        updatedAt: new Date().toISOString()
      };
      const index = state.profiles.findIndex((item) => item.id === normalized.id);
      const profiles = [...state.profiles];
      if (index === -1) profiles.unshift(normalized);
      else profiles[index] = normalized;
      return {
        ...state,
        profiles,
        defaultProfileId: state.defaultProfileId || normalized.id
      };
    });
  }

  async function deleteProfile(id) {
    return updateState((state) => {
      const profiles = state.profiles.filter((profile) => profile.id !== id);
      return {
        ...state,
        profiles,
        defaultProfileId:
          state.defaultProfileId === id ? profiles[0]?.id || null : state.defaultProfileId
      };
    });
  }

  function exportPayload(state) {
    return {
      app: "TTD SmartFill Pro",
      version: VERSION,
      exportedAt: new Date().toISOString(),
      general: state.general,
      profiles: state.profiles,
      defaultProfileId: state.defaultProfileId,
      settings: state.settings
    };
  }

  function validateImport(input) {
    if (!input || typeof input !== "object") throw new Error("The backup is not a JSON object.");
    if (input.app && input.app !== "TTD SmartFill Pro") {
      throw new Error("This backup belongs to a different app.");
    }
    const imported = mergeState(input);
    if (!imported.general && !Array.isArray(imported.profiles)) {
      throw new Error("The backup does not contain TTD SmartFill data.");
    }
    return imported;
  }

  root.TTDStorage = {
    clone,
    createId,
    getState,
    saveState,
    updateState,
    saveGeneral,
    saveSettings,
    upsertProfile,
    deleteProfile,
    exportPayload,
    validateImport,
    mergeState
  };
})(globalThis);