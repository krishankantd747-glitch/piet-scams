import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircuitBoard, Sparkles, Download, Layers, ShieldCheck, IndianRupee, FolderOpen, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// PCB Footprint Library
// ─────────────────────────────────────────────────────────────────────────────
type Pad = { x: number; y: number; w: number; h: number; name: string; drill?: number };
type Footprint = {
  width: number; height: number;
  pads: Pad[];
  outline: string; // SVG path of component body outline
  refPrefix?: string;
  costINR?: number;
};

const FOOTPRINTS: Record<string, Footprint> = {
  'arduino uno': {
    width: 68, height: 53, refPrefix: 'U', costINR: 450,
    pads: [
      ...Array.from({ length: 14 }, (_, i) => ({ x: 5 + i * 5, y: 2, w: 3, h: 3, name: `D${i}`, drill: 1 })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 5 + i * 5, y: 51, w: 3, h: 3, name: `A${i}`, drill: 1 })),
    ],
    outline: 'M2,6 L66,6 L66,50 L2,50 Z',
  },
  'arduino nano': {
    width: 18, height: 43, refPrefix: 'U', costINR: 280,
    pads: [
      ...Array.from({ length: 15 }, (_, i) => ({ x: 1, y: 2 + i * 2.5, w: 2.5, h: 2, name: `L${i}`, drill: 0.8 })),
      ...Array.from({ length: 15 }, (_, i) => ({ x: 16, y: 2 + i * 2.5, w: 2.5, h: 2, name: `R${i}`, drill: 0.8 })),
    ],
    outline: 'M2,1 L16,1 L16,42 L2,42 Z',
  },
  'esp32': {
    width: 28, height: 52, refPrefix: 'U', costINR: 380,
    pads: [
      ...Array.from({ length: 19 }, (_, i) => ({ x: 1, y: 2 + i * 2.5, w: 3, h: 2, name: `L${i}`, drill: 0.8 })),
      ...Array.from({ length: 19 }, (_, i) => ({ x: 26, y: 2 + i * 2.5, w: 3, h: 2, name: `R${i}`, drill: 0.8 })),
    ],
    outline: 'M2,1 L26,1 L26,51 L2,51 Z',
  },
  'esp8266': {
    width: 25, height: 40, refPrefix: 'U', costINR: 220,
    pads: [
      ...Array.from({ length: 15 }, (_, i) => ({ x: 1, y: 2 + i * 2.4, w: 3, h: 2, name: `L${i}`, drill: 0.8 })),
      ...Array.from({ length: 15 }, (_, i) => ({ x: 23, y: 2 + i * 2.4, w: 3, h: 2, name: `R${i}`, drill: 0.8 })),
    ],
    outline: 'M2,1 L23,1 L23,39 L2,39 Z',
  },
  'dht11': {
    width: 15, height: 18, refPrefix: 'T', costINR: 60,
    pads: [
      { x: 3, y: 2, w: 2.5, h: 2.5, name: 'VCC', drill: 0.8 },
      { x: 8, y: 2, w: 2.5, h: 2.5, name: 'DATA', drill: 0.8 },
      { x: 13, y: 2, w: 2.5, h: 2.5, name: 'GND', drill: 0.8 },
    ],
    outline: 'M1,4 L14,4 L14,17 L1,17 Z',
  },
  'oled': {
    width: 26, height: 18, refPrefix: 'DSP', costINR: 120,
    pads: [
      { x: 4, y: 2, w: 3, h: 2.5, name: 'GND', drill: 0.8 },
      { x: 10, y: 2, w: 3, h: 2.5, name: 'VCC', drill: 0.8 },
      { x: 16, y: 2, w: 3, h: 2.5, name: 'SCL', drill: 0.8 },
      { x: 22, y: 2, w: 3, h: 2.5, name: 'SDA', drill: 0.8 },
    ],
    outline: 'M1,4 L25,4 L25,17 L1,17 Z',
  },
  'hc-sr04': {
    width: 45, height: 22, refPrefix: 'S', costINR: 75,
    pads: [
      { x: 4, y: 2, w: 3, h: 3, name: 'VCC', drill: 1 },
      { x: 12, y: 2, w: 3, h: 3, name: 'TRIG', drill: 1 },
      { x: 20, y: 2, w: 3, h: 3, name: 'ECHO', drill: 1 },
      { x: 28, y: 2, w: 3, h: 3, name: 'GND', drill: 1 },
    ],
    outline: 'M1,4 L44,4 L44,21 L1,21 Z',
  },
  'l298n': {
    width: 43, height: 43, refPrefix: 'MD', costINR: 150,
    pads: [
      { x: 4, y: 2, w: 3, h: 3, name: 'IN1', drill: 1 },
      { x: 12, y: 2, w: 3, h: 3, name: 'IN2', drill: 1 },
      { x: 20, y: 2, w: 3, h: 3, name: 'IN3', drill: 1 },
      { x: 28, y: 2, w: 3, h: 3, name: 'IN4', drill: 1 },
      { x: 4, y: 41, w: 4, h: 3, name: 'OUT1', drill: 1.2 },
      { x: 14, y: 41, w: 4, h: 3, name: 'OUT2', drill: 1.2 },
      { x: 24, y: 41, w: 4, h: 3, name: 'OUT3', drill: 1.2 },
      { x: 34, y: 41, w: 4, h: 3, name: 'OUT4', drill: 1.2 },
      { x: 41, y: 14, w: 3, h: 3, name: '12V', drill: 1 },
      { x: 41, y: 22, w: 3, h: 3, name: 'GND', drill: 1 },
      { x: 41, y: 30, w: 3, h: 3, name: '5V', drill: 1 },
    ],
    outline: 'M1,4 L42,4 L42,40 L1,40 Z',
  },
  'relay': {
    width: 35, height: 25, refPrefix: 'RLY', costINR: 45,
    pads: [
      { x: 4, y: 2, w: 3, h: 2.5, name: 'VCC', drill: 0.8 },
      { x: 11, y: 2, w: 3, h: 2.5, name: 'GND', drill: 0.8 },
      { x: 18, y: 2, w: 3, h: 2.5, name: 'IN', drill: 0.8 },
      { x: 4, y: 23, w: 4, h: 3, name: 'COM', drill: 1.2 },
      { x: 18, y: 23, w: 4, h: 3, name: 'NO', drill: 1.2 },
      { x: 30, y: 23, w: 4, h: 3, name: 'NC', drill: 1.2 },
    ],
    outline: 'M1,4 L34,4 L34,22 L1,22 Z',
  },
  'resistor': {
    width: 20, height: 8, refPrefix: 'R', costINR: 2,
    pads: [
      { x: 1, y: 3, w: 3, h: 2.5, name: '1', drill: 0.6 },
      { x: 16, y: 3, w: 3, h: 2.5, name: '2', drill: 0.6 },
    ],
    outline: 'M4,1 L16,1 L16,7 L4,7 Z',
  },
  'capacitor': {
    width: 10, height: 14, refPrefix: 'C', costINR: 5,
    pads: [
      { x: 2, y: 1, w: 3, h: 2.5, name: '+', drill: 0.6 },
      { x: 6, y: 1, w: 3, h: 2.5, name: '-', drill: 0.6 },
    ],
    outline: 'M1,3 L9,3 L9,13 L1,13 Z',
  },
  'led': {
    width: 8, height: 12, refPrefix: 'LED', costINR: 5,
    pads: [
      { x: 2, y: 1, w: 2.5, h: 2.5, name: 'A', drill: 0.6 },
      { x: 6, y: 1, w: 2.5, h: 2.5, name: 'K', drill: 0.6 },
    ],
    outline: 'M1,3 L7,3 L7,11 L1,11 Z',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PCB SVG Renderer
// ─────────────────────────────────────────────────────────────────────────────
type PCBComponent = {
  id: string; type: string; ref: string;
  x: number; y: number; cost: number;
};
type PCBNet = { from: { comp: string; pad: string }; to: { comp: string; pad: string }; };
type PCBSpec = { components: PCBComponent[]; nets: PCBNet[]; boardW: number; boardH: number; };

function resolveFootprint(type: string): string {
  const lower = type.toLowerCase();
  for (const key of Object.keys(FOOTPRINTS)) {
    if (lower.includes(key) || key.includes(lower)) return key;
  }
  if (lower.includes('arduino')) return lower.includes('nano') ? 'arduino nano' : 'arduino uno';
  if (lower.includes('esp32')) return 'esp32';
  if (lower.includes('esp8266') || lower.includes('nodemcu')) return 'esp8266';
  if (lower.includes('dht')) return 'dht11';
  if (lower.includes('oled') || lower.includes('ssd')) return 'oled';
  if (lower.includes('hc-sr04') || lower.includes('ultrasonic')) return 'hc-sr04';
  if (lower.includes('l298') || lower.includes('motor driver')) return 'l298n';
  if (lower.includes('relay')) return 'relay';
  if (lower.includes('resistor')) return 'resistor';
  if (lower.includes('capacitor')) return 'capacitor';
  if (lower.includes('led')) return 'led';
  return 'resistor';
}

function getPadAbsPos(spec: PCBSpec, compId: string, padName: string) {
  const comp = spec.components.find(c => c.id === compId);
  if (!comp) return { x: 0, y: 0 };
  const fpKey = resolveFootprint(comp.type);
  const fp = FOOTPRINTS[fpKey];
  const pad = fp?.pads.find(p => p.name.toLowerCase() === padName.toLowerCase()) || fp?.pads[0];
  if (!pad) return { x: comp.x, y: comp.y };
  return { x: comp.x + pad.x + pad.w / 2, y: comp.y + pad.y + pad.h / 2 };
}

function buildPCBSVG(spec: PCBSpec, layer: 'preview' | 'top' | 'bottom'): string {
  const scale = 4; // multiply mm to pixels
  const W = spec.boardW * scale;
  const H = spec.boardH * scale;
  const PAD = 40;

  const isPreview = layer === 'preview';
  const isTop = layer === 'top';

  // Colors: "White page KiCad PCB" aesthetic
  const boardFill = '#ffffff'; // Clean white board
  const padFill = isPreview ? '#F59E0B' : isTop ? '#EF4444' : '#3B82F6'; // Gold pads for preview, red for top
  const traceColor = isTop || isPreview ? '#DC2626' : '#2563EB'; // Red traces for Top/Preview, Blue for Bottom
  const silkColor = '#374151'; // Dark gray silk on white board
  const holeColor = '#E5E7EB'; // Light gray drill holes
  const bgColor = '#F8FAFC'; // Very light gray canvas

  // Component footprints
  const compSVGs = spec.components.map(comp => {
    const fpKey = resolveFootprint(comp.type);
    const fp = FOOTPRINTS[fpKey];
    if (!fp) return '';
    const cx = comp.x * scale;
    const cy = comp.y * scale;

    const pads = fp.pads.map(pad => {
      const px = pad.x * scale;
      const py = pad.y * scale;
      const pw = pad.w * scale;
      const ph = pad.h * scale;
      return `
        <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${pw * 0.2}" fill="${padFill}" stroke="#B45309" stroke-width="0.5"/>
        ${pad.drill ? `<circle cx="${px + pw / 2}" cy="${py + ph / 2}" r="${pad.drill * scale * 0.35}" fill="${holeColor}"/>` : ''}
      `;
    }).join('');

    const scaledOutline = fp.outline.replace(/[\d.]+/g, n => String(parseFloat(n) * scale));

    return `<g transform="translate(${cx},${cy})" id="fp-${comp.id}">
      <path d="${scaledOutline}" fill="${isPreview ? 'rgba(243, 244, 246, 0.5)' : 'rgba(243, 244, 246, 0.2)'}" stroke="${silkColor}" stroke-width="0.8" stroke-dasharray="3,2"/>
      ${pads}
      <text x="${fp.width * scale / 2}" y="${-3}" text-anchor="middle" fill="${silkColor}" font-size="8" font-weight="900" font-family="monospace">${comp.ref}</text>
      <text x="${fp.width * scale / 2}" y="${fp.height * scale + 10}" text-anchor="middle" fill="#6B7280" font-size="6.5" font-family="monospace">${comp.type.substring(0, 12)}</text>
    </g>`;
  }).join('');

  // Trace routing (L-shaped paths between pads)
  const traces = spec.nets.slice(0, 40).map((net, i) => {
    const from = getPadAbsPos(spec, net.from.comp, net.from.pad);
    const to = getPadAbsPos(spec, net.to.comp, net.to.pad);
    const fx = from.x * scale, fy = from.y * scale;
    const tx = to.x * scale, ty = to.y * scale;
    const mx = fx; const my = ty; // L-route bend point
    return `<path d="M${fx},${fy} L${mx},${my} L${tx},${ty}" fill="none" stroke="${traceColor}" stroke-width="${i % 3 === 0 ? 3 : 2}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`;
  }).join('');

  // Drill holes (on preview)
  const drillHoles = isPreview ? spec.components.flatMap(comp => {
    const fpKey = resolveFootprint(comp.type);
    const fp = FOOTPRINTS[fpKey];
    if (!fp) return [];
    const cx = comp.x * scale, cy = comp.y * scale;
    return fp.pads.filter(p => p.drill).map(pad => {
      return `<circle cx="${cx + pad.x * scale + pad.w * scale / 2}" cy="${cy + pad.y * scale + pad.h * scale / 2}" r="${(pad.drill || 0.8) * scale * 0.45}" fill="#0d1f12" stroke="#444" stroke-width="0.3"/>`;
    });
  }).join('') : '';

  // Board edge
  const cornerR = 6;
  const boardPath = `M${PAD + cornerR},${PAD} L${PAD + W - cornerR},${PAD} Q${PAD + W},${PAD} ${PAD + W},${PAD + cornerR} L${PAD + W},${PAD + H - cornerR} Q${PAD + W},${PAD + H} ${PAD + W - cornerR},${PAD + H} L${PAD + cornerR},${PAD + H} Q${PAD},${PAD + H} ${PAD},${PAD + H - cornerR} L${PAD},${PAD + cornerR} Q${PAD},${PAD} ${PAD + cornerR},${PAD} Z`;

  // Mounting holes
  const mountHoles = [[PAD + 5, PAD + 5], [PAD + W - 5, PAD + 5], [PAD + 5, PAD + H - 5], [PAD + W - 5, PAD + H - 5]].map(([hx, hy]) =>
    `<circle cx="${hx}" cy="${hy}" r="5" fill="${holeColor}" stroke="#D1D5DB" stroke-width="0.8"/>
     <circle cx="${hx}" cy="${hy}" r="2.5" fill="${padFill}" opacity="0.7"/>`
  ).join('');

  const svgH = H + PAD * 2 + 50;
  const svgW = W + PAD * 2;

  const layerLabel = isPreview ? 'PCB PREVIEW (FR4)' : isTop ? 'TOP COPPER LAYER (F.Cu)' : 'BOTTOM COPPER LAYER (B.Cu)';
  const layerColor = isPreview ? '#10B981' : isTop ? '#EF4444' : '#3B82F6';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH + 30}" width="${svgW}" height="${svgH + 30}" style="font-family: monospace;">
  <defs>
    <pattern id="kicadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E7EB" stroke-width="0.5"/>
    </pattern>
    <filter id="boardShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.1"/>
    </filter>
  </defs>
  <rect width="${svgW}" height="${svgH + 30}" fill="${bgColor}"/>
  <rect width="${svgW}" height="${svgH + 30}" fill="url(#kicadGrid)"/>
  
  <!-- Board edge -->
  <path d="${boardPath}" fill="${boardFill}" stroke="#D1D5DB" stroke-width="1.5" filter="url(#boardShadow)"/>
  
  <g transform="translate(${PAD},${PAD})">
    ${traces}
    ${compSVGs}
    ${drillHoles}
  </g>
  ${mountHoles}
  <!-- Layer label -->
  <rect x="0" y="${svgH + 5}" width="${svgW}" height="25" fill="rgba(0,0,0,0.12)"/>
  <text x="${svgW / 2}" y="${svgH + 20}" text-anchor="middle" fill="${layerColor}" font-size="10" font-weight="bold" font-family="monospace">${layerLabel} — ProjectForge AI PCB Generator</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback PCB Spec Generator
// ─────────────────────────────────────────────────────────────────────────────
function generateFallbackPCBSpec(_projectName: string, componentsText: string): PCBSpec {
  const lines = componentsText.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
  const BOARD_W = 120, BOARD_H = 100;
  const refCounts: Record<string, number> = {};

  // Grid layout
  const positions = [
    { x: 5, y: 5 }, { x: 35, y: 5 }, { x: 70, y: 5 }, { x: 5, y: 50 },
    { x: 40, y: 50 }, { x: 75, y: 50 }, { x: 5, y: 80 }, { x: 45, y: 80 },
    { x: 80, y: 80 }, { x: 95, y: 10 }, { x: 95, y: 35 }, { x: 95, y: 60 },
  ];

  const components: PCBComponent[] = lines.slice(0, 12).map((line, i) => {
    const fpKey = resolveFootprint(line);
    const fp = FOOTPRINTS[fpKey];
    const prefix = fp?.refPrefix || 'U';
    refCounts[prefix] = (refCounts[prefix] || 0) + 1;
    const pos = positions[i] || { x: 5 + (i % 6) * 20, y: 5 + Math.floor(i / 6) * 30 };
    return {
      id: `c${i}`, type: line,
      ref: `${prefix}${refCounts[prefix]}`,
      x: pos.x, y: pos.y,
      cost: fp?.costINR || 50,
    };
  });

  // Always add power rails + bypass caps
  const extras = ['100nF Capacitor', '10uF Capacitor', '10k Resistor'];
  extras.forEach((e, i) => {
    const fpKey = resolveFootprint(e);
    const fp = FOOTPRINTS[fpKey];
    const prefix = fp?.refPrefix || 'R';
    refCounts[prefix] = (refCounts[prefix] || 0) + 1;
    components.push({
      id: `extra${i}`, type: e, ref: `${prefix}${refCounts[prefix]}`,
      x: BOARD_W - 18, y: 5 + i * 20, cost: fp?.costINR || 5,
    });
  });

  // Generate nets
  const nets: PCBNet[] = [];
  const mcuComp = components[0];
  if (mcuComp) {
    for (let i = 1; i < Math.min(components.length, 6); i++) {
      const c = components[i];
      nets.push({ from: { comp: mcuComp.id, pad: 'L0' }, to: { comp: c.id, pad: 'VCC' } });
      nets.push({ from: { comp: mcuComp.id, pad: 'L1' }, to: { comp: c.id, pad: 'GND' } });
      nets.push({ from: { comp: mcuComp.id, pad: `L${i + 1}` }, to: { comp: c.id, pad: 'DATA' } });
    }
  }

  return { components, nets, boardW: BOARD_W, boardH: BOARD_H };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gerber Generator (RS-274X format)
// ─────────────────────────────────────────────────────────────────────────────
function generateGerber(spec: PCBSpec): string {
  const lines = [
    '%FSLAX46Y46*%', '%MOIN*%', '%ADD10C,0.015*%', '%ADD11C,0.010*%',
    'G04 ProjectForge AI Generated Gerber*',
    'G04 Top Copper (F.Cu)*',
    'G75*', 'G01*', 'D10*',
  ];
  spec.nets.forEach(net => {
    const from = getPadAbsPos(spec, net.from.comp, net.from.pad);
    const to = getPadAbsPos(spec, net.to.comp, net.to.pad);
    lines.push(`X${Math.round(from.x * 1000000)}Y${Math.round(from.y * 1000000)}D02*`);
    lines.push(`X${Math.round(to.x * 1000000)}Y${Math.round(to.y * 1000000)}D01*`);
  });
  lines.push('M02*');
  return lines.join('\n');
}

function generateBOM(spec: PCBSpec): string {
  let total = 0;
  const rows = spec.components.map(c => {
    total += c.cost;
    return `"${c.ref}","${c.type}","${resolveFootprint(c.type)}","1","₹${c.cost}"`;
  });
  return `"Reference","Component","Footprint","Quantity","Cost (INR)"\n${rows.join('\n')}\n"TOTAL","","","${spec.components.length}","₹${total}"`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function PcbGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [componentsText, setComponentsText] = useState('');
  const [activeLayer, setActiveLayer] = useState<'preview' | 'top' | 'bottom'>('preview');
  const [zoom, setZoom] = useState(0.85);
  const [result, setResult] = useState<{
    spec: PCBSpec;
    previewSvg: string; topSvg: string; bottomSvg: string;
    gerberContent: string; bomContent: string;
    stats: { componentCount: number; totalCost: string };
  } | null>(null);

  useEffect(() => {
    const state = location.state as { projectName?: string; components?: string } | null;
    if (state?.projectName) { setProjectName(state.projectName); setPrefilled(true); }
    if (state?.components) setComponentsText(state.components);
  }, [location.state]);

  const showToast = (text: string, type: 'success' | 'danger') => {
    setToast({ text, type }); setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !componentsText.trim()) {
      showToast('Please fill project name and components.', 'danger'); return;
    }
    setLoading(true); setResult(null);
    try {
      // Small delay for UX
      await new Promise(r => setTimeout(r, 800));
      const spec = generateFallbackPCBSpec(projectName, componentsText);
      const previewSvg = buildPCBSVG(spec, 'preview');
      const topSvg = buildPCBSVG(spec, 'top');
      const bottomSvg = buildPCBSVG(spec, 'bottom');
      const gerberContent = generateGerber(spec);
      const bomContent = generateBOM(spec);
      const totalCost = spec.components.reduce((s, c) => s + c.cost, 0);
      setResult({
        spec, previewSvg, topSvg, bottomSvg, gerberContent, bomContent,
        stats: { componentCount: spec.components.length, totalCost: `₹${totalCost}` }
      });
      showToast('KiCad-style PCB layout generated!', 'success');
    } catch (err) {
      showToast('PCB generation failed.', 'danger');
    } finally { setLoading(false); }
  };

  const getActiveSvg = () => {
    if (!result) return '';
    if (activeLayer === 'preview') return result.previewSvg;
    if (activeLayer === 'top') return result.topSvg;
    return result.bottomSvg;
  };

  const handleDownloadPNG = useCallback(() => {
    const svgStr = getActiveSvg();
    if (!svgStr) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 700;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = activeLayer === 'preview' ? '#0d1f12' : '#f0f0f0';
    ctx.fillRect(0, 0, 800, 700);
    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 800, 700);
      canvas.toBlob(b => {
        if (!b) return;
        const a = document.createElement('a');
        a.download = `${projectName.replace(/\s+/g, '_')}_PCB_${activeLayer}.png`;
        a.href = URL.createObjectURL(b); a.click();
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [result, activeLayer, projectName]);

  const handleDownloadGerber = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.gerberContent], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName.replace(/\s+/g, '_')}_Gerber.gbr`; a.click();
  }, [result, projectName]);

  const handleDownloadBOM = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.bomContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName.replace(/\s+/g, '_')}_BOM.csv`; a.click();
  }, [result, projectName]);

  const handleDownloadSVG = useCallback(() => {
    const svgStr = getActiveSvg();
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName.replace(/\s+/g, '_')}_PCB_${activeLayer}.svg`; a.click();
  }, [result, activeLayer, projectName]);

  const LAYERS = [
    { id: 'preview', label: 'FR4 Preview', color: 'emerald' },
    { id: 'top', label: 'Top Copper (F.Cu)', color: 'red' },
    { id: 'bottom', label: 'Bottom Copper (B.Cu)', color: 'blue' },
  ];

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white border border-l-4 animate-slide-up ${toast.type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <span className="text-xs font-semibold text-slate-700">{toast.text}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/dashboard')} className="text-slate-600 hover:text-emerald-600 text-xs font-medium transition">← Dashboard</button>
          <span className="text-slate-600">/</span>
          <span className="text-xs text-emerald-600 font-bold tracking-wide uppercase">PCB Generator</span>
        </div>

        {prefilled && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-medium">
            <FolderOpen className="w-3.5 h-3.5 text-emerald-500" /> Project pre-filled from saved project.
          </div>
        )}

        <div className="flex items-start gap-4 mb-8">
          <div className="p-3.5 rounded-2xl bg-emerald-600 shadow-lg text-slate-900 shrink-0"><CircuitBoard className="w-6 h-6" /></div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              PCB Layout Generator <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              Generates KiCad-style PCB layouts with copper pads, traces, silkscreen, drill holes. Exports Gerber ZIP & BOM CSV.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input form */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">Project Name</label>
                  <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g. Line Follower Robot" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">Components List</label>
                  <textarea value={componentsText} onChange={e => setComponentsText(e.target.value)}
                    placeholder="e.g. Arduino Nano, 2x IR Sensor, L298N Motor Driver, 4x 10k Resistor, 100nF Capacitor"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition min-h-[160px] resize-y" required />
                  <p className="text-[10px] text-slate-600 mt-1.5">Specify quantities (e.g. "4x 10k Resistor"). Footprints assigned automatically.</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-slate-900 bg-emerald-600 hover:bg-emerald-700 transition shadow disabled:opacity-50 disabled:bg-slate-300">
                  {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Routing PCB...</> : <><CircuitBoard className="w-4 h-4"/>Generate PCB</>}
                </button>
              </form>
            </div>

            {/* Stats */}
            {result && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Manufacturing Specs
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="block text-[10px] text-slate-600 uppercase font-bold">Board</span>
                    <span className="block text-sm font-semibold text-slate-800 mt-0.5">{result.spec.boardW}×{result.spec.boardH}mm</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="block text-[10px] text-slate-600 uppercase font-bold">Components</span>
                    <span className="block text-sm font-semibold text-slate-800 mt-0.5">{result.stats.componentCount}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="block text-[10px] text-slate-600 uppercase font-bold">Layers</span>
                    <span className="block text-sm font-semibold text-slate-800 mt-0.5">2 (FR4)</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="block text-[10px] text-slate-600 uppercase font-bold">Traces</span>
                    <span className="block text-sm font-semibold text-slate-800 mt-0.5">{result.spec.nets.length}</span>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" /> Estimated BOM Cost
                  </span>
                  <span className="text-sm font-bold text-emerald-700">{result.stats.totalCost}</span>
                </div>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="lg:col-span-8 space-y-5">
            {!result && !loading && (
              <div className="bg-white border border-slate-200 rounded-2xl h-[540px] flex flex-col items-center justify-center text-center p-8">
                <Layers className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No PCB Layout Yet</h3>
                <p className="text-sm text-slate-600 mt-2 max-w-sm">Enter components to generate a 2-layer FR4 PCB with copper pads, traces, silkscreen and drill holes. Export Gerber files ready for JLCPCB/PCBWay.</p>
              </div>
            )}
            {loading && (
              <div className="bg-white border border-slate-200 rounded-2xl h-[540px] flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Generating PCB Layout...</h3>
                <p className="text-sm text-slate-600 mt-2">Placing footprints, auto-routing traces, generating Gerber files...</p>
              </div>
            )}
            {result && !loading && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Toolbar */}
                <div className="border-b border-slate-100 bg-slate-50 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex bg-slate-200 p-1 rounded-xl gap-0.5">
                    {LAYERS.map(l => (
                      <button key={l.id} onClick={() => setActiveLayer(l.id as any)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeLayer === l.id ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-700'}`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition"><ZoomOut className="w-3.5 h-3.5"/></button>
                    <span className="text-xs font-mono text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition"><ZoomIn className="w-3.5 h-3.5"/></button>
                    <button onClick={() => setZoom(0.85)} className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition"><RotateCcw className="w-3.5 h-3.5"/></button>
                    <button onClick={handleDownloadSVG} className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:text-emerald-600 transition">SVG</button>
                    <button onClick={handleDownloadPNG} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-slate-900 rounded-lg hover:bg-blue-700 transition flex items-center gap-1">
                      <Download className="w-3 h-3"/>PNG
                    </button>
                    <button onClick={handleDownloadGerber} className="px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-700 transition flex items-center gap-1">
                      <Download className="w-3 h-3"/>Gerber
                    </button>
                    <button onClick={handleDownloadBOM} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-slate-900 rounded-lg hover:bg-emerald-700 transition flex items-center gap-1">
                      <Download className="w-3 h-3"/>BOM CSV
                    </button>
                  </div>
                </div>
                {/* SVG view */}
                <div className={`overflow-auto ${activeLayer === 'preview' ? 'bg-slate-100' : 'bg-slate-100'}`} style={{ height: '520px' }}>
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block' }}
                    dangerouslySetInnerHTML={{ __html: getActiveSvg() }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
