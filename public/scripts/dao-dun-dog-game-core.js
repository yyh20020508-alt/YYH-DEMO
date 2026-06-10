'use strict';

// ─── CANVAS SETUP ────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let safeTop = 0, safeBottom = 0;
// Measure safe area insets via hidden divs — reliable across all browsers
const _safeTopDiv = Object.assign(document.createElement('div'), {});
_safeTopDiv.style.cssText = 'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;';
const _safeBotDiv = Object.assign(document.createElement('div'), {});
_safeBotDiv.style.cssText = 'position:fixed;bottom:0;left:0;width:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
document.body.appendChild(_safeTopDiv);
document.body.appendChild(_safeBotDiv);

function updateSafeAreas() {
  safeTop = _safeTopDiv.offsetHeight || 0;
  safeBottom = _safeBotDiv.offsetHeight || 0;
}
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; updateSafeAreas(); }
resize();
window.addEventListener('resize', resize);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MAP_W = 6000, MAP_H = 6000;
const PLAYER_SPEED = 3.2;
const ENEMY_COUNT_TARGET = 12;
const OBSTACLE_COUNT_TARGET = 160;

// Weapon orbit radius & blade length per level
function weaponOrbit(lvl) { return 55 + lvl * 10; }
function weaponBlade(lvl) { return 16 + lvl * 6; }
function weaponShieldR(lvl) { return 7 + lvl * 1.8; }
function weaponRotSpeed(lvl) { return 0.048 + lvl * 0.004; }
// Skill active duration (frames): 6s + 0.3s per level; cooldown: 6s - 0.25s/lvl, min 1.5s
function skillDuration(lvl)  { return Math.round((6 + lvl * 0.3) * 60); }
function skillCooldown(lvl)  { return Math.round(Math.max(1.5, 6 - lvl * 0.25) * 60); }

// ─── STATE ────────────────────────────────────────────────────────────────────
let G = {}; // game state

// Character images
const playerImg = new Image();
playerImg.src = './player-dog.png';
// 7 player character tiers — switch by weapon level
const playerImgs = Array.from({length: 7}, (_, i) => { const img = new Image(); img.src = `./主角${i+1}.png`; return img; });
// 7 enemy tiers: level 1-2 → img1, 3-4 → img2, 5-6 → img3, 7-9 → img4, 10-12 → img5, 13-15 → img6, 16+ → img7
const enemyImgs = Array.from({length: 7}, (_, i) => {
  const img = new Image();
  img.src = i === 5 ? './敌人6.jpg' : `./敌人${i+1}.png`;
  return img;
});
// Weapon images: 刀1-7 (sword), 盾1-7 (shield)
const swordImgs  = Array.from({length: 7}, (_, i) => { const img = new Image(); img.src = `./刀${i+1}.png`; return img; });
const shieldImgs = Array.from({length: 7}, (_, i) => { const img = new Image(); img.src = `./盾${i+1}.png`; return img; });
// Obstacle images: 障碍1-7
const obstacleImgs = Array.from({length: 7}, (_, i) => { const img = new Image(); img.src = `./障碍${i+1}.png`; return img; });
// Map weapon level → 0-based image index (same tiers as enemy images)
function getWeaponImgIdx(lvl) {
  return Math.min((lvl || 1) - 1, 6);
}
function getEnemyImgIdx(lvl) { return getWeaponImgIdx(lvl); }
let keys = {};
let joy = { active: false, bx: 0, by: 0, dx: 0, dy: 0, id: -1 };
let running = false;
let shakeDur = 0, shakeAmt = 0;

// ─── AUDIO ────────────────────────────────────────────────────────────────────
let audioCtx;
function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return audioCtx;
}
function playTone(freq, type, dur, vol) {
  const ac = getAudio(); if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.start(); osc.stop(ac.currentTime + dur);
  } catch(e) {}
}
function sfxHit()    { playTone(220, 'sawtooth', 0.08, 0.12); }
function sfxTree()   { playTone(180, 'triangle', 0.1, 0.1); }
function sfxLevelUp(){ playTone(660, 'sine', 0.2, 0.2); setTimeout(()=>playTone(880,'sine',0.2,0.2),120); }
function sfxDie()    { playTone(110,'sawtooth',0.4,0.2); }

// ─── INIT ─────────────────────────────────────────────────────────────────────
function initGame() {
  shakeDur = 0;
  G = {
    tick: 0,
    score: 0,
    kills: 0,
    camera: { x: 0, y: 0 },
    player: {
      x: MAP_W / 2, y: MAP_H / 2,
      r: 22, facing: 1,
      vx: 0, vy: 0,
      hp: 100, maxHp: 100,
      invincible: 0,
      weaponAngle: 0,
      weaponLevel: 1,
      xp: 0, xpNext: 15,
      swordActive: false, swordTimer: 0, swordCd: 0,
      shieldActive: false, shieldTimer: 0, shieldCd: 0,
    },
    obstacles: [],
    enemies: [],
    particles: [],
    floats: [],
    decorations: [],
  };

  // Ground decorations (flowers, stones)
  for (let i = 0; i < 200; i++) {
    G.decorations.push({
      x: Math.random() * MAP_W, y: Math.random() * MAP_H,
      type: Math.random() < 0.6 ? 'flower' : 'stone',
      c: ['#ff8fa3','#ffd6e0','#fffacd','#d4edda'][Math.floor(Math.random()*4)],
      r: 3 + Math.random() * 4,
    });
  }

  // Obstacles
  for (let i = 0; i < 200; i++) spawnObstacle(true);

  // Remove those too close to spawn
  G.obstacles = G.obstacles.filter(o => dist(o, G.player) > 180);

  // Initial enemies
  for (let i = 0; i < 5; i++) spawnEnemy();

  joy = { active: false, bx: 0, by: 0, dx: 0, dy: 0, id: -1 };
}

function spawnObstacle(initial) {
  const p = G.player || { x: MAP_W/2, y: MAP_H/2 };
  let x, y;
  if (initial) {
    x = 100 + Math.random() * (MAP_W - 200);
    y = 100 + Math.random() * (MAP_H - 200);
  } else {
    const ang = Math.random() * Math.PI * 2;
    const d = 500 + Math.random() * 800;
    x = clamp(p.x + Math.cos(ang) * d, 100, MAP_W - 100);
    y = clamp(p.y + Math.sin(ang) * d, 100, MAP_H - 100);
  }

  const roll = Math.random();
  const o = { x, y, r: 0, w: 0, h: 0, hp: 0, maxHp: 0, xpVal: 0, scoreVal: 0, hitCd: 0,
              imgIdx: Math.floor(Math.random() * 7) };

  if (roll < 0.28) {
    // Tree
    o.type = 'tree'; o.subtype = 'tree';
    o.r = 26 + Math.random() * 18;
    o.hp = o.maxHp = 2 + Math.floor(Math.random() * 3);
    o.xpVal = 2; o.scoreVal = 2;
  } else if (roll < 0.52) {
    // Flower
    o.type = 'tree'; o.subtype = 'flower';
    o.r = 16 + Math.random() * 10;
    o.hp = o.maxHp = 1 + Math.floor(Math.random() * 2);
    o.xpVal = 1; o.scoreVal = 1;
  } else if (roll < 0.76) {
    // House
    o.type = 'building'; o.subtype = 'house';
    o.w = 54 + Math.random() * 28; o.h = 50 + Math.random() * 24;
    o.r = Math.hypot(o.w, o.h) / 2;
    o.hp = o.maxHp = 5 + Math.floor(Math.random() * 4);
    o.xpVal = 6; o.scoreVal = 6;
  } else {
    // Car
    o.type = 'building'; o.subtype = 'car';
    o.w = 30 + Math.random() * 14; o.h = 54 + Math.random() * 18;
    o.r = Math.hypot(o.w, o.h) / 2;
    o.hp = o.maxHp = 3 + Math.floor(Math.random() * 3);
    o.xpVal = 4; o.scoreVal = 4;
  }
  G.obstacles.push(o);
}

function spawnEnemy() {
  const p = G.player;
  const ang = Math.random() * Math.PI * 2;
  const d = 300 + Math.random() * 350;
  const x = clamp(p.x + Math.cos(ang) * d, 40, MAP_W - 40);
  const y = clamp(p.y + Math.sin(ang) * d, 40, MAP_H - 40);
  // Variance grows with player level: more high-level enemies appear later
  const pLvl2 = G.player.weaponLevel;
  const variance = Math.min(1 + Math.floor(pLvl2 / 4), 3); // 1 at lv1-3, 2 at lv4-7, 3 at lv8+
  const lvl = clamp(pLvl2 + Math.floor(Math.random() * (variance * 2 + 1) - variance), 1, 18);
  G.enemies.push({
    x, y, r: 18, facing: 1,
    weaponLevel: lvl,
    weaponAngle: Math.random() * Math.PI * 2,
    hp: 2 + lvl, maxHp: 2 + lvl,
    invincible: 0,
    vx: 0, vy: 0,
    state: 'roam',
    roamTgt: { x: x + rnd(-300, 300), y: y + rnd(-300, 300) },
    roamTimer: rnd(60, 180),
    xpVal: lvl * 2, scoreVal: lvl * 15,
    imgIdx: Math.floor(Math.random() * 2), // randomly pick enemy1 or enemy2
  });
}

// ─── INPUT ─────────────────────────────────────────────────────────────────────
// Skill button screen positions — vertical stack on the right
function swordBtnPos()  { return { x: window.innerWidth - 68, y: window.innerHeight - 165 - safeBottom, r: 38 }; }
function shieldBtnPos() { return { x: window.innerWidth - 68, y: window.innerHeight - 255 - safeBottom, r: 38 }; }

function activateSword() {
  const p = G && G.player; if (!p) return;
  if (p.swordActive || p.swordCd > 0) return;
  p.swordActive = true; p.swordTimer = skillDuration(p.weaponLevel);
}
function activateShield() {
  const p = G && G.player; if (!p) return;
  if (p.shieldActive || p.shieldCd > 0) return;
  p.shieldActive = true; p.shieldTimer = skillDuration(p.weaponLevel);
}

window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'q') activateSword();
  if (e.key.toLowerCase() === 'e') activateShield();
  e.preventDefault && ['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()) && e.preventDefault();
});
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const sp = swordBtnPos(), sh = shieldBtnPos();
    if (Math.hypot(t.clientX - sp.x, t.clientY - sp.y) < sp.r + 12) {
      activateSword(); continue;
    }
    if (Math.hypot(t.clientX - sh.x, t.clientY - sh.y) < sh.r + 12) {
      activateShield(); continue;
    }
    if (!joy.active && t.clientX < window.innerWidth * 0.55) {
      joy.active = true; joy.bx = t.clientX; joy.by = t.clientY;
      joy.dx = 0; joy.dy = 0; joy.id = t.identifier;
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) {
      const dx = t.clientX - joy.bx, dy = t.clientY - joy.by;
      const len = Math.hypot(dx, dy), max = 65;
      joy.dx = len > max ? dx / len : dx / max;
      joy.dy = len > max ? dy / len : dy / max;
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) {
      joy.active = false; joy.dx = 0; joy.dy = 0; joy.id = -1;
    }
  }
}, { passive: false });

// ─── UPDATE ────────────────────────────────────────────────────────────────────
function update() {
  G.tick++;
  const p = G.player;

  // ---- Player movement ----
  let mx = 0, my = 0;
  if (keys['w'] || keys['arrowup'])    my -= 1;
  if (keys['s'] || keys['arrowdown'])  my += 1;
  if (keys['a'] || keys['arrowleft'])  mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  if (joy.active) { mx = joy.dx; my = joy.dy; }
  const mlen = Math.hypot(mx, my);
  if (mlen > 0.01) { mx /= mlen; my /= mlen; if (mx > 0.1) p.facing = 1; else if (mx < -0.1) p.facing = -1; }
  p.x = clamp(p.x + mx * PLAYER_SPEED, p.r, MAP_W - p.r);
  p.y = clamp(p.y + my * PLAYER_SPEED, p.r, MAP_H - p.r);

  // ---- Skill timers ----
  if (p.swordActive) {
    if (--p.swordTimer <= 0) { p.swordActive = false; p.swordCd = skillCooldown(p.weaponLevel); }
  } else if (p.swordCd > 0) p.swordCd--;
  if (p.shieldActive) {
    if (--p.shieldTimer <= 0) { p.shieldActive = false; p.shieldCd = skillCooldown(p.weaponLevel); }
  } else if (p.shieldCd > 0) p.shieldCd--;

  // ---- Weapon rotation ----
  p.weaponAngle += weaponRotSpeed(p.weaponLevel);

  // ---- Player weapon → obstacles (only when sword active) ----
  const pOrbit = weaponOrbit(p.weaponLevel);
  const pBlade = weaponBlade(p.weaponLevel);
  if (p.swordActive) {
  for (let i = G.obstacles.length - 1; i >= 0; i--) {
    const o = G.obstacles[i];
    if (o.hitCd > 0) { o.hitCd--; continue; }
    // Distance from obstacle center to weapon orbit circle (closest point on circle)
    const d = dist(p, o);
    if (Math.abs(d - pOrbit) < o.r + pBlade * 0.6) {
      o.hp--;
      o.hitCd = 18;
      sfxTree();
      spawnParticles(o.x, o.y, o.type === 'tree' ? '#66BB6A' : '#90A4AE', 5);
      if (o.hp <= 0) {
        addXP(o.xpVal);
        G.score += o.scoreVal;
        spawnFloat(o.x, o.y - 20, `+${o.scoreVal}`, '#fff', 14);
        spawnParticles(o.x, o.y, o.type === 'tree' ? '#4CAF50' : '#78909C', 14);
        G.obstacles.splice(i, 1);
      }
    }
  }
  } // end swordActive

  // ---- Player weapon → enemies (only when sword active) ----
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.invincible > 0) { e.invincible--; continue; }
    if (!p.swordActive) continue; // sword skill must be active to attack
    if (p.weaponLevel < e.weaponLevel) continue; // can't hurt stronger enemies
    const d = dist(p, e);
    if (Math.abs(d - pOrbit) < e.r + pBlade * 0.5 || d < p.r + e.r + pBlade * 0.3) {
      e.hp--;
      e.invincible = 25;
      sfxHit();
      spawnParticles(e.x, e.y, '#FF8A65', 6);
      if (e.hp <= 0) {
        addXP(e.xpVal);
        G.score += e.scoreVal;
        G.kills++;
        spawnFloat(e.x, e.y - 30, `击败！+${e.scoreVal}`, '#FFD700', 16);
        spawnParticles(e.x, e.y, '#FF6D00', 20);
        G.enemies.splice(i, 1);
      }
    }
  }

  // ---- Enemy weapon → player (blocked by shield skill) ----
  if (p.invincible > 0) p.invincible--;
  for (const e of G.enemies) {
    if (p.invincible > 0) continue;
    if (p.shieldActive) {
      // Shield blocks: show visual but no damage
      const d2 = dist(e, p);
      const eOrbit2 = weaponOrbit(e.weaponLevel), eBlade2 = weaponBlade(e.weaponLevel);
      if (Math.abs(d2 - eOrbit2) < p.r + eBlade2 * 0.5 || d2 < e.r + p.r + eBlade2 * 0.3) {
        if (G.tick % 18 === 0) spawnFloat(p.x, p.y - 35, '🛡️', '#64B5F6', 20);
      }
      continue;
    }
    const eOrbit = weaponOrbit(e.weaponLevel);
    const eBlade = weaponBlade(e.weaponLevel);
    const d = dist(e, p);
    if (Math.abs(d - eOrbit) < p.r + eBlade * 0.5 || d < e.r + p.r + eBlade * 0.3) {
      p.hp -= 12 + Math.floor(e.weaponLevel * 1.5);
      p.invincible = 45;
      shakeDur = 20; shakeAmt = 5;
      sfxHit();
      spawnParticles(p.x, p.y, '#EF5350', 12);
      spawnFloat(p.x, p.y - 35, `-${8 + e.weaponLevel} HP`, '#FF5252', 18);
      if (p.hp <= 0) { p.hp = 0; endGame(); return; }
    }
  }

  // ---- Enemy AI ----
  for (const e of G.enemies) {
    const d = dist(e, p);
    // All enemies chase the player when in range — no fleeing
    if (d < 650)       e.state = 'chase';
    else if (d > 750)  e.state = 'roam';

    let tx = 0, ty = 0;
    const spd = 1.6 + e.weaponLevel * 0.12;
    if (e.state === 'chase') {
      // Each enemy approaches from a unique angle — spreads them around player
      if (e.approachAng === undefined) e.approachAng = Math.random() * Math.PI * 2;
      const spreadR = 60; // orbit radius around player center
      const tgtX = p.x + Math.cos(e.approachAng) * spreadR;
      const tgtY = p.y + Math.sin(e.approachAng) * spreadR;
      tx = tgtX - e.x; ty = tgtY - e.y;
    } else {
      e.roamTimer--;
      if (e.roamTimer <= 0) {
        e.roamTgt = { x: clamp(e.x + rnd(-400,400), 50, MAP_W-50), y: clamp(e.y + rnd(-400,400), 50, MAP_H-50) };
        e.roamTimer = rnd(80, 200);
      }
      tx = e.roamTgt.x - e.x; ty = e.roamTgt.y - e.y;
    }
    const len = Math.hypot(tx, ty);
    if (len > 1) {
      e.vx = (tx / len) * spd; e.vy = (ty / len) * spd;
      if (e.vx > 0.1) e.facing = 1; else if (e.vx < -0.1) e.facing = -1;
    } else { e.vx = 0; e.vy = 0; }
    e.x = clamp(e.x + e.vx, e.r, MAP_W - e.r);
    e.y = clamp(e.y + e.vy, e.r, MAP_H - e.r);
    e.weaponAngle += weaponRotSpeed(e.weaponLevel) * 1.1;
  }

  // ---- Enemy separation (prevent bunching) — multiple passes ----
  const minSep = 120;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < G.enemies.length; i++) {
      for (let j = i + 1; j < G.enemies.length; j++) {
        const a = G.enemies[i], b = G.enemies[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < minSep) {
          const push = (minSep - d) / 2 * 0.9;
          const nx = dx / d, ny = dy / d;
          a.x = clamp(a.x - nx * push, a.r, MAP_W - a.r);
          a.y = clamp(a.y - ny * push, a.r, MAP_H - a.r);
          b.x = clamp(b.x + nx * push, b.r, MAP_W - b.r);
          b.y = clamp(b.y + ny * push, b.r, MAP_H - b.r);
        }
      }
    }
  }

  // ---- Spawn maintenance ----
  if (G.obstacles.length < OBSTACLE_COUNT_TARGET && G.tick % 90 === 0) spawnObstacle(false);
  // Dynamic difficulty: more enemies & faster spawns as player levels up
  {
    const pLvl = p.weaponLevel;
    const dynTarget   = Math.min(6 + pLvl * 1.5, 28);         // 7–28 enemies
    const dynInterval = Math.max(80, 240 - pLvl * 16);        // 240→80 frames
    if (G.enemies.length < dynTarget && G.tick % dynInterval === 0) spawnEnemy();
  }

  // ---- Particles & floats ----
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.92; pt.vy *= 0.92; pt.life--;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const ft = G.floats[i];
    ft.y += ft.vy; ft.life--;
    if (ft.life <= 0) G.floats.splice(i, 1);
  }
}

function addXP(amount) {
  const p = G.player;
  p.xp += amount;
  while (p.xp >= p.xpNext && p.weaponLevel < 20) {
    p.xp -= p.xpNext;
    p.weaponLevel++;
    p.xpNext = Math.floor(p.xpNext * 1.65 + 8);
    sfxLevelUp();
    spawnFloat(p.x, p.y - 50, `🆙 升级！Lv.${p.weaponLevel}`, '#FFD700', 20);
    spawnParticles(p.x, p.y, '#FFD700', 22);
    shakeDur = 12; shakeAmt = 3;
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1.5 + Math.random() * 3.5;
    G.particles.push({ x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, color, r: 2+Math.random()*3, life: 25+Math.random()*20 });
  }
}

function spawnFloat(x, y, text, color, size) {
  G.floats.push({ x, y, text, color, size: size || 16, life: 55, vy: -0.9 });
}

// ─── DRAW ──────────────────────────────────────────────────────────────────────
function draw() {
  if (!G.player) return; // not initialized yet
  const p = G.player;
  const W = canvas.width, H = canvas.height;

  // Camera
  G.camera.x = clamp(p.x - W/2, 0, MAP_W - W);
  G.camera.y = clamp(p.y - H/2, 0, MAP_H - H);

  // Screen shake
  let sx = 0, sy = 0;
  if (shakeDur > 0) {
    sx = (Math.random()-0.5)*shakeAmt*2; sy = (Math.random()-0.5)*shakeAmt*2;
    shakeDur--; shakeAmt *= 0.85;
  }

  const cx = G.camera.x - sx, cy = G.camera.y - sy;

  // ---- Background: gray brick floor ----
  ctx.fillStyle = '#606060';
  ctx.fillRect(0, 0, W, H);

  // Brick pattern: alternating rows of bricks
  const bW = 72, bH = 36, gap = 2;
  const mortarColor = 'rgba(0,0,0,0.28)';
  const brickLight = 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = mortarColor;
  ctx.lineWidth = gap;

  // Horizontal mortar lines
  const goy = (-(cy % bH) + bH) % bH;
  for (let y = goy - bH; y < H + bH; y += bH) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Vertical mortar lines — alternate offset per row
  const rowBase = Math.floor(cy / bH);
  for (let rowStep = -1; rowStep * bH < H + bH * 2; rowStep++) {
    const rowY = goy + (rowStep - 1) * bH;
    const absRow = rowBase + rowStep;
    const xOff = absRow % 2 === 0 ? (-(cx % bW) + bW) % bW : (-(cx % bW) + bW * 1.5) % bW;
    for (let x = xOff - bW; x < W + bW; x += bW) {
      ctx.beginPath(); ctx.moveTo(x, rowY); ctx.lineTo(x, rowY + bH); ctx.stroke();
    }
  }

  // Subtle brick highlight
  ctx.strokeStyle = brickLight;
  ctx.lineWidth = 1;
  const goy2 = (-(cy % bH) + bH) % bH;
  for (let rowStep = -1; rowStep * bH < H + bH * 2; rowStep++) {
    const rowY = goy2 + (rowStep - 1) * bH;
    const absRow = rowBase + rowStep;
    const xOff = absRow % 2 === 0 ? (-(cx % bW) + bW) % bW : (-(cx % bW) + bW * 1.5) % bW;
    for (let x = xOff - bW; x < W + bW; x += bW) {
      ctx.strokeRect(x + gap, rowY + gap, bW - gap * 2, bH - gap * 2);
    }
  }

  ctx.save();
  ctx.translate(-cx, -cy);

  // Map border
  ctx.strokeStyle = '#888'; ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, MAP_W, MAP_H);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, MAP_W, 8); ctx.fillRect(0, MAP_H-8, MAP_W, 8);
  ctx.fillRect(0, 0, 8, MAP_H); ctx.fillRect(MAP_W-8, 0, 8, MAP_H);

  // Decorations
  for (const d of G.decorations) {
    if (!inView(d.x, d.y, 20, cx, cy, W, H)) continue;
    if (d.type === 'flower') {
      ctx.fillStyle = d.c;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = '#9E9E9E';
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r*1.4, d.r*0.8, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  // Obstacles
  for (const o of G.obstacles) {
    if (!inView(o.x, o.y, o.r + 10, cx, cy, W, H)) continue;
    drawObstacle(o);
  }

  // Enemies
  for (const e of G.enemies) {
    if (!inView(e.x, e.y, weaponOrbit(e.weaponLevel)+20, cx, cy, W, H)) continue;
    drawEntity(e, e.weaponLevel > p.weaponLevel);
  }

  // Player
  drawEntity(p, false, true);

  // Particles
  for (const pt of G.particles) {
    ctx.globalAlpha = pt.life / 45;
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating texts
  for (const ft of G.floats) {
    ctx.globalAlpha = Math.min(1, ft.life / 30);
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${ft.size}px 'PingFang SC', sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // ---- HUD ----
  drawHUD(W, H);
}

function drawObstacle(o) {
  ctx.save();
  const dmg = 1 - o.hp / o.maxHp;
  const cx = o.x, cy = o.y;
  const img = obstacleImgs[o.imgIdx];

  if (img && img.complete && img.naturalWidth > 0) {
    // Determine display size from obstacle collision radius
    const sz = (o.type === 'tree' ? o.r * 2.4 : Math.max(o.w, o.h) * 1.2);
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(cx, cy + sz*0.44, sz*0.42, sz*0.1, 0, 0, Math.PI*2); ctx.fill();
    // Draw image, slightly dimmed when damaged
    ctx.globalAlpha = 1 - dmg * 0.45;
    ctx.drawImage(img, cx - sz/2, cy - sz*0.75, sz, sz);
    ctx.globalAlpha = 1;
  }

  // HP bar (when damaged)
  if (o.hp < o.maxHp) {
    const bw2 = o.type === 'tree' ? o.r * 2.2 : o.w;
    const barTop = o.type === 'tree' ? cy - o.r * 1.9 : cy - o.h / 2 - 10;
    const bx2 = cx - bw2/2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx2, barTop, bw2, 6);
    ctx.fillStyle = o.type === 'tree' ? '#66BB6A' : '#FF8A65';
    ctx.fillRect(bx2, barTop, bw2 * o.hp / o.maxHp, 6);
  }
  ctx.restore();
}

// ─── WEAPON TIER SYSTEM ──────────────────────────────────────────────────────
// Tier 0 Lv1-2: Knife + Wooden shield
// Tier 1 Lv3-5: Short sword + Iron shield
// Tier 2 Lv6-8: Broadsword + Kite shield
// Tier 3 Lv9-11: Great sword + Tower shield
// Tier 4 Lv12+:  Legendary flame sword + Dragon orb shield
function getWeaponTier(lvl) {
  if (lvl <= 2) return 0;
  if (lvl <= 5) return 1;
  if (lvl <= 8) return 2;
  if (lvl <= 11) return 3;
  return 4;
}

function drawWeaponSet(cx2, cy2, weaponAngle, lvl, isPlayer, isDangerous, swordOn, shieldOn) {
  const orbit = weaponOrbit(lvl);
  const imgIdx = getWeaponImgIdx(lvl);
  const weaponSize = 28 + lvl * 3.5; // grows with level
  const glowColor = isPlayer ? '#FFD700' : isDangerous ? '#FF6600' : '#90CAF9';

  // Shield (opposite side of orbit)
  if (shieldOn) {
    const shAng = weaponAngle + Math.PI;
    const sx = cx2 + Math.cos(shAng) * orbit * 0.82;
    const sy = cy2 + Math.sin(shAng) * orbit * 0.82;
    const img = shieldImgs[imgIdx];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = '#64B5F6'; ctx.shadowBlur = 14;
      ctx.translate(sx, sy);
      ctx.rotate(shAng + Math.PI / 2);
      const sz = weaponSize * 1.6;
      ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }

  // Sword (at blade tip position)
  if (swordOn) {
    const bx = cx2 + Math.cos(weaponAngle) * orbit;
    const by = cy2 + Math.sin(weaponAngle) * orbit;
    const img = swordImgs[imgIdx];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = glowColor; ctx.shadowBlur = 12;
      ctx.translate(bx, by);
      ctx.rotate(weaponAngle + Math.PI / 2);
      const sz = weaponSize * 2.0;
      ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }
}

function drawEntity(e, isDangerous, isPlayer) {
  const lvl = e.weaponLevel;
  const orbit = weaponOrbit(lvl);
  ctx.save();

  // Draw weapon (tiered visual) — for player, only render when skill is active
  const swordOn = isPlayer ? e.swordActive : true;   // enemies always sword-on
  const shieldOn = isPlayer ? e.shieldActive : false; // enemies have no shield
  const showWeapon = !isPlayer || swordOn || shieldOn;

  // Weapon orbit ring hint (only when weapon visible)
  if (showWeapon) {
    ctx.strokeStyle = isDangerous ? 'rgba(255,80,80,0.18)' : isPlayer ? 'rgba(255,215,0,0.2)' : 'rgba(100,255,100,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5,5]); ctx.beginPath(); ctx.arc(e.x, e.y, orbit, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }

  drawWeaponSet(e.x, e.y, e.weaponAngle, lvl, isPlayer, isDangerous, swordOn, shieldOn);

  // Orbit line (only when weapon visible)
  if (showWeapon) {
    const bx2 = e.x + Math.cos(e.weaponAngle) * orbit;
    const by2 = e.y + Math.sin(e.weaponAngle) * orbit;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(bx2, by2); ctx.stroke();
  }

  // Invincible flash
  const alpha = (e.invincible > 0 && Math.floor(e.invincible/5)%2===0) ? 0.35 : 1;
  ctx.globalAlpha = alpha;

  // Dog body (new style)
  drawDog(ctx, e.x, e.y, e.facing, e.r, isPlayer, isDangerous, e.weaponLevel);

  ctx.globalAlpha = 1;

  // ── Head-up display: level above blood bar, both for player and enemies ──
  {
    const bw   = isPlayer ? e.r * 3.5 : e.r * 2.6;
    const barH = isPlayer ? 14 : 12;
    const bx3  = e.x - bw / 2;
    // Image top = y - r * 3.024 (drawImage uses -size*0.72, size = r*4.2)
    const imgTop = e.y - e.r * 3.1;
    // Bar sits just above image top; level text sits above bar
    const barY   = imgTop - barH - 2;
    const lvlFontSize = isPlayer ? 11 : Math.min(11, 8 + Math.min(lvl, 4));

    // Level text (baseline aligned to bottom of gap above bar)
    ctx.font = `bold ${lvlFontSize}px 'PingFang SC',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = isPlayer ? '#FFD700' : isDangerous ? '#FF5252' : '#69F0AE';
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 4;
    ctx.fillText(`Lv.${lvl}`, e.x, barY - 2);
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';

    // Bar background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx3 - 1, barY - 1, bw + 2, barH + 2);
    // Bar fill
    const ratio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = isPlayer
      ? (ratio > 0.5 ? '#4CAF50' : ratio > 0.25 ? '#FF9800' : '#F44336')
      : isDangerous ? '#FF7043' : '#81C784';
    ctx.fillRect(bx3, barY, bw * ratio, barH);
    // Bar border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx3 - 1, barY - 1, bw + 2, barH + 2);

    // HP numbers centered inside bar
    const barFontSize = isPlayer ? 9 : 9;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `bold ${barFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 2;
    ctx.fillText(`${Math.max(0, e.hp)}/${e.maxHp}`, e.x, barY + barH / 2);
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

// Draw Shiba Inu character — chubby body, sleepy half-lidded eyes, smirk
function drawDog(ctx, x, y, facing, r, isPlayer, isDangerous, weaponLevel) {
  // ── Player: use tiered character image based on weapon level ─────────────
  if (isPlayer) {
    const imgIdx = getWeaponImgIdx(weaponLevel || 1);
    const img = playerImgs[imgIdx];
    // Draw as soon as the image object exists; canvas ignores in-flight loads gracefully
    if (img && img.src) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(facing, 1);
      const size = r * 4.2;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(0, size * 0.28, size * 0.32, size * 0.07, 0, 0, Math.PI*2); ctx.fill();
      try { ctx.drawImage(img, -size / 2, -size * 0.72, size, size); } catch(e2) {}
      ctx.restore();
      return;
    }
  }

  // ── Enemy: use enemy image by weapon level ────────────────────────────────
  if (!isPlayer) {
    const img = enemyImgs[getEnemyImgIdx(weaponLevel || 1)];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(facing, 1);
      const size = r * 4.2;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(0, size * 0.28, size * 0.32, size * 0.07, 0, 0, Math.PI*2); ctx.fill();
      ctx.drawImage(img, -size / 2, -size * 0.72, size, size);
      ctx.restore();
      return;
    }
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const s = r / 20;
  const W = 24 * s, H = 30 * s; // half-width, half-height of design
  const bodyColor = isPlayer ? '#E8951A' : isDangerous ? '#CC6E12' : '#A07520';
  const lw = Math.max(1.5, s * 2.6); // outline width

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(0, H*0.72, W*0.88, H*0.19, 0, 0, Math.PI*2); ctx.fill();

  // Helper: draw a manual rounded-rect path (no ctx.roundRect dependency)
  function rrp(rx, ry, rw, rh, rr) {
    const mr = Math.min(rr, rw/2, rh/2);
    ctx.beginPath();
    ctx.moveTo(rx+mr, ry);
    ctx.lineTo(rx+rw-mr, ry); ctx.quadraticCurveTo(rx+rw, ry, rx+rw, ry+mr);
    ctx.lineTo(rx+rw, ry+rh-mr); ctx.quadraticCurveTo(rx+rw, ry+rh, rx+rw-mr, ry+rh);
    ctx.lineTo(rx+mr, ry+rh); ctx.quadraticCurveTo(rx, ry+rh, rx, ry+rh-mr);
    ctx.lineTo(rx, ry+mr); ctx.quadraticCurveTo(rx, ry, rx+mr, ry);
    ctx.closePath();
  }
  function fillStroke(fc, sw) {
    ctx.fillStyle = fc; ctx.fill();
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = sw || lw; ctx.stroke();
  }

  // Arms (stubby rounded rect on each side)
  const aw = W*0.44, ah = H*0.52, ar = aw*0.38;
  rrp(-W - aw*0.08, -H*0.12, aw, ah, ar); fillStroke(bodyColor);
  rrp(W - aw*0.92, -H*0.12, aw, ah, ar); fillStroke(bodyColor);

  // Legs
  const lgw = W*0.44, lgh = H*0.44, lgr = lgw*0.38;
  rrp(-W*0.58, H*0.44, lgw, lgh, lgr); fillStroke(bodyColor);
  rrp(W*0.14, H*0.44, lgw, lgh, lgr); fillStroke(bodyColor);

  // Body (tall rounded rect)
  rrp(-W, -H*0.4, W*2, H*0.92, W*0.42); fillStroke(bodyColor);

  // Belly (large cream oval)
  ctx.fillStyle = '#F5E6C0'; ctx.strokeStyle = 'transparent';
  ctx.beginPath(); ctx.ellipse(0, H*0.1, W*0.58, H*0.44, 0, 0, Math.PI*2); ctx.fill();

  // Head
  rrp(-W*0.9, -H*1.04, W*1.8, H*0.7, W*0.36); fillStroke(bodyColor);

  // Forehead cream highlights
  ctx.fillStyle = '#F5E6C0'; ctx.strokeStyle = 'transparent';
  ctx.beginPath(); ctx.ellipse(-W*0.25, -H*0.82, W*0.2, H*0.13, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( W*0.25, -H*0.82, W*0.2, H*0.13, 0, 0, Math.PI*2); ctx.fill();

  // Ears (triangular, pointing up)
  [-1, 1].forEach(dir => {
    ctx.fillStyle = bodyColor; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(dir*W*0.42,-H*0.98); ctx.lineTo(dir*W*0.63,-H*1.44); ctx.lineTo(dir*W*0.13,-H*0.98); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Inner ear (darker orange)
    ctx.fillStyle = '#C07010'; ctx.strokeStyle = 'transparent';
    ctx.beginPath(); ctx.moveTo(dir*W*0.41,-H*1.01); ctx.lineTo(dir*W*0.59,-H*1.38); ctx.lineTo(dir*W*0.17,-H*1.01); ctx.closePath(); ctx.fill();
  });

  // Eyes — half-lidded sleepy style
  const erx = W*0.21, ery = H*0.11, ecy = -H*0.64;
  [-W*0.3, W*0.3].forEach(ecx => {
    // White sclera
    ctx.fillStyle = 'white'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = lw * 0.75;
    ctx.beginPath(); ctx.ellipse(ecx, ecy, erx, ery, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // Black pupil (lower area only)
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath(); ctx.arc(ecx, ecy + ery*0.3, erx*0.6, 0, Math.PI*2); ctx.fill();
    // Eyelid: clip to eye shape, fill top portion with body color
    ctx.save();
    ctx.beginPath(); ctx.ellipse(ecx, ecy, erx, ery, 0, 0, Math.PI*2); ctx.clip();
    ctx.fillStyle = bodyColor;
    ctx.fillRect(ecx - erx, ecy - ery, erx*2, ery*1.2); // covers top ~60%
    ctx.restore();
    // Eyelid crease line (the bottom edge of lid)
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = lw * 0.9;
    ctx.beginPath(); ctx.moveTo(ecx-erx, ecy-ery*0.1); ctx.quadraticCurveTo(ecx, ecy-ery*0.62, ecx+erx, ecy-ery*0.1); ctx.stroke();
  });

  // Nose (large black oval)
  ctx.fillStyle = '#1A1A1A'; ctx.strokeStyle = 'transparent';
  ctx.beginPath(); ctx.ellipse(0, -H*0.51, W*0.18, H*0.095, 0, 0, Math.PI*2); ctx.fill();
  // Nose highlight
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath(); ctx.ellipse(-W*0.07, -H*0.535, W*0.065, H*0.042, 0, 0, Math.PI*2); ctx.fill();

  // Smirk (slight, right-side)
  ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = lw * 0.75; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-W*0.04, -H*0.39); ctx.quadraticCurveTo(W*0.14, -H*0.33, W*0.2, -H*0.4); ctx.stroke();

  ctx.restore();
}

function drawHUD(W, H) {
  const p = G.player;
  const st = Math.max(safeTop, 16) + 6; // top safe offset, minimum 16px
  ctx.textAlign = 'left';

  // HP bar
  roundRect(ctx, 16, st, 170, 22, 6, 'rgba(0,0,0,0.55)');
  const hpW = 166 * p.hp / p.maxHp;
  const hpColor = p.hp > p.maxHp * 0.5 ? '#4CAF50' : p.hp > p.maxHp * 0.25 ? '#FF9800' : '#F44336';
  roundRect(ctx, 18, st + 2, hpW, 18, 5, hpColor);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; strokeRoundRect(ctx, 16, st, 170, 22, 6);
  ctx.fillStyle = 'white'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=3;
  ctx.fillText(`❤️ ${Math.max(0,p.hp)} / ${p.maxHp}`, 101, st + 15);
  ctx.shadowBlur = 0;

  // XP bar
  roundRect(ctx, 16, st + 26, 170, 14, 4, 'rgba(0,0,0,0.5)');
  const xpW = 166 * p.xp / p.xpNext;
  roundRect(ctx, 18, st + 28, xpW, 10, 3, '#FFD700');
  ctx.strokeStyle = 'rgba(255,215,0,0.4)'; strokeRoundRect(ctx, 16, st + 26, 170, 14, 4);
  ctx.fillStyle = 'white'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=2;
  ctx.fillText(`⚔️ Lv.${p.weaponLevel}  ${p.xp}/${p.xpNext} XP`, 101, st + 37);
  ctx.shadowBlur = 0;

  // Score
  ctx.fillStyle = 'white'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'right';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5;
  ctx.fillText(`${G.score} 分`, W - 16, st + 18);
  ctx.font = '13px sans-serif';
  ctx.fillText(`击败: ${G.kills}`, W - 16, st + 36);
  ctx.shadowBlur = 0;

  // Joystick
  if (joy.active) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.bx, joy.by, 65, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(joy.bx + joy.dx*65, joy.by + joy.dy*65, 22, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(joy.bx + joy.dx*65, joy.by + joy.dy*65, 22, 0, Math.PI*2); ctx.stroke();
  } else {
    // Hint removed
  }

  // ── Skill buttons ──
  const skillDur = skillDuration(p.weaponLevel);
  const skillCd  = skillCooldown(p.weaponLevel);
  function drawSkillBtn(bx3, by3, r, label, active, timer, cdTimer, cdMax) {
    ctx.save();
    // Background circle
    ctx.beginPath(); ctx.arc(bx3, by3, r, 0, Math.PI*2);
    if (active) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.shadowColor = label === '⚔️' ? '#FFD700' : '#64B5F6';
      ctx.shadowBlur = 20;
    } else if (cdTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
    } else {
      ctx.fillStyle = 'rgba(30,30,60,0.75)';
    }
    ctx.fill();
    ctx.strokeStyle = active ? (label === '⚔️' ? '#FFD700' : '#64B5F6') : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Cooldown sweep arc (gray overlay from top clockwise)
    if (!active && cdTimer > 0) {
      const ratio = cdTimer / cdMax;
      ctx.beginPath();
      ctx.moveTo(bx3, by3);
      ctx.arc(bx3, by3, r - 2, -Math.PI/2, -Math.PI/2 + ratio * Math.PI * 2, false);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fill();
    }

    // Active progress arc (bright edge sweeping down as time runs out)
    if (active && timer > 0) {
      const ratio = timer / skillDur;
      ctx.beginPath();
      ctx.arc(bx3, by3, r - 2, -Math.PI/2, -Math.PI/2 + ratio * Math.PI * 2, false);
      ctx.strokeStyle = label === '⚔️' ? '#FFD700' : '#64B5F6';
      ctx.lineWidth = 3; ctx.stroke();
    }

    // Icon
    ctx.globalAlpha = (cdTimer > 0 && !active) ? 0.4 : 1;
    ctx.font = `${r * 0.82}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, bx3, by3 + 1);
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;

    // Cooldown seconds remaining
    if (!active && cdTimer > 0) {
      ctx.fillStyle = 'white'; ctx.font = `bold ${r * 0.38}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
      ctx.fillText(`${(cdTimer / 60).toFixed(1)}s`, bx3, by3 + r * 0.65);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  const sp2 = swordBtnPos(), sh2 = shieldBtnPos();
  drawSkillBtn(sp2.x, sp2.y, sp2.r, '⚔️', p.swordActive, p.swordTimer, p.swordCd, skillCd);
  drawSkillBtn(sh2.x, sh2.y, sh2.r, '🛡️', p.shieldActive, p.shieldTimer, p.shieldCd, skillCd);

  // Minimap
  const mmSize = Math.min(90, W * 0.2);
  const mmX = W - mmSize - 10, mmY = H - mmSize - 10;
  roundRect(ctx, mmX, mmY, mmSize, mmSize, 6, 'rgba(0,0,0,0.5)');
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; strokeRoundRect(ctx, mmX, mmY, mmSize, mmSize, 6);
  for (const e of G.enemies) {
    const ex = mmX + (e.x / MAP_W) * mmSize;
    const ey = mmY + (e.y / MAP_H) * mmSize;
    ctx.fillStyle = e.weaponLevel > p.weaponLevel ? '#FF5252' : '#69F0AE';
    ctx.beginPath(); ctx.arc(ex, ey, 2, 0, Math.PI*2); ctx.fill();
  }
  const ppx = mmX + (p.x / MAP_W) * mmSize;
  const ppy = mmY + (p.y / MAP_H) * mmSize;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(ppx, ppy, 3.5, 0, Math.PI*2); ctx.fill();
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────
function loop() {
  if (running) update();
  draw();
  requestAnimationFrame(loop);
}

function endGame() {
  running = false; sfxDie();
  document.getElementById('finalScore').textContent = G.score;
  document.getElementById('finalLevel').textContent = `Lv.${G.player.weaponLevel}`;
  document.getElementById('finalKills').textContent = G.kills;
  // Notify React to show game-over screen
  window.dispatchEvent(new CustomEvent('daodundog:gameover'));
}

let loopStarted = false;
function startLoop() { if (!loopStarted) { loopStarted = true; loop(); } }

// React dispatches these events when the user clicks start/restart buttons
window.addEventListener('daodundog:startbtnclick', () => {
  getAudio();
  initGame(); running = true;
  startLoop();
});
window.addEventListener('daodundog:restartbtnclick', () => {
  initGame(); running = true;
});

// ─── UTILS ───────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
function inView(x, y, r, cx, cy, W, H) { return x+r > cx && x-r < cx+W && y+r > cy && y-r < cy+H; }

function roundRect(ctx, x, y, w, h, rad, fill) {
  ctx.beginPath();
  ctx.moveTo(x+rad, y); ctx.lineTo(x+w-rad, y); ctx.quadraticCurveTo(x+w,y,x+w,y+rad);
  ctx.lineTo(x+w, y+h-rad); ctx.quadraticCurveTo(x+w,y+h,x+w-rad,y+h);
  ctx.lineTo(x+rad, y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-rad);
  ctx.lineTo(x, y+rad); ctx.quadraticCurveTo(x,y,x+rad,y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
function strokeRoundRect(ctx, x, y, w, h, rad) {
  roundRect(ctx, x, y, w, h, rad); ctx.stroke();
}
