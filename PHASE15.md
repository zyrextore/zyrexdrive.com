# ZYREX DRIVE — PHASE 15

## Scope
World-life and Indonesian roadside detail expansion built on Phase 14.

## Added
- Procedural SPBU ZYREX POI with pumps/canopy.
- ZYREX MOTOR workshop POI.
- Minimarket POI.
- Public parking POI with parking bay markings.
- City landmark/town monument POI.
- 18 ambient pedestrian entities on sidewalks with looping movement.
- Nearby-POI HUD showing name, type, and distance.
- Existing Phase 14 GPS, traffic, race, weather, day/night, garage, audio, save/profile, controls, and camera systems retained.

## Implementation
- All new world elements are generated procedurally in the existing Three.js scene.
- No new backend/database/router was introduced.
- Pedestrians are visual ambient entities and are intentionally not part of vehicle collision physics.

## Verification
- `node --check public/game.js` PASS
- `node --check server.js` PASS
- `node --check public/script.js` PASS
- ZIP integrity PASS
- Browser/WebGL runtime is not claimed as fully verified because the environment cannot guarantee CDN/browser execution.
