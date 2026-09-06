# ZYREX DRIVE — PHASE 13

## Controls & Input Upgrade
- Added persistent steering sensitivity (0.50–1.60).
- Added persistent gamepad deadzone (0.03–0.30).
- Added keyboard rebinding UI for acceleration, reverse, left, right, brake, and nitro.
- Added browser Gamepad API polling: left stick steering, RT/R2 acceleration, LT/L2 brake, face-button nitro.
- Existing keyboard, touch/mobile buttons, photo mode, race, garage, audio, graphics, save/profile systems remain.
- Profile schema bumped to version 2 and now stores controls.

## Verification
- `node --check public/game.js` PASS
- `node --check server.js` PASS
- `node --check public/script.js` PASS
- ZIP integrity verified after packaging.
- Browser/WebGL/Gamepad runtime was not claimed as fully verified in this environment.
