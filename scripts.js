// =============================
// Diep.io-like Game Script (Reworked)
// =============================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======= GAME SETTINGS =======
const world = { width: 3000, height: 3000 };
const keys = {};
let bullets = [];
let xpDots = [];
let enemies = [];
let walls = [];

// Debug menu toggle
let debugMode = false;

// ======= PLAYER =======
const player = {
  id: "local",
  x: world.width / 2,
  y: world.height / 2,
  size: 20,
  color: "blue",
  speed: 3,
  bulletSize: 8,
  reloadTime: 500,
  lastShot: 0,
  hp: 100,
  xp: 0,
  level: 1,
  name: "Player",
};

// Multiplayer placeholder
const players = { local: player };

// ======= WORLD SETUP =======
function initWorld() {
  // Walls
  walls = [
    { x: 200, y: 200, w: 600, h: 40 },
    { x: 1000, y: 800, w: 40, h: 600 },
    { x: 1500, y: 400, w: 800, h: 40 },
    { x: 2200, y: 1200, w: 40, h: 800 },
  ];

  // XP dots
  for (let i = 0; i < 100; i++) {
    xpDots.push({
      x: Math.random() * world.width,
      y: Math.random() * world.height,
      size: 15, // bigger hitbox
      color: "green",
    });
  }

  // Wandering enemies
  for (let i = 0; i < 20; i++) {
    enemies.push({
      x: Math.random() * world.width,
      y: Math.random() * world.height,
      size: 25,
      color: "red",
      speed: 1 + Math.random() * 1.5,
      dir: Math.random() * Math.PI * 2,
      hp: 30,
    });
  }
}

// ======= INPUT HANDLING =======
window.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "[") debugMode = !debugMode;
});
window.addEventListener("keyup", e => delete keys[e.key]);

// Mouse aiming
let mouseX = 0, mouseY = 0;
window.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
window.addEventListener("mousedown", shoot);

// ======= SHOOTING =======
function shoot() {
  const now = Date.now();
  if (now - player.lastShot < player.reloadTime) return;
  player.lastShot = now;

  const angle = Math.atan2(mouseY - canvas.height / 2, mouseX - canvas.width / 2);
  bullets.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(angle) * 8,
    vy: Math.sin(angle) * 8,
    size: player.bulletSize,
    owner: player.id,
  });
}

// ======= UPDATE LOOP =======
function update() {
  // Movement
  if (keys["w"]) player.y -= player.speed;
  if (keys["s"]) player.y += player.speed;
  if (keys["a"]) player.x -= player.speed;
  if (keys["d"]) player.x += player.speed;

  // Wall collision
  for (let wall of walls) {
    if (rectCircleCollide(player, wall)) {
      if (keys["w"]) player.y += player.speed;
      if (keys["s"]) player.y -= player.speed;
      if (keys["a"]) player.x += player.speed;
      if (keys["d"]) player.x -= player.speed;
    }
  }

  // Bullets update
  bullets.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
  });

  // XP dots collision
  xpDots = xpDots.filter(dot => {
    for (let b of bullets) {
      if (dist(dot.x, dot.y, b.x, b.y) < dot.size + b.size) {
        player.xp += 10;
        return false;
      }
    }
    if (dist(dot.x, dot.y, player.x, player.y) < dot.size + player.size) {
      player.xp += 5;
      return false;
    }
    return true;
  });

  // Enemy wandering
  for (let e of enemies) {
    e.x += Math.cos(e.dir) * e.speed;
    e.y += Math.sin(e.dir) * e.speed;
    if (Math.random() < 0.01) e.dir = Math.random() * Math.PI * 2;

    // Bullets damage enemies
    bullets = bullets.filter(b => {
      if (dist(b.x, b.y, e.x, e.y) < e.size + b.size) {
        e.hp -= 10;
        if (e.hp <= 0) {
          player.xp += 50;
          enemies = enemies.filter(en => en !== e);
        }
        return false;
      }
      return true;
    });
  }

  // Level up
  if (player.xp >= player.level * 100) {
    player.level++;
    player.xp = 0;
  }
}

// ======= DRAW LOOP =======
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Camera offset
  const offsetX = canvas.width / 2 - player.x;
  const offsetY = canvas.height / 2 - player.y;

  // Walls
  ctx.fillStyle = "grey";
  for (let wall of walls) ctx.fillRect(wall.x + offsetX, wall.y + offsetY, wall.w, wall.h);

  // XP dots
  for (let dot of xpDots) {
    ctx.fillStyle = dot.color;
    ctx.beginPath();
    ctx.arc(dot.x + offsetX, dot.y + offsetY, dot.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemies
  for (let e of enemies) {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x + offsetX, e.y + offsetY, e.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bullets
  ctx.fillStyle = "black";
  for (let b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x + offsetX, b.y + offsetY, b.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, player.size, 0, Math.PI * 2);
  ctx.fill();

  // Player name
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(player.name, canvas.width / 2, canvas.height / 2 - player.size - 10);

  // XP bar
  ctx.fillStyle = "lightgrey";
  ctx.fillRect(20, 20, 200, 20);
  ctx.fillStyle = "blue";
  ctx.fillRect(20, 20, (player.xp / (player.level * 100)) * 200, 20);
  ctx.strokeRect(20, 20, 200, 20);

  // Minimap
  const mmSize = 150;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(canvas.width - mmSize - 20, canvas.height - mmSize - 20, mmSize, mmSize);
  ctx.fillStyle = "red";
  ctx.fillRect(canvas.width - mmSize - 20 + (player.x / world.width) * mmSize, canvas.height - mmSize - 20 + (player.y / world.height) * mmSize, 5, 5);

  // Debug menu
  if (debugMode) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(20, 60, 250, 160);
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText("DEBUG MENU (press [ to toggle)", 30, 80);
    ctx.fillText("1: Increase Speed", 30, 100);
    ctx.fillText("2: Increase Bullet Size", 30, 120);
    ctx.fillText("3: Faster Reload", 30, 140);
    ctx.fillText("4: Increase HP", 30, 160);
  }
}

// ======= DEBUG CONTROLS =======
window.addEventListener("keydown", e => {
  if (!debugMode) return;
  switch (e.key) {
    case "1": player.speed += 1; break;
    case "2": player.bulletSize += 2; break;
    case "3": player.reloadTime = Math.max(100, player.reloadTime - 50); break;
    case "4": player.hp += 20; break;
  }
});

// ======= HELPERS =======
function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}
function rectCircleCollide(circle, rect) {
  let cx = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  let cy = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  return dist(circle.x, circle.y, cx, cy) < circle.size;
}

// ======= GAME LOOP =======
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

initWorld();
gameLoop();