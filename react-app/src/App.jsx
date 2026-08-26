import { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_TRENDS } from '@core/data/trends.js';
import { BUILTIN_TEMPLATES } from '@core/data/templates.js';
import { STYLE_PRESETS, buildConcepts } from '@core/engines/meme-engine.js';
import { scoreMemePotential } from '@core/engines/score-engine.js';
import {
  clearProject,
  loadProject,
  loadTemplateFavorites,
  loadUserTemplates,
  saveProject,
  saveTemplateFavorites,
  saveUserTemplates
} from '@core/engines/storage-engine.js';
import {
  applyTemplateToStudio,
  createTemplateFromStudio,
  decodeTemplatePack,
  encodeTemplatePack,
  filterTemplates,
  mergeUserTemplates,
  normalizeTemplate
} from '@core/engines/template-engine.js';
import {
  CANVAS_FORMATS,
  DEFAULT_FONT,
  STICKER_CHOICES,
  defaultStudio,
  drawMeme,
  loadImage,
  prepareImage
} from './canvas.js';
import {
  addRemixSnapshot,
  clearRemixHistory as clearRemixHistoryStorage,
  createRemixSnapshot,
  loadRemixHistory,
  restoreSnapshotStudio
} from './remix-history.js';
import { useStudioHistory } from './useStudioHistory.js';

const DEFAULT_STYLES = ['absurd', 'nerdy', 'surreal'];
const THEMES = ['signal', 'void', 'paper', 'warning', 'terminal'];
const FONT_OPTIONS = [
  [DEFAULT_FONT, 'Impact'],
  ["'Arial Black', Arial, sans-serif", 'Arial Black'],
  ['Inter, Arial, sans-serif', 'Inter'],
  ['Georgia, serif', 'Georgia'],
  ["'Courier New', monospace", 'Courier New']
];
const VALID_GLYPHS = new Set(STICKER_CHOICES.map(item => item.glyph));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function normalizeStudio(source) {
  const fallback = defaultStudio();
  if (!source || typeof source !== 'object') return fallback;
  const normalizeLayer = (layer, base) => ({
    ...base,
    ...(layer && typeof layer === 'object' ? layer : {}),
    x: clamp(finite(layer?.x, base.x), .05, .95),
    y: clamp(finite(layer?.y, base.y), .05, .95),
    size: clamp(finite(layer?.size, base.size), 28, 140),
    font: FONT_OPTIONS.some(([value]) => value === layer?.font) ? layer.font : base.font,
    color: /^#[0-9a-f]{6}$/i.test(layer?.color || '') ? layer.color : base.color,
    align: ['left', 'center', 'right'].includes(layer?.align) ? layer.align : base.align,
    outline: layer?.outline !== false,
    shadow: layer?.shadow === true
  });
  const stickers = Array.isArray(source.stickers)
    ? source.stickers.slice(0, 12).map((sticker, index) => ({
      id: typeof sticker?.id === 'string' && sticker.id ? sticker.id : `restored-${index}`,
      glyph: VALID_GLYPHS.has(sticker?.glyph) ? sticker.glyph : '✨',
      x: clamp(finite(sticker?.x, .5), .03, .97),
      y: clamp(finite(sticker?.y, .5), .03, .97),
      size: clamp(finite(sticker?.size, 120), 40, 360),
      rotation: clamp(finite(sticker?.rotation, 0), -180, 180),
      opacity: clamp(finite(sticker?.opacity, 1), .2, 1)
    }))
    : [];
  const activeStickerId = stickers.some(item => item.id === source.activeStickerId) ? source.activeStickerId : null;
  return {
    format: CANVAS_FORMATS[source.format] ? source.format : fallback.format,
    visualTheme: THEMES.includes(source.visualTheme) ? source.visualTheme : fallback.visualTheme,
    watermark: source.watermark !== false,
    activeLayer: source.activeLayer === 'bottom' ? 'bottom' : 'top',
    activeStickerId,
    background: {
      ...fallback.background,
      ...(source.background && typeof source.background === 'object' ? source.background : {}),
      dataUrl: typeof source.background?.dataUrl === 'string' ? source.background.dataUrl : '',
      name: typeof source.background?.name === 'string' ? source.background.name : '',
      fit: source.background?.fit === 'contain' ? 'contain' : 'cover',
      zoom: clamp(finite(source.background?.zoom, 1), .5, 3),
      x: clamp(finite(source.background?.x, 0), -100, 100),
      y: clamp(finite(source.background?.y, 0), -100, 100)
    },
    stickers,
    layers: {
      top: normalizeLayer(source.layers?.top, fallback.layers.top),
      bottom: normalizeLayer(source.layers?.bottom, fallback.layers.bottom)
    }
  };
}

function Header() {
  return <header className="site-header shell">
    <a className="brand" href="#top"><span className="brand-mark">MF</span><span><strong>MemeForge</strong><small>React V0.4 · GitHub Pages</small></span></a>
    <nav className="header-actions"><a href="#forge">Forge</a><a href="#templates">Templates</a><a href="#studio">Remix</a><a href="https://github.com/MichaelWave369/MemeForge" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
  </header>;
}

function CanvasStudio({ studio, updateStudio, backgroundImage, topic }) {
  const canvasRef = useRef(null);
  const boundsRef = useRef({ top: null, bottom: null, stickers: {} });
  const dragRef = useRef(null);
  const format = CANVAS_FORMATS[studio.format] || CANVAS_FORMATS.square;

  useEffect(() => {
    boundsRef.current = drawMeme(canvasRef.current, studio, backgroundImage);
  }, [studio, backgroundImage, format.width, format.height]);

  const point = event => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  };
  const contains = (bounds, p) => bounds && p.x >= bounds.left && p.x <= bounds.right && p.y >= bounds.top && p.y <= bounds.bottom;

  const onPointerDown = event => {
    const p = point(event);
    const stickerHit = [...(studio.stickers || [])].reverse().find(sticker => contains(boundsRef.current.stickers?.[sticker.id], p));
    if (stickerHit) {
      dragRef.current = {
        type: 'sticker',
        id: stickerHit.id,
        offsetX: p.x - stickerHit.x * canvasRef.current.width,
        offsetY: p.y - stickerHit.y * canvasRef.current.height
      };
      updateStudio(prev => ({ ...prev, activeStickerId: stickerHit.id }), 'select-sticker', { record: false });
      canvasRef.current.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }

    const order = [studio.activeLayer, studio.activeLayer === 'top' ? 'bottom' : 'top'];
    const hit = order.find(name => contains(boundsRef.current[name], p));
    if (!hit) return;
    const layer = studio.layers[hit];
    dragRef.current = {
      type: 'text',
      layer: hit,
      offsetX: p.x - layer.x * canvasRef.current.width,
      offsetY: p.y - layer.y * canvasRef.current.height
    };
    updateStudio(prev => ({ ...prev, activeLayer: hit, activeStickerId: null }), 'select-text', { record: false });
    canvasRef.current.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = event => {
    if (!dragRef.current) return;
    const p = point(event);
    const drag = dragRef.current;
    if (drag.type === 'sticker') {
      updateStudio(prev => ({
        ...prev,
        stickers: prev.stickers.map(sticker => sticker.id === drag.id ? {
          ...sticker,
          x: clamp((p.x - drag.offsetX) / canvasRef.current.width, .03, .97),
          y: clamp((p.y - drag.offsetY) / canvasRef.current.height, .03, .97)
        } : sticker)
      }), `drag-sticker-${drag.id}`);
    } else {
      updateStudio(prev => ({
        ...prev,
        layers: {
          ...prev.layers,
          [drag.layer]: {
            ...prev.layers[drag.layer],
            x: clamp((p.x - drag.offsetX) / canvasRef.current.width, .05, .95),
            y: clamp((p.y - drag.offsetY) / canvasRef.current.height, .05, .95)
          }
        }
      }), `drag-text-${drag.layer}`);
    }
    event.preventDefault();
  };

  const onPointerUp = event => {
    if (!dragRef.current) return;
    dragRef.current = null;
    canvasRef.current.releasePointerCapture?.(event.pointerId);
  };

  const download = () => {
    const canvas = canvasRef.current;
    drawMeme(canvas, studio, backgroundImage, { showSelection: false });
    const safeTopic = String(topic || 'meme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'meme';
    const a = document.createElement('a');
    a.download = `memeforge-${safeTopic}-${format.ratio.replace(':', 'x')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    boundsRef.current = drawMeme(canvas, studio, backgroundImage);
  };

  return <div className="canvas-column">
    <div className="canvas-wrap panel">
      <canvas
        ref={canvasRef}
        width={format.width}
        height={format.height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`Meme preview canvas ${format.ratio}`}
      />
      <div className="canvas-hint">Drag text or stickers · {format.ratio}</div>
    </div>
    <button className="button primary wide" onClick={download}>Download {format.label} PNG</button>
  </div>;
}

function TemplateCard({ template, favorite, onFavorite, onApply, onDelete }) {
  return <article className="template-card panel">
    <div className={`template-preview theme-${template.studio.visualTheme}`}>
      <span style={{ left: `${template.studio.layers.top.x * 100}%`, top: `${template.studio.layers.top.y * 100}%`, color: template.studio.layers.top.color }}>SETUP GOES HERE</span>
      <span style={{ left: `${template.studio.layers.bottom.x * 100}%`, top: `${template.studio.layers.bottom.y * 100}%`, color: template.studio.layers.bottom.color }}>PUNCHLINE</span>
    </div>
    <div className="template-body">
      <div className="template-title"><h3>{template.name}</h3><button className={`favorite ${favorite ? 'active' : ''}`} onClick={onFavorite} aria-label={`${favorite ? 'Remove' : 'Add'} ${template.name} ${favorite ? 'from' : 'to'} favorites`}>{favorite ? '★' : '☆'}</button></div>
      <p>{template.description || 'Reusable MemeForge layout.'}</p>
      <div className="tag-row">{template.tags?.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div>
      <div className="template-actions"><button className="button primary small" onClick={onApply}>Apply</button>{onDelete && <button className="button ghost small" onClick={onDelete}>Delete</button>}</div>
    </div>
  </article>;
}

function RemixHistory({ items, onRestore, onClear }) {
  return <div className="remix-history panel">
    <div className="history-heading"><div><strong>Remix checkpoints</strong><span>Compact local snapshots · uploaded image bytes are not duplicated</span></div>{items.length > 0 && <button className="button ghost small" onClick={onClear}>Clear</button>}</div>
    {items.length === 0
      ? <p className="history-empty">Use Duplicate or Remix and your recent looks will appear here.</p>
      : <div className="history-list">{items.slice(0, 6).map(item => <button className="history-item" key={item.id} onClick={() => onRestore(item)}><strong>{item.label}</strong><span>{item.topic || 'Untitled meme'} · {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></button>)}</div>}
  </div>;
}

export default function App() {
  const [topic, setTopic] = useState('');
  const [selectedStyles, setSelectedStyles] = useState(new Set(DEFAULT_STYLES));
  const [weirdness, setWeirdness] = useState(7);
  const [concepts, setConcepts] = useState([]);
  const {
    studio,
    updateStudio,
    replaceStudio,
    undo,
    redo,
    canUndo,
    canRedo
  } = useStudioHistory(defaultStudio());
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [saveStatus, setSaveStatus] = useState('Not saved yet');
  const [userTemplates, setUserTemplates] = useState(() => loadUserTemplates(window.localStorage).map(normalizeTemplate).filter(Boolean));
  const [favorites, setFavorites] = useState(() => loadTemplateFavorites(window.localStorage));
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [templateName, setTemplateName] = useState('');
  const [templateStatus, setTemplateStatus] = useState(`${BUILTIN_TEMPLATES.length} built-in templates ready.`);
  const [remixHistory, setRemixHistory] = useState(() => loadRemixHistory(window.localStorage));
  const remixNonce = useRef(0);

  const score = useMemo(() => topic.trim() ? scoreMemePotential(topic.trim(), selectedStyles.size, weirdness) : null, [topic, selectedStyles, weirdness]);
  const activeLayer = studio.layers[studio.activeLayer];
  const activeSticker = studio.stickers.find(sticker => sticker.id === studio.activeStickerId) || null;
  const allTemplates = useMemo(() => [...BUILTIN_TEMPLATES, ...userTemplates], [userTemplates]);
  const visibleTemplates = useMemo(() => filterTemplates(allTemplates, templateSearch, templateFilter, favorites), [allTemplates, templateSearch, templateFilter, favorites]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = saveProject(window.localStorage, { topic, selectedStyles: [...selectedStyles], weirdness, concepts, studio });
      setSaveStatus(result.ok ? 'Autosaved locally' : `Save failed: ${result.error}`);
    }, 700);
    return () => clearTimeout(timer);
  }, [topic, selectedStyles, weirdness, concepts, studio]);

  useEffect(() => {
    let cancelled = false;
    if (!studio.background.dataUrl) { setBackgroundImage(null); return undefined; }
    loadImage(studio.background.dataUrl).then(image => { if (!cancelled) setBackgroundImage(image); }).catch(() => {});
    return () => { cancelled = true; };
  }, [studio.background.dataUrl]);

  useEffect(() => {
    const onKeyDown = event => {
      const command = event.ctrlKey || event.metaKey;
      if (!command) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) { if (redo()) setSaveStatus('Redid edit'); }
        else if (undo()) setSaveStatus('Undid edit');
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        if (redo()) setSaveStatus('Redid edit');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redo, undo]);

  const toggleStyle = id => setSelectedStyles(prev => {
    const next = new Set(prev);
    if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id);
    return next;
  });

  const generate = () => {
    const safeTopic = topic.trim() || DEMO_TRENDS[0].topic;
    setTopic(safeTopic);
    setConcepts(buildConcepts(safeTopic, [...selectedStyles], weirdness, 12));
    setTimeout(() => document.querySelector('#concepts')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const forge = concept => {
    updateStudio(prev => ({
      ...prev,
      activeStickerId: null,
      layers: {
        ...prev.layers,
        top: { ...prev.layers.top, text: concept.top },
        bottom: { ...prev.layers.bottom, text: concept.bottom }
      }
    }), 'forge-concept');
    setTimeout(() => document.querySelector('#studio')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const updateLayer = (patch, key = 'layer-edit') => updateStudio(prev => ({
    ...prev,
    activeStickerId: null,
    layers: { ...prev.layers, [prev.activeLayer]: { ...prev.layers[prev.activeLayer], ...patch } }
  }), `${key}-${studio.activeLayer}`);

  const handleImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSaveStatus('Preparing image…');
      const prepared = await prepareImage(file);
      setBackgroundImage(prepared.image);
      updateStudio(prev => ({ ...prev, background: { dataUrl: prepared.dataUrl, name: file.name, fit: 'cover', zoom: 1, x: 0, y: 0 } }), 'upload-image');
      setSaveStatus('Image ready · stays in this browser');
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Image could not be loaded.');
    }
    event.target.value = '';
  };

  const saveNow = () => {
    const result = saveProject(window.localStorage, { topic, selectedStyles: [...selectedStyles], weirdness, concepts, studio });
    setSaveStatus(result.ok ? 'Saved locally' : `Save failed: ${result.error}`);
  };

  const loadSaved = () => {
    const project = loadProject(window.localStorage);
    if (!project) { setSaveStatus('No saved project found'); return; }
    setTopic(project.topic || '');
    setSelectedStyles(new Set(project.selectedStyles?.length ? project.selectedStyles : DEFAULT_STYLES));
    setWeirdness(clamp(finite(project.weirdness, 7), 1, 10));
    setConcepts(Array.isArray(project.concepts) ? project.concepts : []);
    replaceStudio(normalizeStudio(project.studio), { clearHistory: true });
    setSaveStatus('Saved project loaded');
  };

  const newProject = () => {
    clearProject(window.localStorage);
    setTopic('');
    setSelectedStyles(new Set(DEFAULT_STYLES));
    setWeirdness(7);
    setConcepts([]);
    replaceStudio(defaultStudio(), { clearHistory: true });
    setBackgroundImage(null);
    setSaveStatus('New project');
  };

  const applyTemplate = template => {
    updateStudio(prev => applyTemplateToStudio(prev, template), `template-${template.id}`);
    setTemplateStatus(`Applied “${template.name}”. Caption and image preserved.`);
    setTimeout(() => document.querySelector('#studio')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const toggleFavorite = id => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFavorites(next);
    saveTemplateFavorites(window.localStorage, next);
  };

  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) { setTemplateStatus('Give the template a name first.'); return; }
    const template = createTemplateFromStudio(name, studio);
    if (!template) return;
    const merged = mergeUserTemplates(userTemplates, [template]);
    setUserTemplates(merged);
    saveUserTemplates(window.localStorage, merged);
    setTemplateName('');
    setTemplateFilter('mine');
    setTemplateStatus(`Saved “${name}” locally. Caption and image were excluded.`);
  };

  const deleteTemplate = id => {
    const next = userTemplates.filter(template => template.id !== id);
    setUserTemplates(next);
    saveUserTemplates(window.localStorage, next);
    const fav = new Set(favorites);
    fav.delete(id);
    setFavorites(fav);
    saveTemplateFavorites(window.localStorage, fav);
  };

  const exportTemplates = () => {
    if (!userTemplates.length) { setTemplateStatus('No custom templates to export yet.'); return; }
    const blob = new Blob([encodeTemplatePack(userTemplates)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memeforge-template-pack-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importTemplates = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const incoming = decodeTemplatePack(await file.text());
    if (!incoming.length) { setTemplateStatus('No compatible templates found in that file.'); event.target.value = ''; return; }
    const merged = mergeUserTemplates(userTemplates, incoming);
    setUserTemplates(merged);
    saveUserTemplates(window.localStorage, merged);
    setTemplateFilter('mine');
    setTemplateStatus(`Imported ${incoming.length} template${incoming.length === 1 ? '' : 's'}.`);
    event.target.value = '';
  };

  const captureCheckpoint = label => {
    const snapshot = createRemixSnapshot({ topic, selectedStyles: [...selectedStyles], weirdness, studio, label });
    const result = addRemixSnapshot(window.localStorage, snapshot);
    if (result.ok) setRemixHistory(result.items);
    else setSaveStatus(`Checkpoint failed: ${result.error}`);
    return snapshot;
  };

  const duplicateProject = () => {
    captureCheckpoint('Duplicate checkpoint');
    setSaveStatus('Duplicated current look to remix history · edit freely');
  };

  const remixNow = () => {
    const safeTopic = topic.trim() || DEMO_TRENDS[0].topic;
    if (!topic.trim()) setTopic(safeTopic);
    captureCheckpoint('Before remix');
    const board = concepts.length ? concepts : buildConcepts(safeTopic, [...selectedStyles], weirdness, 12);
    if (!concepts.length) setConcepts(board);
    const currentIndex = board.findIndex(item => item.top === studio.layers.top.text && item.bottom === studio.layers.bottom.text);
    remixNonce.current += 1;
    const nextIndex = (Math.max(currentIndex, -1) + remixNonce.current) % board.length;
    const concept = board[nextIndex];
    const template = BUILTIN_TEMPLATES[(nextIndex + remixNonce.current) % BUILTIN_TEMPLATES.length];
    updateStudio(prev => {
      const templated = applyTemplateToStudio(prev, template);
      return {
        ...templated,
        activeStickerId: null,
        layers: {
          top: { ...templated.layers.top, text: concept.top },
          bottom: { ...templated.layers.bottom, text: concept.bottom }
        }
      };
    }, 'one-click-remix');
    setSaveStatus(`Remixed with ${template.name} · image preserved`);
  };

  const restoreCheckpoint = snapshot => {
    const restored = normalizeStudio(restoreSnapshotStudio(studio, snapshot.studio));
    updateStudio(restored, `restore-${snapshot.id}`);
    setSaveStatus(`Restored checkpoint · ${snapshot.label}`);
  };

  const clearCheckpoints = () => {
    clearRemixHistoryStorage(window.localStorage);
    setRemixHistory([]);
    setSaveStatus('Remix history cleared');
  };

  const addSticker = glyph => {
    if (studio.stickers.length >= 12) { setSaveStatus('Sticker limit reached · remove one first'); return; }
    const id = `sticker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    updateStudio(prev => ({
      ...prev,
      activeStickerId: id,
      stickers: [...prev.stickers, { id, glyph, x: .5, y: .5, size: 120, rotation: 0, opacity: 1 }]
    }), 'add-sticker');
  };

  const updateSticker = (patch, key = 'sticker-edit') => {
    const id = studio.activeStickerId;
    if (!id) return;
    updateStudio(prev => ({
      ...prev,
      stickers: prev.stickers.map(sticker => sticker.id === id ? { ...sticker, ...patch } : sticker)
    }), `${key}-${id}`);
  };

  const removeSticker = () => {
    const id = studio.activeStickerId;
    if (!id) return;
    updateStudio(prev => ({ ...prev, activeStickerId: null, stickers: prev.stickers.filter(sticker => sticker.id !== id) }), 'remove-sticker');
  };

  const duplicateSticker = () => {
    if (!activeSticker || studio.stickers.length >= 12) return;
    const id = `sticker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    updateStudio(prev => ({
      ...prev,
      activeStickerId: id,
      stickers: [...prev.stickers, { ...activeSticker, id, x: clamp(activeSticker.x + .06, .03, .97), y: clamp(activeSticker.y + .06, .03, .97) }]
    }), 'duplicate-sticker');
  };

  return <>
    <div className="noise" aria-hidden="true" />
    <Header />
    <main id="top">
      <section className="hero shell">
        <div><p className="eyebrow">MEME INTELLIGENCE // REACT V0.4 REMIX TOOLS</p><h1>Idea to meme in a minute. Remix it in seconds.</h1><p className="lede">Generate an angle, drop in your image, choose a look, then remix without turning MemeForge into Photoshop. Undo, aspect ratios, stickers, checkpoints, and one-click remix all stay local in your browser.</p><div className="hero-actions"><a className="button primary" href="#forge">Start forging</a><a className="button ghost" href="#studio">Quick remix</a></div></div>
        <aside className="signal-card"><div className="signal-topline"><span className="status-dot" /> V0.4 ONLINE</div><dl><div><dt>Remix</dt><dd>One click</dd></div><div><dt>Undo / redo</dt><dd>Local</dd></div><div><dt>Formats</dt><dd>4 presets</dd></div><div><dt>Backend</dt><dd>None</dd></div></dl></aside>
      </section>

      <section className="section shell" id="forge">
        <div className="section-heading"><div><p className="eyebrow">01 // SIGNAL INPUT</p><h2>What are we memeing?</h2></div><p className="section-note">Trend cards remain demo prompts until V1 Trend Radar. No fake live data.</p></div>
        <div className="trend-strip">{DEMO_TRENDS.map(item => <button className="trend-chip" key={item.topic} onClick={() => setTopic(item.topic)}><small>{item.label}</small><strong>{item.topic}</strong></button>)}</div>
        <div className="forge-panel panel">
          <label className="field"><span>Topic or cultural signal</span><input value={topic} onChange={event => setTopic(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') generate(); }} placeholder="e.g. AI agents becoming coworkers" /></label>
          <div className="field"><span>Humor profiles</span><div className="style-grid">{STYLE_PRESETS.map(style => <button key={style.id} className={`style-button ${selectedStyles.has(style.id) ? 'active' : ''}`} onClick={() => toggleStyle(style.id)}>{style.label}</button>)}</div></div>
          <label className="field"><span>Weirdness {weirdness}/10</span><input type="range" min="1" max="10" value={weirdness} onChange={event => setWeirdness(Number(event.target.value))} /></label>
          <div className="forge-action-row"><button className="button primary big" onClick={generate}>Generate 12 concepts</button><div className="score-box"><span>Meme potential</span><strong>{score ? `${score.total}/100` : '—'}</strong></div></div>
        </div>
      </section>

      {concepts.length > 0 && <section className="section shell" id="concepts">
        <div className="section-heading"><div><p className="eyebrow">02 // ANGLE ENGINE</p><h2>Pick a survivor.</h2></div><button className="button ghost" onClick={generate}>Regenerate</button></div>
        <div className="concept-grid">{concepts.map(concept => <article className="concept-card" key={concept.key}><div><div className="concept-meta"><span>#{concept.rank}</span><span>{concept.style}</span></div><h3>{concept.caption}</h3><p>{concept.note}</p></div><button className="button primary small" onClick={() => forge(concept)}>Forge this one</button></article>)}</div>
      </section>}

      <section className="section shell" id="templates">
        <div className="section-heading"><div><p className="eyebrow">03 // TEMPLATE LIBRARY</p><h2>Reuse the look, not the joke.</h2></div><p className="section-note">Templates preserve layout and styling. Your caption and uploaded image remain yours.</p></div>
        <div className="template-toolbar panel">
          <label className="field"><span>Search</span><input value={templateSearch} onChange={event => setTemplateSearch(event.target.value)} placeholder="Search templates…" /></label>
          <label className="field"><span>Show</span><select value={templateFilter} onChange={event => setTemplateFilter(event.target.value)}><option value="all">All</option><option value="favorites">Favorites</option><option value="builtin">Built-in</option><option value="mine">Mine</option></select></label>
          <label className="field"><span>Save current look</span><input value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="My chaos poster" /></label>
          <div className="toolbar-actions"><button className="button primary" onClick={saveTemplate}>Save template</button><button className="button ghost" onClick={exportTemplates}>Export mine</button><label className="button ghost upload-label">Import pack<input type="file" accept="application/json,.json" hidden onChange={importTemplates} /></label></div>
          <p className="template-status">{templateStatus}</p>
        </div>
        <div className="template-grid">{visibleTemplates.map(template => <TemplateCard key={template.id} template={template} favorite={favorites.has(template.id)} onFavorite={() => toggleFavorite(template.id)} onApply={() => applyTemplate(template)} onDelete={template.source === 'user' ? () => deleteTemplate(template.id) : null} />)}</div>
      </section>

      <section className="section shell" id="studio">
        <div className="section-heading"><div><p className="eyebrow">04 // V0.4 REMIX STUDIO</p><h2>Keep the speed. Add options.</h2></div><p className="section-note">Remix swaps in another concept and built-in look while preserving your uploaded image. Undo gets you straight back.</p></div>

        <div className="quick-remix panel">
          <div className="quick-actions"><button className="button primary remix-button" onClick={remixNow}>↻ One-click Remix</button><button className="button ghost" onClick={duplicateProject}>Duplicate checkpoint</button><button className="button ghost" disabled={!canUndo} onClick={() => { if (undo()) setSaveStatus('Undid edit'); }}>↶ Undo</button><button className="button ghost" disabled={!canRedo} onClick={() => { if (redo()) setSaveStatus('Redid edit'); }}>↷ Redo</button></div>
          <div className="format-group"><span>Export shape</span><div className="format-pills">{Object.values(CANVAS_FORMATS).map(format => <button key={format.id} className={`format-pill ${studio.format === format.id ? 'active' : ''}`} onClick={() => updateStudio(prev => ({ ...prev, format: format.id }), 'canvas-format')}><strong>{format.label}</strong><small>{format.ratio}</small></button>)}</div></div>
        </div>

        <div className="studio-grid">
          <div className="canvas-stack">
            <CanvasStudio studio={studio} updateStudio={updateStudio} backgroundImage={backgroundImage} topic={topic} />
            <RemixHistory items={remixHistory} onRestore={restoreCheckpoint} onClear={clearCheckpoints} />
          </div>

          <div className="editor panel">
            <div className="project-row"><span>{saveStatus}</span><div><button className="button ghost small" onClick={saveNow}>Save</button><button className="button ghost small" onClick={loadSaved}>Load</button><button className="button ghost small" onClick={newProject}>New</button></div></div>

            <section className="editor-group">
              <div className="group-heading"><strong>Background</strong><span>{studio.background.name || 'Original treatment'}</span></div>
              <div className="editor-actions"><label className="button ghost upload-label">Upload image<input type="file" accept="image/*" hidden onChange={handleImage} /></label><button className="button ghost" disabled={!studio.background.dataUrl} onClick={() => { setBackgroundImage(null); updateStudio(prev => ({ ...prev, background: { ...prev.background, dataUrl: '', name: '', zoom: 1, x: 0, y: 0 } }), 'remove-image'); }}>Remove image</button></div>
              <label className="field"><span>Visual treatment</span><select value={studio.visualTheme} onChange={event => updateStudio(prev => ({ ...prev, visualTheme: event.target.value }), 'visual-theme')}>{THEMES.map(theme => <option key={theme} value={theme}>{theme}</option>)}</select></label>
              <div className="control-grid"><label className="field"><span>Image fit</span><select value={studio.background.fit} onChange={event => updateStudio(prev => ({ ...prev, background: { ...prev.background, fit: event.target.value } }), 'image-fit')}><option value="cover">Cover</option><option value="contain">Contain</option></select></label><label className="field"><span>Zoom {Math.round(studio.background.zoom * 100)}%</span><input type="range" min="50" max="300" value={Math.round(studio.background.zoom * 100)} onChange={event => updateStudio(prev => ({ ...prev, background: { ...prev.background, zoom: Number(event.target.value) / 100 } }), 'image-zoom')} /></label><label className="field"><span>Pan X {studio.background.x}</span><input type="range" min="-100" max="100" value={studio.background.x} onChange={event => updateStudio(prev => ({ ...prev, background: { ...prev.background, x: Number(event.target.value) } }), 'image-pan-x')} /></label><label className="field"><span>Pan Y {studio.background.y}</span><input type="range" min="-100" max="100" value={studio.background.y} onChange={event => updateStudio(prev => ({ ...prev, background: { ...prev.background, y: Number(event.target.value) } }), 'image-pan-y')} /></label></div>
            </section>

            <section className="editor-group">
              <div className="group-heading"><strong>Copy</strong><span>Instant render</span></div>
              <label className="field"><span>Top text</span><textarea rows="3" value={studio.layers.top.text} onChange={event => updateStudio(prev => ({ ...prev, activeStickerId: null, layers: { ...prev.layers, top: { ...prev.layers.top, text: event.target.value } } }), 'text-top')} /></label>
              <label className="field"><span>Bottom text</span><textarea rows="3" value={studio.layers.bottom.text} onChange={event => updateStudio(prev => ({ ...prev, activeStickerId: null, layers: { ...prev.layers, bottom: { ...prev.layers.bottom, text: event.target.value } } }), 'text-bottom')} /></label>
            </section>

            <section className="editor-group">
              <div className="group-heading"><strong>Text layer</strong><span>{studio.activeLayer}</span></div>
              <label className="field"><span>Editing layer</span><select value={studio.activeLayer} onChange={event => updateStudio(prev => ({ ...prev, activeLayer: event.target.value, activeStickerId: null }), 'select-layer', { record: false })}><option value="top">Top</option><option value="bottom">Bottom</option></select></label>
              <div className="control-grid"><label className="field"><span>Font</span><select value={activeLayer.font} onChange={event => updateLayer({ font: event.target.value }, 'font')} >{FONT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>Alignment</span><select value={activeLayer.align} onChange={event => updateLayer({ align: event.target.value }, 'align')}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label className="field"><span>Size {activeLayer.size}px</span><input type="range" min="28" max="140" value={activeLayer.size} onChange={event => updateLayer({ size: Number(event.target.value) }, 'font-size')} /></label><label className="field"><span>Color</span><input type="color" value={activeLayer.color} onChange={event => updateLayer({ color: event.target.value }, 'font-color')} /></label><label className="field"><span>X {Math.round(activeLayer.x * 100)}%</span><input type="range" min="5" max="95" value={Math.round(activeLayer.x * 100)} onChange={event => updateLayer({ x: Number(event.target.value) / 100 }, 'text-x')} /></label><label className="field"><span>Y {Math.round(activeLayer.y * 100)}%</span><input type="range" min="5" max="95" value={Math.round(activeLayer.y * 100)} onChange={event => updateLayer({ y: Number(event.target.value) / 100 }, 'text-y')} /></label></div>
              <div className="toggle-row"><label><input type="checkbox" checked={activeLayer.outline} onChange={event => updateLayer({ outline: event.target.checked }, 'outline')} /> Outline</label><label><input type="checkbox" checked={activeLayer.shadow} onChange={event => updateLayer({ shadow: event.target.checked }, 'shadow')} /> Shadow</label><label><input type="checkbox" checked={studio.watermark} onChange={event => updateStudio(prev => ({ ...prev, watermark: event.target.checked }), 'watermark')} /> Watermark</label></div>
            </section>

            <section className="editor-group sticker-group">
              <div className="group-heading"><strong>Stickers & shapes</strong><span>{studio.stickers.length}/12 · drag on canvas</span></div>
              <div className="sticker-palette">{STICKER_CHOICES.map(item => <button key={item.glyph} className="sticker-add" onClick={() => addSticker(item.glyph)} title={`Add ${item.label}`} aria-label={`Add ${item.label}`}>{item.glyph}</button>)}</div>
              {studio.stickers.length > 0 && <label className="field"><span>Selected sticker</span><select value={studio.activeStickerId || ''} onChange={event => updateStudio(prev => ({ ...prev, activeStickerId: event.target.value || null }), 'select-sticker-ui', { record: false })}><option value="">Choose sticker…</option>{studio.stickers.map((sticker, index) => <option key={sticker.id} value={sticker.id}>{index + 1}. {sticker.glyph}</option>)}</select></label>}
              {activeSticker && <><div className="control-grid"><label className="field"><span>Size {activeSticker.size}px</span><input type="range" min="40" max="360" value={activeSticker.size} onChange={event => updateSticker({ size: Number(event.target.value) }, 'sticker-size')} /></label><label className="field"><span>Rotation {activeSticker.rotation}°</span><input type="range" min="-180" max="180" value={activeSticker.rotation} onChange={event => updateSticker({ rotation: Number(event.target.value) }, 'sticker-rotation')} /></label><label className="field"><span>X {Math.round(activeSticker.x * 100)}%</span><input type="range" min="3" max="97" value={Math.round(activeSticker.x * 100)} onChange={event => updateSticker({ x: Number(event.target.value) / 100 }, 'sticker-x')} /></label><label className="field"><span>Y {Math.round(activeSticker.y * 100)}%</span><input type="range" min="3" max="97" value={Math.round(activeSticker.y * 100)} onChange={event => updateSticker({ y: Number(event.target.value) / 100 }, 'sticker-y')} /></label><label className="field"><span>Opacity {Math.round(activeSticker.opacity * 100)}%</span><input type="range" min="20" max="100" value={Math.round(activeSticker.opacity * 100)} onChange={event => updateSticker({ opacity: Number(event.target.value) / 100 }, 'sticker-opacity')} /></label></div><div className="editor-actions"><button className="button ghost small" onClick={duplicateSticker}>Duplicate sticker</button><button className="button ghost small danger" onClick={removeSticker}>Remove sticker</button></div></>}
            </section>
          </div>
        </div>
      </section>
    </main>
    <footer className="site-footer shell"><p>MemeForge React V0.4 · GitHub Pages</p><p>Fast remixing, local images, no backend.</p></footer>
  </>;
}
