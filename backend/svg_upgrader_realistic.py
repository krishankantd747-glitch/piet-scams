import re
import sys

def upgrade_to_realistic(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # --- 1. Replace compVisuals with highly realistic shapes ---
    new_comp_visuals = """const compVisuals = {
      'arduino': (x, y, label) => {
        let s = ``;
        // Realistic Arduino Uno R3 PCB
        s += `<path d="M ${x} ${y} h 100 l 10 10 v 140 h -110 v -150" fill="#005C8A" stroke="#00476B" stroke-width="1.5" rx="2"/>`;
        // Mounting holes
        s += `<circle cx="${x+3}" cy="${y+3}" r="2" fill="#111" stroke="#EAB308" stroke-width="0.5"/>`;
        s += `<circle cx="${x+105}" cy="${y+145}" r="2" fill="#111" stroke="#EAB308" stroke-width="0.5"/>`;
        s += `<circle cx="${x+105}" cy="${y+30}" r="2" fill="#111" stroke="#EAB308" stroke-width="0.5"/>`;
        
        // USB Port (Silver metallic)
        s += `<rect x="${x-5}" y="${y+10}" width="20" height="25" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1" rx="1"/>`;
        s += `<rect x="${x-3}" y="${y+12}" width="16" height="21" fill="#E5E7EB" stroke="#D1D5DB"/>`;
        // Barrel Jack
        s += `<rect x="${x-5}" y="${y+115}" width="25" height="20" fill="#1A1A1A" stroke="#000" stroke-width="1" rx="1"/>`;
        s += `<rect x="${x-5}" y="${y+117}" width="2" height="16" fill="#333"/>`;
        
        // ATMEGA328P DIP-28 IC
        s += `<rect x="${x+50}" y="${y+65}" width="25" height="70" fill="#111827" stroke="#000" rx="1"/>`;
        s += `<circle cx="${x+62.5}" cy="${y+68}" r="2" fill="#333"/>`; // Notch
        s += `<text x="${x+62.5}" y="${y+100}" fill="#4B5563" font-size="5" text-anchor="middle" transform="rotate(-90 ${x+62.5} ${y+100})">ATMEGA328P-PU</text>`;
        for(let i=0; i<14; i++) {
            s += `<rect x="${x+48}" y="${y+67 + i*4.8}" width="3" height="1.5" fill="#9CA3AF"/>`;
            s += `<rect x="${x+74}" y="${y+67 + i*4.8}" width="3" height="1.5" fill="#9CA3AF"/>`;
        }

        // Female Headers (Top and Bottom)
        // Top (Digital 0-13, GND, AREF)
        s += `<rect x="${x+15}" y="${y+2}" width="90" height="8" fill="#1A1A1A" stroke="#000" rx="1"/>`;
        for(let i=0; i<16; i++) {
           s += `<rect x="${x+18 + i*5.4}" y="${y+3.5}" width="3.5" height="5" fill="#000"/>`;
           s += `<circle cx="${x+19.75 + i*5.4}" cy="${y+6}" r="1.5" fill="#333"/>`;
        }
        // Bottom (Power, Analog)
        s += `<rect x="${x+35}" y="${y+140}" width="35" height="8" fill="#1A1A1A" stroke="#000" rx="1"/>`; // Power
        s += `<rect x="${x+75}" y="${y+140}" width="32" height="8" fill="#1A1A1A" stroke="#000" rx="1"/>`; // Analog
        for(let i=0; i<6; i++) {
           s += `<rect x="${x+37 + i*5.4}" y="${y+141.5}" width="3.5" height="5" fill="#000"/>`;
           s += `<circle cx="${x+38.75 + i*5.4}" cy="${y+144}" r="1.5" fill="#333"/>`;
        }
        for(let i=0; i<6; i++) {
           s += `<rect x="${x+77 + i*5.4}" y="${y+141.5}" width="3.5" height="5" fill="#000"/>`;
           s += `<circle cx="${x+78.75 + i*5.4}" cy="${y+144}" r="1.5" fill="#333"/>`;
        }

        // Crystal Oscillator
        s += `<rect x="${x+30}" y="${y+50}" width="12" height="6" fill="#D1D5DB" stroke="#9CA3AF" rx="2"/>`;
        // Reset Button
        s += `<rect x="${x+5}" y="${y+40}" width="8" height="8" fill="#D1D5DB" stroke="#9CA3AF"/>`;
        s += `<circle cx="${x+9}" cy="${y+44}" r="2" fill="#EF4444"/>`;

        // Silk text
        s += `<text x="${x+65}" y="${y+50}" fill="#FFFFFF" font-size="8" font-weight="bold" font-family="monospace">UNO</text>`;
        s += `<text x="${x+55}" y="${y+160}" fill="#64A3E0" font-size="7" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'esp32': (x, y, label) => {
        let s = ``;
        // Base PCB
        s += `<rect x="${x}" y="${y}" width="60" height="110" fill="#1A1A1A" stroke="#000" stroke-width="2" rx="2"/>`;
        // Silver shield (WROOM)
        s += `<rect x="${x+5}" y="${y+25}" width="50" height="60" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1" rx="2"/>`;
        s += `<rect x="${x+10}" y="${y+30}" width="40" height="50" fill="#E5E7EB" stroke="#D1D5DB" rx="1"/>`;
        s += `<text x="${x+30}" y="${y+45}" fill="#4B5563" font-size="5" text-anchor="middle" font-weight="bold" font-family="monospace">ESP-WROOM-32</text>`;
        s += `<text x="${x+30}" y="${y+55}" fill="#4B5563" font-size="4" text-anchor="middle" font-family="monospace">Wi-Fi + BT</text>`;
        // PCB Antenna trace
        s += `<path d="M ${x+10} ${y+15} h 40 v -5 h -35 v -3 h 35 v -3 h -35" fill="none" stroke="#D4AF37" stroke-width="1.5"/>`;
        
        // Edge Castellations
        for(let i=0; i<19; i++) {
            s += `<path d="M ${x} ${y+15 + i*4.5} a 2 2 0 0 1 2 2 a 2 2 0 0 1 -2 2" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
            s += `<path d="M ${x+60} ${y+15 + i*4.5} a 2 2 0 0 0 -2 2 a 2 2 0 0 0 2 2" fill="#EAB308" stroke="#CA8A04" stroke-width="0.5"/>`;
        }
        
        s += `<text x="${x+30}" y="${y+120}" fill="#22C55E" font-size="7" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'l298n': (x, y, label) => {
        let s = ``;
        // Red PCB
        s += `<rect x="${x}" y="${y}" width="90" height="80" fill="#B91C1C" stroke="#7F1D1D" stroke-width="1.5" rx="3"/>`;
        s += `<circle cx="${x+5}" cy="${y+5}" r="2" fill="#F87171"/>`;
        s += `<circle cx="${x+85}" cy="${y+75}" r="2" fill="#F87171"/>`;

        // Large Heatsink
        s += `<rect x="${x+10}" y="${y+5}" width="70" height="25" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1"/>`;
        for(let f=0; f<8; f++) s += `<rect x="${x+12 + f*8}" y="${y-2}" width="4" height="8" fill="#9CA3AF"/>`;
        
        // Black L298N IC attached to heatsink
        s += `<rect x="${x+25}" y="${y+28}" width="40" height="15" fill="#111827" stroke="#000" rx="1"/>`;
        s += `<text x="${x+45}" y="${y+38}" fill="#6B7280" font-size="5" text-anchor="middle" font-family="monospace">L298N</text>`;

        // Blue terminal blocks
        // Power (3 pins)
        s += `<rect x="${x+25}" y="${y+65}" width="40" height="15" fill="#1E40AF" stroke="#1E3A8A" rx="1"/>`;
        for(let i=0; i<3; i++) {
           s += `<circle cx="${x+32 + i*13}" cy="${y+72.5}" r="3" fill="#D1D5DB" stroke="#9CA3AF"/>`;
           s += `<line x1="${x+30 + i*13}" y1="${y+72.5}" x2="${x+34 + i*13}" y2="${y+72.5}" stroke="#4B5563" stroke-width="1"/>`;
        }
        // Motor Left (2 pins)
        s += `<rect x="${x-5}" y="${y+20}" width="15" height="30" fill="#1E40AF" stroke="#1E3A8A" rx="1"/>`;
        s += `<circle cx="${x+2.5}" cy="${y+27}" r="3" fill="#D1D5DB" stroke="#9CA3AF"/>`;
        s += `<circle cx="${x+2.5}" cy="${y+42}" r="3" fill="#D1D5DB" stroke="#9CA3AF"/>`;
        // Motor Right (2 pins)
        s += `<rect x="${x+80}" y="${y+20}" width="15" height="30" fill="#1E40AF" stroke="#1E3A8A" rx="1"/>`;
        s += `<circle cx="${x+87.5}" cy="${y+27}" r="3" fill="#D1D5DB" stroke="#9CA3AF"/>`;
        s += `<circle cx="${x+87.5}" cy="${y+42}" r="3" fill="#D1D5DB" stroke="#9CA3AF"/>`;

        // Capacitors
        s += `<circle cx="${x+15}" cy="${y+55}" r="6" fill="#1F2937" stroke="#9CA3AF" stroke-width="1.5"/>`;
        s += `<circle cx="${x+75}" cy="${y+55}" r="6" fill="#1F2937" stroke="#9CA3AF" stroke-width="1.5"/>`;

        s += `<text x="${x+45}" y="${y+90}" fill="#EF4444" font-size="7" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'sensor': (x, y, label, type) => {
        let s = ``;
        if (type.includes('ultrasonic') || type.includes('hcsr')) {
           // Blue PCB
           s += `<rect x="${x}" y="${y}" width="80" height="40" fill="#1E3A8A" stroke="#1E40AF" stroke-width="1.5" rx="2"/>`;
           // Transducers (cylinders with mesh)
           s += `<circle cx="${x+20}" cy="${y+20}" r="14" fill="url(#silverGrad)" stroke="#9CA3AF" stroke-width="2"/>`;
           s += `<circle cx="${x+20}" cy="${y+20}" r="11" fill="#111827"/>`; // Mesh
           s += `<circle cx="${x+60}" cy="${y+20}" r="14" fill="url(#silverGrad)" stroke="#9CA3AF" stroke-width="2"/>`;
           s += `<circle cx="${x+60}" cy="${y+20}" r="11" fill="#111827"/>`;
           // Crystal
           s += `<rect x="${x+35}" y="${y+10}" width="10" height="5" fill="#D1D5DB" rx="1"/>`;
           // 4 Pins at bottom
           for(let i=0; i<4; i++) {
               s += `<rect x="${x+27.5 + i*6}" y="${y+40}" width="2" height="8" fill="#EAB308"/>`;
               s += `<circle cx="${x+28.5 + i*6}" cy="${y+38}" r="1.5" fill="#EAB308"/>`;
           }
           s += `<text x="${x+40}" y="${y-5}" fill="#38BDF8" font-size="6" text-anchor="middle" font-weight="bold" font-family="monospace">${label}</text>`;
        } else if (type.includes('ir')) {
           s += `<rect x="${x}" y="${y}" width="60" height="30" fill="#047857" stroke="#065F46" rx="2"/>`;
           s += `<rect x="${x-5}" y="${y+5}" width="10" height="10" fill="#D1D5DB" rx="1"/>`; // Potentiometer
           s += `<circle cx="${x}" cy="${y+10}" r="3" fill="#F59E0B"/>`; 
           // LEDs
           s += `<circle cx="${x+50}" cy="${y+10}" r="5" fill="#2D1B00" stroke="#F59E0B" stroke-width="1"/>`; // IR Emitter
           s += `<circle cx="${x+50}" cy="${y+22}" r="5" fill="#001A2D" stroke="#38BDF8" stroke-width="1"/>`; // Photodiode
           // 3 Pins
           for(let i=0; i<3; i++) {
               s += `<rect x="${x+10 + i*6}" y="${y+30}" width="2" height="8" fill="#EAB308"/>`;
           }
           s += `<text x="${x+30}" y="${y-5}" fill="#10B981" font-size="6" text-anchor="middle" font-family="monospace">${label}</text>`;
        } else {
           // Default sensor
           s += `<rect x="${x}" y="${y}" width="50" height="50" fill="#1E3A8A" stroke="#1E40AF" rx="2"/>`;
           s += `<circle cx="${x+25}" cy="${y+25}" r="15" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="2"/>`;
           s += `<text x="${x+25}" y="${y+5}" fill="#FFFFFF" font-size="5" text-anchor="middle">${label}</text>`;
        }
        return s;
      },

      'motor': (x, y, label) => {
        let s = ``;
        // TT Gear Motor style
        s += `<rect x="${x}" y="${y}" width="80" height="35" fill="#EAB308" stroke="#CA8A04" stroke-width="1" rx="4"/>`;
        s += `<rect x="${x+40}" y="${y+5}" width="50" height="25" fill="#D1D5DB" stroke="#9CA3AF" rx="2"/>`; // metal casing
        s += `<rect x="${x-10}" y="${y+15}" width="20" height="5" fill="#FFFFFF" stroke="#000" rx="1"/>`; // shaft
        s += `<circle cx="${x-5}" cy="${y+17.5}" r="1.5" fill="#000"/>`;
        // terminals
        s += `<rect x="${x+85}" y="${y+10}" width="5" height="5" fill="#EF4444"/>`;
        s += `<rect x="${x+85}" y="${y+20}" width="5" height="5" fill="#111827"/>`;
        s += `<text x="${x+40}" y="${y+45}" fill="#64748B" font-size="7" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'relay': (x, y, label) => {
        let s = ``;
        s += `<rect x="${x}" y="${y}" width="70" height="50" fill="#047857" stroke="#065F46" stroke-width="1.5" rx="3"/>`;
        // Blue relay cube
        s += `<rect x="${x+25}" y="${y+5}" width="40" height="30" fill="#1E3A8A" stroke="#1E40AF" rx="2"/>`;
        s += `<text x="${x+45}" y="${y+20}" fill="#FFFFFF" font-size="6" text-anchor="middle" font-weight="bold">SONGLE</text>`;
        s += `<text x="${x+45}" y="${y+27}" fill="#E2E8F0" font-size="4" text-anchor="middle">10A 250VAC</text>`;
        // Green screw terminal
        s += `<rect x="${x+5}" y="${y+5}" width="15" height="30" fill="#10B981" stroke="#059669" rx="1"/>`;
        s += `<circle cx="${x+12.5}" cy="${y+10}" r="3" fill="#D1D5DB" stroke="#9CA3AF"/>`;
        s += `<circle cx="${x+12.5}" cy="${y+20}" r="3" fill="#D1D5DB" stroke="#9CA3AF"/>`;
        s += `<circle cx="${x+12.5}" cy="${y+30}" r="3" fill="#D1D5DB" stroke="#9CA3AF"/>`;
        // Pins
        s += `<rect x="${x+35}" y="${y+50}" width="2" height="8" fill="#EAB308"/>`;
        s += `<rect x="${x+45}" y="${y+50}" width="2" height="8" fill="#EAB308"/>`;
        s += `<rect x="${x+55}" y="${y+50}" width="2" height="8" fill="#EAB308"/>`;
        s += `<text x="${x+35}" y="${y+65}" fill="#10B981" font-size="6" text-anchor="middle" font-family="monospace">${label}</text>`;
        return s;
      },

      'generic': (x, y, label, color) => {
        let s = ``;
        s += `<rect x="${x}" y="${y}" width="60" height="40" fill="#1F2937" stroke="${color}" stroke-width="2" rx="3"/>`;
        s += `<rect x="${x+10}" y="${y+10}" width="40" height="20" fill="#111827" rx="1"/>`;
        s += `<text x="${x+30}" y="${y+23}" fill="${color}" font-size="6" text-anchor="middle" font-family="monospace" font-weight="bold">${label.slice(0,10)}</text>`;
        for(let i=0; i<4; i++) {
           s += `<rect x="${x+15 + i*10}" y="${y+40}" width="2" height="6" fill="#EAB308"/>`;
        }
        return s;
      }
    };"""

    # --- 2. Replace PCB generator logic with KiCad Style ---
    # In server.js, there is `app.post('/api/pcb/generate'`
    # The SVG generation uses `boardW` and `boardH`
    # We will replace the entire SVG concatenation block inside `generateFallbackPcb` or the endpoint.

    # Instead of brittle replacements, we'll use regex to swap out the specific `compVisuals` definition
    content = re.sub(r"const compVisuals = \{.*?'generic': \(x, y, label, color\) => \{[^\}]*\}\s*\};", new_comp_visuals, content, flags=re.DOTALL)

    # For the PCB output, we will find where `let pcbSvg = ` starts and replace the drawing logic.
    # Actually, the user's PCB generator creates 2D footprints. Let's find the pcbSvg builder.
    pcb_svg_builder_start = content.find("let pcbSvg = `<svg viewBox=")
    
    if pcb_svg_builder_start != -1:
        # We need to replace from pcbSvg to the end of that block.
        # Let's just do a string replacement for the board background to add a copper pour and mounting holes.
        content = content.replace(
            "`<rect width=\"${boardW}\" height=\"${boardH}\" fill=\"#0A3A20\" rx=\"10\"/>`;",
            """`<rect width="${boardW}" height="${boardH}" fill="#0A3A20" rx="10"/>`;
    // Copper pour polygon with clearance
    pcbSvg += `<rect x="5" y="5" width="${boardW-10}" height="${boardH-10}" fill="#124726" rx="8" opacity="0.9"/>`;
    // Mounting holes (Gold annular rings)
    [ [15,15], [boardW-15,15], [15,boardH-15], [boardW-15,boardH-15] ].forEach(([hx, hy]) => {
      pcbSvg += `<circle cx="${hx}" cy="${hy}" r="6" fill="#FBBF24"/>`;
      pcbSvg += `<circle cx="${hx}" cy="${hy}" r="3" fill="#0A3A20"/>`; // empty hole
    });
    // Add silver gradient def
    pcbSvg = pcbSvg.replace('<defs>', '<defs><linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="50%" stop-color="#9CA3AF"/><stop offset="100%" stop-color="#4B5563"/></linearGradient>');
"""
        )

        # Replace component boxes with Footprints (Pads + Silkscreen)
        # Old: pcbSvg += `<rect x="${cx - w/2}" y="${cy - h/2}" width="${w}" height="${h}" fill="${fp.color}" stroke="#000" stroke-width="2" rx="4"/>`;
        # We want to remove the filled rect and just draw the silkscreen outline.
        content = re.sub(
            r'pcbSvg \+= `<rect x="\$\{cx - w/2\}" y="\$\{cy - h/2\}" width="\$\{w\}" height="\$\{h\}" fill="\$\{fp\.color\}" stroke="#[^"]+" stroke-width="2" rx="4"/>`;',
            """// Silkscreen outline instead of 3D box
      pcbSvg += `<rect x="${cx - w/2}" y="${cy - h/2}" width="${w}" height="${h}" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="2,2" rx="2"/>`;
      pcbSvg += `<text x="${cx}" y="${cy}" fill="#FFFFFF" font-size="8" text-anchor="middle" font-family="monospace">${fp.ref}</text>`;""",
            content
        )

        # Ensure pads are gold
        content = content.replace('fill="#FBBF24"', 'fill="#FBBF24"') # (It's already gold if my previous script ran)
        content = content.replace('fill="#D1D5DB"', 'fill="#D1D5DB"') # Silver
        
        # Replace track colors if not already KiCad
        content = content.replace('stroke="#E53935"', 'stroke="#E53935"') 
        content = content.replace('stroke="#1E88E5"', 'stroke="#1E88E5"') 

    # For circuit SVG, we also need to add the silverGrad definition if it's missing
    if '<defs>' in content and 'silverGrad' not in content:
        content = content.replace('<defs>', '<defs>\n    <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E5E7EB"/><stop offset="50%" stop-color="#9CA3AF"/><stop offset="100%" stop-color="#4B5563"/></linearGradient>')


    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Realistic SVG upgrader finished!")

if __name__ == "__main__":
    upgrade_to_realistic(sys.argv[1])
