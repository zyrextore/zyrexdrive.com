# ZYREX Drive — Phase 11

## Added
- Versioned local profile save/load (`zyrexDriveProfile_v1`).
- Profile stores active vehicle, per-vehicle applied modifications, world state, graphics settings, and best race times.
- Three per-vehicle garage presets (save/load).
- Graphics Quality: Low / Medium / High.
- Shadows toggle.
- Graphics changes apply immediately and persist in the profile.
- Best race time is recorded per vehicle when the player finishes 1st with a faster time.
- Automatic profile save on page unload and important garage/race changes.

## Storage model
This phase intentionally uses browser `localStorage`; it does not introduce a second backend or database. Data is device/browser-local and is not a cloud account save.

## Verification
- JavaScript syntax checks: PASS.
- Existing project files/assets preserved.
- Browser/WebGL runtime is not claimed as fully verified in this environment.
