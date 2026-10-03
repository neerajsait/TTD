(function (root) {
  "use strict";

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function setNativeValue(element, value) {
    if (!element) return;
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor?.set) descriptor.set.call(element, String(value ?? ""));
    else element.value = String(value ?? "");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function optionText(option) {
    return option?.textContent || option?.getAttribute("aria-label") || option?.getAttribute("data-value") || "";
  }

  function chooseNative(element, expected) {
    const options = [...element.options];
    const option = options.find(
      (item) =>
        root.TTDFields.valueMatches(item.value, expected) ||
        root.TTDFields.valueMatches(item.textContent, expected)
    );
    if (!option) return false;
    setNativeValue(element, option.value);
    return true;
  }

  function visibleChoice(expected) {
    const selector = [
      "[role='option']",
      "[role='menuitem']",
      "li",
      "button",
      "[data-value]",
      "[class*='option']",
      "[class*='dropdown'] div"
    ].join(",");
    return [...document.querySelectorAll(selector)]
      .filter(root.TTDFields.visible)
      .map((element) => ({ element, text: optionText(element).trim() }))
      .filter(({ text }) => text && text.length < 80 && root.TTDFields.valueMatches(text, expected))
      .sort((a, b) => a.text.length - b.text.length)[0]?.element;
  }

  async function chooseCustom(element, expected) {
    if (!element || element.disabled) return false;
    element.focus();
    element.click();
    await sleep(80);
    const choice = visibleChoice(expected);
    if (choice) {
      choice.click();
      await sleep(80);
      if (root.TTDFields.valueMatches(element.value, expected)) return true;
    }
    const inputEvent = new KeyboardEvent("keydown", { key: String(expected), bubbles: true });
    element.dispatchEvent(inputEvent);
    return root.TTDFields.valueMatches(element.value, expected);
  }

  async function selectValue(element, expected) {
    if (!element || !expected) return false;
    if (element instanceof HTMLSelectElement) return chooseNative(element, expected);
    return chooseCustom(element, expected);
  }

  async function fillText(element, value, overwriteExisting) {
    if (!element || !value || element.disabled || (element.value && !overwriteExisting)) return false;
    setNativeValue(element, value);
    return true;
  }

  function rowField(row, key) {
    return root.TTDFields.groupField(row, key);
  }

  async function fillGeneral(general, options) {
    let filled = 0;
    for (const key of root.TTDFields.GENERAL_KEYS) {
      const field = root.TTDFields.findFirst(key);
      if (await fillText(field, general[key], options.overwriteExisting)) filled += 1;
      await sleep(options.delay);
    }
    return filled;
  }

  async function fillProfileRow(row, profile, options) {
    let filled = 0;
    const textOrder = [
      ["fullName", profile.fullName],
      ["age", profile.age]
    ];
    for (const [key, value] of textOrder) {
      const field = rowField(row, key);
      if (await fillText(field, value, options.overwriteExisting)) filled += 1;
      await sleep(options.delay);
    }

    const gender = rowField(row, "gender");
    if (gender && (options.overwriteExisting || !gender.value)) {
      if (await selectValue(gender, profile.gender)) filled += 1;
    }
    await sleep(options.delay);

    const idProof = rowField(row, "idProof");
    if (idProof && (options.overwriteExisting || !idProof.value)) {
      if (await selectValue(idProof, profile.idProof)) filled += 1;
    }
    await sleep(options.delay);

    const idNumber = rowField(row, "idNumber");
    if (await fillText(idNumber, profile.idNumber, options.overwriteExisting)) filled += 1;
    return filled;
  }

  function speedDelay(speed) {
    if (speed === "instant") return 0;
    return 100 + Math.round(Math.random() * 90);
  }

  async function fill({
    general,
    profiles = [],
    profile,
    overwriteExisting = false,
    speed = "human",
    allVisible = false
  }) {
    if (root.__ttdSmartFillDone) {
      return { skipped: true, filled: 0, rows: root.TTDFields.profileFieldGroups().length, profilesUsed: 0 };
    }
    const options = {
      overwriteExisting,
      delay: speedDelay(speed)
    };
    let filled = await fillGeneral(general || {}, options);
    const groups = root.TTDFields.profileFieldGroups();
    const profileList = Array.isArray(profiles) && profiles.length
      ? profiles
      : profile
        ? [profile]
        : [];
    const profilesForRows = allVisible ? profileList : profileList.slice(0, 1);
    const groupsToFill = groups.slice(0, profilesForRows.length);

    for (let index = 0; index < groupsToFill.length; index += 1) {
      filled += await fillProfileRow(groupsToFill[index], profilesForRows[index], options);
    }
    root.__ttdSmartFillDone = true;
    return {
      filled,
      rows: groups.length,
      profilesUsed: groupsToFill.length
    };
  }

  root.TTDFiller = {
    setNativeValue,
    selectValue,
    fill,
    fillProfileRow,
    speedDelay
  };
})(globalThis);