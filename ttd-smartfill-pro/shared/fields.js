(function (root) {
  "use strict";

  const GENERAL_KEYS = ["email", "city", "state", "country", "pincode"];
  const PROFILE_KEYS = ["fullName", "age", "gender", "idProof", "idNumber"];
  const token = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/photo\s*id|proof\s*of\s*identity/g, "id")
      .replace(/pincode|pin\s*code|postal\s*code|zip\s*code/g, "pincode")
      .replace(/full\s*name|pilgrim\s*name/g, "name")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const aliases = {
    email: ["email", "email address", "pilgrim email"],
    city: ["city", "town", "pilgrim city"],
    state: ["state", "province", "pilgrim state"],
    country: ["country", "nation", "pilgrim country"],
    pincode: ["pincode", "pin code", "postal code", "zip code", "pilgrim pincode"],
    fullName: ["name", "full name", "pilgrim name", "devotee name"],
    age: ["age", "pilgrim age"],
    gender: ["gender", "sex"],
    idProof: ["id proof", "id type", "photo id", "photo id proof", "identity proof", "identity type"],
    idNumber: ["id number", "photo id number", "identity number", "document number"]
  };

  function visible(element) {
    if (!element || !(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function associatedLabel(element) {
    const labels = [];
    if (element.id) {
      document.querySelectorAll(`label[for="${CSS.escape(element.id)}"]`).forEach((label) => labels.push(label.textContent));
    }
    const wrapper = element.closest("label");
    if (wrapper) labels.push(wrapper.textContent);
    const parent = element.parentElement;
    if (parent) {
      parent.querySelectorAll(":scope > label, :scope > div > label").forEach((label) => labels.push(label.textContent));
    }
    return labels.join(" ");
  }

  function descriptor(element) {
    const attributes = [
      element.name,
      element.id,
      element.getAttribute("label"),
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("autocomplete"),
      associatedLabel(element)
    ];
    return token(attributes.filter(Boolean).join(" "));
  }

  function matchesKey(element, key) {
    const text = descriptor(element);
    const exactName = token(element.name || "");
    if (key === "email" && (exactName === "pilgrimemail" || exactName === "email")) return true;
    if (key === "city" && exactName === "pilgrimcity") return true;
    if (key === "state" && exactName === "pilgrimstate") return true;
    if (key === "country" && exactName === "pilgrimcountry") return true;
    if (key === "pincode" && exactName === "pilgrimpincode") return true;
    if (key === "fullName" && ["name", "fullname", "pilgrimname"].includes(exactName)) return true;
    if (key === "idProof" && ["idtype", "idproof"].includes(exactName)) return true;
    if (key === "idNumber" && ["idnumber", "photoidnumber"].includes(exactName)) return true;
    return aliases[key].some((alias) => text === token(alias) || text.includes(token(alias)));
  }

  function candidates(rootElement = document) {
    return [...rootElement.querySelectorAll("input, select, textarea, [role='combobox'], [contenteditable='true']")]
      .filter((element) => visible(element) && !element.readOnly || visible(element) && ["gender", "idtype", "idproof"].includes(token(element.name)));
  }

  function findFields(key, rootElement = document) {
    return candidates(rootElement).filter((element) => matchesKey(element, key));
  }

  function documentOrder(element) {
    return [...document.querySelectorAll("input, select, textarea, [role='combobox'], [contenteditable='true']")].indexOf(element);
  }

  function containsExactlyOneName(container, names) {
    return names.filter((name) => container.contains(name)).length === 1;
  }

  function isLikelyPilgrimContainer(element) {
    return element.matches(
      "tr, [role='row'], fieldset, [data-pilgrim], [class*='pilDetails'], [class*='pilgrimDetails'], [class*='pilgrimRow'], [class*='passenger']"
    );
  }

  function findPilgrimContainer(nameField, names) {
    let current = nameField.parentElement;
    let best = null;
    for (let depth = 0; current && depth < 12; depth += 1, current = current.parentElement) {
      if (!containsExactlyOneName(current, names)) {
        if (best) break;
        continue;
      }
      const fieldCount = PROFILE_KEYS.filter((key) => findFields(key, current).length > 0).length;
      if (fieldCount >= 3) best = current;
      if (isLikelyPilgrimContainer(current) && fieldCount >= 3) return current;
    }
    return best;
  }

  function groupFieldsByPosition(names) {
    const groups = names.map((nameField) => ({
      root: null,
      fields: { fullName: nameField }
    }));
    const namePositions = names.map(documentOrder);

    PROFILE_KEYS.filter((key) => key !== "fullName").forEach((key) => {
      findFields(key).forEach((field) => {
        const position = documentOrder(field);
        const groupIndex = namePositions.findIndex((start, index) => {
          const end = namePositions[index + 1] ?? Number.POSITIVE_INFINITY;
          return position >= start && position < end;
        });
        if (groupIndex >= 0 && !groups[groupIndex].fields[key]) {
          groups[groupIndex].fields[key] = field;
        }
      });
    });
    return groups;
  }

  function profileFieldGroups(rootElement = document) {
    const names = findFields("fullName", rootElement);
    if (!names.length) return [];

    const groups = names.map((nameField) => ({
      root: findPilgrimContainer(nameField, names),
      fields: { fullName: nameField }
    }));
    const distinctRoots = groups.every((group) => group.root) &&
      new Set(groups.map((group) => group.root)).size === groups.length;

    if (!distinctRoots) return groupFieldsByPosition(names);

    PROFILE_KEYS.filter((key) => key !== "fullName").forEach((key) => {
      groups.forEach((group) => {
        group.fields[key] = findFirst(key, group.root);
      });
    });
    return groups;
  }

  function nearestRow(element) {
    return findPilgrimContainer(element, findFields("fullName")) || element.parentElement || document.body;
  }

  function profileRows(rootElement = document) {
    return profileFieldGroups(rootElement).map((group) => group.root || group.fields.fullName);
  }

  function groupField(group, key) {
    if (!group) return null;
    return group.fields ? group.fields[key] || null : findFirst(key, group);
  }

  function findFirst(key, rootElement = document) {
    return findFields(key, rootElement)[0] || null;
  }

  function normalize(value) {
    return token(value).replace(/\bcard\b/g, "").trim();
  }

  function valueMatches(actual, expected) {
    const left = normalize(actual);
    const right = normalize(expected);
    if (!left || !right) return false;
    if (left === right || left.includes(right) || right.includes(left)) return true;
    if (right === "aadhaar" && (left.includes("aadhar") || left.includes("aadhaar"))) return true;
    return false;
  }

  root.TTDFields = {
    GENERAL_KEYS,
    PROFILE_KEYS,
    visible,
    token,
    descriptor,
    matchesKey,
    candidates,
    findFields,
    findFirst,
    profileRows,
    profileFieldGroups,
    groupField,
    nearestRow,
    valueMatches
  };
})(globalThis);