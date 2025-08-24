// ===== Utility =====
const rand = (a,b)=>Math.random()*(b-a)+a;
const clamp = (v,a,b)=>Math.max(a, Math.min(b,v));
const now = ()=>performance.now();

// ===== Canvas Setup =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

// ===== World Config =====
const WORLD = { w: 5000, h: 5000 }; // bigger map
const GRID = 120;

// ===== Player =====
const player = {
  id: 'me',
  name: 'Tanky',
  x: WORLD.w/2, y: WORLD.h/2, r: 18,
  speed: 220,
  baseSpeed: 220,
  vx:0, vy:0,
  angle: 0,
  color: '#9dd0ff',
  hp: 100, maxHp: 100,
  fireCooldown: 0,
  baseFireRate: 0.33,
  bulletSize: 8,
  stats: { size:0, reload:0, speed:0, hp:0 },
  level: 1, xp: 0, points: 0
};

// Other players (multiplayer ready structure)
const players = { [player.id]: player };

function xpForLevel(level){
  return Math.floor(20 * Math.pow(1.25, level-1));
}

// ===== Camera =====
const camera = { x:0, y:0 };
function updateCamera(){
  camera.x = clamp(player.x - canvas.width/2, 0, WORLD.w - canvas.width);
  camera.y = clamp(player.y - canvas.height/2, 0, WORLD.h - canvas.height);
}

// ===== Input =====
const keys = new Set();
addEventListener('keydown', e=>{ if(['KeyW','KeyA','KeyS','KeyD','KeyM'].includes(e.code)) e.preventDefault(); keys.add(e.code);
  if(e.code==='KeyM'){ toggleMenu(); }
});
addEventListener('keyup', e=> keys.delete(e.code));

let mouse = { x:0, y:0, worldX:0, worldY:0, down:false };
canvas.addEventListener('mousemove', e=>{
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
  mouse.worldX = mouse.x + camera.x; mouse.worldY = mouse.y + camera.y;
});
canvas.addEventListener('mousedown', ()=> mouse.down = true);
addEventListener('mouseup', ()=> mouse.down = false);

// ===== Maze Walls =====
const walls = [];
function addWall(x,y,w,h){ walls.push({x,y,w,h}); }
// Border walls
addWall(-50, -50, WORLD.w+100, 50);
addWall(-50, WORLD.h, WORLD.w+100, 50);
addWall(-50, 0, 50, WORLD.h);
addWall(WORLD.w, 0, 50, WORLD.h);
// Some random walls for a new map style
for(let i=0;i<25;i++){
  addWall(rand(200, WORLD.w-400), rand(200, WORLD.h-400), rand(200,600), 30);
}
for(let i=0;i<25;i++){
  addWall(rand(200, WORLD.w-400), rand(200, WORLD.h-400), 30, rand(200,600));
}

// ===== XP Dots (enemies) =====
const dots = [];
const DOT_COUNT = 800; // more enemies
function placeDot(){
  for(let k=0;k<30;k++){
    const x = rand(80, WORLD.w-80);
    const y = rand(80, WORLD.h-80);
    const r = rand(6, 14); // larger hitboxes
    const col = '#6bf0a6';
    const rect = {x:x-r, y:y-r, w:r*2, h:r*2};
    if(!collidesRectWalls(rect)) { dots.push({x,y,r, color:col, hp:r, xp: Math.ceil(r)}); return; }
  }
}
for(let i=0;i<DOT_COUNT;i++) placeDot();

// ===== Bullets =====
const bullets = [];
function shoot(){
  const cd = Math.max(0.08, player.baseFireRate * Math.pow(0.9, player.stats.reload));
  if(player.fireCooldown>0) return;
  player.fireCooldown = cd;
  const angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
  const speed = 700;
  const size = player.bulletSize + player.stats.size * 2;
  bullets.push({owner: player.id, x: player.x + Math.cos(angle)*(player.r+size+6), y: player.y + Math.sin(angle)*(player.r+size+6),
                vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, r: size, life: 1.2});
}

// ===== Collision Helpers =====
function circleRectIntersect(cx, cy, r, rx, ry, rw, rh){
  const nx = clamp(cx, rx, rx+rw);
  const ny = clamp(cy, ry, ry+rh);
  const dx = cx - nx, dy = cy - ny;
  return dx*dx + dy*dy <= r*r;
}
function collidesCircleWalls(cx,cy,r){
  for(const w of walls){ if(circleRectIntersect(cx,cy,r,w.x,w.y,w.w,w.h)) return true; }
  return false;
}
function collidesRectWalls(rect){
  for(const w of walls){ if(!(rect.x+rect.w < w.x || rect.x > w.x+w.w || rect.y+rect.h < w.y || rect.y > w.y+w.h)) return true; }
  return false;
}

function moveWithCollision(ent, dt){
  let nx = ent.x + ent.vx * dt;
  if(!collidesCircleWalls(nx, ent.y, ent.r)) ent.x = nx;
  let ny = ent.y + ent.vy * dt;
  if(!collidesCircleWalls(ent.x, ny, ent.r)) ent.y = ny;
  ent.x = clamp(ent.x, ent.r+2, WORLD.w-ent.r-2);
  ent.y = clamp(ent.y, ent.r+2, WORLD.h-ent.r-2);
}

// ===== Game Loop =====
let last = now();
function tick(){
  const t = now();
  let dt = (t - last)/1000; if(dt>0.05) dt=0.05; last = t;

  // Input -> velocity
  const sp = (player.baseSpeed + player.stats.speed*18);
  const ax = (keys.has('KeyD')?1:0) - (keys.has('KeyA')?1:0);
  const ay = (keys.has('KeyS')?1:0) - (keys.has('KeyW')?1:0);
  const len = Math.hypot(ax,ay) || 1;
  player.vx = (ax/len) * sp;
  player.vy = (ay/len) * sp;

  player.angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
  if(mouse.down) shoot();
  if(player.fireCooldown>0) player.fireCooldown -= dt;

  moveWithCollision(player, dt);

  // Update bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    for(let j=dots.length-1;j>=0;j--){
      const d = dots[j];
      const dist2 = (d.x-b.x)*(d.x-b.x)+(d.y-b.y)*(d.y-b.y);
      if(dist2 <= (d.r+b.r)*(d.r+b.r)){
        d.hp -= Math.max(1, Math.floor(b.r/5));
        b.life -= 0.15;
        if(d.hp<=0){ player.xp += d.xp; dots.splice(j,1); placeDot(); }
      }
    }
    if(b.life<=0) bullets.splice(i,1);
  }

  const need = xpForLevel(player.level);
  if(player.xp >= need){ player.xp -= need; player.level++; player.points++; player.maxHp += 5; player.hp = Math.min(player.hp+5, player.maxHp); }

  updateCamera();
  draw();
  requestAnimationFrame(tick);
}

// ===== Drawing =====
function drawGrid(){
  const startX = Math.floor(camera.x/GRID)*GRID;
  const startY = Math.floor(camera.y/GRID)*GRID;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for(let x=startX; x<camera.x+canvas.width; x+=GRID){
    ctx.beginPath(); ctx.moveTo(x-camera.x, 0); ctx.lineTo(x-camera.x, canvas.height); ctx.stroke();
  }
  for(let y=startY; y<camera.y+canvas.height; y+=GRID){
    ctx.beginPath(); ctx.moveTo(0, y-camera.y); ctx.lineTo(canvas.width, y-camera.y); ctx.stroke();
  }
}

function drawWalls(){
  ctx.fillStyle = '#2a2f54';
  for(const w of walls){
    const x = w.x - camera.x, y = w.y - camera.y;
    if(x+w.w<0||y+w.h<0||x>canvas.width||y>canvas.height) continue;
    ctx.fillRect(x,y,w.w,w.h);
  }
}

function drawDots(){
  for(const d of dots){
    const x = d.x - camera.x, y = d.y - camera.y;
    if(x<-30||y<-30||x>canvas.width+30||y>canvas.height+30) continue;
    ctx.beginPath(); ctx.arc(x,y,d.r,0,Math.PI*2);
    ctx.fillStyle = d.color; ctx.fill();
  }
}

function drawBullets(){
  ctx.fillStyle = '#ffd08a';
  for(const b of bullets){
    const x = b.x - camera.x, y = b.y - camera.y;
    ctx.beginPath(); ctx.arc(x,y,b.r,0,Math.PI*2); ctx.fill();
  }
}

function drawPlayers(){
  for(const id in players){
    const p = players[id];
    const x = p.x - camera.x, y = p.y - camera.y;
    ctx.beginPath(); ctx.arc(x,y,p.r,0,Math.PI*2); ctx.fillStyle = p.color; ctx.fill();
    ctx.save(); ctx.translate(x,y); ctx.rotate(p.angle);
    ctx.fillStyle = '#c8e6ff'; ctx.fillRect(0,-5, p.r+14, 10);
    ctx.restore();
    ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'white';
    ctx.fillText(p.name, x, y-p.r-12);
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawGrid();
  drawWalls();
  drawDots();
  drawBullets();
  drawPlayers();
  drawUI();
  drawMinimap();
}

function drawUI(){
  document.getElementById('playerName').textContent = player.name;
  document.getElementById('levelText').textContent = player.level;
  const need = xpForLevel(player.level);
  document.getElementById('xpText').textContent = `${player.xp} / ${need}`;
  const pct = clamp(player.xp / need, 0, 1) * 100;
  document.getElementById('levelFill').style.width = pct + '%';
}

function drawMinimap(){
  const m = document.getElementById('minimap');
  const mctx = m.getContext('2d');
  const mw = m.width, mh = m.height;
  mctx.clearRect(0,0,mw,mh);
  mctx.fillStyle = 'rgba(255,255,255,0.08)';
  mctx.fillRect(0,0,mw,mh);

  const sx = mw / WORLD.w; const sy = mh / WORLD.h;
  mctx.fillStyle = 'rgba(255,255,255,0.35)';
  for(const w of walls){ mctx.fillRect(w.x*sx, w.y*sy, w.w*sx, w.h*sy); }

  for(const id in players){
    const p = players[id];
    mctx.fillStyle = id===player.id ? '#6bd6ff' : '#ff6b6b';
    mctx.beginPath(); mctx.arc(p.x*sx, p.y*sy, 4, 0, Math.PI*2); mctx.fill();
  }

  mctx.strokeStyle = 'rgba(107,214,255,0.8)'; mctx.strokeRect(camera.x*sx, camera.y*sy, canvas.width*sx, canvas.height*sy);
}

// ===== Menu / Upgrades =====
const menuEl = document.getElementById('menu');
const pointsText = document.getElementById('pointsText');
function toggleMenu(){ menuEl.classList.toggle('active'); }
menuEl.addEventListener('click', (e)=>{ if(e.target===menuEl) toggleMenu(); });
for(const btn of menuEl.querySelectorAll('button[data-up]')){
  btn.addEventListener('click', ()=>{
    if(player.points<=0) return;
    const key = btn.getAttribute('data-up');
    player.stats[key]++;
    player.points--;
    if(key==='size') player.bulletSize += 1;
    if(key==='hp'){ player.maxHp += 10; player.hp = player.maxHp; }
    updateUpgradeUI();
  });
}
function updateUpgradeUI(){
  pointsText.textContent = player.points;
  document.getElementById('lvlSize').textContent = `Lv. ${player.stats.size}`;
  document.getElementById('lvlReload').textContent = `Lv. ${player.stats.reload}`;
  document.getElementById('lvlSpeed').textContent = `Lv. ${player.stats.speed}`;
  document.getElementById('lvlHP').textContent = `Lv. ${player.stats.hp}`;
}

// ===== Start =====
updateUpgradeUI();
requestAnimationFrame(tick);
