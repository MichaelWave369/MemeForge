const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const DEFAULT_FONT = "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";

export function defaultStudio() {
  return {
    visualTheme: 'signal',
    watermark: true,
    activeLayer: 'top',
    background: { dataUrl: '', name: '', fit: 'cover', zoom: 1, x: 0, y: 0 },
    layers: {
      top: { text: 'WHEN THE INTERNET INVENTS A NEW PROBLEM', x: 0.5, y: 0.24, size: 82, font: DEFAULT_FONT, color: '#ffffff', align: 'center', outline: true, shadow: false },
      bottom: { text: 'AND SOMEHOW IT BECOMES YOUR MEETING', x: 0.5, y: 0.76, size: 82, font: DEFAULT_FONT, color: '#ffffff', align: 'center', outline: true, shadow: false }
    }
  };
}

function splitLines(ctx, text, maxWidth) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const test = `${current} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) current = test;
    else { lines.push(current); current = words[i]; }
  }
  lines.push(current);
  return lines;
}

function fitLayerText(ctx, layer, maxWidth, maxLines = 4) {
  let size = Number(layer.size || 82);
  let lines = [];
  let maxLineWidth = 0;
  while (size >= 22) {
    ctx.font = `900 ${size}px ${layer.font || DEFAULT_FONT}`;
    lines = splitLines(ctx, layer.text || 'TEXT', maxWidth);
    maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width), 0);
    if (lines.length <= maxLines && maxLineWidth <= maxWidth) break;
    size -= 2;
  }
  return { size, lines: lines.slice(0, maxLines), maxLineWidth };
}

function drawTheme(ctx, theme, width, height) {
  ctx.clearRect(0, 0, width, height);
  if (theme === 'paper') {
    ctx.fillStyle = '#e9e3d5'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(35,35,35,.08)'; ctx.lineWidth = 2;
    for (let y = 90; y < height; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    return;
  }
  if (theme === 'warning') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f7b32b'); gradient.addColorStop(1, '#f45d01');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.translate(width / 2, height / 2); ctx.rotate(-0.38); ctx.fillStyle = 'rgba(20,20,20,.12)';
    for (let x = -1200; x < 1200; x += 150) ctx.fillRect(x, -900, 70, 1800);
    ctx.restore(); return;
  }
  if (theme === 'terminal') {
    ctx.fillStyle = '#07140d'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(106,255,145,.08)';
    for (let y = 0; y < height; y += 8) ctx.fillRect(0, y, width, 2);
    ctx.font = '700 26px monospace'; ctx.fillStyle = 'rgba(106,255,145,.12)';
    for (let i = 0; i < 18; i += 1) ctx.fillText(`0x${(i * 92821 + 369).toString(16).padStart(6, '0')} // cultural_signal`, 54, 78 + i * 58);
    return;
  }
  if (theme === 'void') {
    const gradient = ctx.createRadialGradient(width * .62, height * .34, 40, width * .5, height * .5, width * .8);
    gradient.addColorStop(0, '#30354f'); gradient.addColorStop(.45, '#171923'); gradient.addColorStop(1, '#07080c');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height); return;
  }
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#11131b'); gradient.addColorStop(.55, '#1f2030'); gradient.addColorStop(1, '#0d2630');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(94,231,240,.13)'; ctx.lineWidth = 2;
  for (let x = 0; x <= width; x += 72) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y <= height; y += 72) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,107,61,.35)'; ctx.beginPath(); ctx.arc(width * .78, height * .28, 160, 0, Math.PI * 2); ctx.fill();
}

function drawUploaded(ctx, image, background, width, height) {
  if (!image || !background?.dataUrl) return false;
  const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const containScale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const baseScale = background.fit === 'contain' ? containScale : coverScale;
  const scale = baseScale * clamp(Number(background.zoom || 1), .5, 3);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (width - drawWidth) / 2 + (Number(background.x || 0) / 100) * width * .45;
  const y = (height - drawHeight) / 2 + (Number(background.y || 0) / 100) * height * .45;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, 'rgba(0,0,0,.20)'); shade.addColorStop(.5, 'rgba(0,0,0,.04)'); shade.addColorStop(1, 'rgba(0,0,0,.23)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
  return true;
}

function drawLayer(ctx, canvas, studio, layerName, showSelection, boundsOut) {
  const layer = studio.layers[layerName];
  const width = canvas.width; const height = canvas.height; const maxWidth = width * .84;
  const fitted = fitLayerText(ctx, layer, maxWidth, 4);
  const lineHeight = fitted.size * 1.06;
  const totalHeight = fitted.lines.length * lineHeight;
  const anchorX = clamp(Number(layer.x || .5), .05, .95) * width;
  const centerY = clamp(Number(layer.y || .5), .05, .95) * height;
  let y = centerY - totalHeight / 2 + lineHeight * .78;
  ctx.save();
  ctx.font = `900 ${fitted.size}px ${layer.font || DEFAULT_FONT}`;
  ctx.textAlign = ['left','center','right'].includes(layer.align) ? layer.align : 'center';
  ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(5, fitted.size * .11);
  ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(layer.color || '') ? layer.color : '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,.92)';
  if (layer.shadow) { ctx.shadowColor = 'rgba(0,0,0,.72)'; ctx.shadowBlur = Math.max(8, fitted.size * .18); ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4; }
  fitted.lines.forEach(line => { if (layer.outline !== false) ctx.strokeText(line, anchorX, y); ctx.fillText(line, anchorX, y); y += lineHeight; });
  ctx.restore();
  let left = anchorX - fitted.maxLineWidth / 2;
  if (layer.align === 'left') left = anchorX;
  if (layer.align === 'right') left = anchorX - fitted.maxLineWidth;
  const padding = Math.max(12, fitted.size * .12);
  const bounds = { left: left - padding, right: left + fitted.maxLineWidth + padding, top: centerY - totalHeight / 2 - padding, bottom: centerY + totalHeight / 2 + padding };
  boundsOut[layerName] = bounds;
  if (showSelection && studio.activeLayer === layerName) {
    ctx.save(); ctx.strokeStyle = 'rgba(94,231,240,.9)'; ctx.lineWidth = 3; ctx.setLineDash([12, 9]);
    ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top); ctx.restore();
  }
}

export function drawMeme(canvas, studio, image, { showSelection = true } = {}) {
  if (!canvas) return { top: null, bottom: null };
  const ctx = canvas.getContext('2d'); const width = canvas.width; const height = canvas.height;
  drawTheme(ctx, studio.visualTheme, width, height);
  const hasImage = drawUploaded(ctx, image, studio.background, width, height);
  if (!hasImage) { ctx.fillStyle = studio.visualTheme === 'paper' ? 'rgba(20,20,20,.08)' : 'rgba(0,0,0,.23)'; ctx.fillRect(54, 54, width - 108, height - 108); }
  const bounds = { top: null, bottom: null };
  drawLayer(ctx, canvas, studio, 'top', showSelection, bounds);
  drawLayer(ctx, canvas, studio, 'bottom', showSelection, bounds);
  if (!hasImage) { ctx.textAlign = 'left'; ctx.font = '800 22px Inter, Arial, sans-serif'; ctx.fillStyle = studio.visualTheme === 'paper' || studio.visualTheme === 'warning' ? 'rgba(20,20,20,.65)' : 'rgba(255,255,255,.64)'; ctx.fillText('MEMEFORGE // REACT', 70, 92); }
  if (studio.watermark) { ctx.textAlign = 'right'; ctx.font = '800 20px Inter, Arial, sans-serif'; ctx.fillStyle = hasImage || (studio.visualTheme !== 'paper' && studio.visualTheme !== 'warning') ? 'rgba(255,255,255,.72)' : 'rgba(20,20,20,.65)'; ctx.fillText('MEMEFORGE', width - 70, height - 72); }
  return bounds;
}

export function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not decode image.')); image.src = source;
  });
}

export async function prepareImage(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image file.');
  const raw = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error || new Error('Could not read image.')); reader.readAsDataURL(file); });
  const image = await loadImage(raw);
  const maxDimension = 1600; const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio)); const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);
  let dataUrl = canvas.toDataURL('image/webp', .86); if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', .86);
  return { dataUrl, image: await loadImage(dataUrl) };
}
