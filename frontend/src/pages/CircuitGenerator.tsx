import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, Sparkles, Cable, ListTree, FolderOpen, ZoomIn, ZoomOut, RotateCcw, FileImage } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT SVG LIBRARY — Fritzing-style component drawings
// ─────────────────────────────────────────────────────────────────────────────
type PinDef = { name: string; x: number; y: number; side: 'left' | 'right' | 'top' | 'bottom' };
type ComponentDef = {
  width: number; height: number;
  draw: (label: string) => string;   // returns SVG inner markup
  pins: PinDef[];
  color: string;
};

const COMPONENT_DEFS: Record<string, ComponentDef> = {

  'arduino uno': {
    width: 220, height: 300,
    color: '#0068B5',
    pins: [
      { name: 'D13', x: 30, y: 8, side: 'top' }, { name: 'D12', x: 48, y: 8, side: 'top' },
      { name: 'D11', x: 66, y: 8, side: 'top' }, { name: 'D10', x: 84, y: 8, side: 'top' },
      { name: 'D9',  x:102, y: 8, side: 'top' }, { name: 'D8',  x:120, y: 8, side: 'top' },
      { name: 'D7',  x:138, y: 8, side: 'top' }, { name: 'D6',  x:156, y: 8, side: 'top' },
      { name: '5V',  x: 50, y:292, side: 'bottom' }, { name: 'GND',  x: 68, y:292, side: 'bottom' },
      { name: 'GND2',x: 86, y:292, side: 'bottom' }, { name: 'A0',   x:104, y:292, side: 'bottom' },
      { name: 'A1',  x:122, y:292, side: 'bottom' }, { name: 'A2',  x:140, y:292, side: 'bottom' },
      { name: 'A3',  x:158, y:292, side: 'bottom' }, { name: 'A4',  x:176, y:292, side: 'bottom' },
      { name: 'D2',  x:   0, y:120, side: 'left' }, { name: 'D3',  x:   0, y:140, side: 'left' },
      { name: 'D4',  x:   0, y:160, side: 'left' }, { name: 'D5',  x:   0, y:180, side: 'left' },
      { name: 'TX',  x:   0, y: 80, side: 'left' }, { name: 'RX',  x:   0, y:100, side: 'left' },
      { name: 'SDA', x: 220, y:120, side: 'right' }, { name: 'SCL', x: 220, y:140, side: 'right' },
      { name: '3.3V',x: 220, y:160, side: 'right' }, { name: 'VIN', x: 220, y:180, side: 'right' },
    ],
    draw: (_label) => `
      <!-- PCB Board -->
      <rect width="220" height="300" rx="6" fill="#0068B5" stroke="#004A80" stroke-width="2.5"/>
      <!-- Mounting holes -->
      <circle cx="8" cy="8" r="4" fill="#004A80" stroke="#FFD54F" stroke-width="1"/>
      <circle cx="212" cy="8" r="4" fill="#004A80" stroke="#FFD54F" stroke-width="1"/>
      <circle cx="8" cy="292" r="4" fill="#004A80" stroke="#FFD54F" stroke-width="1"/>
      <circle cx="212" cy="292" r="4" fill="#004A80" stroke="#FFD54F" stroke-width="1"/>
      <!-- USB-B Port (silver) -->
      <rect x="-8" y="30" width="32" height="36" rx="3" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1.5"/>
      <rect x="-5" y="33" width="26" height="30" rx="2" fill="#E5E7EB"/>
      <rect x="0" y="40" width="16" height="16" rx="1" fill="#B0B8C4"/>
      <!-- Barrel Jack -->
      <rect x="-8" y="230" width="30" height="24" rx="2" fill="#1a1a1a" stroke="#000" stroke-width="1"/>
      <circle cx="7" cy="242" r="5" fill="#333"/>
      <circle cx="7" cy="242" r="2.5" fill="#1a1a1a"/>
      <!-- ATMEGA328P DIP-28 IC -->
      <rect x="60" y="100" width="100" height="120" rx="3" fill="#111827" stroke="#000" stroke-width="1"/>
      <circle cx="72" cy="108" r="4" fill="#333"/>
      ${Array.from({length:14}, (_, i) => `<rect x="56" y="${104 + i*8}" width="5" height="3" rx="0.5" fill="#C0C0C0"/><rect x="159" y="${104 + i*8}" width="5" height="3" rx="0.5" fill="#C0C0C0"/>`).join('')}
      <text x="110" y="145" text-anchor="middle" fill="#6B7280" font-size="6" font-family="monospace">ATMEL</text>
      <text x="110" y="155" text-anchor="middle" fill="#9CA3AF" font-size="5" font-family="monospace">ATMEGA328P-PU</text>
      <!-- Crystal Oscillator -->
      <rect x="40" y="140" width="14" height="8" rx="3" fill="#C0C0C0" stroke="#9CA3AF" stroke-width="0.5"/>
      <text x="47" y="147" text-anchor="middle" fill="#555" font-size="3.5">16MHz</text>
      <!-- Reset Button -->
      <rect x="16" y="85" width="14" height="14" rx="2" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="0.5"/>
      <circle cx="23" cy="92" r="4" fill="#EF4444"/>
      <!-- Power LED -->
      <circle cx="175" y="45" cx="175" cy="245" r="3" fill="#22C55E" opacity="0.9"/>
      <text x="183" y="248" fill="#22C55E" font-size="4">ON</text>
      <!-- TX/RX LEDs -->
      <circle cx="175" cy="255" r="2.5" fill="#FBBF24"/>
      <text x="183" y="258" fill="#FBBF24" font-size="3.5">TX</text>
      <circle cx="175" cy="263" r="2.5" fill="#22C55E"/>
      <text x="183" y="266" fill="#22C55E" font-size="3.5">RX</text>
      <!-- Digital Pin Header (top) -->
      <rect x="22" y="14" width="160" height="10" rx="1" fill="#1a1a1a" stroke="#000" stroke-width="0.5"/>
      ${Array.from({length:9}, (_, i) => `<rect x="${26 + i*18}" y="15.5" width="7" height="7" fill="#333"/><rect x="${27.5 + i*18}" y="17" width="4" height="4" rx="0.5" fill="#B8860B"/>`).join('')}
      <!-- Analog/Power Pin Header (bottom) -->
      <rect x="42" y="276" width="150" height="10" rx="1" fill="#1a1a1a" stroke="#000" stroke-width="0.5"/>
      ${Array.from({length:8}, (_, i) => `<rect x="${46 + i*18}" y="277.5" width="7" height="7" fill="#333"/><rect x="${47.5 + i*18}" y="279" width="4" height="4" rx="0.5" fill="#B8860B"/>`).join('')}
      <!-- Logo -->
      <text x="110" y="78" text-anchor="middle" fill="#7DD3FC" font-size="12" font-weight="bold" font-family="sans-serif">Arduino</text>
      <text x="110" y="92" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="900" font-family="sans-serif">UNO R3</text>
    `
  },

  'arduino nano': {
    width: 70, height: 220,
    color: '#0068B5',
    pins: [
      { name: 'D13', x:  0, y: 20, side: 'left' }, { name: 'D12', x:  0, y: 37, side: 'left' },
      { name: 'D11', x:  0, y: 54, side: 'left' }, { name: 'D10', x:  0, y: 71, side: 'left' },
      { name: 'D9',  x:  0, y: 88, side: 'left' }, { name: 'D8',  x:  0, y:105, side: 'left' },
      { name: 'D7',  x:  0, y:122, side: 'left' }, { name: 'D6',  x:  0, y:139, side: 'left' },
      { name: 'D5',  x:  0, y:156, side: 'left' }, { name: 'D4',  x:  0, y:173, side: 'left' },
      { name: 'D3',  x:  0, y:190, side: 'left' },
      { name: '5V',  x: 70, y: 20, side: 'right' }, { name: 'GND',  x: 70, y: 37, side: 'right' },
      { name: 'A0',  x: 70, y: 54, side: 'right' }, { name: 'A1',  x: 70, y: 71, side: 'right' },
      { name: 'A2',  x: 70, y: 88, side: 'right' }, { name: 'A3',  x: 70, y:105, side: 'right' },
      { name: 'A4',  x: 70, y:122, side: 'right' }, { name: 'A5',  x: 70, y:139, side: 'right' },
      { name: 'SDA', x: 70, y:156, side: 'right' }, { name: 'SCL', x: 70, y:173, side: 'right' },
      { name: '3.3V',x: 70, y:190, side: 'right' },
    ],
    draw: (_label) => `
      <rect width="70" height="220" rx="4" fill="#0068B5" stroke="#004A80" stroke-width="2"/>
      <rect x="-5" y="5" width="22" height="18" rx="2" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1"/>
      <rect x="18" y="85" width="34" height="44" rx="2" fill="#111827" stroke="#000" stroke-width="0.5"/>
      <circle cx="28" cy="92" r="3" fill="#333"/>
      <text x="35" y="112" text-anchor="middle" fill="#6B7280" font-size="4">328P</text>
      <rect x="3" y="12" width="64" height="8" rx="1" fill="#1a1a1a"/>
      ${Array.from({length:11}, (_, i) => `<rect x="${3 + i*5.5}" y="13" width="3.5" height="6" fill="#333"/>`).join('')}
      <rect x="3" y="200" width="64" height="8" rx="1" fill="#1a1a1a"/>
      ${Array.from({length:11}, (_, i) => `<rect x="${3 + i*5.5}" y="201" width="3.5" height="6" fill="#333"/>`).join('')}
      <text x="35" y="145" text-anchor="middle" fill="#7DD3FC" font-size="8" font-weight="bold">Nano</text>
      <text x="35" y="155" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">V3.0</text>
    `
  },

  'esp32': {
    width: 90, height: 200,
    color: '#1a1a1a',
    pins: [
      { name: 'EN',    x:  0, y: 18, side: 'left' }, { name: 'GPIO36',x:  0, y: 36, side: 'left' },
      { name: 'GPIO39',x:  0, y: 54, side: 'left' }, { name: 'GPIO34',x:  0, y: 72, side: 'left' },
      { name: 'GPIO35',x:  0, y: 90, side: 'left' }, { name: 'GPIO32',x:  0, y:108, side: 'left' },
      { name: 'GPIO33',x:  0, y:126, side: 'left' }, { name: 'GPIO25',x:  0, y:144, side: 'left' },
      { name: 'GPIO26',x:  0, y:162, side: 'left' }, { name: 'GPIO27',x:  0, y:180, side: 'left' },
      { name: 'GPIO14',x:  0, y:198, side: 'left' },
      { name: 'GND',   x: 90, y: 18, side: 'right' }, { name: '3V3',   x: 90, y: 36, side: 'right' },
      { name: 'GPIO15',x: 90, y: 54, side: 'right' }, { name: 'GPIO2', x: 90, y: 72, side: 'right' },
      { name: 'GPIO0', x: 90, y: 90, side: 'right' }, { name: 'GPIO4', x: 90, y:108, side: 'right' },
      { name: 'GPIO16',x: 90, y:126, side: 'right' }, { name: 'GPIO17',x: 90, y:144, side: 'right' },
      { name: 'GPIO5', x: 90, y:162, side: 'right' }, { name: 'GPIO18',x: 90, y:180, side: 'right' },
      { name: 'GPIO19',x: 90, y:198, side: 'right' },
    ],
    draw: (label) => `
      <rect width="90" height="200" rx="4" fill="#212121" stroke="#000" stroke-width="1.5"/>
      <!-- USB Port -->
      <rect x="25" y="190" width="40" height="15" rx="2" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1"/>
      <rect x="30" y="192" width="30" height="13" rx="1" fill="#E5E7EB"/>
      <!-- ESP32 Module shield -->
      <rect x="15" y="15" width="60" height="85" rx="3" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1"/>
      <rect x="20" y="20" width="50" height="25" rx="2" fill="#1a1a1a"/>
      <!-- Meander antenna -->
      ${Array.from({length:6}, (_, i) => `<path d="M ${25 + i*8} 40 L ${25 + i*8} 25 L ${29 + i*8} 25 L ${29 + i*8} 40" fill="none" stroke="#FBBF24" stroke-width="1.5"/>`).join('')}
      <text x="45" y="70" text-anchor="middle" fill="#1a1a1a" font-size="8" font-weight="900" font-family="sans-serif">ESP-WROOM-32</text>
      <!-- Buttons -->
      <rect x="15" y="165" width="12" height="12" rx="2" fill="#D1D5DB"/>
      <circle cx="21" cy="171" r="4" fill="#333"/>
      <rect x="63" y="165" width="12" height="12" rx="2" fill="#D1D5DB"/>
      <circle cx="69" cy="171" r="4" fill="#333"/>
      <!-- Header Pins -->
      <rect x="5" y="10" width="6" height="180" rx="1" fill="#1a1a1a"/>
      ${Array.from({length:11}, (_, i) => `<rect x="6.5" y="${17 + i*18}" width="3" height="3" fill="#B8860B"/>`).join('')}
      <rect x="79" y="10" width="6" height="180" rx="1" fill="#1a1a1a"/>
      ${Array.from({length:11}, (_, i) => `<rect x="80.5" y="${17 + i*18}" width="3" height="3" fill="#B8860B"/>`).join('')}
      <!-- Label -->
      <text x="45" y="130" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">${label}</text>
    `
  },

  'esp8266': {
    width: 80, height: 180,
    color: '#212121',
    pins: [
      { name: 'A0',   x:  0, y: 20, side: 'left' }, { name: 'D0',   x:  0, y: 38, side: 'left' },
      { name: 'D1',   x:  0, y: 56, side: 'left' }, { name: 'D2',   x:  0, y: 74, side: 'left' },
      { name: 'D3',   x:  0, y: 92, side: 'left' }, { name: 'D4',   x:  0, y:110, side: 'left' },
      { name: '3V3',  x:  0, y:128, side: 'left' }, { name: 'GND',  x:  0, y:146, side: 'left' },
      { name: 'D5',   x: 80, y: 20, side: 'right' }, { name: 'D6',   x: 80, y: 38, side: 'right' },
      { name: 'D7',   x: 80, y: 56, side: 'right' }, { name: 'D8',   x: 80, y: 74, side: 'right' },
      { name: 'RX',   x: 80, y: 92, side: 'right' }, { name: 'TX',   x: 80, y:110, side: 'right' },
      { name: 'GND',  x: 80, y:128, side: 'right' }, { name: '3V3',  x: 80, y:146, side: 'right' },
    ],
    draw: (label) => `
      <rect width="80" height="180" rx="5" fill="#212121" stroke="#000" stroke-width="1.5"/>
      <rect x="25" y="165" width="30" height="15" rx="2" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1"/>
      <rect x="15" y="15" width="50" height="65" rx="3" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1"/>
      <!-- ESP-12E shield antenna -->
      <rect x="20" y="20" width="40" height="20" rx="2" fill="#1a1a1a"/>
      ${Array.from({length:4}, (_, i) => `<path d="M ${25 + i*8} 35 L ${25 + i*8} 25 L ${29 + i*8} 25 L ${29 + i*8} 35" fill="none" stroke="#FBBF24" stroke-width="1.5"/>`).join('')}
      <text x="40" y="60" text-anchor="middle" fill="#1a1a1a" font-size="7" font-weight="900" font-family="sans-serif">ESP-12E</text>
      <!-- Buttons -->
      <rect x="18" y="140" width="10" height="10" rx="1" fill="#D1D5DB"/>
      <circle cx="23" cy="145" r="3" fill="#333"/>
      <rect x="52" y="140" width="10" height="10" rx="1" fill="#D1D5DB"/>
      <circle cx="57" cy="145" r="3" fill="#333"/>
      <!-- CH340 Chip -->
      <rect x="33" y="110" width="14" height="20" rx="1" fill="#111827"/>
      <!-- Headers -->
      <rect x="4" y="10" width="6" height="150" rx="1" fill="#1a1a1a"/>
      ${Array.from({length:8}, (_, i) => `<rect x="5.5" y="${19 + i*18}" width="3" height="3" fill="#B8860B"/>`).join('')}
      <rect x="70" y="10" width="6" height="150" rx="1" fill="#1a1a1a"/>
      ${Array.from({length:8}, (_, i) => `<rect x="71.5" y="${19 + i*18}" width="3" height="3" fill="#B8860B"/>`).join('')}
      <!-- Label -->
      <text x="40" y="95" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">${label}</text>
    `
  },

  'raspberry pi pico': {
    width: 52, height: 210,
    color: '#4CAF50',
    pins: [
      { name: 'GP0',  x:  0, y: 10, side: 'left' }, { name: 'GP1',  x:  0, y: 25, side: 'left' },
      { name: 'GND',  x:  0, y: 40, side: 'left' }, { name: 'GP2',  x:  0, y: 55, side: 'left' },
      { name: 'GP3',  x:  0, y: 70, side: 'left' }, { name: 'GP4',  x:  0, y: 85, side: 'left' },
      { name: 'GP5',  x:  0, y:100, side: 'left' }, { name: 'GND2', x:  0, y:115, side: 'left' },
      { name: 'GP6',  x:  0, y:130, side: 'left' }, { name: 'GP7',  x:  0, y:145, side: 'left' },
      { name: '3V3',  x:  0, y:160, side: 'left' }, { name: 'GP8',  x:  0, y:175, side: 'left' },
      { name: 'GP9',  x:  0, y:190, side: 'left' },
      { name: 'VBUS', x: 52, y: 10, side: 'right' }, { name: 'VSYS', x: 52, y: 25, side: 'right' },
      { name: 'GND3', x: 52, y: 40, side: 'right' }, { name: 'GP13', x: 52, y: 55, side: 'right' },
      { name: 'GP14', x: 52, y: 70, side: 'right' }, { name: 'GP15', x: 52, y: 85, side: 'right' },
      { name: 'GP28', x: 52, y:100, side: 'right' }, { name: 'ADC',  x: 52, y:115, side: 'right' },
      { name: 'GP26', x: 52, y:130, side: 'right' }, { name: 'GP27', x: 52, y:145, side: 'right' },
      { name: 'GP21', x: 52, y:160, side: 'right' }, { name: 'GP20', x: 52, y:175, side: 'right' },
      { name: 'GP19', x: 52, y:190, side: 'right' },
    ],
    draw: (label) => `
      <rect width="52" height="210" rx="5" fill="#388e3c" stroke="#2e7d32" stroke-width="1.5"/>
      <rect x="4" y="70" width="44" height="70" rx="3" fill="#1b5e20"/>
      <rect x="8" y="74" width="36" height="30" rx="2" fill="#212121"/>
      <text x="26" y="86" text-anchor="middle" fill="#69f0ae" font-size="6" font-weight="bold">RP2040</text>
      <text x="26" y="96" text-anchor="middle" fill="#a5d6a7" font-size="5">133MHz</text>
      <rect x="16" y="5" width="20" height="12" rx="2" fill="#263238"/>
      <text x="26" y="14" text-anchor="middle" fill="#80cbc4" font-size="4.5">MICRO-USB</text>
      <text x="26" y="204" text-anchor="middle" fill="#c8e6c9" font-size="4.5">${label}</text>
    `
  },

  'dht11': {
    width: 55, height: 75,
    color: '#1976d2',
    pins: [
      { name: 'VCC',  x: 12, y: 0, side: 'top' },
      { name: 'DATA', x: 28, y: 0, side: 'top' },
      { name: 'NC',   x: 44, y: 0, side: 'top' },
      { name: 'GND',  x: 12, y:75, side: 'bottom' },
    ],
    draw: (label) => `
      <rect width="55" height="75" rx="5" fill="#1976d2" stroke="#1565c0" stroke-width="1.5"/>
      <rect x="5" y="20" width="45" height="40" rx="3" fill="#0d47a1"/>
      <circle cx="27" cy="40" r="12" fill="#263238"/>
      <circle cx="27" cy="40" r="8" fill="#1a237e"/>
      <text x="27" y="44" text-anchor="middle" fill="#90caf9" font-size="6">DHT11</text>
      <text x="27" y="70" text-anchor="middle" fill="#bbdefb" font-size="5">${label}</text>
    `
  },

  'dht22': {
    width: 55, height: 80,
    color: '#1976d2',
    pins: [
      { name: 'VCC',  x: 10, y: 0, side: 'top' },
      { name: 'DATA', x: 27, y: 0, side: 'top' },
      { name: 'GND',  x: 45, y: 0, side: 'top' },
    ],
    draw: (label) => `
      <rect width="55" height="80" rx="5" fill="#1976d2" stroke="#1565c0" stroke-width="1.5"/>
      <rect x="4" y="18" width="47" height="48" rx="3" fill="#0d47a1"/>
      <circle cx="27" cy="42" r="14" fill="#263238"/>
      <circle cx="27" cy="42" r="9" fill="#1a237e"/>
      <text x="27" y="45" text-anchor="middle" fill="#90caf9" font-size="6">DHT22</text>
      <text x="27" y="73" text-anchor="middle" fill="#bbdefb" font-size="5">${label}</text>
    `
  },

  'hc-sr04': {
    width: 90, height: 45,
    color: '#0068B5',
    pins: [
      { name: 'VCC',  x: 20, y: 45, side: 'bottom' },
      { name: 'TRIG', x: 36, y: 45, side: 'bottom' },
      { name: 'ECHO', x: 52, y: 45, side: 'bottom' },
      { name: 'GND',  x: 68, y: 45, side: 'bottom' },
    ],
    draw: (_label) => `
      <rect width="90" height="45" rx="3" fill="#0068B5" stroke="#004A80" stroke-width="1.5"/>
      <!-- Ultrasonic Domes -->
      <circle cx="22" cy="22" r="15" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="1.5"/>
      <circle cx="22" cy="22" r="12" fill="#D1D5DB"/>
      <circle cx="22" cy="22" r="5" fill="#333"/>
      <circle cx="68" cy="22" r="15" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="1.5"/>
      <circle cx="68" cy="22" r="12" fill="#D1D5DB"/>
      <circle cx="68" cy="22" r="5" fill="#333"/>
      <!-- Crystal & Chip -->
      <rect x="42" y="26" width="6" height="10" rx="1" fill="#C0C0C0"/>
      <text x="45" y="12" text-anchor="middle" fill="#fff" font-size="7" font-weight="900" font-family="sans-serif">HC-SR04</text>
      <!-- Header -->
      <rect x="16" y="38" width="56" height="7" rx="1" fill="#1a1a1a"/>
      ${[20, 36, 52, 68].map(x => `<rect x="${x-1.5}" y="39.5" width="3" height="3" fill="#B8860B"/>`).join('')}
    `
  },

  'mq2': {
    width: 60, height: 80,
    color: '#0068B5',
    pins: [
      { name: 'VCC', x: 12, y: 80, side: 'bottom' }, { name: 'GND', x: 24, y: 80, side: 'bottom' },
      { name: 'DO',  x: 36, y: 80, side: 'bottom' }, { name: 'AO',  x: 48, y: 80, side: 'bottom' },
    ],
    draw: (_label) => `
      <!-- Blue PCB -->
      <rect width="60" height="80" rx="4" fill="#0068B5" stroke="#004A80" stroke-width="1.5"/>
      <!-- Metallic Gas Sensor Dome -->
      <circle cx="30" cy="35" r="22" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="2"/>
      <!-- Internal grill lines -->
      ${Array.from({length:7}, (_, i) => `<line x1="${16 + i*5}" y1="20" x2="${16 + i*5}" y2="50" stroke="#9CA3AF" stroke-width="1"/>`).join('')}
      <line x1="16" y1="20" x2="44" y2="20" stroke="#9CA3AF" stroke-width="1"/>
      <line x1="12" y1="35" x2="48" y2="35" stroke="#9CA3AF" stroke-width="1"/>
      <line x1="16" y1="50" x2="44" y2="50" stroke="#9CA3AF" stroke-width="1"/>
      <text x="30" y="10" text-anchor="middle" fill="#fff" font-size="6" font-weight="900" font-family="sans-serif">MQ-2 SENSOR</text>
      <!-- Header -->
      <rect x="8" y="73" width="44" height="7" rx="1" fill="#1a1a1a"/>
      ${[12, 24, 36, 48].map(x => `<rect x="${x-1.5}" y="74.5" width="3" height="3" fill="#B8860B"/>`).join('')}
    `
  },

  'oled_basic': {
    width: 60, height: 60,
    color: '#0068B5',
    pins: [
      { name: 'GND', x: 15, y: 0, side: 'top' }, { name: 'VCC', x: 25, y: 0, side: 'top' },
      { name: 'SCL', x: 35, y: 0, side: 'top' }, { name: 'SDA', x: 45, y: 0, side: 'top' },
    ],
    draw: (label) => `
      <rect width="60" height="60" rx="4" fill="#0068B5" stroke="#004A80" stroke-width="1.5"/>
      <rect x="5" y="15" width="50" height="35" rx="2" fill="#111827" stroke="#333" stroke-width="1"/>
      <rect x="8" y="18" width="44" height="25" fill="#000"/>
      <!-- Header -->
      <rect x="10" y="0" width="40" height="7" rx="1" fill="#1a1a1a"/>
      ${[15, 25, 35, 45].map(x => `<rect x="${x-1.5}" y="1.5" width="3" height="3" fill="#B8860B"/>`).join('')}
      <!-- Display Text -->
      <text x="30" y="32" text-anchor="middle" fill="#3B82F6" font-size="6" font-family="monospace">OLED</text>
      <text x="30" y="40" text-anchor="middle" fill="#fff" font-size="4" font-family="monospace">128x64</text>
      <text x="30" y="55" text-anchor="middle" fill="#fff" font-size="4" font-weight="bold">${label}</text>
    `
  },

  'oled': {
    width: 75, height: 60,
    color: '#212121',
    pins: [
      { name: 'GND', x: 15, y: 0, side: 'top' }, { name: 'VCC', x: 30, y: 0, side: 'top' },
      { name: 'SCL', x: 45, y: 0, side: 'top' }, { name: 'SDA', x: 60, y: 0, side: 'top' },
    ],
    draw: (label) => `
      <rect width="75" height="60" rx="4" fill="#212121" stroke="#333" stroke-width="1.5"/>
      <rect x="5" y="12" width="65" height="38" rx="2" fill="#0a1628" stroke="#1a3060" stroke-width="1"/>
      <rect x="8" y="15" width="59" height="32" rx="1" fill="#040d1a"/>
      <text x="37" y="27" text-anchor="middle" fill="#64b5f6" font-size="5.5" font-weight="bold">ProjectForge</text>
      <text x="37" y="36" text-anchor="middle" fill="#4fc3f7" font-size="4.5">OLED 0.96"</text>
      <text x="37" y="44" text-anchor="middle" fill="#29b6f6" font-size="4">I2C Display</text>
      <text x="37" y="57" text-anchor="middle" fill="#90caf9" font-size="4.5">${label}</text>
    `
  },

  'lcd': {
    width: 120, height: 65,
    color: '#2e7d32',
    pins: [
      { name: 'VSS', x: 10, y: 0, side: 'top' }, { name: 'VDD', x: 20, y: 0, side: 'top' },
      { name: 'V0',  x: 30, y: 0, side: 'top' }, { name: 'RS',  x: 40, y: 0, side: 'top' },
      { name: 'RW',  x: 50, y: 0, side: 'top' }, { name: 'E',   x: 60, y: 0, side: 'top' },
      { name: 'D4',  x: 70, y: 0, side: 'top' }, { name: 'D5',  x: 80, y: 0, side: 'top' },
      { name: 'D6',  x: 90, y: 0, side: 'top' }, { name: 'D7', x: 100, y: 0, side: 'top' },
      { name: 'A',  x: 110, y: 0, side: 'top' }, { name: 'K',  x: 120, y: 0, side: 'top' },
    ],
    draw: (label) => `
      <rect width="120" height="65" rx="4" fill="#1b5e20" stroke="#2e7d32" stroke-width="1.5"/>
      <rect x="5" y="14" width="110" height="38" rx="2" fill="#0d4720"/>
      <rect x="8" y="17" width="104" height="32" rx="1" fill="#1a3f2a"/>
      <text x="60" y="29" text-anchor="middle" fill="#a5d6a7" font-size="5.5" font-family="monospace">Hello World!</text>
      <text x="60" y="39" text-anchor="middle" fill="#69f0ae" font-size="5" font-family="monospace">LCD 16x2 Display</text>
      <text x="60" y="60" text-anchor="middle" fill="#c8e6c9" font-size="4.5">${label}</text>
    `
  },

  'l298n': {
    width: 130, height: 120,
    color: '#DC2626',
    pins: [
      { name: 'IN1', x:  0, y: 30, side: 'left' }, { name: 'IN2', x:  0, y: 48, side: 'left' },
      { name: 'IN3', x:  0, y: 66, side: 'left' }, { name: 'IN4', x:  0, y: 84, side: 'left' },
      { name: 'ENA', x:  0, y: 12, side: 'left' }, { name: 'ENB', x:  0, y:102, side: 'left' },
      { name: '12V', x:130, y: 20, side: 'right' }, { name: 'GND', x:130, y: 45, side: 'right' },
      { name: '5V',  x:130, y: 70, side: 'right' },
      { name: 'MOT-A1',x: 25, y:120, side: 'bottom' }, { name: 'MOT-A2',x: 50, y:120, side: 'bottom' },
      { name: 'MOT-B1',x: 80, y:120, side: 'bottom' }, { name: 'MOT-B2',x:105, y:120, side: 'bottom' },
    ],
    draw: (label) => `
      <!-- Red PCB -->
      <rect width="130" height="120" rx="5" fill="#DC2626" stroke="#991B1B" stroke-width="2"/>
      <!-- Heatsink (silver aluminum fins) -->
      <rect x="30" y="2" width="70" height="45" rx="2" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1"/>
      ${Array.from({length:8}, (_, i) => `<rect x="${34 + i*8}" y="0" width="3" height="47" fill="#B0B8C4"/>`).join('')}
      <rect x="38" y="8" width="54" height="32" rx="2" fill="#111" stroke="#333" stroke-width="0.5"/>
      <text x="65" y="22" text-anchor="middle" fill="#EF4444" font-size="8" font-weight="bold" font-family="monospace">L298N</text>
      <text x="65" y="32" text-anchor="middle" fill="#888" font-size="5" font-family="monospace">DUAL H-BRIDGE</text>
      <!-- Blue screw terminals (motor output) -->
      <rect x="12" y="104" width="45" height="14" rx="2" fill="#2563EB" stroke="#1D4ED8" stroke-width="1"/>
      <text x="34" y="114" text-anchor="middle" fill="#fff" font-size="5" font-family="monospace">MOTOR A</text>
      <rect x="72" y="104" width="45" height="14" rx="2" fill="#2563EB" stroke="#1D4ED8" stroke-width="1"/>
      <text x="94" y="114" text-anchor="middle" fill="#fff" font-size="5" font-family="monospace">MOTOR B</text>
      <!-- Power screw terminal -->
      <rect x="105" y="10" width="20" height="50" rx="2" fill="#2563EB" stroke="#1D4ED8" stroke-width="1"/>
      <text x="115" y="30" text-anchor="middle" fill="#fff" font-size="4" font-family="monospace">12V</text>
      <text x="115" y="42" text-anchor="middle" fill="#fff" font-size="4" font-family="monospace">GND</text>
      <text x="115" y="54" text-anchor="middle" fill="#fff" font-size="4" font-family="monospace">5V</text>
      <!-- Input pins -->
      ${['ENA','IN1','IN2','IN3','IN4','ENB'].map((p,i) => `<rect x="4" y="${10+i*16}" width="14" height="8" rx="1" fill="#1a1a1a" stroke="#555" stroke-width="0.5"/><text x="11" y="${17+i*16}" text-anchor="middle" fill="#ddd" font-size="4">${p}</text>`).join('')}
      <!-- Capacitors -->
      <rect x="22" y="55" width="6" height="10" rx="2" fill="#1a1a1a" stroke="#555" stroke-width="0.5"/>
      <rect x="35" y="55" width="6" height="10" rx="2" fill="#1a1a1a" stroke="#555" stroke-width="0.5"/>
      <text x="65" y="80" text-anchor="middle" fill="#FCA5A5" font-size="6" font-weight="bold">${label}</text>
    `
  },

  'relay': {
    width: 65, height: 55,
    color: '#1565c0',
    pins: [
      { name: 'VCC', x: 10, y: 0, side: 'top' }, { name: 'GND', x: 28, y: 0, side: 'top' },
      { name: 'IN',  x: 46, y: 0, side: 'top' },
      { name: 'COM', x: 10, y:55, side: 'bottom' }, { name: 'NO',  x: 32, y:55, side: 'bottom' },
      { name: 'NC',  x: 55, y:55, side: 'bottom' },
    ],
    draw: (label) => `
      <rect width="65" height="55" rx="4" fill="#1565c0" stroke="#0d47a1" stroke-width="1.5"/>
      <rect x="5" y="10" width="55" height="30" rx="3" fill="#0d47a1"/>
      <rect x="10" y="14" width="25" height="22" rx="2" fill="#212121"/>
      <rect x="38" y="16" width="18" height="18" rx="1" fill="#263238"/>
      <text x="47" y="28" text-anchor="middle" fill="#80cbc4" font-size="5">COIL</text>
      <text x="25" y="50" text-anchor="middle" fill="#bbdefb" font-size="4.5">5V Relay</text>
      <text x="25" y="57" text-anchor="middle" fill="#90caf9" font-size="4">${label}</text>
    `
  },

  'servo': {
    width: 75, height: 60,
    color: '#795548',
    pins: [
      { name: 'PWM', x: 20, y: 0, side: 'top' },
      { name: 'VCC', x: 38, y: 0, side: 'top' },
      { name: 'GND', x: 56, y: 0, side: 'top' },
    ],
    draw: (label) => `
      <rect width="75" height="60" rx="4" fill="#6d4c41" stroke="#5d4037" stroke-width="1.5"/>
      <rect x="5" y="10" width="65" height="40" rx="3" fill="#795548"/>
      <circle cx="55" cy="30" r="18" fill="#4e342e"/>
      <circle cx="55" cy="30" r="12" fill="#3e2723"/>
      <circle cx="55" cy="30" r="5" fill="#8d6e63"/>
      <rect x="8" y="15" width="30" height="25" rx="2" fill="#5d4037"/>
      <text x="23" y="30" text-anchor="middle" fill="#d7ccc8" font-size="6">SERVO</text>
      <text x="37" y="56" text-anchor="middle" fill="#d7ccc8" font-size="4.5">${label}</text>
    `
  },

  'ir sensor': {
    width: 50, height: 60,
    color: '#004d40',
    pins: [
      { name: 'VCC', x: 12, y: 0, side: 'top' }, { name: 'GND', x: 28, y: 0, side: 'top' },
      { name: 'OUT', x: 44, y: 0, side: 'top' },
    ],
    draw: (label) => `
      <rect width="50" height="60" rx="4" fill="#00695c" stroke="#004d40" stroke-width="1.5"/>
      <circle cx="15" cy="42" r="8" fill="#212121"/>
      <circle cx="15" cy="42" r="5" fill="#1a237e"/>
      <circle cx="35" cy="42" r="8" fill="#212121"/>
      <circle cx="35" cy="42" r="5" fill="#bf360c"/>
      <text x="25" y="16" text-anchor="middle" fill="#e0f2f1" font-size="5" font-weight="bold">IR Sensor</text>
      <text x="25" y="56" text-anchor="middle" fill="#b2dfdb" font-size="4.5">${label}</text>
    `
  },

  'buzzer': {
    width: 40, height: 45,
    color: '#212121',
    pins: [
      { name: 'VCC', x: 12, y: 0, side: 'top' }, { name: 'GND', x: 28, y: 0, side: 'top' },
    ],
    draw: (label) => `
      <rect width="40" height="45" rx="20" fill="#212121" stroke="#424242" stroke-width="1.5"/>
      <circle cx="20" cy="22" r="12" fill="#37474f"/>
      <circle cx="20" cy="22" r="7" fill="#263238"/>
      <circle cx="20" cy="22" r="3" fill="#455a64"/>
      <text x="20" y="40" text-anchor="middle" fill="#9e9e9e" font-size="4.5">${label}</text>
    `
  },

  'led': {
    width: 30, height: 45,
    color: '#f44336',
    pins: [
      { name: '+', x: 10, y: 0, side: 'top' }, { name: '-', x: 22, y: 0, side: 'top' },
    ],
    draw: (label) => `
      <rect width="30" height="45" rx="3" fill="none"/>
      <polygon points="15,12 6,28 24,28" fill="#ef5350" stroke="#b71c1c" stroke-width="1"/>
      <line x1="6" y1="28" x2="24" y2="28" stroke="#b71c1c" stroke-width="2"/>
      <line x1="10" y1="28" x2="10" y2="40" stroke="#e0e0e0" stroke-width="1.5"/>
      <line x1="20" y1="28" x2="20" y2="40" stroke="#e0e0e0" stroke-width="1.5"/>
      <text x="15" y="12" text-anchor="middle" fill="#ef5350" font-size="4.5">${label}</text>
    `
  },

  'rfid rc522': {
    width: 75, height: 60,
    color: '#1a237e',
    pins: [
      { name: 'SDA', x:  0, y: 12, side: 'left' }, { name: 'SCK', x:  0, y: 26, side: 'left' },
      { name: 'MOSI',x:  0, y: 40, side: 'left' }, { name: 'MISO',x:  0, y: 54, side: 'left' },
      { name: 'GND', x: 75, y: 26, side: 'right' }, { name: 'RST', x: 75, y: 40, side: 'right' },
      { name: '3.3V',x: 75, y: 54, side: 'right' },
    ],
    draw: (label) => `
      <rect width="75" height="60" rx="5" fill="#1a237e" stroke="#0d47a1" stroke-width="1.5"/>
      <rect x="5" y="8" width="65" height="44" rx="3" fill="#283593"/>
      <rect x="10" y="14" width="55" height="32" rx="2" fill="#1a237e" stroke="#3f51b5" stroke-width="0.5"/>
      <text x="37" y="26" text-anchor="middle" fill="#c5cae9" font-size="6" font-weight="bold">RFID</text>
      <text x="37" y="36" text-anchor="middle" fill="#9fa8da" font-size="5">RC522</text>
      <text x="37" y="46" text-anchor="middle" fill="#7986cb" font-size="4.5">13.56 MHz</text>
      <text x="37" y="56" text-anchor="middle" fill="#9fa8da" font-size="4">${label}</text>
    `
  },

  'gps': {
    width: 55, height: 55,
    color: '#01579b',
    pins: [
      { name: 'VCC', x: 10, y: 0, side: 'top' }, { name: 'GND', x: 25, y: 0, side: 'top' },
      { name: 'TX',  x: 40, y: 0, side: 'top' }, { name: 'RX',  x: 55, y: 0, side: 'top' },
    ],
    draw: (label) => `
      <rect width="55" height="55" rx="5" fill="#01579b" stroke="#014477" stroke-width="1.5"/>
      <rect x="5" y="10" width="45" height="35" rx="3" fill="#0277bd"/>
      <circle cx="27" cy="27" r="12" fill="#012c4d"/>
      <text x="27" y="24" text-anchor="middle" fill="#81d4fa" font-size="6" font-weight="bold">GPS</text>
      <text x="27" y="33" text-anchor="middle" fill="#b3e5fc" font-size="4.5">NEO-6M</text>
      <text x="27" y="50" text-anchor="middle" fill="#b3e5fc" font-size="4.5">${label}</text>
    `
  },

  'gsm': {
    width: 70, height: 90,
    color: '#1b5e20',
    pins: [
      { name: 'VCC', x:  0, y: 15, side: 'left' }, { name: 'GND', x:  0, y: 30, side: 'left' },
      { name: 'TX',  x:  0, y: 45, side: 'left' }, { name: 'RX',  x:  0, y: 60, side: 'left' },
    ],
    draw: (label) => `
      <rect width="70" height="90" rx="5" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.5"/>
      <rect x="5" y="10" width="60" height="70" rx="3" fill="#388e3c"/>
      <rect x="15" y="18" width="40" height="35" rx="2" fill="#1b5e20"/>
      <text x="35" y="30" text-anchor="middle" fill="#a5d6a7" font-size="7" font-weight="bold">SIM800L</text>
      <text x="35" y="42" text-anchor="middle" fill="#69f0ae" font-size="5.5">GSM Module</text>
      <rect x="25" y="60" width="20" height="14" rx="2" fill="#1b5e20"/>
      <text x="35" y="70" text-anchor="middle" fill="#c8e6c9" font-size="4.5">SIM SLOT</text>
      <text x="35" y="85" text-anchor="middle" fill="#c8e6c9" font-size="4.5">${label}</text>
    `
  },
};

// Wire color map
const WIRE_COLORS: Record<string, string> = {
  red: '#e53935', black: '#212121', yellow: '#f9a825',
  green: '#2e7d32', blue: '#1565c0', orange: '#e65100',
  purple: '#6a1b9a', white: '#bdbdbd', brown: '#4e342e',
};

// ─────────────────────────────────────────────────────────────────────────────
// Circuit Wiring Spec Types
// ─────────────────────────────────────────────────────────────────────────────
type WiringComponent = {
  id: string; type: string; label: string; x: number; y: number;
};
type WiringConnection = {
  from: { component: string; pin: string };
  to: { component: string; pin: string };
  color: string; label: string;
};
type WiringSpec = {
  components: WiringComponent[];
  connections: WiringConnection[];
  pinMapping: { component: string; pin: string; connectedTo: string; description: string }[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Fritzing SVG Renderer
// ─────────────────────────────────────────────────────────────────────────────
function buildFritzingSVG(spec: WiringSpec): string {
  const PADDING = 40;
  const canvasW = 1400;
  const canvasH = 900;

  // resolve component defs
  const resolveType = (type: string): string => {
    const lower = type.toLowerCase();
    for (const key of Object.keys(COMPONENT_DEFS)) {
      if (lower.includes(key) || key.includes(lower)) return key;
    }
    // fuzzy fallbacks
    if (lower.includes('arduino')) return lower.includes('nano') ? 'arduino nano' : 'arduino uno';
    if (lower.includes('esp32')) return 'esp32';
    if (lower.includes('esp8266') || lower.includes('nodemcu')) return 'esp8266';
    if (lower.includes('pico')) return 'raspberry pi pico';
    if (lower.includes('dht22')) return 'dht22';
    if (lower.includes('dht')) return 'dht11';
    if (lower.includes('oled') || lower.includes('ssd1306')) return 'oled';
    if (lower.includes('lcd')) return 'lcd';
    if (lower.includes('l298') || lower.includes('motor driver')) return 'l298n';
    if (lower.includes('relay')) return 'relay';
    if (lower.includes('servo')) return 'servo';
    if (lower.includes('hc-sr04') || lower.includes('ultrasonic')) return 'hc-sr04';
    if (lower.includes('mq2') || lower.includes('mq-2')) return 'mq2';
    if (lower.includes('mq135') || lower.includes('mq-135')) return 'mq135';
    if (lower.includes('ir') || lower.includes('infrared')) return 'ir sensor';
    if (lower.includes('rfid') || lower.includes('rc522')) return 'rfid rc522';
    if (lower.includes('buzzer')) return 'buzzer';
    if (lower.includes('led')) return 'led';
    if (lower.includes('gps')) return 'gps';
    if (lower.includes('gsm') || lower.includes('sim800')) return 'gsm';
    return 'dht11'; // generic fallback
  };

  // Get absolute pin position on canvas for a given component and pin name
  const getPinPos = (compId: string, pinName: string): { x: number; y: number } => {
    const comp = spec.components.find(c => c.id === compId);
    if (!comp) return { x: 0, y: 0 };
    const typKey = resolveType(comp.type);
    const def = COMPONENT_DEFS[typKey];
    if (!def) return { x: comp.x, y: comp.y };
    const pin = def.pins.find(p => p.name.toLowerCase() === pinName.toLowerCase())
      || def.pins.find(p => pinName.toLowerCase().includes(p.name.toLowerCase()))
      || def.pins[0];
    if (!pin) return { x: comp.x, y: comp.y };
    return { x: comp.x + pin.x, y: comp.y + pin.y };
  };

  // Build component SVG groups
  const componentSVGs = spec.components.map(comp => {
    const typKey = resolveType(comp.type);
    const def = COMPONENT_DEFS[typKey] || COMPONENT_DEFS['dht11'];
    const inner = def.draw(comp.label);

    // Draw pin dots and labels
    const pinDots = def.pins.map(pin => {
      const px = pin.x;
      const py = pin.y;
      const labelOffset = 11;
      let lx = px, ly = py;
      let textAnchor = 'middle';
      if (pin.side === 'left') { lx = px - labelOffset; ly = py + 3; textAnchor = 'end'; }
      else if (pin.side === 'right') { lx = px + labelOffset; ly = py + 3; textAnchor = 'start'; }
      else if (pin.side === 'top') { lx = px; ly = py - 6; }
      else { lx = px; ly = py + 14; }
      return `
        <circle cx="${px}" cy="${py}" r="3.5" fill="#facc15" stroke="#ca8a04" stroke-width="1" opacity="0.95"/>
        <text x="${lx}" y="${ly}" text-anchor="${textAnchor}" fill="#334155" font-size="6.5" font-weight="700" font-family="sans-serif">${pin.name}</text>
      `;
    }).join('');

    return `<g transform="translate(${comp.x},${comp.y})" id="comp-${comp.id}">
      ${inner}
      ${pinDots}
    </g>`;
  }).join('\n');

  // Draw wires as bezier curves
  const wireSVGs = spec.connections.map((conn, i) => {
    const fromPos = getPinPos(conn.from.component, conn.from.pin);
    const toPos = getPinPos(conn.to.component, conn.to.pin);
    const color = WIRE_COLORS[conn.color] || conn.color || '#9e9e9e';

    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const cx1 = fromPos.x + Math.min(60, Math.abs(dx) * 0.4);
    const cy1 = fromPos.y + Math.sign(dy) * 20;
    const cx2 = toPos.x - Math.min(60, Math.abs(dx) * 0.4);
    const cy2 = toPos.y - Math.sign(dy) * 20;

    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;

    return `
      <g id="wire-${i}">
        <path d="M${fromPos.x},${fromPos.y} C${cx1},${cy1} ${cx2},${cy2} ${toPos.x},${toPos.y}"
          fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="1"/>
        <circle cx="${fromPos.x}" cy="${fromPos.y}" r="4" fill="${color}" stroke="#475569" stroke-width="0.5"/>
        <circle cx="${toPos.x}" cy="${toPos.y}" r="4" fill="${color}" stroke="#475569" stroke-width="0.5"/>
        <rect x="${midX - 28}" y="${midY - 7}" width="56" height="12" rx="4" fill="#0f172a" opacity="0.8"/>
        <text x="${midX}" y="${midY + 2}" text-anchor="middle" fill="#ffffff" font-size="6" font-weight="750" font-family="sans-serif">${conn.from.pin}→${conn.to.pin}</text>
      </g>`;
  }).join('\n');

  // Legend
  const legendItems = [
    { color: '#e53935', label: 'Red = VCC/Power' },
    { color: '#212121', label: 'Black = GND' },
    { color: '#f9a825', label: 'Yellow = Signal' },
    { color: '#2e7d32', label: 'Green = Data' },
    { color: '#1565c0', label: 'Blue = I2C (SDA/SCL)' },
  ];
  const legendSVG = legendItems.map((item, i) => `
    <rect x="${PADDING + i * 170}" y="${canvasH - 36}" width="16" height="8" rx="3" fill="${item.color}"/>
    <text x="${PADDING + i * 170 + 22}" y="${canvasH - 29}" fill="#475569" font-size="8.5" font-weight="700" font-family="sans-serif">${item.label}</text>
  `).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="${canvasW}" height="${canvasH}" style="background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    </pattern>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.12"/>
    </filter>
  </defs>
  <!-- Background canvas -->
  <rect width="${canvasW}" height="${canvasH}" fill="#ffffff"/>
  <rect width="${canvasW}" height="${canvasH}" fill="url(#grid)"/>

  <!-- Subtle Title Header -->
  <rect x="0" y="0" width="${canvasW}" height="60" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <text x="24" y="36" fill="#0f172a" font-size="16" font-weight="800" letter-spacing="0.5">CIRCUIT WIRING DIAGRAM</text>
  <text x="24" y="49" fill="#64748b" font-size="9.5" font-weight="500">Fritzing-style component schematic layout</text>
  <text x="${canvasW - 24}" y="36" text-anchor="end" fill="#3b82f6" font-size="11" font-weight="700" letter-spacing="0.5">PROJECTFORGE AI</text>

  <!-- Wires (drawn below components) -->
  <g id="wires">${wireSVGs}</g>

  <!-- Components -->
  <g id="components" filter="url(#shadow)">${componentSVGs}</g>

  <!-- Legend Bottom Bar -->
  <rect x="0" y="${canvasH - 55}" width="${canvasW}" height="55" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${PADDING}" y="${canvasH - 32}" fill="#475569" font-size="9" font-weight="800" letter-spacing="1">WIRE LEGEND:</text>
  ${legendSVG}
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Intelligent fallback wiring spec generator (no AI needed)
// ─────────────────────────────────────────────────────────────────────────────
function generateFallbackSpec(_projectName: string, componentsText: string): WiringSpec {
  const lines = componentsText.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);

  // Detect MCU
  let mcuType = 'Arduino Uno';
  let mcuId = 'mcu';
  for (const l of lines) {
    const lower = l.toLowerCase();
    if (lower.includes('esp32')) { mcuType = 'ESP32'; break; }
    if (lower.includes('esp8266') || lower.includes('nodemcu')) { mcuType = 'ESP8266'; break; }
    if (lower.includes('nano')) { mcuType = 'Arduino Nano'; break; }
    if (lower.includes('pico')) { mcuType = 'Raspberry Pi Pico'; break; }
  }

  const peripherals = lines.filter(l => {
    const lower = l.toLowerCase();
    return !lower.includes('arduino') && !lower.includes('esp') && !lower.includes('pico')
      && !lower.includes('raspberry') && !lower.includes('stm32');
  });

  // Layout: MCU in center, sensors around it
  const MCU_X = 550, MCU_Y = 300;
  const components: WiringComponent[] = [
    { id: mcuId, type: mcuType, label: mcuType, x: MCU_X, y: MCU_Y }
  ];

  const positions = [
    { x: 80, y: 150 }, { x: 80, y: 400 }, { x: 80, y: 620 },
    { x: 900, y: 150 }, { x: 900, y: 400 }, { x: 900, y: 620 },
    { x: 350, y: 680 }, { x: 700, y: 680 },
  ];

  peripherals.slice(0, 8).forEach((pName, i) => {
    const pos = positions[i] || { x: 100 + i * 120, y: 750 };
    components.push({
      id: `p${i}`, type: pName, label: pName,
      x: pos.x, y: pos.y
    });
  });

  // Generate connections
  const connections: WiringConnection[] = [];
  const pinMapping: WiringSpec['pinMapping'] = [];

  void (COMPONENT_DEFS['esp32'] || COMPONENT_DEFS['arduino uno']); // kept for future pin-mapping use

  peripherals.slice(0, 8).forEach((pName, i) => {
    const lower = pName.toLowerCase();
    const compId = `p${i}`;

    const isI2C = lower.includes('oled') || lower.includes('lcd');
    const isUART = lower.includes('gps') || lower.includes('gsm');

    const isAnalog = lower.includes('mq') || lower.includes('gas') || lower.includes('sound');

    // VCC
    connections.push({ from: { component: mcuId, pin: mcuType.includes('ESP') ? '3V3' : '5V' }, to: { component: compId, pin: 'VCC' }, color: 'red', label: 'Power' });
    pinMapping.push({ component: pName, pin: 'VCC', connectedTo: `${mcuType} VCC`, description: 'Power supply' });

    // GND
    connections.push({ from: { component: mcuId, pin: 'GND' }, to: { component: compId, pin: 'GND' }, color: 'black', label: 'Ground' });
    pinMapping.push({ component: pName, pin: 'GND', connectedTo: `${mcuType} GND`, description: 'Ground' });

    // Signal
    if (isI2C) {
      const sclPin = mcuType.includes('ESP32') ? 'GPIO22' : 'SCL';
      const sdaPin = mcuType.includes('ESP32') ? 'GPIO21' : 'SDA';
      connections.push({ from: { component: mcuId, pin: sclPin }, to: { component: compId, pin: 'SCL' }, color: 'blue', label: 'I2C SCL' });
      connections.push({ from: { component: mcuId, pin: sdaPin }, to: { component: compId, pin: 'SDA' }, color: 'blue', label: 'I2C SDA' });
      pinMapping.push({ component: pName, pin: 'SCL', connectedTo: `${mcuType} ${sclPin}`, description: 'I2C Clock' });
      pinMapping.push({ component: pName, pin: 'SDA', connectedTo: `${mcuType} ${sdaPin}`, description: 'I2C Data' });
    } else if (isUART) {
      connections.push({ from: { component: mcuId, pin: 'TX' }, to: { component: compId, pin: 'RX' }, color: 'green', label: 'UART TX' });
      connections.push({ from: { component: mcuId, pin: 'RX' }, to: { component: compId, pin: 'TX' }, color: 'yellow', label: 'UART RX' });
      pinMapping.push({ component: pName, pin: 'TX/RX', connectedTo: `${mcuType} UART`, description: 'Serial communication' });
    } else if (isAnalog) {
      const sigPin = mcuType.includes('ESP32') ? 'GPIO36' : 'A0';
      connections.push({ from: { component: mcuId, pin: sigPin }, to: { component: compId, pin: 'AO' }, color: 'orange', label: 'Analog Signal' });
      pinMapping.push({ component: pName, pin: 'AO', connectedTo: `${mcuType} ${sigPin}`, description: 'Analog sensor output' });
    } else {
      const dPin = mcuType.includes('ESP32') ? `GPIO${4 + i * 2}` : `D${2 + i}`;
      const sigPinName = lower.includes('trig') ? 'TRIG' : lower.includes('relay') ? 'IN' : lower.includes('servo') ? 'PWM' : 'DATA';
      connections.push({ from: { component: mcuId, pin: dPin }, to: { component: compId, pin: sigPinName }, color: 'yellow', label: 'Signal' });
      pinMapping.push({ component: pName, pin: sigPinName, connectedTo: `${mcuType} ${dPin}`, description: 'Digital signal' });
    }
  });

  return { components, connections, pinMapping };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function CircuitGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [componentsText, setComponentsText] = useState('');
  const [zoom, setZoom] = useState(0.75);
  const [result, setResult] = useState<{
    svgString: string;
    pinMapping: { component: string; pin: string; connectedTo: string; description: string }[];
  } | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

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
      showToast('Please enter project name and components.', 'danger'); return;
    }
    setLoading(true); setResult(null);
    try {
      const token = localStorage.getItem('forge_token');
      let spec: WiringSpec | null = null;

      try {
        const res = await fetch('/api/ai/circuit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ projectName, components: componentsText })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.wiringSpec) spec = data.wiringSpec;
        }
      } catch { /* fallback */ }

      if (!spec) spec = generateFallbackSpec(projectName, componentsText);
      const svgString = buildFritzingSVG(spec);
      setResult({ svgString, pinMapping: spec.pinMapping });
      showToast('Fritzing-style circuit generated!', 'success');
    } catch (err) {
      showToast('Generation failed. Please try again.', 'danger');
    } finally { setLoading(false); }
  };

  const handleDownloadPNG = useCallback(() => {
    if (!result?.svgString) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1400; canvas.height = 900;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 1400, 900);
    const img = new Image();
    const blob = new Blob([result.svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(b => {
        if (!b) return;
        const a = document.createElement('a');
        a.download = `${projectName.replace(/\s+/g, '_')}_Circuit.png`;
        a.href = URL.createObjectURL(b); a.click();
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [result, projectName]);

  const handleDownloadSVG = useCallback(() => {
    if (!result?.svgString) return;
    const blob = new Blob([result.svgString], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName.replace(/\s+/g, '_')}_Circuit.svg`; a.click();
  }, [result, projectName]);

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 min-h-screen">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-white border border-l-4 animate-slide-up ${toast.type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <span className="text-xs font-semibold text-slate-700">{toast.text}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/dashboard')} className="text-slate-600 hover:text-blue-600 text-xs font-medium transition">← Dashboard</button>
          <span className="text-slate-600">/</span>
          <span className="text-xs text-blue-600 font-bold tracking-wide uppercase">Circuit Generator</span>
        </div>

        {prefilled && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium">
            <FolderOpen className="w-3.5 h-3.5 text-blue-500" /> Project pre-filled from saved project.
          </div>
        )}

        <div className="flex items-start gap-4 mb-8">
          <div className="p-3.5 rounded-2xl bg-blue-600 shadow-lg text-slate-900 shrink-0"><Zap className="w-6 h-6" /></div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Circuit Generator <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              Generates real Fritzing-style wiring diagrams with colored wires, component images & pin-to-pin mapping.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input panel */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">Project Name</label>
                  <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g. Smart Weather Station" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">Components List</label>
                  <textarea value={componentsText} onChange={e => setComponentsText(e.target.value)}
                    placeholder="e.g. ESP32, DHT11 Sensor, OLED Display, 5V Relay, Buzzer"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition min-h-[160px] resize-y" required />
                  <p className="text-[10px] text-slate-600 mt-1.5 leading-relaxed">Separate with commas or newlines. Be specific (e.g. "Arduino Uno" not "Arduino").</p>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition shadow disabled:opacity-50 disabled:bg-slate-300">
                  {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Generating...</> : <><Zap className="w-4 h-4"/>Generate Circuit</>}
                </button>
              </form>
            </div>

            {/* Component reference */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Supported Components</h3>
              <div className="flex flex-wrap gap-1.5">
                {['Arduino Uno', 'Arduino Nano', 'ESP32', 'ESP8266', 'Pico', 'DHT11', 'DHT22', 'HC-SR04', 'MQ2', 'MQ135', 'OLED', 'LCD', 'L298N', 'Relay', 'Servo', 'IR Sensor', 'RFID', 'GPS', 'GSM', 'Buzzer', 'LED'].map(c => (
                  <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[10px] font-semibold">{c}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas area */}
          <div className="lg:col-span-8 space-y-5">
            {!result && !loading && (
              <div className="bg-white border border-slate-200 rounded-2xl h-[520px] flex flex-col items-center justify-center text-center p-8">
                <Cable className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No Circuit Yet</h3>
                <p className="text-sm text-slate-600 mt-2 max-w-sm">Fill the form and click Generate to get a Fritzing-style wiring diagram with colored wires and real component images.</p>
              </div>
            )}

            {loading && (
              <div className="bg-white border border-slate-200 rounded-2xl h-[520px] flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Building Fritzing Diagram...</h3>
                <p className="text-sm text-slate-600 mt-2">Placing components, routing colored wires, mapping pins...</p>
              </div>
            )}

            {result && !loading && (
              <>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {/* Toolbar */}
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Fritzing-Style Wiring Diagram</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"><ZoomOut className="w-3.5 h-3.5"/></button>
                      <span className="text-xs font-mono text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"><ZoomIn className="w-3.5 h-3.5"/></button>
                      <button onClick={() => setZoom(0.75)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition" title="Reset zoom"><RotateCcw className="w-3.5 h-3.5"/></button>
                      <button onClick={handleDownloadSVG} className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:text-blue-600 hover:border-blue-200 transition">SVG</button>
                      <button onClick={handleDownloadPNG} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-slate-900 rounded-lg hover:bg-blue-700 transition">
                        <FileImage className="w-3 h-3"/> PNG
                      </button>
                    </div>
                  </div>
                  <div className="overflow-auto bg-slate-50 border border-slate-200/50 rounded-xl" style={{ height: '500px' }} ref={svgContainerRef}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block' }}
                      dangerouslySetInnerHTML={{ __html: result.svgString }} />
                  </div>
                </div>

                {/* Pin mapping table */}
                {result.pinMapping?.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50 p-4 flex items-center gap-2">
                      <ListTree className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-slate-800 text-sm">Pin-to-Pin Mapping Table</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3 font-bold">Component</th>
                            <th className="px-5 py-3 font-bold">Pin</th>
                            <th className="px-5 py-3 font-bold">Connected To</th>
                            <th className="px-5 py-3 font-bold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {result.pinMapping.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="px-5 py-3 font-semibold text-slate-900">{row.component}</td>
                              <td className="px-5 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-xs">{row.pin}</span></td>
                              <td className="px-5 py-3 text-slate-700">{row.connectedTo}</td>
                              <td className="px-5 py-3 text-slate-600 text-xs">{row.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
