# Changelog

## 1.0.0.2

- Never inject the script into JavaScript chunks whose name matches the `index.html` regex;
  only inject into a document with a closing body tag.

## 1.0.0.1

- First release.
- Register the exact `index.html` key required by File Transformation when another
  plugin already registered it, so the script is actually injected.
- Original procedural cat art with orange, black, gray, white and calico palettes.
- Seven-state behavior: walk, run, idle, sit, groom, stretch and sleep.
- Idle detection that never activates during video, typing, hidden tabs, or music when
  `ActivateDuringMusic` is off.
- Full-screen overlay with fade in/out, optional clock and anti burn-in drift.
- Per-browser opt-out from the Jellyfin user menu.
- Preview button in the configuration page.
- Reduced-motion mode, adaptive 30 fps fallback and pre-rendered sprites.
- File Transformation injection with retry, relative base-path support and idempotence.
- Anonymous `GET /CatScreensaver/Config` and cached `GET /CatScreensaver/cat-screensaver.js`.
- Tests with Vitest/jsdom and xUnit.
- Jellyfin icon and banner artwork.
