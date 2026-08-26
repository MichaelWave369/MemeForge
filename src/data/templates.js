const IMPACT = "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const ARIAL_BLACK = "'Arial Black', Arial, sans-serif";
const INTER = "Inter, Arial, sans-serif";
const GEORGIA = "Georgia, serif";
const COURIER = "'Courier New', monospace";

export const BUILTIN_TEMPLATES = [
  {
    id: 'builtin-classic-impact',
    name: 'Classic Impact',
    description: 'Big centered copy with the familiar high-contrast meme silhouette.',
    tags: ['classic', 'bold', 'centered'],
    source: 'builtin',
    studio: {
      visualTheme: 'void',
      watermark: true,
      background: { fit: 'cover', zoom: 1, x: 0, y: 0 },
      layers: {
        top: { x: 0.5, y: 0.18, size: 92, font: IMPACT, color: '#ffffff', align: 'center', outline: true, shadow: false },
        bottom: { x: 0.5, y: 0.82, size: 92, font: IMPACT, color: '#ffffff', align: 'center', outline: true, shadow: false }
      }
    }
  },
  {
    id: 'builtin-terminal-dispatch',
    name: 'Terminal Dispatch',
    description: 'Monospace signal-report energy for tech, AI, and internet-brain jokes.',
    tags: ['tech', 'terminal', 'nerdy'],
    source: 'builtin',
    studio: {
      visualTheme: 'terminal',
      watermark: true,
      background: { fit: 'cover', zoom: 1, x: 0, y: 0 },
      layers: {
        top: { x: 0.09, y: 0.20, size: 62, font: COURIER, color: '#a8ff78', align: 'left', outline: false, shadow: true },
        bottom: { x: 0.09, y: 0.77, size: 62, font: COURIER, color: '#ffffff', align: 'left', outline: false, shadow: true }
      }
    }
  },
  {
    id: 'builtin-office-memo',
    name: 'Office Memo',
    description: 'Dry corporate memo layout built for meetings, management, and bureaucracy.',
    tags: ['office', 'corporate', 'deadpan'],
    source: 'builtin',
    studio: {
      visualTheme: 'paper',
      watermark: true,
      background: { fit: 'contain', zoom: 1, x: 0, y: 0 },
      layers: {
        top: { x: 0.08, y: 0.22, size: 62, font: ARIAL_BLACK, color: '#151515', align: 'left', outline: false, shadow: false },
        bottom: { x: 0.08, y: 0.72, size: 54, font: GEORGIA, color: '#262626', align: 'left', outline: false, shadow: false }
      }
    }
  },
  {
    id: 'builtin-warning-signal',
    name: 'Warning Signal',
    description: 'Orange hazard-poster treatment for maximum “this has escalated” energy.',
    tags: ['warning', 'loud', 'absurd'],
    source: 'builtin',
    studio: {
      visualTheme: 'warning',
      watermark: true,
      background: { fit: 'cover', zoom: 1, x: 0, y: 0 },
      layers: {
        top: { x: 0.5, y: 0.24, size: 88, font: ARIAL_BLACK, color: '#111111', align: 'center', outline: false, shadow: false },
        bottom: { x: 0.5, y: 0.74, size: 78, font: ARIAL_BLACK, color: '#ffffff', align: 'center', outline: true, shadow: false }
      }
    }
  },
  {
    id: 'builtin-signal-grid',
    name: 'Signal Grid',
    description: 'The MemeForge house look: structured, futuristic, and slightly unhinged.',
    tags: ['signal', 'futurist', 'house'],
    source: 'builtin',
    studio: {
      visualTheme: 'signal',
      watermark: true,
      background: { fit: 'cover', zoom: 1, x: 0, y: 0 },
      layers: {
        top: { x: 0.5, y: 0.26, size: 76, font: INTER, color: '#ffffff', align: 'center', outline: true, shadow: true },
        bottom: { x: 0.5, y: 0.73, size: 76, font: INTER, color: '#5ee7f0', align: 'center', outline: true, shadow: true }
      }
    }
  },
  {
    id: 'builtin-editorial-left',
    name: 'Editorial Left',
    description: 'Clean asymmetric headline treatment for smarter, less template-looking memes.',
    tags: ['editorial', 'clean', 'highbrow'],
    source: 'builtin',
    studio: {
      visualTheme: 'void',
      watermark: true,
      background: { fit: 'cover', zoom: 1.05, x: 10, y: 0 },
      layers: {
        top: { x: 0.08, y: 0.26, size: 64, font: GEORGIA, color: '#ffffff', align: 'left', outline: false, shadow: true },
        bottom: { x: 0.08, y: 0.69, size: 52, font: INTER, color: '#ffb347', align: 'left', outline: false, shadow: true }
      }
    }
  },
  {
    id: 'builtin-deadpan-center',
    name: 'Deadpan Center',
    description: 'Minimal centered layout that lets understatement carry the joke.',
    tags: ['deadpan', 'minimal', 'centered'],
    source: 'builtin',
    studio: {
      visualTheme: 'void',
      watermark: false,
      background: { fit: 'cover', zoom: 1, x: 0, y: 0 },
      layers: {
        top: { x: 0.5, y: 0.42, size: 58, font: INTER, color: '#ffffff', align: 'center', outline: false, shadow: true },
        bottom: { x: 0.5, y: 0.58, size: 42, font: INTER, color: '#a6a8b3', align: 'center', outline: false, shadow: false }
      }
    }
  },
  {
    id: 'builtin-split-punch',
    name: 'Split Punch',
    description: 'Top-left setup and bottom-right punchline for visual tension.',
    tags: ['dynamic', 'split', 'punchline'],
    source: 'builtin',
    studio: {
      visualTheme: 'signal',
      watermark: true,
      background: { fit: 'cover', zoom: 1, x: 0, y: 0 },
      layers: {
        top: { x: 0.08, y: 0.22, size: 66, font: ARIAL_BLACK, color: '#ffffff', align: 'left', outline: true, shadow: false },
        bottom: { x: 0.92, y: 0.78, size: 66, font: ARIAL_BLACK, color: '#ffb347', align: 'right', outline: true, shadow: false }
      }
    }
  }
];
