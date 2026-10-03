# TTD SmartFill Pro

TTD SmartFill Pro is an unofficial Chrome extension that fills supported Tirumala Tirupati Devasthanams booking forms using details you keep in the browser.

It is designed for the current TTD form structure and fills each pilgrim row in this order:

1. Full Name
2. Age
3. Gender
4. Photo ID Proof
5. Photo ID Number

## Install locally

1. Download or clone this project.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the `ttd-smartfill-pro` folder.
6. Open the extension popup and add General Details and at least one pilgrim profile.

The extension is intentionally unpacked for review and personal use. It has no server component and does not require an account.

## Features

- Automatically fills supported TTD pages on load when enabled.
- General Details shared across bookings: email, city, state, country, and pincode.
- Unlimited pilgrim profiles with search, edit, duplicate-safe local storage, default profile selection, and delete.
- Manual **Fill selected profile** and **Fill all visible fields** actions.
- Supports multi-pilgrim rows and dynamic React-style forms.
- Handles native selects and custom readonly dropdowns.
- Optional human-like fill pacing for forms that need a short delay between fields.
- JSON backup and restore for all profiles, General Details, and settings.
- Light, dark, or system theme.
- Keyboard shortcut support. Chrome's actual command can be changed at `chrome://extensions/shortcuts`.

## Privacy

All General Details, profiles, and settings are stored with `chrome.storage.local`. Data never leaves the browser. The extension does not use analytics, telemetry, Firebase, external APIs, remote scripts, or a remote database.

The content script is limited to:

- `https://*.ttdevasthanams.ap.gov.in/*`
- `https://*.tirupatibalaji.ap.gov.in/*`

The extension requests only `storage`, `activeTab`, and `scripting` permissions.

## Disclaimer

TTD SmartFill Pro is unofficial and is not affiliated with, endorsed by, or sponsored by Tirumala Tirupati Devasthanams. Always review every value, dropdown, row, and booking detail before continuing or submitting a booking. TTD may change its website and form structure at any time.

## Files

```text
ttd-smartfill-pro/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.css
├── popup.js
├── options.html
├── options.css
├── options.js
├── shared/
│   ├── constants.js
│   ├── storage.js
│   ├── fields.js
│   └── filler.js
└── scripts/
    └── verify.mjs
```