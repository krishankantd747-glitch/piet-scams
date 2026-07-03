import re
import sys

def upgrade_svgs(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We will segment the file to apply replacements only where needed
    
    # --- 1. generateFallbackCircuit & wiring ---
    # Replace dark backgrounds with crisp light backgrounds
    content = content.replace('background:#0F172A;', 'background:#F8FAFC;')
    content = content.replace('fill="#111827"', 'fill="#FFFFFF"')
    # Schematic Grid pattern
    content = content.replace('<circle cx="2" cy="2" r="1" fill="#334155"/>', '<circle cx="2" cy="2" r="1" fill="#E2E8F0"/>')
    # Fallback header box
    content = content.replace('fill="#1E293B" stroke="#EF4444"', 'fill="#FFFFFF" stroke="#CBD5E1"')
    content = content.replace('fill="#F8FAFC" font-size="11" font-weight="bold">FALLBACK SCHEMATIC', 'fill="#0F172A" font-size="11" font-weight="bold">FALLBACK SCHEMATIC')
    # Fallback MCU text
    content = content.replace('fill="#FFFFFF" font-size="14" font-weight="bold" text-anchor="middle">${mcu}</text>', 'fill="#0F172A" font-size="14" font-weight="bold" text-anchor="middle">${mcu}</text>')
    content = content.replace('fill="#FFFFFF" font-size="9" font-weight="bold" text-anchor="middle">${c.slice(0, 16)}</text>', 'fill="#0F172A" font-size="9" font-weight="bold" text-anchor="middle">${c.slice(0, 16)}</text>')
    # Fallback Wiring MCU
    content = content.replace('fill="#991B1B" stroke="#B91C1C"', 'fill="#FFFFFF" stroke="#2563EB"')
    content = content.replace('fill="#FCA5A5" font-size="10" text-anchor="middle">SAFE FALLBACK WIRING', 'fill="#64748B" font-size="10" text-anchor="middle">SAFE FALLBACK WIRING')

    # --- 2. compVisuals (Components library for Circuit) ---
    # Arduino Uno: Darken blue, crisp white silk
    content = content.replace('fill="#1C4E80" stroke="#2D7DD2"', 'fill="#005C8A" stroke="#00476B"')
    content = content.replace('fill="#1A3A5C" stroke="#1E6091"', 'fill="#005C8A" stroke="#005C8A"')
    content = content.replace('fill="#B8860B" stroke="#555"', 'fill="#EAB308" stroke="#CA8A04"') # Gold pins
    
    # Generic module background
    content = content.replace('fill="#0F172A" stroke="${color}"', 'fill="#FFFFFF" stroke="${color}"')
    content = content.replace('fill="#0F172A" stroke="#EF4444"', 'fill="#FFFFFF" stroke="#EF4444"')
    content = content.replace('fill="#0F172A" stroke="#22C55E"', 'fill="#FFFFFF" stroke="#22C55E"')
    content = content.replace('fill="#1a1a1a" stroke="${color}"', 'fill="#F1F5F9" stroke="${color}"')
    
    # Generic text fixes so it shows up on white backgrounds
    content = content.replace('fill="#FFFFFF" font-size="6" text-anchor="middle" font-family="monospace">${label}</text>', 'fill="#0F172A" font-size="6" text-anchor="middle" font-family="monospace">${label}</text>')
    content = content.replace('fill="#FFFFFF" font-size="9" font-weight="bold" text-anchor="middle">${c.slice(0, 16)}', 'fill="#0F172A" font-size="9" font-weight="bold" text-anchor="middle">${c.slice(0, 16)}')
    
    # --- 3. PCB Layout & Wiring logic (generateFallbackPcb & AI PCB routes) ---
    # Convert standard PCB background to KiCad Green
    content = content.replace('background:#0F172A;', 'background:#F8FAFC;') # For overall SVGs
    
    # If the PCB has a board rect
    content = content.replace('fill="#111827" stroke="#334155"', 'fill="#0A3A20" stroke="#082A17"') # Board outline
    
    # PCB tracks
    content = content.replace('stroke="#3B82F6" stroke-width="2"', 'stroke="#1E88E5" stroke-width="2"') # Bottom track (KiCad blue)
    content = content.replace('stroke="#EF4444" stroke-width="2"', 'stroke="#E53935" stroke-width="2"') # Top track (KiCad red)
    
    # Vias and Pads
    content = content.replace('fill="#F59E0B"', 'fill="#FBBF24"') # Gold pads
    content = content.replace('fill="#10B981"', 'fill="#D1D5DB"') # Silver pads 
    content = content.replace('fill="#8B5CF6"', 'fill="#9CA3AF"') # Silver pads
    
    # PCB Silkscreen
    content = content.replace('fill="#94A3B8" font-size="10"', 'fill="#FFFFFF" font-size="10"')
    content = content.replace('fill="#64748B" font-size="12"', 'fill="#FFFFFF" font-size="12"')
    content = content.replace('fill="#334155"', 'fill="#E2E8F0"') # Silk details
    
    # Make sure text on KiCad green board is white
    content = content.replace('fill="#E2E8F0"', 'fill="#FFFFFF"')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print("SVG styles updated to professional KiCad-like theme.")

if __name__ == "__main__":
    upgrade_svgs(sys.argv[1])
