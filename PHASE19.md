# ZYREX DRIVE — PHASE 19

## Missions & Progression
- Added a native city activity system with three playable mission types:
  - Delivery: Antar Paket · Pasar
  - Checkpoint: Kampung route with sequential checkpoints
  - Speed Challenge: reach 100 km/h inside the Simpang speed zone
- Added mission timers, live objective/status HUD, cancel action, rewards and completion counter.
- Added progression XP and level system with persistent local save.
- Mission rewards are paid into the existing ZYREX local wallet.
- Profile schema advanced from v3 to v4 while retaining previous economy, vehicle, garage, world, graphics, controls and race data.
- Locked vehicles cannot start missions; owned vehicles only.

## Rewards
- Delivery: Rp 2.500 + 120 XP
- Checkpoint: Rp 1.800 + 90 XP
- Speed Challenge: Rp 3.000 + 140 XP

## Verification
- `node --check public/game.js`: PASS
- `node --check server.js`: PASS
- `node --check public/script.js`: PASS
- ZIP integrity: PASS
- Browser/WebGL runtime was not claimed as fully verified in this environment.
