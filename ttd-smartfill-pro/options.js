(function () {
  "use strict";

  let state;
  let saveTimer;
  const $ = (selector) => document.querySelector(selector);

  function render() {
    document.body.dataset.theme = state.settings.theme;
    $("#auto-fill").checked = state.settings.autoFillOnLoad;
    $("#overwrite").checked = state.settings.overwriteExisting;
    $("#fill-speed").value = state.settings.fillSpeed;
    $("#shortcut").value = state.settings.shortcut;
    const profileSelect = $("#default-profile");
    profileSelect.innerHTML = "";
    if (!state.profiles.length) {
      profileSelect.add(new Option("No profiles created", ""));
      profileSelect.disabled = true;
      $("#default-profile-hint").textContent = "Create a profile from the extension popup to choose it here.";
    } else {
      profileSelect.disabled = false;
      state.profiles.forEach((profile) => profileSelect.add(new Option(profile.fullName || "Unnamed profile", profile.id)));
      profileSelect.value = state.defaultProfileId || state.profiles[0].id;
      $("#default-profile-hint").textContent = "The default profile is used for auto-fill and the keyboard shortcut.";
    }
    document.querySelectorAll(".theme-option").forEach((button) => {
      button.classList.toggle("active", button.dataset.theme === state.settings.theme);
    });
  }

  async function save() {
    state = await TTDStorage.saveSettings({
      autoFillOnLoad: $("#auto-fill").checked,
      overwriteExisting: $("#overwrite").checked,
      fillSpeed: $("#fill-speed").value,
      shortcut: $("#shortcut").value.trim() || "Ctrl+Shift+F",
      theme: state.settings.theme
    });
    if ($("#default-profile").value) {
      state = await TTDStorage.saveState({ ...state, defaultProfileId: $("#default-profile").value });
    }
    render();
    const message = $("#saved-message");
    message.classList.add("visible");
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => message.classList.remove("visible"), 2300);
  }

  function bind() {
    $("#save-settings").addEventListener("click", save);
    document.querySelectorAll(".theme-option").forEach((button) => button.addEventListener("click", () => {
      state.settings.theme = button.dataset.theme;
      render();
    }));
    ["auto-fill", "overwrite", "fill-speed", "default-profile"].forEach((id) => {
      $(`#${id}`).addEventListener("change", () => {
        if (id !== "default-profile") save();
      });
    });
  }

  async function init() {
    state = await TTDStorage.getState();
    render();
    bind();
  }

  init();
})();