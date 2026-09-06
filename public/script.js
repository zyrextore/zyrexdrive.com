const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

$("#navToggle").onclick = () => $("#navMenu").classList.toggle("open");
$$("nav a").forEach(a => a.onclick = () => $("#navMenu").classList.remove("open"));

const money = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);

let products = [];
let selected = null;

async function loadProducts(){
  const res = await fetch("/api/products");
  products = await res.json();
  renderProducts();
}

function renderProducts(){
  const q = ($("#search").value || "").toLowerCase();
  const cat = $("#category").value;
  const list = products.filter(p => (cat==="All" || p.category===cat) && `${p.name} ${p.description}`.toLowerCase().includes(q));
  $("#products").innerHTML = list.map(p => `
    <article>
      <span>${p.category.toUpperCase()}</span>
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <div class="product-price">${money(p.price)}</div>
      <button class="btn primary order-btn" data-id="${p.id}" style="margin-top:16px">Order</button>
    </article>
  `).join("") || "<p>Produk tidak ditemukan.</p>";
  $$(".order-btn").forEach(b => b.onclick = () => openOrder(b.dataset.id));
}

function openOrder(id){
  selected = products.find(p => p.id === id);
  $("#selectedProduct").textContent = `${selected.name} — ${money(selected.price)}`;
  $("#orderResult").textContent = "";
  $("#modal").classList.add("open");
}
$("#close").onclick = () => $("#modal").classList.remove("open");
$("#modal").onclick = e => { if(e.target.id==="modal") $("#modal").classList.remove("open") };

$("#submitOrder").onclick = async () => {
  const customerName = $("#customerName").value.trim();
  const customerContact = $("#customerContact").value.trim();
  if(!customerName || !customerContact) return $("#orderResult").textContent = "Nama dan kontak wajib diisi.";
  const res = await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:selected.id,customerName,customerContact})});
  const data = await res.json();
  $("#orderResult").textContent = res.ok ? `Order dibuat: ${data.id}` : (data.error || "Gagal membuat order.");
};

$("#search").oninput = renderProducts;
$("#category").onchange = renderProducts;
loadProducts();

/* Cyber Dodge */
(() => {
  const canvas=$("#cyberGame"), ctx=canvas.getContext("2d"), scoreEl=$("#score"), bestEl=$("#best"), start=$("#start");
  const W=canvas.width,H=canvas.height;
  const keys={left:false,right:false,up:false,down:false};
  let player,blocks,score,best=Number(localStorage.getItem("zyrexCyberBest")||0),running=false,last=0,spawnTimer=0,raf;
  bestEl.textContent=best;

  function reset(){player={x:W/2-16,y:H-55,w:32,h:32,speed:260};blocks=[];score=0;spawnTimer=0;scoreEl.textContent=0}
  function startGame(){cancelAnimationFrame(raf);reset();running=true;start.textContent="RESTART";last=performance.now();raf=requestAnimationFrame(loop)}
  function collision(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function spawn(){const s=22+Math.random()*30;blocks.push({x:Math.random()*(W-s),y:-s,w:s,h:s,speed:130+Math.random()*100+score*1.5})}
  function end(){running=false;score=Math.floor(score);if(score>best){best=score;localStorage.setItem("zyrexCyberBest",best);bestEl.textContent=best}draw("GAME OVER")}
  function update(dt){
    const dx=(keys.right?1:0)-(keys.left?1:0),dy=(keys.down?1:0)-(keys.up?1:0),len=Math.hypot(dx,dy)||1;
    player.x=Math.max(0,Math.min(W-player.w,player.x+dx/len*player.speed*dt));
    player.y=Math.max(0,Math.min(H-player.h,player.y+dy/len*player.speed*dt));
    spawnTimer-=dt;if(spawnTimer<=0){spawn();spawnTimer=Math.max(.25,.7-score*.004)}
    for(const b of blocks){b.y+=b.speed*dt;if(collision(player,b))return end()}
    blocks=blocks.filter(b=>b.y<H+60);score+=dt*10;scoreEl.textContent=Math.floor(score);
  }
  function draw(message){
    ctx.clearRect(0,0,W,H);ctx.fillStyle="#050506";ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=.08;ctx.strokeStyle="#fff";
    for(let i=0;i<W;i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke()}
    for(let i=0;i<H;i+=40){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(W,i);ctx.stroke()}
    ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.shadowBlur=18;ctx.shadowColor="#8b5cf6";ctx.fillRect(player.x,player.y,player.w,player.h);ctx.shadowBlur=0;
    ctx.fillStyle="#8b5cf6";blocks.forEach(b=>ctx.fillRect(b.x,b.y,b.w,b.h));
    if(message){ctx.fillStyle="rgba(0,0,0,.6)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="700 34px system-ui";ctx.fillText(message,W/2,H/2)}
  }
  function loop(t){if(!running)return;const dt=Math.min(.033,(t-last)/1000);last=t;update(dt);if(running){draw();raf=requestAnimationFrame(loop)}}
  const map={ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right",ArrowUp:"up",w:"up",ArrowDown:"down",s:"down"};
  addEventListener("keydown",e=>{if(map[e.key]){e.preventDefault();keys[map[e.key]]=true}});
  addEventListener("keyup",e=>{if(map[e.key])keys[map[e.key]]=false});
  $$(".controls button").forEach(b=>{const d=b.dataset.key;b.onpointerdown=e=>{e.preventDefault();keys[d]=true};b.onpointerup=()=>keys[d]=false;b.onpointercancel=()=>keys[d]=false;b.onpointerleave=()=>keys[d]=false});
  start.onclick=startGame;reset();draw("READY");
})();
