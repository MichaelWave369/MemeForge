import { DEMO_TRENDS } from './data/trends.js';
import { STYLE_PRESETS, buildConcepts } from './engines/meme-engine.js';
import { scoreMemePotential } from './engines/score-engine.js';
import {
  clearProject,
  loadProject,
  saveProject
} from './engines/storage-engine.js';

const $ = selector => document.querySelector(selector);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const DEFAULT_TOP = 'WHEN THE INTERNET INVENTS A NEW PROBLEM';
const DEFAULT_BOTTOM = 'AND SOMEHOW IT BECOMES YOUR MEETING';
const DEFAULT_FONT = "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const DEFAULT_STYLES = ['absurd', 'nerdy', 'surreal'];
const themeOrder = ['signal', 'void', 'paper', 'warning', 'terminal'];

const refs = {
  topicInput: $('#topicInput'),
  trendStrip: $('#trendStrip'),
  styleGrid: $('#styleGrid'),
  weirdness: $('#weirdness'),
  weirdnessValue: $('#weirdnessValue'),
  generateButton: $('#generateButton'),
  regenerateButton: $('#regenerateButton'),
  surpriseMe: $('#surpriseMe'),
  scoreBox: $('#scoreBox'),
  conceptsSection: $('#conceptsSection'),
  conceptGrid: $('#conceptGrid'),
  canvas: $('#memeCanvas'),
  topText: $('#topText'),
  bottomText: $('#bottomText'),
  visualTheme: $('#visualTheme'),
  watermark: $('#watermark'),
  downloadButton: $('#downloadButton'),
  copyButton: $('#copyButton'),
  shuffleTheme: $('#shuffleTheme'),
  captionPreview: $('#captionPreview'),
  imageUpload: $('#imageUpload'),
  removeImage: $('#removeImage'),
  imageName: $('#imageName'),
  imageFit: $('#imageFit'),
  imageZoom: $('#imageZoom'),
  imageZoomValue: $('#imageZoomValue'),
  imageX: $('#imageX'),
  imageXValue: $('#imageXValue'),
  imageY: $('#imageY'),
  imageYValue: $('#imageYValue'),
  activeLayer: $('#activeLayer'),
  fontFamily: $('#fontFamily'),
  fontSize: $('#fontSize'),
  fontSizeValue: $('#fontSizeValue'),
  fontColor: $('#fontColor'),
  textAlign: $('#textAlign'),
  textOutline: $('#textOutline'),
  textShadow: $('#textShadow'),
  textX: $('#textX'),
  textXValue: $('#textXValue'),
  textY: $('#textY'),
  textYValue: $('#textYValue'),
  saveProject: $('#saveProject'),
  loadProject: $('#loadProject'),
  newProject: $('#newProject'),
  saveStatus: $('#saveStatus')
};

function createDefaultStudio() {
  return {
    visualTheme: 'signal',
    watermark: true,
    activeLayer: 'top',
    background: {
      dataUrl: '',
      name: '',
      fit: 'cover',
      zoom: 1,
      x: 0,
      y: 0
    },
    layers: {
      top: {
        text: DEFAULT_TOP,
        x: 0.5,
        y: 0.25,
        size: 82,
        font: DEFAULT_FONT,
        color: '#ffffff',
        align: 'center',
        outline: true,
        shadow: false
      },
      bottom: {
        text: DEFAULT_BOTTOM,
        x: 0.5,
        y: 0.75,
        size: 82,
        font: DEFAULT_FONT,
        color: '#ffffff',
        align: 'center',
        outline: true,
        shadow: false
      }
    }
  };
}

const state = {
  selectedStyles: new Set(DEFAULT_STYLES),
  concepts: [],
  activeConcept: null,
  studio: createDefaultStudio(),
  backgroundImage: null,
  textBounds: { top: null, bottom: null },
  drag: null,
  autosaveTimer: null
};

function renderTrends() {
  refs.trendStrip.innerHTML = '';
  DEMO_TRENDS.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'trend-chip';

    const label = document.createElement('small');
    label.textContent = item.label;
    const topic = document.createElement('strong');
    topic.textContent = item.topic;

    button.append(label, topic);
    button.addEventListener('click', () => {
      refs.topicInput.value = item.topic;
      refs.topicInput.focus();
      scheduleAutosave();
    });
    refs.trendStrip.appendChild(button);
  });
}

function renderStyles() {
  refs.styleGrid.innerHTML = '';
  STYLE_PRESETS.forEach(style => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `style-button${state.selectedStyles.has(style.id) ? ' active' : ''}`;
    button.textContent = style.label;
    button.dataset.style = style.id;
    button.setAttribute('aria-pressed', String(state.selectedStyles.has(style.id)));
    button.addEventListener('click', () => {
      if (state.selectedStyles.has(style.id)) {
        if (state.selectedStyles.size > 1) state.selectedStyles.delete(style.id);
      } else {
        state.selectedStyles.add(style.id);
      }
      renderStyles();
      scheduleAutosave();
    });
    refs.styleGrid.appendChild(button);
  });
}

function getTopic() {
  return refs.topicInput.value.trim() || DEMO_TRENDS[0].topic;
}

function updateScore(topic = refs.topicInput.value.trim()) {
  if (!topic) {
    refs.scoreBox.querySelector('strong').textContent = '—';
    refs.scoreBox.removeAttribute('title');
    return;
  }

  const weirdness = Number(refs.weirdness.value);
  const score = scoreMemePotential(topic, state.selectedStyles.size, weirdness);
  refs.scoreBox.querySelector('strong').textContent = `${score.total}/100`;
  refs.scoreBox.title = `${score.note}\n${Object.entries(score.breakdown).map(([key, value]) => `${key}: ${value}`).join('\n')}`;
}

function generateConcepts({ scroll = true } = {}) {
  const topic = getTopic();
  refs.topicInput.value = topic;
  const weirdness = Number(refs.weirdness.value);
  const styles = [...state.selectedStyles];

  updateScore(topic);
  state.concepts = buildConcepts(topic, styles, weirdness, 12);
  renderConcepts();
  refs.conceptsSection.hidden = false;
  scheduleAutosave();

  if (scroll) {
    refs.conceptsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderConcepts() {
  refs.conceptGrid.innerHTML = '';
  state.concepts.forEach(concept => {
    const article = document.createElement('article');
    article.className = 'concept-card';

    const content = document.createElement('div');
    const meta = document.createElement('div');
    meta.className = 'concept-meta';
    const rank = document.createElement('span');
    rank.textContent = `#${concept.rank}`;
    const style = document.createElement('span');
    style.textContent = concept.style;
    meta.append(rank, style);

    const title = document.createElement('h3');
    title.textContent = concept.caption;
    const note = document.createElement('p');
    note.textContent = concept.note;
    content.append(meta, title, note);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button primary';
    button.textContent = 'Forge this one';
    button.addEventListener('click', () => forgeConcept(concept));

    article.append(content, button);
    refs.conceptGrid.appendChild(article);
  });
}

function forgeConcept(concept) {
  state.activeConcept = concept;
  state.studio.layers.top.text = concept.top;
  state.studio.layers.bottom.text = concept.bottom;
  syncTextAreas();
  updateCaptionPreview();
  drawCanvas();
  scheduleAutosave();
  $('#studio').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateCaptionPreview() {
  refs.captionPreview.textContent = `${state.studio.layers.top.text.trim()} — ${state.studio.layers.bottom.text.trim()}`;
}

function syncTextAreas() {
  refs.topText.value = state.studio.layers.top.text;
  refs.bottomText.value = state.studio.layers.bottom.text;
}

function getActiveLayer() {
  return state.studio.layers[state.studio.activeLayer];
}

function syncActiveLayerControls() {
  const layer = getActiveLayer();
  refs.activeLayer.value = state.studio.activeLayer;
  refs.fontFamily.value = layer.font;
  refs.fontSize.value = String(layer.size);
  refs.fontSizeValue.value = String(layer.size);
  refs.fontColor.value = layer.color;
  refs.textAlign.value = layer.align;
  refs.textOutline.checked = layer.outline;
  refs.textShadow.checked = layer.shadow;
  refs.textX.value = String(Math.round(layer.x * 100));
  refs.textXValue.value = refs.textX.value;
  refs.textY.value = String(Math.round(layer.y * 100));
  refs.textYValue.value = refs.textY.value;
}

function syncBackgroundControls() {
  const background = state.studio.background;
  refs.visualTheme.value = state.studio.visualTheme;
  refs.watermark.checked = state.studio.watermark;
  refs.imageFit.value = background.fit;
  refs.imageZoom.value = String(Math.round(background.zoom * 100));
  refs.imageZoomValue.value = `${refs.imageZoom.value}%`;
  refs.imageX.value = String(Math.round(background.x));
  refs.imageXValue.value = refs.imageX.value;
  refs.imageY.value = String(Math.round(background.y));
  refs.imageYValue.value = refs.imageY.value;
  refs.imageName.textContent = background.dataUrl ? (background.name || 'Local image') : 'Original treatment';
  refs.removeImage.disabled = !background.dataUrl;

  const disabled = !background.dataUrl;
  refs.imageFit.disabled = disabled;
  refs.imageZoom.disabled = disabled;
  refs.imageX.disabled = disabled;
  refs.imageY.disabled = disabled;
}

function syncStudioControls() {
  syncTextAreas();
  syncBackgroundControls();
  syncActiveLayerControls();
  updateCaptionPreview();
}

function splitLines(ctx, text, maxWidth) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const test = `${current} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function fitLayerText(ctx, layer, maxWidth, maxLines = 4) {
  let size = layer.size;
  let lines = [];
  let maxLineWidth = 0;

  while (size >= 22) {
    ctx.font = `900 ${size}px ${layer.font}`;
    lines = splitLines(ctx, layer.text || 'TEXT', maxWidth);
    maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width), 0);
    if (lines.length <= maxLines && maxLineWidth <= maxWidth) break;
    size -= 2;
  }

  return {
    size,
    lines: lines.slice(0, maxLines),
    maxLineWidth
  };
}

function drawThemeBackground(ctx, theme, width, height) {
  ctx.clearRect(0, 0, width, height);

  if (theme === 'paper') {
    ctx.fillStyle = '#e9e3d5';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(35,35,35,.08)';
    ctx.lineWidth = 2;
    for (let y = 90; y < height; y += 56) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    return;
  }

  if (theme === 'warning') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f7b32b');
    gradient.addColorStop(1, '#f45d01');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-0.38);
    ctx.fillStyle = 'rgba(20,20,20,.12)';
    for (let x = -1200; x < 1200; x += 150) ctx.fillRect(x, -900, 70, 1800);
    ctx.restore();
    return;
  }

  if (theme === 'terminal') {
    ctx.fillStyle = '#07140d';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(106,255,145,.08)';
    for (let y = 0; y < height; y += 8) ctx.fillRect(0, y, width, 2);
    ctx.font = '700 26px monospace';
    ctx.fillStyle = 'rgba(106,255,145,.12)';
    for (let i = 0; i < 18; i += 1) {
      ctx.fillText(`0x${(i * 92821 + 369).toString(16).padStart(6, '0')} // cultural_signal`, 54, 78 + i * 58);
    }
    return;
  }

  if (theme === 'void') {
    const gradient = ctx.createRadialGradient(width * .62, height * .34, 40, width * .5, height * .5, width * .8);
    gradient.addColorStop(0, '#30354f');
    gradient.addColorStop(.45, '#171923');
    gradient.addColorStop(1, '#07080c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#11131b');
  gradient.addColorStop(.55, '#1f2030');
  gradient.addColorStop(1, '#0d2630');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(94,231,240,.13)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= width; x += 72) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y <= height; y += 72) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,107,61,.35)';
  ctx.beginPath();
  ctx.arc(width * .78, height * .28, 160, 0, Math.PI * 2);
  ctx.fill();
}

function drawUploadedBackground(ctx, width, height) {
  const image = state.backgroundImage;
  const background = state.studio.background;
  if (!image || !background.dataUrl) return false;

  const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const containScale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const baseScale = background.fit === 'contain' ? containScale : coverScale;
  const scale = baseScale * background.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const panX = (background.x / 100) * width * 0.45;
  const panY = (background.y / 100) * height * 0.45;
  const x = (width - drawWidth) / 2 + panX;
  const y = (height - drawHeight) / 2 + panY;

  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, 'rgba(0,0,0,.20)');
  shade.addColorStop(.5, 'rgba(0,0,0,.04)');
  shade.addColorStop(1, 'rgba(0,0,0,.23)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  return true;
}

function drawTextLayer(ctx, layerName, showSelection) {
  const layer = state.studio.layers[layerName];
  const width = refs.canvas.width;
  const height = refs.canvas.height;
  const maxWidth = width * 0.84;
  const fitted = fitLayerText(ctx, layer, maxWidth, 4);
  const lineHeight = fitted.size * 1.06;
  const totalHeight = fitted.lines.length * lineHeight;
  const anchorX = layer.x * width;
  const centerY = layer.y * height;
  let y = centerY - totalHeight / 2 + lineHeight * .78;

  ctx.save();
  ctx.font = `900 ${fitted.size}px ${layer.font}`;
  ctx.textAlign = layer.align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(5, fitted.size * .11);
  ctx.fillStyle = layer.color;
  ctx.strokeStyle = 'rgba(0,0,0,.92)';

  if (layer.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,.72)';
    ctx.shadowBlur = Math.max(8, fitted.size * .18);
    ctx.shadowOffsetX = Math.max(3, fitted.size * .06);
    ctx.shadowOffsetY = Math.max(3, fitted.size * .06);
  }

  fitted.lines.forEach(line => {
    if (layer.outline) ctx.strokeText(line, anchorX, y);
    ctx.fillText(line, anchorX, y);
    y += lineHeight;
  });
  ctx.restore();

  let left = anchorX - fitted.maxLineWidth / 2;
  if (layer.align === 'left') left = anchorX;
  if (layer.align === 'right') left = anchorX - fitted.maxLineWidth;

  const padding = Math.max(12, fitted.size * .12);
  const bounds = {
    left: left - padding,
    right: left + fitted.maxLineWidth + padding,
    top: centerY - totalHeight / 2 - padding,
    bottom: centerY + totalHeight / 2 + padding
  };
  state.textBounds[layerName] = bounds;

  if (showSelection && state.studio.activeLayer === layerName) {
    ctx.save();
    ctx.strokeStyle = 'rgba(94,231,240,.88)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 9]);
    ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    ctx.restore();
  }
}

function drawCanvas({ showSelection = true } = {}) {
  const ctx = refs.canvas.getContext('2d');
  const width = refs.canvas.width;
  const height = refs.canvas.height;
  const theme = state.studio.visualTheme;

  drawThemeBackground(ctx, theme, width, height);
  const hasImage = drawUploadedBackground(ctx, width, height);

  if (!hasImage) {
    ctx.fillStyle = theme === 'paper' ? 'rgba(20,20,20,.08)' : 'rgba(0,0,0,.23)';
    ctx.fillRect(54, 54, width - 108, height - 108);
  }

  drawTextLayer(ctx, 'top', showSelection);
  drawTextLayer(ctx, 'bottom', showSelection);

  if (!hasImage) {
    ctx.textAlign = 'left';
    ctx.font = '800 22px Inter, Arial, sans-serif';
    ctx.fillStyle = theme === 'paper' || theme === 'warning' ? 'rgba(20,20,20,.65)' : 'rgba(255,255,255,.64)';
    ctx.fillText('MEMEFORGE // CONCEPT PROTOTYPE', 70, 92);
  }

  if (state.studio.watermark) {
    ctx.textAlign = 'right';
    ctx.font = '800 20px Inter, Arial, sans-serif';
    ctx.fillStyle = hasImage || (theme !== 'paper' && theme !== 'warning') ? 'rgba(255,255,255,.72)' : 'rgba(20,20,20,.65)';
    ctx.fillText('MEMEFORGE', width - 70, height - 72);
  }
}

function canvasPoint(event) {
  const rect = refs.canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (refs.canvas.width / rect.width),
    y: (event.clientY - rect.top) * (refs.canvas.height / rect.height)
  };
}

function boundsContain(bounds, point) {
  return bounds && point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
}

function beginDrag(event) {
  const point = canvasPoint(event);
  const order = [state.studio.activeLayer, state.studio.activeLayer === 'top' ? 'bottom' : 'top'];
  const hit = order.find(layerName => boundsContain(state.textBounds[layerName], point));
  if (!hit) return;

  state.studio.activeLayer = hit;
  const layer = state.studio.layers[hit];
  state.drag = {
    layer: hit,
    offsetX: point.x - layer.x * refs.canvas.width,
    offsetY: point.y - layer.y * refs.canvas.height
  };
  refs.canvas.classList.add('dragging');
  refs.canvas.setPointerCapture?.(event.pointerId);
  syncActiveLayerControls();
  drawCanvas();
  event.preventDefault();
}

function moveDrag(event) {
  if (!state.drag) return;
  const point = canvasPoint(event);
  const layer = state.studio.layers[state.drag.layer];
  layer.x = clamp((point.x - state.drag.offsetX) / refs.canvas.width, 0.05, 0.95);
  layer.y = clamp((point.y - state.drag.offsetY) / refs.canvas.height, 0.05, 0.95);
  syncActiveLayerControls();
  drawCanvas();
  scheduleAutosave();
  event.preventDefault();
}

function endDrag(event) {
  if (!state.drag) return;
  state.drag = null;
  refs.canvas.classList.remove('dragging');
  refs.canvas.releasePointerCapture?.(event.pointerId);
  scheduleAutosave();
}

function downloadCanvas() {
  drawCanvas({ showSelection: false });
  const link = document.createElement('a');
  const topic = getTopic().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'meme';
  link.download = `memeforge-${topic}.png`;
  link.href = refs.canvas.toDataURL('image/png');
  link.click();
  drawCanvas();
}

async function copyCaption() {
  const caption = `${state.studio.layers.top.text.trim()}\n${state.studio.layers.bottom.text.trim()}`;
  try {
    await navigator.clipboard.writeText(caption);
    const oldText = refs.copyButton.textContent;
    refs.copyButton.textContent = 'Copied';
    setTimeout(() => { refs.copyButton.textContent = oldText; }, 1200);
  } catch {
    refs.copyButton.textContent = 'Copy unavailable';
  }
}

function surprise() {
  const item = DEMO_TRENDS[Math.floor(Math.random() * DEMO_TRENDS.length)];
  refs.topicInput.value = item.topic;
  refs.weirdness.value = String(5 + Math.floor(Math.random() * 6));
  refs.weirdnessValue.value = refs.weirdness.value;
  generateConcepts();
}

function shuffleTheme() {
  const current = themeOrder.indexOf(state.studio.visualTheme);
  state.studio.visualTheme = themeOrder[(current + 1) % themeOrder.length];
  syncBackgroundControls();
  drawCanvas();
  scheduleAutosave();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode image.'));
    image.src = source;
  });
}

async function prepareUploadedImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Choose an image file.');

  const raw = await readFileAsDataUrl(file);
  const image = await loadImage(raw);
  const maxDimension = 1600;
  const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);

  let dataUrl = canvas.toDataURL('image/webp', 0.86);
  if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  return { dataUrl, image: await loadImage(dataUrl) };
}

async function handleImageUpload(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  setSaveStatus('Preparing image…');

  try {
    const prepared = await prepareUploadedImage(file);
    state.studio.background.dataUrl = prepared.dataUrl;
    state.studio.background.name = file.name;
    state.studio.background.fit = 'cover';
    state.studio.background.zoom = 1;
    state.studio.background.x = 0;
    state.studio.background.y = 0;
    state.backgroundImage = prepared.image;
    syncBackgroundControls();
    drawCanvas();
    saveCurrentProject();
  } catch (error) {
    setSaveStatus(error instanceof Error ? error.message : 'Image could not be loaded.');
  } finally {
    refs.imageUpload.value = '';
  }
}

function removeImage() {
  state.studio.background = {
    dataUrl: '',
    name: '',
    fit: 'cover',
    zoom: 1,
    x: 0,
    y: 0
  };
  state.backgroundImage = null;
  syncBackgroundControls();
  drawCanvas();
  scheduleAutosave();
}

function buildProjectSnapshot() {
  return {
    topic: refs.topicInput.value,
    selectedStyles: [...state.selectedStyles],
    weirdness: Number(refs.weirdness.value),
    concepts: state.concepts,
    activeConcept: state.activeConcept,
    studio: state.studio
  };
}

function setSaveStatus(message) {
  refs.saveStatus.textContent = message;
}

function saveCurrentProject({ quiet = false } = {}) {
  const result = saveProject(window.localStorage, buildProjectSnapshot());
  if (result.ok) {
    const stamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    setSaveStatus(`${quiet ? 'Autosaved' : 'Saved'} ${stamp}`);
  } else {
    setSaveStatus(result.error.includes('quota') || result.error.includes('Quota')
      ? 'Local storage is full — try a smaller image.'
      : `Save failed: ${result.error}`);
  }
  return result.ok;
}

function scheduleAutosave() {
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer = setTimeout(() => saveCurrentProject({ quiet: true }), 650);
}

function normalizeLayer(source, fallback) {
  return {
    ...fallback,
    ...(source && typeof source === 'object' ? source : {}),
    x: clamp(Number(source?.x ?? fallback.x), 0.05, 0.95),
    y: clamp(Number(source?.y ?? fallback.y), 0.05, 0.95),
    size: clamp(Number(source?.size ?? fallback.size), 28, 140),
    color: /^#[0-9a-f]{6}$/i.test(source?.color || '') ? source.color : fallback.color,
    align: ['left', 'center', 'right'].includes(source?.align) ? source.align : fallback.align,
    outline: source?.outline !== false,
    shadow: source?.shadow === true
  };
}

function normalizeStudio(source) {
  const fallback = createDefaultStudio();
  if (!source || typeof source !== 'object') return fallback;

  return {
    visualTheme: themeOrder.includes(source.visualTheme) ? source.visualTheme : fallback.visualTheme,
    watermark: source.watermark !== false,
    activeLayer: source.activeLayer === 'bottom' ? 'bottom' : 'top',
    background: {
      ...fallback.background,
      ...(source.background && typeof source.background === 'object' ? source.background : {}),
      fit: source.background?.fit === 'contain' ? 'contain' : 'cover',
      zoom: clamp(Number(source.background?.zoom ?? 1), 0.5, 3),
      x: clamp(Number(source.background?.x ?? 0), -100, 100),
      y: clamp(Number(source.background?.y ?? 0), -100, 100)
    },
    layers: {
      top: normalizeLayer(source.layers?.top, fallback.layers.top),
      bottom: normalizeLayer(source.layers?.bottom, fallback.layers.bottom)
    }
  };
}

async function restoreBackgroundImage() {
  state.backgroundImage = null;
  const dataUrl = state.studio.background.dataUrl;
  if (!dataUrl) return;

  try {
    state.backgroundImage = await loadImage(dataUrl);
  } catch {
    state.studio.background.dataUrl = '';
    state.studio.background.name = '';
    setSaveStatus('Saved image could not be restored.');
  }
}

async function loadSavedProject() {
  const project = loadProject(window.localStorage);
  if (!project) {
    setSaveStatus('No compatible saved project found.');
    return;
  }

  refs.topicInput.value = typeof project.topic === 'string' ? project.topic : '';
  const validStyles = new Set(STYLE_PRESETS.map(item => item.id));
  const savedStyles = Array.isArray(project.selectedStyles)
    ? project.selectedStyles.filter(style => validStyles.has(style))
    : [];
  state.selectedStyles = new Set(savedStyles.length ? savedStyles : DEFAULT_STYLES);
  refs.weirdness.value = String(clamp(Number(project.weirdness ?? 7), 1, 10));
  refs.weirdnessValue.value = refs.weirdness.value;
  state.concepts = Array.isArray(project.concepts) ? project.concepts : [];
  state.activeConcept = project.activeConcept && typeof project.activeConcept === 'object' ? project.activeConcept : null;
  state.studio = normalizeStudio(project.studio);

  renderStyles();
  renderConcepts();
  refs.conceptsSection.hidden = state.concepts.length === 0;
  syncStudioControls();
  updateScore();
  await restoreBackgroundImage();
  syncBackgroundControls();
  drawCanvas();
  setSaveStatus('Saved project loaded.');
}

function startNewProject() {
  clearTimeout(state.autosaveTimer);
  clearProject(window.localStorage);
  state.selectedStyles = new Set(DEFAULT_STYLES);
  state.concepts = [];
  state.activeConcept = null;
  state.studio = createDefaultStudio();
  state.backgroundImage = null;
  refs.topicInput.value = '';
  refs.weirdness.value = '7';
  refs.weirdnessValue.value = '7';
  refs.scoreBox.querySelector('strong').textContent = '—';
  refs.scoreBox.removeAttribute('title');
  refs.conceptsSection.hidden = true;
  refs.conceptGrid.innerHTML = '';
  renderStyles();
  syncStudioControls();
  drawCanvas();
  setSaveStatus('New unsaved project');
}

function mutateActiveLayer(mutator) {
  mutator(getActiveLayer());
  syncActiveLayerControls();
  drawCanvas();
  scheduleAutosave();
}

refs.generateButton.addEventListener('click', () => generateConcepts());
refs.regenerateButton.addEventListener('click', () => generateConcepts({ scroll: false }));
refs.surpriseMe.addEventListener('click', surprise);
refs.weirdness.addEventListener('input', () => {
  refs.weirdnessValue.value = refs.weirdness.value;
  updateScore();
  scheduleAutosave();
});
refs.topText.addEventListener('input', () => {
  state.studio.layers.top.text = refs.topText.value;
  updateCaptionPreview();
  drawCanvas();
  scheduleAutosave();
});
refs.bottomText.addEventListener('input', () => {
  state.studio.layers.bottom.text = refs.bottomText.value;
  updateCaptionPreview();
  drawCanvas();
  scheduleAutosave();
});
refs.visualTheme.addEventListener('change', () => {
  state.studio.visualTheme = refs.visualTheme.value;
  drawCanvas();
  scheduleAutosave();
});
refs.watermark.addEventListener('change', () => {
  state.studio.watermark = refs.watermark.checked;
  drawCanvas();
  scheduleAutosave();
});
refs.downloadButton.addEventListener('click', downloadCanvas);
refs.copyButton.addEventListener('click', copyCaption);
refs.shuffleTheme.addEventListener('click', shuffleTheme);
refs.topicInput.addEventListener('input', () => {
  updateScore();
  scheduleAutosave();
});
refs.topicInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') generateConcepts();
});
refs.imageUpload.addEventListener('change', handleImageUpload);
refs.removeImage.addEventListener('click', removeImage);
refs.imageFit.addEventListener('change', () => {
  state.studio.background.fit = refs.imageFit.value;
  drawCanvas();
  scheduleAutosave();
});
refs.imageZoom.addEventListener('input', () => {
  state.studio.background.zoom = Number(refs.imageZoom.value) / 100;
  refs.imageZoomValue.value = `${refs.imageZoom.value}%`;
  drawCanvas();
  scheduleAutosave();
});
refs.imageX.addEventListener('input', () => {
  state.studio.background.x = Number(refs.imageX.value);
  refs.imageXValue.value = refs.imageX.value;
  drawCanvas();
  scheduleAutosave();
});
refs.imageY.addEventListener('input', () => {
  state.studio.background.y = Number(refs.imageY.value);
  refs.imageYValue.value = refs.imageY.value;
  drawCanvas();
  scheduleAutosave();
});
refs.activeLayer.addEventListener('change', () => {
  state.studio.activeLayer = refs.activeLayer.value === 'bottom' ? 'bottom' : 'top';
  syncActiveLayerControls();
  drawCanvas();
  scheduleAutosave();
});
refs.fontFamily.addEventListener('change', () => mutateActiveLayer(layer => { layer.font = refs.fontFamily.value; }));
refs.fontSize.addEventListener('input', () => mutateActiveLayer(layer => { layer.size = Number(refs.fontSize.value); }));
refs.fontColor.addEventListener('input', () => mutateActiveLayer(layer => { layer.color = refs.fontColor.value; }));
refs.textAlign.addEventListener('change', () => mutateActiveLayer(layer => { layer.align = refs.textAlign.value; }));
refs.textOutline.addEventListener('change', () => mutateActiveLayer(layer => { layer.outline = refs.textOutline.checked; }));
refs.textShadow.addEventListener('change', () => mutateActiveLayer(layer => { layer.shadow = refs.textShadow.checked; }));
refs.textX.addEventListener('input', () => mutateActiveLayer(layer => { layer.x = Number(refs.textX.value) / 100; }));
refs.textY.addEventListener('input', () => mutateActiveLayer(layer => { layer.y = Number(refs.textY.value) / 100; }));
refs.saveProject.addEventListener('click', () => saveCurrentProject());
refs.loadProject.addEventListener('click', loadSavedProject);
refs.newProject.addEventListener('click', startNewProject);
refs.canvas.addEventListener('pointerdown', beginDrag);
refs.canvas.addEventListener('pointermove', moveDrag);
refs.canvas.addEventListener('pointerup', endDrag);
refs.canvas.addEventListener('pointercancel', endDrag);

renderTrends();
renderStyles();
syncStudioControls();
drawCanvas();

if (loadProject(window.localStorage)) {
  setSaveStatus('Saved project available');
}
