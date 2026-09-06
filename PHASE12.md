# ZYREX Drive — Phase 12

## Added
- Expanded procedural Web Audio engine with vehicle-specific engine tone profiles.
- Separate engine, exhaust, turbo/nitro, brake, tire-skid and collision sound layers.
- Procedural city ambience layer.
- Race countdown beeps.
- Garage audio controls: master, engine, effects, and ambience volume.
- Audio settings persist in the existing local profile storage; no new backend/database.
- Profile schema version bumped to v2 while remaining backward-compatible with missing audio data.

## Safety / behavior
- Audio starts/resumes only after a user interaction because browsers restrict autoplay audio.
- No external audio assets were fabricated or claimed; Phase 12 uses procedural Web Audio only.

## Verification
- JavaScript syntax checks: PASS.
- Existing website and assets preserved.
- Browser/WebAudio runtime is not claimed as fully verified in this environment.
