# ZYREX DRIVE — Phase 2 Asset Pipeline

## Goal
Prepare the supplied Roblox/FBX sources for a browser-native 3D game without pretending Roblox runtime data is directly executable in the browser.

## Audit result
- 31 `.rbxm` source assets are present.
- 2 `.fbx` source assets are present.
- The RBXM files contain Roblox-specific objects such as `VehicleSeat`, constraints, lights, sounds, particles, and Lua scripts. These are **source/reference data**, not browser runtime code.
- Both FBX files have valid FBX headers. Full scene/material import was not verified because no Blender/Assimp conversion executable is available in this environment.

## Browser target
All production 3D assets should ultimately be exported as `.glb`/`.gltf` with:
- separate visual meshes for body, wheels and detachable customization parts where practical;
- PBR materials;
- compressed textures;
- reasonable polygon budgets and LODs;
- no Roblox scripts, VehicleSeat, HingeConstraint, SpringConstraint, WeldConstraint or Roblox-only physics dependencies;
- audio handled by the web game's own audio system rather than Roblox `Sound` objects.

## Priority conversion queue
1. `sv4.fbx` — primary motorcycle candidate.
2. `Lotus Carlton.rbxm` — primary car candidate.
3. `Kawasaki ZX10RR roll race setup v2 by pwdrivingferrari.rbxm` — sport motorcycle candidate.
4. `FanFan Garage (new File) (1).rbxm` — garage environment candidate.
5. `Rumah Vibes Kampung.rbxm` — Indonesian environment candidate.
6. `lax vario (3).rbxm` / `variosnorlax KJRTWORKS.rbxm` — scooter candidates.

## Not done / not claimed
No RBXM-to-GLB conversion was claimed or fabricated in this phase. No FBX-to-GLB conversion was claimed or fabricated. The project is ready for the conversion step once a verified conversion toolchain is available.
