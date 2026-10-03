const STORAGE_KEY = "ttdSmartFillState";
const DEFAULT_SETTINGS = {
  autoFillOnLoad: true,
  fillSpeed: "human",
  overwriteExisting: false,
  theme: "system",
  shortcut: "Ctrl+Shift+F"
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!stored[STORAGE_KEY]) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        version: 1,
        general: { email: "", city: "", state: "", country: "India", pincode: "" },
        profiles: [],
        defaultProfileId: null,
        settings: DEFAULT_SETTINGS
      }
    });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "fill-all-visible") return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "FILL_ALL_VISIBLE", source: "keyboard" });
  } catch {
    // The active tab may not be a supported TTD page.
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_OPTIONS") return;
  chrome.runtime.openOptionsPage().then(() => sendResponse({ ok: true }));
  return true;
});