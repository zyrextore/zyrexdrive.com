# ZYREX FullStack + Cyber Dodge

Starter website ZYREX yang siap dibuka di VS Code.

## Stack
- Node.js
- Express
- HTML
- CSS
- Vanilla JavaScript
- Canvas API
- No frontend framework

## Fitur Public
- Home / Hero
- About
- Services
- Projects
- Technology
- Store
- Why ZYREX
- Contact
- Cyber Dodge mini-game
- Search produk
- Filter kategori
- Order produk
- Responsive HP / PC
- Score + Best Score menggunakan localStorage

## Cyber Dodge
Game ringan berbasis Canvas:
- WASD / Arrow Keys di PC
- Tombol touch di HP
- Obstacle makin cepat
- Score realtime
- Best score tersimpan di browser
- Restart
- Tidak membutuhkan library game

## Admin
- Admin-only login
- Dashboard statistik
- Daftar order
- Update status order

Catatan: data produk dan order pada starter ini disimpan di memory server dan akan reset saat server restart. Untuk production, sambungkan database seperti PostgreSQL/Supabase.

## Jalankan di VS Code
1. Install Node.js 20+
2. Buka folder project di VS Code
3. Jalankan:
   npm install
4. Salin `.env.example` menjadi `.env`
5. Ganti password dan session secret
6. Jalankan:
   npm run dev
7. Buka:
   http://localhost:3000

Admin:
http://localhost:3000/admin.html

## Phase 30
Phase 21–30 adds on-foot character gameplay, enter/exit vehicle, POI interactions, timed city events, City Hub, achievements, quick settings, extended local profile persistence and autosave. Press E for vehicle/interaction and O for City Hub.
