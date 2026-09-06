# ZYREX Drive — Phase 8

## Added
- Race mode with a 3-second countdown and GO state.
- Three-lap race flow with start/finish gate and four intermediate checkpoints.
- Four AI race opponents with lane positions and simple pace simulation.
- Live race HUD: state, lap, position, and timer.
- Nitro system with 100% capacity, boost multiplier, drain and recharge outside races.
- Nitro keyboard control (`N`) and mobile NITRO button.
- Race keyboard shortcut (`P`).
- Race reset integration (`R`) and safe cleanup of race opponents/gates.
- Existing Phase 7 traffic, traffic lights, city, weather, day/night, garage, vehicle GLBs and customization retained.

## Verification
- `node --check server.js` PASS
- `node --check public/script.js` PASS
- `node --check public/game.js` PASS
- ZIP integrity verified after packaging.
- Browser/WebGL/CDN runtime is not claimed as fully verified in this environment.
