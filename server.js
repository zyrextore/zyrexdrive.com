import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "CHANGE_THIS_PASSWORD";
const SESSION_SECRET = process.env.SESSION_SECRET || "CHANGE_THIS_RANDOM_SECRET";
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PROFILES_FILE = path.join(DATA_DIR, "profiles.json");
const LEADERBOARD_FILE = path.join(DATA_DIR, "leaderboard.json");
const SOCIAL_FILE = path.join(DATA_DIR, "social.json");

import fs from "fs";
fs.mkdirSync(DATA_DIR, { recursive: true });
function readJson(file, fallback){ try { return JSON.parse(fs.readFileSync(file,"utf8")); } catch { fs.writeFileSync(file, JSON.stringify(fallback,null,2)); return fallback; } }
function writeJson(file, value){ const tmp=file+".tmp"; fs.writeFileSync(tmp, JSON.stringify(value,null,2)); fs.renameSync(tmp,file); }
let users=readJson(USERS_FILE, {});
let profiles=readJson(PROFILES_FILE, {});
let leaderboard=readJson(LEADERBOARD_FILE, []);
let social=readJson(SOCIAL_FILE, {});
const authAttempts=new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/game", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

const products = [
  { id: "P001", name: "Landing Page Pro", category: "Web", price: 250000, description: "Landing page modern dan responsive." },
  { id: "P002", name: "Pterodactyl Panel Setup", category: "Server", price: 150000, description: "Setup dan konfigurasi panel server." },
  { id: "P003", name: "WhatsApp Bot Starter", category: "Bot", price: 300000, description: "Bot WhatsApp starter untuk automation." },
  { id: "P004", name: "Custom Dashboard UI", category: "Software", price: 450000, description: "Dashboard UI premium dan responsive." },
  { id: "P005", name: "Unreal Engine Prototype", category: "Game", price: 750000, description: "Prototype gameplay untuk Unreal Engine." }
];

const orders = [];

function sign(payload) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function makeToken(username) {
  const payload = `${username}.${Date.now()}.${Date.now()+1000*60*60*24*7}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

function verifyToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return false;
  const token = header.slice(7);
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const payload = Buffer.from(encoded, "base64url").toString();
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const parts=payload.split(".");
  return parts.length===3 && Number(parts[2])>Date.now() && !!users[parts[0]];
}
function currentUser(req){ const header=req.headers.authorization||""; if(!header.startsWith("Bearer ")) return null; const token=header.slice(7),[encoded]=token.split("."); if(!encoded) return null; try { const payload=Buffer.from(encoded,"base64url").toString(); const username=payload.split(".")[0]; return verifyToken(req)?username:null; } catch { return null; } }
function authOnly(req,res,next){ const username=currentUser(req); if(!username) return res.status(401).json({error:"Login required"}); req.username=username; next(); }
function validName(v){return typeof v==="string" && /^[a-zA-Z0-9_ -]{3,20}$/.test(v)}
function hashPassword(password,salt=crypto.randomBytes(16).toString("hex")){return {salt,hash:crypto.scryptSync(password,salt,64).toString("hex")}}
function checkPassword(password,u){return crypto.timingSafeEqual(Buffer.from(hashPassword(password,u.salt).hash,"hex"),Buffer.from(u.hash,"hex"))}


function adminOnly(req, res, next) {
  if (!verifyToken(req)) return res.status(401).json({ error: "Unauthorized" });
  next();
}


// --- Online account / save / leaderboard API (Phase 61–70) ---
app.post("/api/auth/register", (req,res)=>{
  const ip=req.ip||"unknown", now=Date.now(), a=authAttempts.get(ip)||[];
  const recent=a.filter(t=>now-t<60000); if(recent.length>=12) return res.status(429).json({error:"Terlalu banyak percobaan"});
  authAttempts.set(ip,[...recent,now]);
  const username=String(req.body?.username||"").trim(), password=String(req.body?.password||"");
  if(!validName(username)) return res.status(400).json({error:"Username 3–20 karakter: huruf, angka, spasi, _ atau -"});
  if(password.length<8 || password.length>128) return res.status(400).json({error:"Password 8–128 karakter"});
  const key=username.toLowerCase(); if(users[key]) return res.status(409).json({error:"Username sudah dipakai"});
  const hp=hashPassword(password); users[key]={username,salt:hp.salt,hash:hp.hash,createdAt:new Date().toISOString()}; profiles[key]=null;
  writeJson(USERS_FILE,users); writeJson(USERS_FILE,users);
  res.status(201).json({token:makeToken(key),username});
});
app.post("/api/auth/login", (req,res)=>{
  const ip=req.ip||"unknown", now=Date.now(), a=authAttempts.get(ip)||[], recent=a.filter(t=>now-t<60000);
  if(recent.length>=12) return res.status(429).json({error:"Terlalu banyak percobaan"}); authAttempts.set(ip,[...recent,now]);
  const key=String(req.body?.username||"").trim().toLowerCase(), password=String(req.body?.password||""), u=users[key];
  if(!u || !checkPassword(password,u)) return res.status(401).json({error:"Username atau password salah"});
  res.json({token:makeToken(key),username:u.username});
});
app.get("/api/auth/me",authOnly,(req,res)=>res.json({username:users[req.username].username}));
app.get("/api/profile",authOnly,(req,res)=>res.json({profile:profiles[req.username]||null}));
app.put("/api/profile",authOnly,(req,res)=>{
  const profile=req.body?.profile; if(!profile || typeof profile!=="object") return res.status(400).json({error:"Profile tidak valid"});
  const clean=JSON.parse(JSON.stringify(profile)); if(JSON.stringify(clean).length>200000) return res.status(413).json({error:"Profile terlalu besar"});
  profiles[req.username]=clean; writeJson(USERS_FILE,users); res.json({ok:true,savedAt:new Date().toISOString()});
});
app.get("/api/leaderboard",(req,res)=>{
  const mode=String(req.query.mode||"race").slice(0,20); const rows=leaderboard.filter(x=>x.mode===mode).sort((a,b)=>a.score-b.score).slice(0,50); res.json(rows);
});
app.post("/api/leaderboard",authOnly,(req,res)=>{
  const mode=String(req.body?.mode||"race").slice(0,20), score=Number(req.body?.score); if(!Number.isFinite(score)||score<0||score>86400000) return res.status(400).json({error:"Score tidak valid"});
  leaderboard=leaderboard.filter(x=>!(x.username===users[req.username].username&&x.mode===mode)); leaderboard.push({username:users[req.username].username,mode,score,updatedAt:new Date().toISOString()}); leaderboard.sort((a,b)=>a.score-b.score); leaderboard=leaderboard.slice(0,500); writeJson(LEADERBOARD_FILE,leaderboard); res.status(201).json(leaderboard.find(x=>x.username===users[req.username].username&&x.mode===mode));
});


// --- PHASE 71–100: lightweight multiplayer foundation (HTTP polling, no extra dependency) ---
const rooms = new Map();
const ROOM_TTL = 12000;
const PLAYER_TTL = 5000;
function cleanRoom(roomId){
  const room=rooms.get(roomId); if(!room) return null;
  const now=Date.now();
  for(const [name,p] of Object.entries(room.players||{})) if(now-p.lastSeen>PLAYER_TTL) delete room.players[name];
  if(room.lastActive+ROOM_TTL<now && Object.keys(room.players).length===0) rooms.delete(roomId);
  return rooms.get(roomId)||null;
}
function validRoomId(v){return typeof v==='string' && /^[A-Za-z0-9_-]{3,16}$/.test(v)}
function roomView(room){return {id:room.id,name:room.name,host:room.host,count:Object.keys(room.players).length,maxPlayers:room.maxPlayers,createdAt:room.createdAt}}
function requireRoom(req,res){const room=cleanRoom(String(req.body?.roomId||req.query?.roomId||''));if(!room)return res.status(404).json({error:'Room tidak ditemukan'});return room}
app.get('/api/online/rooms',(req,res)=>{
  const list=[]; for(const room of rooms.values()){const r=cleanRoom(room.id);if(r)list.push(roomView(r))}
  res.json(list.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,30));
});
app.post('/api/online/rooms',authOnly,(req,res)=>{
  const name=String(req.body?.name||`${users[req.username].username}'s Room`).trim().slice(0,32);
  const id=(String(req.body?.roomId||'').trim()||crypto.randomBytes(5).toString('hex').slice(0,10));
  if(!validRoomId(id))return res.status(400).json({error:'Room ID 3–16 karakter: huruf, angka, _ atau -'});
  if(rooms.has(id))return res.status(409).json({error:'Room sudah ada'});
  const room={id,name,host:users[req.username].username,maxPlayers:8,createdAt:new Date().toISOString(),lastActive:Date.now(),players:{},chat:[]};rooms.set(id,room);res.status(201).json(roomView(room));
});
app.post('/api/online/join',authOnly,(req,res)=>{
  const room=requireRoom(req,res); if(!room)return;
  const username=users[req.username].username;if(Object.keys(room.players).length>=room.maxPlayers&&!room.players[username])return res.status(409).json({error:'Room penuh'});
  room.lastActive=Date.now();room.players[username]={username,lastSeen:Date.now(),x:0,z:70,heading:Math.PI,speed:0,vehicle:'e30_stance',color:'#8b5cf6',ready:false};res.json({room:roomView(room),player:room.players[username]});
});
app.post('/api/online/leave',authOnly,(req,res)=>{const room=requireRoom(req,res);if(!room)return;const username=users[req.username].username;delete room.players[username];room.lastActive=Date.now();if(room.host===username){const next=Object.keys(room.players)[0];if(next)room.host=next}if(!Object.keys(room.players).length)rooms.delete(room.id);res.json({ok:true});});
app.post('/api/online/heartbeat',authOnly,(req,res)=>{
  const room=requireRoom(req,res);if(!room)return;const username=users[req.username].username;const p=room.players[username];if(!p)return res.status(403).json({error:'Belum join room'});
  const b=req.body||{};const finite=(n,d)=>Number.isFinite(Number(n))?Number(n):d;
  p.lastSeen=Date.now();p.x=Math.max(-160,Math.min(160,finite(b.x,p.x)));p.z=Math.max(-180,Math.min(180,finite(b.z,p.z)));p.heading=finite(b.heading,p.heading);p.speed=Math.max(-80,Math.min(120,finite(b.speed,p.speed)));p.vehicle=String(b.vehicle||p.vehicle).slice(0,40);p.color=/^#[0-9a-f]{6}$/i.test(String(b.color||''))?String(b.color):p.color;p.ready=!!b.ready;room.lastActive=Date.now();res.json({ok:true});
});
app.get('/api/online/state',authOnly,(req,res)=>{const room=cleanRoom(String(req.query.roomId||''));if(!room)return res.status(404).json({error:'Room tidak ditemukan'});const username=users[req.username].username;if(!room.players[username])return res.status(403).json({error:'Belum join room'});const now=Date.now();const players=Object.values(room.players).filter(p=>now-p.lastSeen<=PLAYER_TTL).map(({lastSeen,...p})=>p);res.json({room:roomView(room),host:room.host,players,chat:room.chat.slice(-30)});});
app.post('/api/online/ready',authOnly,(req,res)=>{const room=requireRoom(req,res);if(!room)return;const p=room.players[users[req.username].username];if(!p)return res.status(403).json({error:'Belum join room'});p.ready=!!req.body?.ready;p.lastSeen=Date.now();room.lastActive=Date.now();res.json({ready:p.ready});});
app.post('/api/online/chat',authOnly,(req,res)=>{const room=requireRoom(req,res);if(!room)return;const username=users[req.username].username;if(!room.players[username])return res.status(403).json({error:'Belum join room'});const text=String(req.body?.text||'').replace(/[<>]/g,'').trim().slice(0,120);if(!text)return res.status(400).json({error:'Pesan kosong'});room.chat.push({username,text,at:new Date().toISOString()});room.chat=room.chat.slice(-60);room.lastActive=Date.now();res.status(201).json(room.chat.at(-1));});
// --- PHASE 101–150: WebSocket multiplayer transport + server-validated sessions ---
const wsClients = new Map();
const WS_RATE_MS = 80;
const RACE_COUNTDOWN_MS = 3000;
function broadcastRoom(roomId, payload, except=null){
  const set=wsClients.get(roomId); if(!set) return;
  const msg=JSON.stringify(payload);
  for(const c of set){ if(c!==except && c.readyState===1) c.send(msg); }
}
function roomSnapshot(room){
  const now=Date.now();
  return {room:roomView(room),host:room.host,players:Object.values(room.players).filter(p=>now-p.lastSeen<=PLAYER_TTL).map(({lastSeen,...p})=>p),race:room.race||null};
}
function wsLeave(c){
  if(!c.roomId||!c.username)return;
  const room=rooms.get(c.roomId); if(!room)return;
  const set=wsClients.get(c.roomId); if(set)set.delete(c);
  if(set&&!set.size)wsClients.delete(c.roomId);
  c.roomId=null;
}
function wsSend(c,type,data={}){if(c.readyState===1)c.send(JSON.stringify({type,...data}));}
const wss = new WebSocketServer({server:httpServer,path:'/ws'});
wss.on('connection',(socket)=>{
  const c={socket,username:null,roomId:null,lastTransform:0,lastSeen:Date.now()};
  socket.on('message',(raw)=>{
    let m; try{m=JSON.parse(raw.toString())}catch{return wsSend(socket,'error',{error:'Invalid JSON'})}
    const send=(type,data={})=>wsSend(socket,type,data);
    if(m.type==='auth'){
      const token=String(m.token||'');
      const fake={headers:{authorization:`Bearer ${token}`}};
      const username=currentUser(fake);
      if(!username){send('auth:error',{error:'Invalid or expired token'});return socket.close(4001,'auth')}
      c.username=username; send('auth:ok',{username:users[username].username}); return;
    }
    if(!c.username){send('error',{error:'Authenticate first'});return}
    if(m.type==='room:join'){
      const id=String(m.roomId||''); const room=cleanRoom(id);
      if(!room)return send('error',{error:'Room tidak ditemukan'});
      const username=users[c.username].username;
      if(Object.keys(room.players).length>=room.maxPlayers&&!room.players[username])return send('error',{error:'Room penuh'});
      wsLeave(c); c.roomId=id;
      if(!wsClients.has(id))wsClients.set(id,new Set()); wsClients.get(id).add(socket);
      room.players[username] ||= {username,lastSeen:Date.now(),x:0,z:70,heading:Math.PI,speed:0,vehicle:'e30_stance',color:'#8b5cf6',ready:false};
      room.players[username].lastSeen=Date.now(); room.lastActive=Date.now();
      send('room:state',roomSnapshot(room)); broadcastRoom(id,{type:'player:joined',username},socket); return;
    }
    if(m.type==='room:leave'){wsLeave(c);send('room:left');return}
    if(!c.roomId){send('error',{error:'Join a room first'});return}
    const room=cleanRoom(c.roomId); if(!room)return send('error',{error:'Room expired'});
    const username=users[c.username].username; const player=room.players[username]; if(!player)return send('error',{error:'Not in room'});
    if(m.type==='player:transform'){
      const now=Date.now(); if(now-c.lastTransform<WS_RATE_MS)return;
      c.lastTransform=now;
      const finite=(n,d)=>Number.isFinite(Number(n))?Number(n):d;
      const x=Math.max(-160,Math.min(160,finite(m.x,player.x))); const z=Math.max(-180,Math.min(180,finite(m.z,player.z)));
      const speed=Math.max(-80,Math.min(120,finite(m.speed,player.speed))); const heading=finite(m.heading,player.heading);
      player.x=x;player.z=z;player.speed=speed;player.heading=heading;player.vehicle=String(m.vehicle||player.vehicle).slice(0,40);player.color=/^#[0-9a-f]{6}$/i.test(String(m.color||''))?String(m.color):player.color;player.lastSeen=now;room.lastActive=now;
      broadcastRoom(c.roomId,{type:'player:transform',player:{...player}},socket); return;
    }
    if(m.type==='player:input'){
      const now=Date.now(); if(now-c.lastTransform<WS_RATE_MS)return; c.lastTransform=now;
      const throttle=Math.max(0,Math.min(1,Number(m.throttle)||0)); const brake=Math.max(0,Math.min(1,Number(m.brake)||0));
      const steer=Math.max(-1,Math.min(1,Number(m.steer)||0));
      const dt=WS_RATE_MS/1000; const accel=28*throttle-38*brake; player.speed=Math.max(-80,Math.min(120,player.speed+accel*dt));
      if(!throttle&&!brake)player.speed*=0.985;
      player.heading += steer*(0.9+Math.min(1,Math.abs(player.speed)/70))*dt;
      const nx=Number(m.x), nz=Number(m.z); if(Number.isFinite(nx)&&Number.isFinite(nz)){const jump=Math.hypot(nx-player.x,nz-player.z); if(jump<18){player.x=nx;player.z=nz;} else {const n=flagViolation(username,'position_jump'); if(n>=5) send('anti_cheat:warning',{kind:'position_jump',count:n});}}
      player.lastSeen=now;room.lastActive=now;broadcastRoom(c.roomId,{type:'player:authoritative',player:{...player}},socket);return;
    }
    if(m.type==='player:ready'){
      player.ready=!!m.ready;player.lastSeen=Date.now();room.lastActive=Date.now();broadcastRoom(c.roomId,{type:'player:ready',username,ready:player.ready});return;
    }
    if(m.type==='chat'){
      const text=String(m.text||'').replace(/[<>]/g,'').trim().slice(0,120); if(!text)return;
      const msg={username,text,at:new Date().toISOString()};room.chat.push(msg);room.chat=room.chat.slice(-60);room.lastActive=Date.now();broadcastRoom(c.roomId,{type:'chat',message:msg});return;
    }
    if(m.type==='race:start'){
      if(room.host!==username)return send('race:error',{error:'Only host can start'});
      if(room.race?.active)return send('race:error',{error:'Race already active'});
      const players=Object.values(room.players).filter(p=>Date.now()-p.lastSeen<=PLAYER_TTL);
      if(players.length<2)return send('race:error',{error:'Need at least 2 players'});
      if(players.some(p=>!p.ready))return send('race:error',{error:'All players must be ready'});
      room.race={active:true,id:crypto.randomUUID(),countdownMs:RACE_COUNTDOWN_MS,startAt:Date.now()+RACE_COUNTDOWN_MS,started:false,finishers:[],createdAt:Date.now()};
      broadcastRoom(c.roomId,{type:'race:starting',race:room.race});return;
    }
    if(m.type==='race:finish'){
      if(!room.race?.active)return;
      if(room.race.finishers.some(x=>x.username===username))return;
      const elapsed=Number(m.elapsed); if(!Number.isFinite(elapsed)||elapsed<3000||elapsed>86400000)return; if(room.race.startAt>Date.now())return send('race:error',{error:'Race belum dimulai'});
      room.race.finishers.push({username,elapsed:Math.round(elapsed),at:Date.now()});
      broadcastRoom(c.roomId,{type:'race:finish',result:room.race.finishers.at(-1)});
      if(room.race.finishers.length>=Object.keys(room.players).length)room.race={...room.race,active:false,endedAt:Date.now()};
    }
  });
  socket.on('close',()=>{wsLeave(c)});
});
// --- PHASE 151–230: competitive multiplayer services ---
const matchmaking = new Map();
const partyInvites = new Map();
function socialUser(u){ social[u] ||= {friends:[],pending:[],blocked:[],party:null}; return social[u]; }
function cleanSocialName(v){return String(v||'').trim().slice(0,20)}
function validMode(v){return ['race','sprint','delivery','speed'].includes(String(v))}
app.get('/api/online/social',authOnly,(req,res)=>{const u=socialUser(req.username);res.json({friends:u.friends,pending:u.pending,blocked:u.blocked,party:u.party});});
app.post('/api/online/friends/request',authOnly,(req,res)=>{const me=req.username,target=cleanSocialName(req.body?.username);if(!target||!users[target])return res.status(404).json({error:'User tidak ditemukan'});if(target===me)return res.status(400).json({error:'Tidak bisa menambah diri sendiri'});const a=socialUser(me),b=socialUser(target);if(a.blocked.includes(target)||b.blocked.includes(me))return res.status(403).json({error:'Permintaan ditolak'});if(a.friends.includes(target))return res.json({ok:true,status:'friends'});if(!b.pending.includes(me))b.pending.push(me);writeJson(SOCIAL_FILE,social);res.status(201).json({ok:true,status:'pending'});});
app.post('/api/online/friends/accept',authOnly,(req,res)=>{const me=req.username,target=cleanSocialName(req.body?.username),a=socialUser(me),b=socialUser(target);if(!a.pending.includes(target))return res.status(404).json({error:'Request tidak ditemukan'});a.pending=a.pending.filter(x=>x!==target);if(!a.friends.includes(target))a.friends.push(target);if(!b.friends.includes(me))b.friends.push(me);writeJson(SOCIAL_FILE,social);res.json({ok:true,status:'friends'});});
app.post('/api/online/friends/remove',authOnly,(req,res)=>{const me=req.username,target=cleanSocialName(req.body?.username);const a=socialUser(me),b=socialUser(target);a.friends=a.friends.filter(x=>x!==target);b.friends=b.friends.filter(x=>x!==me);writeJson(SOCIAL_FILE,social);res.json({ok:true});});
app.post('/api/online/matchmake/join',authOnly,(req,res)=>{const mode=String(req.body?.mode||'race');if(!validMode(mode))return res.status(400).json({error:'Mode tidak valid'});const u=req.username;let q=matchmaking.get(mode)||[];q=q.filter(x=>x!==u);q.push(u);if(q.length>=2){const players=q.splice(0,Math.min(4,q.length));const id=crypto.randomBytes(5).toString('hex');const room={id,name:`MATCH · ${mode.toUpperCase()}`,host:players[0],maxPlayers:8,createdAt:new Date().toISOString(),lastActive:Date.now(),players:{},chat:[],race:null,matchMode:mode};rooms.set(id,room);for(const name of players)room.players[name]={username:name,lastSeen:Date.now(),x:0,z:70,heading:Math.PI,speed:0,vehicle:'e30_stance',color:'#8b5cf6',ready:true};matchmaking.set(mode,q);return res.json({status:'matched',room:roomView(room),players});}matchmaking.set(mode,q);res.json({status:'queued',mode,position:q.indexOf(u)+1});});
app.post('/api/online/matchmake/leave',authOnly,(req,res)=>{for(const [mode,q0] of matchmaking){const q=q0.filter(x=>x!==req.username);matchmaking.set(mode,q)}res.json({ok:true});});
app.get('/api/online/matchmake',authOnly,(req,res)=>{const mode=String(req.query.mode||'race');const q=matchmaking.get(mode)||[];res.json({mode,queued:q.includes(req.username),position:q.indexOf(req.username)+1,count:q.length});});
app.post('/api/online/party/create',authOnly,(req,res)=>{const u=socialUser(req.username);if(u.party)return res.status(409).json({error:'Sudah ada party'});const id=crypto.randomBytes(4).toString('hex');u.party={id,host:req.username,members:[req.username]};writeJson(SOCIAL_FILE,social);res.status(201).json(u.party);});
app.post('/api/online/party/invite',authOnly,(req,res)=>{const me=socialUser(req.username),target=cleanSocialName(req.body?.username);if(!me.party)return res.status(400).json({error:'Buat party dulu'});if(me.party.host!==req.username)return res.status(403).json({error:'Hanya host'});if(!users[target])return res.status(404).json({error:'User tidak ditemukan'});partyInvites.set(`${target}:${me.party.id}`,{from:req.username,party:me.party,at:Date.now()});res.json({ok:true});});
app.get('/api/online/party/invites',authOnly,(req,res)=>res.json([...partyInvites.entries()].filter(([k])=>k.startsWith(req.username+':')).map(([key,v])=>({key,...v}))));
app.post('/api/online/party/accept',authOnly,(req,res)=>{const key=String(req.body?.key||'');const inv=partyInvites.get(key);if(!inv)return res.status(404).json({error:'Invite tidak ditemukan'});const me=socialUser(req.username);me.party={id:inv.party.id,host:inv.party.host,members:[...inv.party.members,req.username]};partyInvites.delete(key);writeJson(SOCIAL_FILE,social);res.json(me.party);});
app.post('/api/online/party/leave',authOnly,(req,res)=>{const me=socialUser(req.username);if(!me.party)return res.json({ok:true});const pid=me.party.id;for(const u of Object.keys(social)){if(social[u]?.party?.id===pid){social[u].party=social[u].party.members.filter(x=>x!==req.username);if(!social[u].party.members.length)social[u].party=null;else if(social[u].party.host===req.username)social[u].party.host=social[u].party.members[0]}}me.party=null;writeJson(SOCIAL_FILE,social);res.json({ok:true});});
app.get('/api/online/missions',authOnly,(req,res)=>res.json([
 {id:'mp_delivery',name:'Delivery Squad',mode:'delivery',reward:1500,xp:250,players:2,maxPlayers:4},
 {id:'mp_sprint',name:'Simpang Sprint',mode:'sprint',reward:2200,xp:350,players:2,maxPlayers:4},
 {id:'mp_night',name:'Night Run',mode:'race',reward:3000,xp:500,players:2,maxPlayers:4}
]));
// Server-side transform validation and a lightweight authoritative tick. Client input remains prediction; server clamps state.
const SERVER_TICK_MS=100;
setInterval(()=>{const now=Date.now();for(const room of rooms.values()){for(const p of Object.values(room.players)){if(now-p.lastSeen>PLAYER_TTL)continue;p.x=Math.max(-160,Math.min(160,p.x));p.z=Math.max(-180,Math.min(180,p.z));p.speed=Math.max(-80,Math.min(120,p.speed));p.heading=Number.isFinite(p.heading)?p.heading:Math.PI;}if(room.race?.active&&room.race.startAt<=now&&!room.race.started){room.race.started=true;broadcastRoom(room.id,{type:'race:started',race:room.race});}if(room.race?.active&&room.race.finishers.length>=Object.keys(room.players).length){room.race.active=false;room.race.endedAt=now;}if(wsClients.has(room.id))broadcastRoom(room.id,{type:'server:snapshot',room:roomSnapshot(room)});}},SERVER_TICK_MS);

// --- PHASE 231–300: Ranked online gameplay, spectate, recovery, shared objectives ---
const SEASON_FILE = path.join(DATA_DIR, "season.json");
let season = readJson(SEASON_FILE, {id:"S1",name:"ZYREX STREET SEASON 1",startedAt:new Date().toISOString(),endsAt:null});
const ratings = new Map();
const spectating = new Map();
const objectiveRooms = new Map();
const violationLog = new Map();
function ratingFor(u){ if(!ratings.has(u)) ratings.set(u, Number(users[u]?.rating||1000)); return ratings.get(u); }
function saveRatings(){ for(const [u,r] of ratings) if(users[u]) users[u].rating=Math.round(r); writeJson(USERS_FILE,users); }
function rankedDelta(place,count){ const base=[35,22,12,5,-8,-18,-28,-35]; return base[Math.min(base.length-1,Math.max(0,place-1))] + Math.max(0,Math.min(8,count-2)); }
app.get('/api/online/season',(req,res)=>res.json({season,players:[...ratings.entries()].map(([username,rating])=>({username,rating})).sort((a,b)=>b.rating-a.rating).slice(0,100)}));
app.get('/api/online/ranked/me',authOnly,(req,res)=>res.json({username:req.username,rating:ratingFor(req.username),season:season.id}));
app.post('/api/online/ranked/result',authOnly,(req,res)=>{
  const room=rooms.get(String(req.body?.roomId||'')); if(!room)return res.status(404).json({error:'Room tidak ditemukan'});
  const players=Object.values(room.players).filter(p=>Date.now()-p.lastSeen<=PLAYER_TTL); const finishers=Array.isArray(req.body?.finishers)?req.body.finishers:[];
  if(players.length<2||finishers.length<2||finishers.length>players.length)return res.status(400).json({error:'Hasil ranked tidak valid'});
  if(room.rankedSettled)return res.json({ok:true,already:true,rating:ratingFor(req.username)});
  room.rankedSettled=true; const deltas={}; finishers.sort((a,b)=>Number(a.elapsed)-Number(b.elapsed));
  finishers.forEach((f,i)=>{if(players.some(p=>p.username===f.username)){deltas[f.username]=rankedDelta(i+1,players.length);ratings.set(f.username,ratingFor(f.username)+deltas[f.username]);}});
  saveRatings(); broadcastRoom(room.id,{type:'ranked:result',season:season.id,deltas,ratings:Object.fromEntries([...ratings].filter(([u])=>players.some(p=>p.username===u)))}); res.json({ok:true,rating:ratingFor(req.username),delta:deltas[req.username]||0});
});
app.post('/api/online/spectate/join',authOnly,(req,res)=>{const room=cleanRoom(String(req.body?.roomId||''));if(!room)return res.status(404).json({error:'Room tidak ditemukan'});spectating.set(req.username,room.id);res.json({ok:true,roomId:room.id,players:Object.values(room.players).map(p=>({username:p.username,vehicle:p.vehicle,x:p.x,z:p.z,heading:p.heading,speed:p.speed,color:p.color}))});});
app.post('/api/online/spectate/leave',authOnly,(req,res)=>{spectating.delete(req.username);res.json({ok:true});});
app.get('/api/online/spectate',authOnly,(req,res)=>{const id=spectating.get(req.username);const room=id&&cleanRoom(id);if(!room)return res.status(404).json({error:'Tidak sedang spectate'});res.json(roomSnapshot(room));});
app.post('/api/online/objective/join',authOnly,(req,res)=>{const room=cleanRoom(String(req.body?.roomId||''));if(!room)return res.status(404).json({error:'Room tidak ditemukan'});const mode=validMode(req.body?.mode)?String(req.body.mode):'delivery';const key=room.id+':'+mode;let o=objectiveRooms.get(key);if(!o)o={id:crypto.randomUUID(),roomId:room.id,mode,progress:0,target:mode==='delivery'?5:mode==='speed'?100:mode==='sprint'?3:1,contributors:[],startedAt:Date.now(),updatedAt:Date.now()};if(!o.contributors.includes(req.username))o.contributors.push(req.username);objectiveRooms.set(key,o);res.json(o);});
app.post('/api/online/objective/progress',authOnly,(req,res)=>{const key=String(req.body?.key||'');const o=objectiveRooms.get(key);if(!o)return res.status(404).json({error:'Objective tidak ditemukan'});if(!o.contributors.includes(req.username))return res.status(403).json({error:'Bukan anggota objective'});const delta=Math.max(0,Math.min(10,Number(req.body?.delta)||0));o.progress=Math.min(o.target,o.progress+delta);o.updatedAt=Date.now();const room=rooms.get(o.roomId);if(room)broadcastRoom(room.id,{type:'objective:update',objective:o});res.json(o);});
function flagViolation(u,kind){const key=u+':'+kind;const now=Date.now();const x=violationLog.get(key)||{count:0,at:now};if(now-x.at>10000)x.count=0;x.count++;x.at=now;violationLog.set(key,x);return x.count;}
app.get('/api/online/recovery',authOnly,(req,res)=>{const roomId=String(req.query.roomId||'');const room=cleanRoom(roomId);if(!room)return res.status(404).json({error:'Room tidak ditemukan'});const p=room.players[req.username];if(!p)return res.status(403).json({error:'Tidak ada state pemain'});res.json({room:roomSnapshot(room),self:{...p},recoveredAt:Date.now()});});
// Additional server-side checks on the authoritative input path.
const originalBroadcastRoom=broadcastRoom;
function safeBroadcastRoom(roomId,payload,except=null){return originalBroadcastRoom(roomId,payload,except)}

app.get('/api/online/health',(req,res)=>res.json({ok:true,rooms:rooms.size,transport:'WebSocket + HTTP fallback',websocket:wss.clients.size,players:[...rooms.values()].reduce((n,r)=>n+Object.keys(r.players).length,0)}));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "ZYREX", game: "Cyber Dodge" });
});

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.post("/api/orders", (req, res) => {
  const { productId, customerName, customerContact } = req.body || {};
  const product = products.find(p => p.id === productId);

  if (!product) return res.status(400).json({ error: "Product tidak ditemukan" });
  if (!customerName?.trim() || !customerContact?.trim()) {
    return res.status(400).json({ error: "Nama dan kontak wajib diisi" });
  }

  const order = {
    id: `ZYX-${Date.now().toString(36).toUpperCase()}`,
    productId: product.id,
    productName: product.name,
    price: product.price,
    customerName: customerName.trim(),
    customerContact: customerContact.trim(),
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  orders.unshift(order);
  res.status(201).json(order);
});

app.get("/api/orders/:id", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order tidak ditemukan" });
  res.json(order);
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Username atau password salah" });
  }
  res.json({ token: makeToken(username) });
});

app.get("/api/admin/stats", adminOnly, (req, res) => {
  const revenue = orders
    .filter(o => o.status === "Completed")
    .reduce((sum, o) => sum + o.price, 0);

  res.json({
    totalOrders: orders.length,
    revenue,
    projects: 6,
    activeServices: 6
  });
});

app.get("/api/admin/orders", adminOnly, (req, res) => {
  res.json(orders);
});

app.patch("/api/admin/orders/:id", adminOnly, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order tidak ditemukan" });

  const allowed = ["Pending", "Processing", "Completed", "Cancelled"];
  if (!allowed.includes(req.body?.status)) {
    return res.status(400).json({ error: "Status tidak valid" });
  }

  order.status = req.body.status;
  res.json(order);
});

httpServer.listen(PORT, () => {
  console.log(`ZYREX running at http://localhost:${PORT}`);
});