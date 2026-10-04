# TTD

> A local Chrome extension for filling supported TTD booking forms.

## Overview

The extension lives in `ttd-smartfill-pro/`. It stores booking details in Chrome and fills supported pilgrim fields on matching Tirumala Tirupati Devasthanams pages.

## What’s in this repo

- General details and reusable pilgrim profiles
- Automatic or manual form filling, profile import/export, and appearance settings
- Chrome Manifest V3 extension; no server or account is required

## Stack

JavaScript, Chrome Extension APIs, `chrome.storage.local`.

## Getting started

1. Open `chrome://extensions` and enable Developer mode.
2. Choose Load unpacked and select the `ttd-smartfill-pro` folder.
3. Open the extension, add your details, and review every field before submitting a booking.

## Notes

This is an unofficial helper, not affiliated with TTD. It stores profile data in the browser; it does not book tickets or guarantee availability. The target website can change, so verify the filled information and follow TTD's rules.
