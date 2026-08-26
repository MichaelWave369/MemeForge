import { DEMO_TRENDS } from './data/trends.js';
import { STYLE_PRESETS, buildConcepts } from './engines/meme-engine.js';
import { scoreMemePotential } from './engines/score-engine.js';

const $ = selector => document.querySelector(selector);

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
  captionPreview: $('#captionPreview')
};

const state = {
  selectedStyles: new Set(['absurd', 'nerdy', 'surreal']),
  concepts: [],
  activeConcept: null
};

const themeOrder = ['signal', 'void', 'paper', 'warning', 'terminal'];

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
    });
    refs.styleGrid.appendChild(button);
  });
}

function getTopic() {
  return refs.topicInput.value.trim() || DEMO_TRENDS[0].topic;
}

function generateConcepts({ scroll = true } = {}) {
  const topic = getTopic();
  refs.topicInput.value = topic;
  const weirdness = Number(refs.weirdness.value);
  const styles = [...state.selectedStyles];
  const score = scoreMemePotential(topic, styles.length, weirdness);

  refs.scoreBox.querySelector('strong').textContent = `${score.total}/100`;
  refs.scoreBox.title = `${score.note}\n${Object.entries(score.breakdown).map(([key, value]) => `${key}: ${value}`).join('\n')}`;

  state.concepts = buildConcepts(topic, styles, weirdness, 12);
  renderConcepts();
  refs.conceptsSection.hidden = false;

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
  refs.topText.value = concept.top;
  refs.bottomText.value = concept.bottom;
  updateCaptionPreview();
  drawCanvas();
  $('#studio').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateCaptionPreview() {
  refs.captionPreview.textContent = `${refs.topText.value.trim()} — ${refs.bottomText.value.trim()}`;
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

function fitText(ctx, text, maxWidth, maxLines, startSize = 82, minSize = 36) {
  let size = startSize;
  let lines = [];
  while (size >= minSize) {
    ctx.font = `900 ${size}px Inter, Arial, sans-serif`;
    lines = splitLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    size -= 4;
  }
  return { size, lines: lines.slice(0, maxLines) };
}

function drawBackground(ctx, theme, width, height) {
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

function drawTextBlock(ctx, text, areaY, theme, maxLines = 4) {
  const width = refs.canvas.width;
  const maxWidth = width - 150;
  const fitted = fitText(ctx, text.toUpperCase(), maxWidth, maxLines);
  const lineHeight = fitted.size * 1.05;
  const totalHeight = fitted.lines.length * lineHeight;
  let y = areaY - totalHeight / 2 + lineHeight * .72;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(8, fitted.size * .12);

  const darkText = theme === 'paper' || theme === 'warning';
  ctx.strokeStyle = darkText ? 'rgba(255,255,255,.72)' : 'rgba(0,0,0,.88)';
  ctx.fillStyle = darkText ? '#121212' : '#ffffff';

  fitted.lines.forEach(line => {
    ctx.strokeText(line, width / 2, y);
    ctx.fillText(line, width / 2, y);
    y += lineHeight;
  });
}

function drawCanvas() {
  const ctx = refs.canvas.getContext('2d');
  const width = refs.canvas.width;
  const height = refs.canvas.height;
  const theme = refs.visualTheme.value;

  drawBackground(ctx, theme, width, height);

  ctx.fillStyle = theme === 'paper' ? 'rgba(20,20,20,.08)' : 'rgba(0,0,0,.23)';
  ctx.fillRect(54, 54, width - 108, height - 108);

  drawTextBlock(ctx, refs.topText.value || 'TOP TEXT', 300, theme, 4);
  drawTextBlock(ctx, refs.bottomText.value || 'BOTTOM TEXT', 760, theme, 4);

  ctx.textAlign = 'left';
  ctx.font = '800 22px Inter, Arial, sans-serif';
  ctx.fillStyle = theme === 'paper' || theme === 'warning' ? 'rgba(20,20,20,.65)' : 'rgba(255,255,255,.64)';
  ctx.fillText('MEMEFORGE // CONCEPT PROTOTYPE', 70, 92);

  if (refs.watermark.checked) {
    ctx.textAlign = 'right';
    ctx.font = '800 20px Inter, Arial, sans-serif';
    ctx.fillText('MEMEFORGE', width - 70, height - 72);
  }
}

function downloadCanvas() {
  drawCanvas();
  const link = document.createElement('a');
  const topic = getTopic().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'meme';
  link.download = `memeforge-${topic}.png`;
  link.href = refs.canvas.toDataURL('image/png');
  link.click();
}

async function copyCaption() {
  const caption = `${refs.topText.value.trim()}\n${refs.bottomText.value.trim()}`;
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
  const current = themeOrder.indexOf(refs.visualTheme.value);
  refs.visualTheme.value = themeOrder[(current + 1) % themeOrder.length];
  drawCanvas();
}

refs.generateButton.addEventListener('click', () => generateConcepts());
refs.regenerateButton.addEventListener('click', () => generateConcepts({ scroll: false }));
refs.surpriseMe.addEventListener('click', surprise);
refs.weirdness.addEventListener('input', () => { refs.weirdnessValue.value = refs.weirdness.value; });
refs.topText.addEventListener('input', () => { updateCaptionPreview(); drawCanvas(); });
refs.bottomText.addEventListener('input', () => { updateCaptionPreview(); drawCanvas(); });
refs.visualTheme.addEventListener('change', drawCanvas);
refs.watermark.addEventListener('change', drawCanvas);
refs.downloadButton.addEventListener('click', downloadCanvas);
refs.copyButton.addEventListener('click', copyCaption);
refs.shuffleTheme.addEventListener('click', shuffleTheme);
refs.topicInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') generateConcepts();
});

renderTrends();
renderStyles();
updateCaptionPreview();
drawCanvas();
