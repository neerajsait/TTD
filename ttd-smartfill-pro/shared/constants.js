(function (root) {
  "use strict";

  const DEFAULT_SETTINGS = {
    autoFillOnLoad: true,
    fillSpeed: "human",
    overwriteExisting: false,
    theme: "system",
    shortcut: "Ctrl+Shift+F"
  };

  const DEFAULT_STATE = {
    general: {
      email: "",
      city: "",
      state: "",
      country: "India",
      pincode: ""
    },
    profiles: [],
    defaultProfileId: null,
    settings: DEFAULT_SETTINGS
  };

  const GENERAL_FIELDS = [
    { key: "email", label: "Email Address", type: "email", autocomplete: "email", required: true },
    { key: "city", label: "City", type: "text", required: true },
    { key: "state", label: "State", type: "text", required: true },
    { key: "country", label: "Country", type: "text", required: true },
    { key: "pincode", label: "Pincode", type: "text", required: true }
  ];

  const PROFILE_FIELDS = [
    { key: "fullName", label: "Full Name", type: "text", required: true },
    { key: "age", label: "Age", type: "number", required: true },
    { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"], required: true },
    { key: "idProof", label: "Photo ID Proof", type: "select", options: ["Aadhaar Card", "Passport"], required: true },
    { key: "idNumber", label: "Photo ID Number", type: "text", required: true }
  ];

  root.TTDConstants = Object.freeze({
    DEFAULT_SETTINGS,
    DEFAULT_STATE,
    GENERAL_FIELDS,
    PROFILE_FIELDS,
    STORAGE_KEY: "ttdSmartFillState",
    VERSION: 1
  });
})(globalThis);