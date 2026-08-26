import { BUILTIN_TEMPLATES } from './data/templates.js';
import {
  createTemplateFromStudio,
  decodeTemplatePack,
  encodeTemplatePack,
  filterTemplates,
  mergeUserTemplates,
  normalizeTemplate
} from './engines/template-engine.js';
import {
  loadTemplateFavorites,
  loadUserTemplates,
  saveTemplateFavorites,
  saveUserTemplates
} from './engines/storage-engine.js';

const $ = selector => document.querySelector(selector);

const refs = {
  grid: $('#templateGrid'),
  search: $('#templateSearch'),
  filter: $('#templateFilter'),
  name: $('#templateName'),
  save: $('#saveTemplate'),
  export: $('#exportTemplates'),
  import: $('#templateImport'),
  status: $('#templateStatus'),
  studio: $('#studio'),
  visualTheme: $('#visualTheme'),
  watermark: $('#watermark'),
  imageFit: $('#imageFit'),
  imageZoom: $('#imageZoom'),
  imageX: $('#imageX'),
  imageY: $('#imageY'),
  activeLayer: $('#activeLayer'),
  fontFamily: $('#fontFamily'),
  fontSize: $('#fontSize'),
  fontColor: $('#fontColor'),
  textAlign: $('#textAlign'),
  textOutline: $('#textOutline'),
  textShadow: $('#textShadow'),
  textX: $('#textX'),
  textY: $('#textY')
};

const state = {
  userTemplates: loadUserTemplates(window.localStorage)
    .map(normalizeTemplate)
    .filter(template => template && template.source === 'user'),
  favorites: loadTemplateFavorites(window.localStorage)
};

function setStatus(message) {
  refs.status.textContent = message;
}

function dispatch(element, type) {
  element.dispatchEvent(new Event(type, { bubbles: true }));
}

function setSelect(element, value) {
  element.value = String(value);
  dispatch(element, 'change');
}

function setRange(element, value) {
  element.value = String(value);
  dispatch(element, 'input');
}

function setCheckbox(element, value) {
  element.checked = Boolean(value);
  dispatch(element, 'change');
}

function readLayer(layerName) {
  setSelect(refs.activeLayer, layerName);
  return {
    x: Number(refs.textX.value) / 100,
    y: Number(refs.textY.value) / 100,
    size: Number(refs.fontSize.value),
    font: refs.fontFamily.value,
    color: refs.fontColor.value,
    align: refs.textAlign.value,
    outline: refs.textOutline.checked,
    shadow: refs.textShadow.checked
  };
}

function readCurrentStudio() {
  const previousLayer = refs.activeLayer.value;
  const top = readLayer('top');
  const bottom = readLayer('bottom');
  setSelect(refs.activeLayer, previousLayer);

  return {
    visualTheme: refs.visualTheme.value,
    watermark: refs.watermark.checked,
    background: {
      fit: refs.imageFit.value,
      zoom: Number(refs.imageZoom.value) / 100,
      x: Number(refs.imageX.value),
      y: Number(refs.imageY.value)
    },
    layers: { top, bottom }
  };
}

function applyLayer(layerName, layer) {
  setSelect(refs.activeLayer, layerName);
  setSelect(refs.fontFamily, layer.font);
  setRange(refs.fontSize, layer.size);
  refs.fontColor.value = layer.color;
  dispatch(refs.fontColor, 'input');
  setSelect(refs.textAlign, layer.align);
  setCheckbox(refs.textOutline, layer.outline);
  setCheckbox(refs.textShadow, layer.shadow);
  setRange(refs.textX, Math.round(layer.x * 100));
  setRange(refs.textY, Math.round(layer.y * 100));
}

function applyTemplate(template) {
  const normalized = normalizeTemplate(template);
  if (!normalized) return;

  const previousLayer = refs.activeLayer.value;
  setSelect(refs.visualTheme, normalized.studio.visualTheme);
  setCheckbox(refs.watermark, normalized.studio.watermark);

  refs.imageFit.value = normalized.studio.background.fit;
  dispatch(refs.imageFit, 'change');
  setRange(refs.imageZoom, Math.round(normalized.studio.background.zoom * 100));
  setRange(refs.imageX, normalized.studio.background.x);
  setRange(refs.imageY, normalized.studio.background.y);

  applyLayer('top', normalized.studio.layers.top);
  applyLayer('bottom', normalized.studio.layers.bottom);
  setSelect(refs.activeLayer, previousLayer);

  setStatus(`Applied “${normalized.name}”. Caption and uploaded image preserved.`);
  refs.studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function persistTemplates() {
  const result = saveUserTemplates(window.localStorage, state.userTemplates);
  if (!result.ok) setStatus(`Template save failed: ${result.error}`);
  return result.ok;
}

function persistFavorites() {
  const result = saveTemplateFavorites(window.localStorage, state.favorites);
  if (!result.ok) setStatus(`Favorite save failed: ${result.error}`);
  return result.ok;
}

function allTemplates() {
  return [...BUILTIN_TEMPLATES, ...state.userTemplates];
}

function themeLabel(theme) {
  return {
    signal: 'Signal',
    void: 'Void',
    paper: 'Paper',
    warning: 'Warning',
    terminal: 'Terminal'
  }[theme] || theme;
}

function createPreview(template) {
  const preview = document.createElement('div');
  preview.className = `template-preview template-theme-${template.studio.visualTheme}`;

  const top = document.createElement('span');
  top.className = 'template-preview-text template-preview-top';
  top.textContent = 'SETUP GOES HERE';
  top.style.left = `${template.studio.layers.top.x * 100}%`;
  top.style.top = `${template.studio.layers.top.y * 100}%`;
  top.style.color = template.studio.layers.top.color;
  top.style.textAlign = template.studio.layers.top.align;

  const bottom = document.createElement('span');
  bottom.className = 'template-preview-text template-preview-bottom';
  bottom.textContent = 'PUNCHLINE';
  bottom.style.left = `${template.studio.layers.bottom.x * 100}%`;
  bottom.style.top = `${template.studio.layers.bottom.y * 100}%`;
  bottom.style.color = template.studio.layers.bottom.color;
  bottom.style.textAlign = template.studio.layers.bottom.align;

  preview.append(top, bottom);
  return preview;
}

function renderTemplates() {
  const visible = filterTemplates(allTemplates(), refs.search.value, refs.filter.value, state.favorites);
  refs.grid.innerHTML = '';

  visible.forEach(template => {
    const card = document.createElement('article');
    card.className = 'template-card panel';

    const preview = createPreview(template);
    const body = document.createElement('div');
    body.className = 'template-card-body';

    const titleRow = document.createElement('div');
    titleRow.className = 'template-title-row';
    const title = document.createElement('h3');
    title.textContent = template.name;
    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.className = `favorite-button${state.favorites.has(template.id) ? ' active' : ''}`;
    favorite.setAttribute('aria-label', `${state.favorites.has(template.id) ? 'Remove' : 'Add'} ${template.name} ${state.favorites.has(template.id) ? 'from' : 'to'} favorites`);
    favorite.textContent = state.favorites.has(template.id) ? '★' : '☆';
    favorite.addEventListener('click', () => {
      if (state.favorites.has(template.id)) state.favorites.delete(template.id);
      else state.favorites.add(template.id);
      persistFavorites();
      renderTemplates();
    });
    titleRow.append(title, favorite);

    const description = document.createElement('p');
    description.textContent = template.description || 'Reusable MemeForge layout.';

    const meta = document.createElement('div');
    meta.className = 'template-meta';
    const source = document.createElement('span');
    source.textContent = template.source === 'builtin' ? 'Built-in' : 'Mine';
    const theme = document.createElement('span');
    theme.textContent = themeLabel(template.studio.visualTheme);
    meta.append(source, theme);

    const tags = document.createElement('div');
    tags.className = 'template-tags';
    (template.tags || []).slice(0, 4).forEach(tag => {
      const chip = document.createElement('span');
      chip.textContent = tag;
      tags.appendChild(chip);
    });

    const actions = document.createElement('div');
    actions.className = 'template-card-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'button primary small';
    apply.textContent = 'Apply';
    apply.addEventListener('click', () => applyTemplate(template));
    actions.appendChild(apply);

    if (template.source === 'user') {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button ghost small';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => {
        state.userTemplates = state.userTemplates.filter(item => item.id !== template.id);
        state.favorites.delete(template.id);
        persistTemplates();
        persistFavorites();
        setStatus(`Deleted “${template.name}”.`);
        renderTemplates();
      });
      actions.appendChild(remove);
    }

    body.append(titleRow, description, meta, tags, actions);
    card.append(preview, body);
    refs.grid.appendChild(card);
  });

  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'template-empty panel';
    empty.textContent = 'No templates match this view.';
    refs.grid.appendChild(empty);
  }
}

function saveCurrentTemplate() {
  const name = refs.name.value.trim();
  if (!name) {
    setStatus('Give the template a name first.');
    refs.name.focus();
    return;
  }

  const template = createTemplateFromStudio(name, readCurrentStudio());
  if (!template) {
    setStatus('That template could not be created.');
    return;
  }

  state.userTemplates = mergeUserTemplates(state.userTemplates, [template]);
  if (!persistTemplates()) return;
  refs.name.value = '';
  refs.filter.value = 'mine';
  setStatus(`Saved “${template.name}” locally. Image and caption were not copied into the template.`);
  renderTemplates();
}

function exportUserTemplates() {
  if (!state.userTemplates.length) {
    setStatus('No user templates to export yet.');
    return;
  }

  const blob = new Blob([encodeTemplatePack(state.userTemplates)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `memeforge-template-pack-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus(`Exported ${state.userTemplates.length} user template${state.userTemplates.length === 1 ? '' : 's'}.`);
}

async function importTemplatePack(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    const incoming = decodeTemplatePack(await file.text());
    if (!incoming.length) {
      setStatus('No compatible MemeForge templates found in that file.');
      return;
    }
    const before = state.userTemplates.length;
    state.userTemplates = mergeUserTemplates(state.userTemplates, incoming);
    if (!persistTemplates()) return;
    refs.filter.value = 'mine';
    setStatus(`Imported ${incoming.length} template${incoming.length === 1 ? '' : 's'}; library now has ${state.userTemplates.length} custom layouts.`);
    renderTemplates();
    if (state.userTemplates.length === before) setStatus(`Imported pack matched ${incoming.length} template${incoming.length === 1 ? '' : 's'} already in your library.`);
  } catch {
    setStatus('Template pack could not be read.');
  } finally {
    refs.import.value = '';
  }
}

refs.search.addEventListener('input', renderTemplates);
refs.filter.addEventListener('change', renderTemplates);
refs.save.addEventListener('click', saveCurrentTemplate);
refs.name.addEventListener('keydown', event => {
  if (event.key === 'Enter') saveCurrentTemplate();
});
refs.export.addEventListener('click', exportUserTemplates);
refs.import.addEventListener('change', importTemplatePack);

renderTemplates();
setStatus(`${BUILTIN_TEMPLATES.length} built-in · ${state.userTemplates.length} custom · ${state.favorites.size} favorite${state.favorites.size === 1 ? '' : 's'}`);
