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
import { DEFAULT_FONT, defaultStudio, drawMeme, loadImage, prepareImage } from './canvas.js';

const DEFAULT_STYLES = ['absurd', 'nerdy', 'surreal'];
const THEMES = ['signal', 'void', 'paper', 'warning', 'terminal'];
const FONT_OPTIONS = [
  [DEFAULT_FONT, 'Impact'],
  ["'Arial Black', Arial, sans-serif", 'Arial Black'],
  ['Inter, Arial, sans-serif', 'Inter'],
  ['Georgia, serif', 'Georgia'],
  ["'Courier New', monospace", 'Courier New']
];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function normalizeStudio(source) {
  const fallback = defaultStudio();
  if (!source || typeof source !== 'object') return fallback;
  const normalizeLayer = (layer, base) => ({
    ...base,
    ...(layer && typeof layer === 'object' ? layer : {}),
    x: clamp(Number(layer?.x ?? base.x), .05, .95),
    y: clamp(Number(layer?.y ?? base.y), .05, .95),
    size: clamp(Number(layer?.size ?? base.size), 28, 140),
    color: /^#[0-9a-f]{6}$/i.test(layer?.color || '') ? layer.color : base.color,
    align: ['left','center','right'].includes(layer?.align) ? layer.align : base.align,
    outline: layer?.outline !== false,
    shadow: layer?.shadow === true
  });
  return {
    visualTheme: THEMES.includes(source.visualTheme) ? source.visualTheme : fallback.visualTheme,
    watermark: source.watermark !== false,
    activeLayer: source.activeLayer === 'bottom' ? 'bottom' : 'top',
    background: {
      ...fallback.background,
      ...(source.background && typeof source.background === 'object' ? source.background : {}),
      fit: source.background?.fit === 'contain' ? 'contain' : 'cover',
      zoom: clamp(Number(source.background?.zoom ?? 1), .5, 3),
      x: clamp(Number(source.background?.x ?? 0), -100, 100),
      y: clamp(Number(source.background?.y ?? 0), -100, 100)
    },
    layers: {
      top: normalizeLayer(source.layers?.top, fallback.layers.top),
      bottom: normalizeLayer(source.layers?.bottom, fallback.layers.bottom)
    }
  };
}

function Header() {
  return <header className="site-header shell">
    <a className="brand" href="#top"><span className="brand-mark">MF</span><span><strong>MemeForge</strong><small>React / GitHub Pages</small></span></a>
    <nav className="header-actions"><a href="#forge">Forge</a><a href="#templates">Templates</a><a href="#studio">Studio</a><a href="https://github.com/MichaelWave369/MemeForge" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
  </header>;
}

function CanvasStudio({ studio, setStudio, backgroundImage }) {
  const canvasRef = useRef(null);
  const boundsRef = useRef({ top: null, bottom: null });
  const dragRef = useRef(null);

  useEffect(() => {
    boundsRef.current = drawMeme(canvasRef.current, studio, backgroundImage);
  }, [studio, backgroundImage]);

  const point = event => {
    const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const contains = (bounds, p) => bounds && p.x >= bounds.left && p.x <= bounds.right && p.y >= bounds.top && p.y <= bounds.bottom;

  const onPointerDown = event => {
    const p = point(event);
    const order = [studio.activeLayer, studio.activeLayer === 'top' ? 'bottom' : 'top'];
    const hit = order.find(name => contains(boundsRef.current[name], p));
    if (!hit) return;
    const layer = studio.layers[hit];
    dragRef.current = { layer: hit, offsetX: p.x - layer.x * canvasRef.current.width, offsetY: p.y - layer.y * canvasRef.current.height };
    setStudio(prev => ({ ...prev, activeLayer: hit }));
    canvasRef.current.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = event => {
    if (!dragRef.current) return;
    const p = point(event); const drag = dragRef.current;
    setStudio(prev => ({ ...prev, layers: { ...prev.layers, [drag.layer]: { ...prev.layers[drag.layer], x: clamp((p.x - drag.offsetX) / canvasRef.current.width, .05, .95), y: clamp((p.y - drag.offsetY) / canvasRef.current.height, .05, .95) } } }));
  };
  const onPointerUp = event => { if (!dragRef.current) return; dragRef.current = null; canvasRef.current.releasePointerCapture?.(event.pointerId); };

  const download = () => {
    const canvas = canvasRef.current; drawMeme(canvas, studio, backgroundImage, { showSelection: false });
    const a = document.createElement('a'); a.download = 'memeforge-react.png'; a.href = canvas.toDataURL('image/png'); a.click();
    boundsRef.current = drawMeme(canvas, studio, backgroundImage);
  };

  return <div className="canvas-column">
    <div className="canvas-wrap panel">
      <canvas ref={canvasRef} width="1080" height="1080" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label="Meme preview canvas" />
      <div className="canvas-hint">Drag either text layer</div>
    </div>
    <button className="button primary wide" onClick={download}>Download PNG</button>
  </div>;
}

function TemplateCard({ template, favorite, onFavorite, onApply, onDelete }) {
  return <article className="template-card panel">
    <div className={`template-preview theme-${template.studio.visualTheme}`}>
      <span style={{ left: `${template.studio.layers.top.x * 100}%`, top: `${template.studio.layers.top.y * 100}%`, color: template.studio.layers.top.color }}>SETUP GOES HERE</span>
      <span style={{ left: `${template.studio.layers.bottom.x * 100}%`, top: `${template.studio.layers.bottom.y * 100}%`, color: template.studio.layers.bottom.color }}>PUNCHLINE</span>
    </div>
    <div className="template-body">
      <div className="template-title"><h3>{template.name}</h3><button className={`favorite ${favorite ? 'active' : ''}`} onClick={onFavorite}>{favorite ? '★' : '☆'}</button></div>
      <p>{template.description || 'Reusable MemeForge layout.'}</p>
      <div className="tag-row">{template.tags?.slice(0,4).map(tag => <span key={tag}>{tag}</span>)}</div>
      <div className="template-actions"><button className="button primary small" onClick={onApply}>Apply</button>{onDelete && <button className="button ghost small" onClick={onDelete}>Delete</button>}</div>
    </div>
  </article>;
}

export default function App() {
  const [topic, setTopic] = useState('');
  const [selectedStyles, setSelectedStyles] = useState(new Set(DEFAULT_STYLES));
  const [weirdness, setWeirdness] = useState(7);
  const [concepts, setConcepts] = useState([]);
  const [studio, setStudio] = useState(defaultStudio());
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [saveStatus, setSaveStatus] = useState('Not saved yet');
  const [userTemplates, setUserTemplates] = useState(() => loadUserTemplates(window.localStorage).map(normalizeTemplate).filter(Boolean));
  const [favorites, setFavorites] = useState(() => loadTemplateFavorites(window.localStorage));
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [templateName, setTemplateName] = useState('');
  const [templateStatus, setTemplateStatus] = useState(`${BUILTIN_TEMPLATES.length} built-in templates ready.`);

  const score = useMemo(() => topic.trim() ? scoreMemePotential(topic.trim(), selectedStyles.size, weirdness) : null, [topic, selectedStyles, weirdness]);
  const activeLayer = studio.layers[studio.activeLayer];
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
    if (!studio.background.dataUrl) { setBackgroundImage(null); return; }
    loadImage(studio.background.dataUrl).then(image => { if (!cancelled) setBackgroundImage(image); }).catch(() => {});
    return () => { cancelled = true; };
  }, [studio.background.dataUrl]);

  const toggleStyle = id => setSelectedStyles(prev => {
    const next = new Set(prev);
    if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id);
    return next;
  });
  const generate = () => {
    const safeTopic = topic.trim() || DEMO_TRENDS[0].topic; setTopic(safeTopic);
    setConcepts(buildConcepts(safeTopic, [...selectedStyles], weirdness, 12));
    setTimeout(() => document.querySelector('#concepts')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };
  const forge = concept => {
    setStudio(prev => ({ ...prev, layers: { ...prev.layers, top: { ...prev.layers.top, text: concept.top }, bottom: { ...prev.layers.bottom, text: concept.bottom } } }));
    setTimeout(() => document.querySelector('#studio')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };
  const updateLayer = patch => setStudio(prev => ({ ...prev, layers: { ...prev.layers, [prev.activeLayer]: { ...prev.layers[prev.activeLayer], ...patch } } }));

  const handleImage = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      setSaveStatus('Preparing image…'); const prepared = await prepareImage(file); setBackgroundImage(prepared.image);
      setStudio(prev => ({ ...prev, background: { dataUrl: prepared.dataUrl, name: file.name, fit: 'cover', zoom: 1, x: 0, y: 0 } }));
      setSaveStatus('Image ready · stays in this browser');
    } catch (error) { setSaveStatus(error.message); }
    event.target.value = '';
  };

  const saveNow = () => {
    const result = saveProject(window.localStorage, { topic, selectedStyles: [...selectedStyles], weirdness, concepts, studio });
    setSaveStatus(result.ok ? 'Saved locally' : `Save failed: ${result.error}`);
  };
  const loadSaved = async () => {
    const project = loadProject(window.localStorage); if (!project) { setSaveStatus('No saved project found'); return; }
    setTopic(project.topic || ''); setSelectedStyles(new Set(project.selectedStyles?.length ? project.selectedStyles : DEFAULT_STYLES)); setWeirdness(Number(project.weirdness || 7)); setConcepts(Array.isArray(project.concepts) ? project.concepts : []); setStudio(normalizeStudio(project.studio)); setSaveStatus('Saved project loaded');
  };
  const newProject = () => { clearProject(window.localStorage); setTopic(''); setSelectedStyles(new Set(DEFAULT_STYLES)); setWeirdness(7); setConcepts([]); setStudio(defaultStudio()); setBackgroundImage(null); setSaveStatus('New project'); };

  const applyTemplate = template => { setStudio(prev => applyTemplateToStudio(prev, template)); setTemplateStatus(`Applied “${template.name}”. Caption and image preserved.`); setTimeout(() => document.querySelector('#studio')?.scrollIntoView({ behavior: 'smooth' }), 0); };
  const toggleFavorite = id => {
    const next = new Set(favorites); if (next.has(id)) next.delete(id); else next.add(id); setFavorites(next); saveTemplateFavorites(window.localStorage, next);
  };
  const saveTemplate = () => {
    const name = templateName.trim(); if (!name) { setTemplateStatus('Give the template a name first.'); return; }
    const template = createTemplateFromStudio(name, studio); if (!template) return;
    const merged = mergeUserTemplates(userTemplates, [template]); setUserTemplates(merged); saveUserTemplates(window.localStorage, merged); setTemplateName(''); setTemplateFilter('mine'); setTemplateStatus(`Saved “${name}” locally. Caption and image were excluded.`);
  };
  const deleteTemplate = id => {
    const next = userTemplates.filter(t => t.id !== id); setUserTemplates(next); saveUserTemplates(window.localStorage, next);
    const fav = new Set(favorites); fav.delete(id); setFavorites(fav); saveTemplateFavorites(window.localStorage, fav);
  };
  const exportTemplates = () => {
    if (!userTemplates.length) { setTemplateStatus('No custom templates to export yet.'); return; }
    const blob = new Blob([encodeTemplatePack(userTemplates)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `memeforge-template-pack-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importTemplates = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    const incoming = decodeTemplatePack(await file.text()); if (!incoming.length) { setTemplateStatus('No compatible templates found in that file.'); return; }
    const merged = mergeUserTemplates(userTemplates, incoming); setUserTemplates(merged); saveUserTemplates(window.localStorage, merged); setTemplateFilter('mine'); setTemplateStatus(`Imported ${incoming.length} template${incoming.length === 1 ? '' : 's'}.`); event.target.value = '';
  };

  return <>
    <div className="noise" aria-hidden="true" />
    <Header />
    <main id="top">
      <section className="hero shell">
        <div><p className="eyebrow">MEME INTELLIGENCE // REACT GITHUB PAGES</p><h1>Trend to meme, now as a React app.</h1><p className="lede">The same local-first MemeForge idea, rebuilt as a React/Vite frontend for GitHub Pages. Generate concepts, use reusable templates, upload your own image, edit the meme, and export locally.</p><div className="hero-actions"><a className="button primary" href="#forge">Start forging</a><a className="button ghost" href="#templates">Templates</a></div></div>
        <aside className="signal-card"><div className="signal-topline"><span className="status-dot" /> REACT ONLINE</div><dl><div><dt>Framework</dt><dd>React + Vite</dd></div><div><dt>Hosting</dt><dd>GitHub Pages</dd></div><div><dt>Images</dt><dd>Browser only</dd></div><div><dt>Backend</dt><dd>None</dd></div></dl></aside>
      </section>

      <section className="section shell" id="forge">
        <div className="section-heading"><div><p className="eyebrow">01 // FORGE</p><h2>What are we memeing?</h2></div><p className="section-note">Demo topics are still labeled demo. Live trend data remains a future adapter.</p></div>
        <div className="trend-strip">{DEMO_TRENDS.map(item => <button key={item.topic} className="trend-chip" onClick={() => setTopic(item.topic)}><small>{item.label}</small><strong>{item.topic}</strong></button>)}</div>
        <div className="forge-panel panel">
          <label className="field"><span>Topic or cultural signal</span><input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} placeholder="e.g. AI agents becoming coworkers" /></label>
          <div className="field"><span>Humor profiles</span><div className="style-grid">{STYLE_PRESETS.map(style => <button key={style.id} className={`style-button ${selectedStyles.has(style.id) ? 'active' : ''}`} onClick={() => toggleStyle(style.id)}>{style.label}</button>)}</div></div>
          <label className="field"><span>Weirdness {weirdness}/10</span><input type="range" min="1" max="10" value={weirdness} onChange={e => setWeirdness(Number(e.target.value))} /></label>
          <div className="forge-action-row"><button className="button primary big" onClick={generate}>Generate 12 concepts</button><div className="score-box"><span>Meme potential</span><strong>{score ? `${score.total}/100` : '—'}</strong></div></div>
        </div>
      </section>

      {!!concepts.length && <section className="section shell" id="concepts"><div className="section-heading"><div><p className="eyebrow">02 // ANGLE ENGINE</p><h2>Concept tournament</h2></div><button className="button ghost" onClick={generate}>Regenerate</button></div><div className="concept-grid">{concepts.map(concept => <article className="concept-card" key={concept.key}><div><div className="concept-meta"><span>#{concept.rank}</span><span>{concept.style}</span></div><h3>{concept.caption}</h3><p>{concept.note}</p></div><button className="button primary small" onClick={() => forge(concept)}>Forge this one</button></article>)}</div></section>}

      <section className="section shell" id="templates">
        <div className="section-heading"><div><p className="eyebrow">03 // TEMPLATE LIBRARY</p><h2>Reuse the look, not the joke.</h2></div><p className="section-note">Templates preserve layout and styling while leaving your caption and uploaded image untouched.</p></div>
        <div className="template-toolbar panel">
          <label className="field"><span>Search</span><input value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} placeholder="Search templates…" /></label>
          <label className="field"><span>Show</span><select value={templateFilter} onChange={e => setTemplateFilter(e.target.value)}><option value="all">All</option><option value="favorites">Favorites</option><option value="builtin">Built-in</option><option value="mine">Mine</option></select></label>
          <label className="field"><span>Save current look</span><input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="My chaos poster" /></label>
          <div className="toolbar-actions"><button className="button primary" onClick={saveTemplate}>Save template</button><button className="button ghost" onClick={exportTemplates}>Export mine</button><label className="button ghost upload-label">Import pack<input type="file" accept="application/json,.json" hidden onChange={importTemplates} /></label></div>
          <p className="template-status">{templateStatus}</p>
        </div>
        <div className="template-grid">{visibleTemplates.map(template => <TemplateCard key={template.id} template={template} favorite={favorites.has(template.id)} onFavorite={() => toggleFavorite(template.id)} onApply={() => applyTemplate(template)} onDelete={template.source === 'user' ? () => deleteTemplate(template.id) : null} />)}</div>
      </section>

      <section className="section shell" id="studio">
        <div className="section-heading"><div><p className="eyebrow">04 // REACT STUDIO</p><h2>Edit the survivor.</h2></div><p className="section-note">Drag text directly on the Canvas. Uploaded images and project state stay in your browser.</p></div>
        <div className="studio-grid">
          <CanvasStudio studio={studio} setStudio={setStudio} backgroundImage={backgroundImage} />
          <div className="editor panel">
            <div className="project-row"><span>{saveStatus}</span><div><button className="button ghost small" onClick={saveNow}>Save</button><button className="button ghost small" onClick={loadSaved}>Load</button><button className="button ghost small" onClick={newProject}>New</button></div></div>
            <section className="editor-group"><div className="group-heading"><strong>Background</strong><span>{studio.background.name || 'Original treatment'}</span></div><div className="editor-actions"><label className="button ghost upload-label">Upload image<input type="file" accept="image/*" hidden onChange={handleImage} /></label><button className="button ghost" disabled={!studio.background.dataUrl} onClick={() => { setBackgroundImage(null); setStudio(prev => ({ ...prev, background: { ...prev.background, dataUrl: '', name: '', zoom: 1, x: 0, y: 0 } })); }}>Remove image</button></div>
              <label className="field"><span>Visual treatment</span><select value={studio.visualTheme} onChange={e => setStudio(prev => ({ ...prev, visualTheme: e.target.value }))}>{THEMES.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
              <div className="control-grid"><label className="field"><span>Image fit</span><select value={studio.background.fit} onChange={e => setStudio(prev => ({ ...prev, background: { ...prev.background, fit: e.target.value } }))}><option value="cover">Cover</option><option value="contain">Contain</option></select></label><label className="field"><span>Zoom {Math.round(studio.background.zoom * 100)}%</span><input type="range" min="50" max="300" value={Math.round(studio.background.zoom * 100)} onChange={e => setStudio(prev => ({ ...prev, background: { ...prev.background, zoom: Number(e.target.value) / 100 } }))} /></label><label className="field"><span>Pan X {studio.background.x}</span><input type="range" min="-100" max="100" value={studio.background.x} onChange={e => setStudio(prev => ({ ...prev, background: { ...prev.background, x: Number(e.target.value) } }))} /></label><label className="field"><span>Pan Y {studio.background.y}</span><input type="range" min="-100" max="100" value={studio.background.y} onChange={e => setStudio(prev => ({ ...prev, background: { ...prev.background, y: Number(e.target.value) } }))} /></label></div>
            </section>
            <section className="editor-group"><div className="group-heading"><strong>Copy</strong><span>Instant render</span></div><label className="field"><span>Top text</span><textarea rows="3" value={studio.layers.top.text} onChange={e => setStudio(prev => ({ ...prev, layers: { ...prev.layers, top: { ...prev.layers.top, text: e.target.value } } }))} /></label><label className="field"><span>Bottom text</span><textarea rows="3" value={studio.layers.bottom.text} onChange={e => setStudio(prev => ({ ...prev, layers: { ...prev.layers, bottom: { ...prev.layers.bottom, text: e.target.value } } }))} /></label></section>
            <section className="editor-group"><div className="group-heading"><strong>Text layer</strong><span>{studio.activeLayer}</span></div><label className="field"><span>Editing layer</span><select value={studio.activeLayer} onChange={e => setStudio(prev => ({ ...prev, activeLayer: e.target.value }))}><option value="top">Top</option><option value="bottom">Bottom</option></select></label><div className="control-grid"><label className="field"><span>Font</span><select value={activeLayer.font} onChange={e => updateLayer({ font: e.target.value })}>{FONT_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>Alignment</span><select value={activeLayer.align} onChange={e => updateLayer({ align: e.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label className="field"><span>Size {activeLayer.size}px</span><input type="range" min="28" max="140" value={activeLayer.size} onChange={e => updateLayer({ size: Number(e.target.value) })} /></label><label className="field"><span>Color</span><input type="color" value={activeLayer.color} onChange={e => updateLayer({ color: e.target.value })} /></label><label className="field"><span>X {Math.round(activeLayer.x * 100)}%</span><input type="range" min="5" max="95" value={Math.round(activeLayer.x * 100)} onChange={e => updateLayer({ x: Number(e.target.value) / 100 })} /></label><label className="field"><span>Y {Math.round(activeLayer.y * 100)}%</span><input type="range" min="5" max="95" value={Math.round(activeLayer.y * 100)} onChange={e => updateLayer({ y: Number(e.target.value) / 100 })} /></label></div><div className="toggle-row"><label><input type="checkbox" checked={activeLayer.outline} onChange={e => updateLayer({ outline: e.target.checked })} /> Outline</label><label><input type="checkbox" checked={activeLayer.shadow} onChange={e => updateLayer({ shadow: e.target.checked })} /> Shadow</label><label><input type="checkbox" checked={studio.watermark} onChange={e => setStudio(prev => ({ ...prev, watermark: e.target.checked }))} /> Watermark</label></div></section>
          </div>
        </div>
      </section>
    </main>
    <footer className="site-footer shell"><p>MemeForge React · GitHub Pages build</p><p>Local images stay local. Demo trends stay demo.</p></footer>
  </>;
}
