(function () {
  "use strict";

  let state;
  let editingId = null;
  let messageTimer;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function showMessage(text, error = false) {
    const node = $("#message");
    node.textContent = text;
    node.classList.toggle("error", error);
    node.classList.add("visible");
    window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => node.classList.remove("visible"), 2800);
  }

  function applyTheme() {
    document.body.dataset.theme = state?.settings.theme || "system";
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab;
  }

  async function sendToPage(message) {
    const tab = await activeTab();
    if (!tab?.id) throw new Error("No active tab.");
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      throw new Error("Open a supported TTD booking page first.");
    }
  }

  async function refreshStatus() {
    const status = $("#portal-status");
    const text = $("#portal-status-text");
    try {
      const response = await sendToPage({ type: "PING" });
      status.classList.toggle("ready", Boolean(response?.supported));
      text.textContent = response?.supported ? "TTD booking page detected" : "Open a supported TTD page";
    } catch {
      status.classList.remove("ready");
      text.textContent = "Open a supported TTD booking page";
    }
  }

  function setForm(form, values) {
    Object.entries(values || {}).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = value || "";
    });
  }

  function profileInitials(name) {
    return String(name || "P").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }

  function renderProfiles() {
    const query = $("#profile-search").value.trim().toLowerCase();
    const list = $("#profile-list");
    const filtered = state.profiles.filter((profile) => profile.fullName.toLowerCase().includes(query));
    $("#profile-count").textContent = String(state.profiles.length);
    $("#profile-empty").hidden = filtered.length > 0;
    list.innerHTML = "";
    filtered.forEach((profile) => {
      const card = document.createElement("article");
      card.className = `profile-card ${profile.id === state.defaultProfileId ? "selected" : ""}`;
      card.innerHTML = `
        <div class="avatar">${profileInitials(profile.fullName)}</div>
        <div>
          <div class="profile-name">${escapeHtml(profile.fullName || "Unnamed profile")}</div>
          <div class="profile-meta">${escapeHtml(profile.gender || "Gender not set")} · ${escapeHtml(profile.age || "Age not set")} · ${escapeHtml(profile.idProof || "ID not set")}</div>
          ${profile.id === state.defaultProfileId ? '<div class="default-label">DEFAULT PROFILE</div>' : ""}
        </div>
        <div class="card-actions">
          <button class="mini-button fill" data-action="fill" data-id="${profile.id}">Fill</button>
          <button class="mini-button" data-action="edit" data-id="${profile.id}" aria-label="Edit ${escapeHtml(profile.fullName)}">Edit</button>
          <button class="mini-button" data-action="duplicate" data-id="${profile.id}" aria-label="Duplicate ${escapeHtml(profile.fullName)}">Copy</button>
          <button class="mini-button" data-action="delete" data-id="${profile.id}" aria-label="Delete ${escapeHtml(profile.fullName)}">Delete</button>
        </div>`;
      list.appendChild(card);
    });
    if (!state.profiles.length) $("#profile-empty").hidden = false;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[character]));
  }

  function openProfileForm(profile = null) {
    editingId = profile?.id || null;
    const form = $("#profile-form");
    form.hidden = false;
    $("#profile-form-title").textContent = profile ? "Edit profile" : "New profile";
    setForm(form, profile || {});
    form.elements.namedItem("fullName").focus();
  }

  function closeProfileForm() {
    editingId = null;
    $("#profile-form").hidden = true;
    $("#profile-form").reset();
  }

  function downloadBackup() {
    const payload = JSON.stringify(TTDStorage.exportPayload(state), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ttd-smartfill-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showMessage("Backup exported.");
  }

  async function importBackup(file) {
    const content = await file.text();
    const imported = TTDStorage.validateImport(JSON.parse(content));
    state = await TTDStorage.saveState(imported);
    renderProfiles();
    setForm($("#general-form"), state.general);
    applyTheme();
    showMessage("Backup imported.");
  }

  function bindEvents() {
    $$(".tab").forEach((button) => button.addEventListener("click", () => {
      $$(".tab").forEach((item) => item.classList.toggle("active", item === button));
      $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `${button.dataset.tab}-panel`));
    }));

    $("#general-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state = await TTDStorage.saveGeneral(Object.fromEntries(form.entries()));
      showMessage("General Details saved.");
    });

    $("#profile-search").addEventListener("input", renderProfiles);
    $("#new-profile").addEventListener("click", () => openProfileForm());
    $("#empty-new-profile").addEventListener("click", () => openProfileForm());
    $("#cancel-profile").addEventListener("click", closeProfileForm);

    $("#profile-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      values.id = editingId || undefined;
      state = await TTDStorage.upsertProfile(values);
      closeProfileForm();
      renderProfiles();
      showMessage("Profile saved.");
    });

    $("#profile-list").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const profile = state.profiles.find((item) => item.id === button.dataset.id);
      if (!profile) return;
      if (button.dataset.action === "edit") openProfileForm(profile);
      if (button.dataset.action === "fill") {
        await sendToPage({ type: "FILL_SELECTED", profileId: profile.id });
        showMessage(`Filled ${profile.fullName}.`);
      }
      if (button.dataset.action === "duplicate") {
        await TTDStorage.upsertProfile({
          ...profile,
          id: undefined,
          fullName: `${profile.fullName} (copy)`
        }).then((next) => { state = next; });
        renderProfiles();
        showMessage("Profile duplicated.");
      }
      if (button.dataset.action === "delete") {
        if (!window.confirm(`Delete ${profile.fullName || "this profile"}?`)) return;
        state = await TTDStorage.deleteProfile(profile.id);
        renderProfiles();
        showMessage("Profile deleted.");
      }
    });

    $("#fill-all-general").addEventListener("click", async () => {
      await sendToPage({ type: "FILL_ALL_VISIBLE" });
      showMessage("Filled all visible fields.");
    });
    $("#export-data").addEventListener("click", downloadBackup);
    $("#import-data").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try { await importBackup(file); } catch (error) { showMessage(error.message || "Could not import backup.", true); }
      event.target.value = "";
    });
    $("#open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
    $("#privacy-link").addEventListener("click", () => chrome.runtime.openOptionsPage());
  }

  async function init() {
    state = await TTDStorage.getState();
    setForm($("#general-form"), state.general);
    renderProfiles();
    applyTheme();
    bindEvents();
    refreshStatus();
  }

  init().catch((error) => showMessage(error.message || "Could not load SmartFill.", true));
})();