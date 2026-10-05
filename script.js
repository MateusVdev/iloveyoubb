const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const music = document.getElementById('loveMusic');

const WORDS = ['love you', 'Love You', 'LOVE YOU'];
const CENTER_TEXT = ' Love You ';
const COLORS = [
  [70,130,180], [30,144,255], [0,191,255], [100,149,237], [65,105,225]
];
const BASE_WIDTH = 2000;
const BASE_HEIGHT = 1200;
const BASE_SCALE = 20;

let width = 0, height = 0, scale = 1, heartScale = 1;
let dpr = 1, particles = [], frame = 0, animationStarted = false;
let fillStartFrame = 0;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  heartScale = BASE_SCALE * scale;
  if (Math.min(width, height) < 600) heartScale *= 1.12;
}

const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];
const randomRange = (min, max) => min + Math.random() * (max - min);

function heartXY(t) {
  const x = 16 * Math.sin(t) ** 3;
  const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
  return { x, y: -y };
}

function toScreen(x, y) {
  return { x: x * heartScale + width / 2, y: y * heartScale + height / 2 };
}

class Particle {
  constructor(x, y, order, kind) {
    this.x = x; this.y = y; this.order = order; this.kind = kind;
    this.word = randomChoice(WORDS);
    this.color = randomChoice(COLORS);
    this.alpha = 0;
    this.flicker = randomRange(0, Math.PI * 2);
    this.delay = 0;
    this.sizeMult = randomRange(.85, 1.15);
  }
}

function buildOutlineParticles(nOutline, minGap = 30) {
  const result = [], placed = [], gap = minGap * scale;
  for (let i = 0; i < nOutline; i++) {
    const t = i / nOutline * Math.PI * 2;
    const {x: bx, y: by} = heartXY(t);
    const {x: sx, y: sy} = toScreen(bx, by);
    if (placed.some(([px,py]) => Math.hypot(sx-px, sy-py) < gap)) continue;
    placed.push([sx,sy]);
    result.push(new Particle(sx,sy,i,'outline'));
  }
  return result;
}

function buildFillParticles(nFill, minGap = 46) {
  const result = [], placed = [];
  let attempts = 0;
  const maxAttempts = nFill * 80;
  const gap = minGap * scale;
  while (result.length < nFill && attempts < maxAttempts) {
    attempts++;
    const t = randomRange(0, Math.PI * 2);
    const r = randomRange(0, .86);
    const {x: bx, y: by} = heartXY(t);
    const {x: sx, y: sy} = toScreen(bx*r, by*r);
    if (placed.some(([qx,qy]) => Math.hypot(sx-qx, sy-qy) < gap)) continue;
    placed.push([sx,sy]);
    result.push(new Particle(sx,sy,Math.floor(Math.random()*321),'fill'));
  }
  return result;
}

function createParticles() {
  const outline = buildOutlineParticles(160);
  const fill = buildFillParticles(130);
  const outlineSpan = outline.length ? Math.max(...outline.map(p => p.order)) : 0;
  const framesPerStep = 1.6;
  fillStartFrame = Math.floor(outlineSpan * framesPerStep) + 30;
  fill.forEach(p => p.delay = fillStartFrame + p.order);
  outline.forEach(p => p.delay = Math.floor(p.order * framesPerStep));
  particles = [...outline, ...fill];
}

function drawGlowText(p, alpha) {
  if (alpha <= 0) return;
  const baseSize = p.kind === 'outline' ? 20 : 17;
  const fontSize = baseSize * scale * p.sizeMult;
  if (fontSize <= 2) return;
  const [r,g,b] = p.color;
  const color = `rgb(${r},${g},${b})`;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${fontSize}px Arial`;
  ctx.fillStyle = color;
  if (alpha > 10) {
    ctx.shadowBlur = Math.max(2, fontSize * 1.8);
    ctx.shadowColor = `rgba(${r},${g},${b},${Math.min(.55,alpha/460)})`;
    ctx.globalAlpha = alpha / 255 * .20;
    ctx.fillText(p.word,p.x,p.y);
    ctx.shadowBlur = Math.max(2, fontSize * .9);
    ctx.globalAlpha = alpha / 255 * .35;
    ctx.fillText(p.word,p.x,p.y);
  }
  ctx.shadowBlur = Math.max(1,fontSize*.25);
  ctx.shadowColor = `rgba(${r},${g},${b},${Math.min(.75,alpha/330)})`;
  ctx.globalAlpha = alpha / 255;
  ctx.fillText(p.word,p.x,p.y);
  ctx.restore();
}

function drawCenterText(alpha) {
  if (alpha <= 0) return;
  const baseSize = Math.max(30, Math.min(54 * scale, Math.min(width,height)*.085));
  const pulse = 1 + .025 * Math.sin(frame*.05);
  const fontSize = baseSize * pulse;
  ctx.save();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font=`700 ${fontSize}px Georgia`;
  ctx.fillStyle='rgb(255,250,245)';
  ctx.shadowBlur=fontSize*.9;
  ctx.shadowColor=`rgba(255,250,245,${alpha/1275})`;
  ctx.globalAlpha=(alpha/255)*.20;
  ctx.fillText(CENTER_TEXT,width/2,height/2);
  ctx.shadowBlur=fontSize*.18;
  ctx.shadowColor='rgba(255,250,245,.65)';
  ctx.globalAlpha=alpha/255;
  ctx.fillText(CENTER_TEXT,width/2,height/2);
  ctx.restore();
}

function render() {
  if (!animationStarted) return;
  frame++;
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,width,height);

  for (const p of particles) {
    if (frame > p.delay && p.alpha < 255) p.alpha = Math.min(255,p.alpha+14+Math.floor(Math.random()*5));
    const flick = p.alpha >= 255 ? .75 + .25*Math.sin(frame*.04+p.flicker) : 1;
    const alpha = Math.floor(p.alpha*flick);
    if (alpha > 0) drawGlowText(p,alpha);
  }

  const centerStart = fillStartFrame + 200;
  if (frame > centerStart) {
    const progress = Math.min(1,(frame-centerStart)/60);
    const centerAlpha = Math.floor(255*(1-Math.exp(-progress*8)));
    drawCenterText(centerAlpha);
  }
  requestAnimationFrame(render);
}

async function startExperience() {
  if (animationStarted) return;
  animationStarted = true;
  startScreen.classList.add('hidden');
  try { await music.play(); } catch(e) { console.warn('Áudio bloqueado:', e); }
  createParticles();
  frame=0;
  requestAnimationFrame(render);
}

startButton.addEventListener('click',startExperience);
window.addEventListener('resize',()=>{
  resize();
  if(animationStarted) createParticles();
});
resize();
