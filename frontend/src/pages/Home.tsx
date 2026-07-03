import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────
   CAROUSEL IMAGES — 44 real engineering / lab / student photos
───────────────────────────────────────────────────────── */
const carouselImages = [
  { src: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1200', alt: 'Developer Coding' },
  { src: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=1200', alt: 'PCB Circuit Board' },
  { src: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&q=80&w=1200', alt: 'Circuit Schematic' },
  { src: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1200', alt: 'Robotics Lab' },
  { src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&q=80&w=1200', alt: 'Drone Flying' },
  { src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200', alt: 'Engineering Team' },
  { src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200', alt: 'Electronics Closeup' },
  { src: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&q=80&w=1200', alt: 'Hardware Prototype' },
  { src: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=1200', alt: 'AI Development' },
  { src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200', alt: 'Students Innovation' },
  { src: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1200', alt: 'Advanced Electronics' },
  { src: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=1200', alt: 'Microprocessor' },
  { src: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&q=80&w=1200', alt: 'Industrial Robot' },
  { src: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&q=80&w=1200', alt: 'Aeromodelling' },
  { src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=1200', alt: 'IoT Smart Home' },
  { src: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=1200', alt: 'Embedded Code' },
  { src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1200', alt: 'Engineering Students' },
  { src: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&q=80&w=1200', alt: 'Lab Work' },
  { src: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1200', alt: 'AI Robotics' },
  { src: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=1200', alt: 'PCB Assembly' },
  { src: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200', alt: 'Multi-Rotor Drone' },
  { src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200', alt: 'Project Expo' },
  { src: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=1200', alt: 'Electronics Workshop' },
  { src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200', alt: 'Team Engineering' },
  { src: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&q=80&w=1200', alt: 'Smart Agriculture' },
  { src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200', alt: 'Data Analytics' },
  { src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200', alt: 'Neural Network' },
  { src: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&q=80&w=1200', alt: 'Microcontroller' },
  { src: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&q=80&w=1200', alt: 'Solar Energy' },
  { src: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&q=80&w=1200', alt: 'Engineering Student' },
  { src: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1200', alt: 'Laptop Dev' },
  { src: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=1200', alt: 'Robotics Components' },
  { src: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&q=80&w=1200', alt: 'Smart City' },
  { src: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200', alt: 'Cybersecurity IoT' },
  { src: 'https://images.unsplash.com/photo-1491895200222-0fc4a4c35e18?auto=format&fit=crop&q=80&w=1200', alt: 'Power Electronics' },
  { src: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=1200', alt: 'IC Chip Close' },
  { src: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=1200', alt: 'Lab Equipment' },
  { src: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=1200', alt: 'PPT Dashboard' },
  { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200', alt: 'Report Documents' },
  { src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1200', alt: 'Student Collab' },
  { src: 'https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?auto=format&fit=crop&q=80&w=1200', alt: 'IDEA Lab' },
  { src: 'https://images.unsplash.com/photo-1583508915901-b5f84c1dcde1?auto=format&fit=crop&q=80&w=1200', alt: 'ECG Monitor Wearable' },
  { src: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200', alt: 'Microcontroller Closeup' },
  { src: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&q=80&w=1200', alt: 'Aero Wing' },
];

/* ─────────────────────────────────────────────────────────
   MARQUEE IMAGES — real photos for scrolling gallery
───────────────────────────────────────────────────────── */
const marqueeImages = [
  { src: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=400&q=75&fit=crop', label: 'Circuit Design' },
  { src: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&q=75&fit=crop', label: 'PCB Layout' },
  { src: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&q=75&fit=crop', label: 'Robotics' },
  { src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&q=75&fit=crop', label: 'Drone Projects' },
  { src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=75&fit=crop', label: 'IoT Systems' },
  { src: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&q=75&fit=crop', label: 'Embedded Code' },
  { src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=75&fit=crop', label: 'Student Projects' },
  { src: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=400&q=75&fit=crop', label: 'Industrial Robot' },
  { src: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=400&q=75&fit=crop', label: 'Aeromodelling' },
  { src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&q=75&fit=crop', label: 'Project Expo' },
  { src: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400&q=75&fit=crop', label: 'Smart Agriculture' },
  { src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=75&fit=crop', label: 'AI Edge ML' },
  { src: 'https://images.unsplash.com/photo-1491895200222-0fc4a4c35e18?w=400&q=75&fit=crop', label: 'Power Electronics' },
  { src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=75&fit=crop', label: 'Smart Traffic' },
  { src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=75&fit=crop', label: 'Engineering Lab' },
  { src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=75&fit=crop', label: 'IEEE Reports' },
  { src: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=400&q=75&fit=crop', label: 'Solar Energy' },
  { src: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=75&fit=crop', label: 'Electronics Workshop' },
  { src: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=75&fit=crop', label: 'AI Robotics' },
  { src: 'https://images.unsplash.com/photo-1583508915901-b5f84c1dcde1?w=400&q=75&fit=crop', label: 'Biomedical Devices' },
];

/* ─────────────────────────────────────────────────────────
   FEATURES
───────────────────────────────────────────────────────── */
const features = [
  { icon: '⚡', title: 'AI Circuit Generator', desc: 'Describe your project — get a complete schematic with BOM, component values and netlist.' },
  { icon: '🖥', title: 'PCB Layout Engine', desc: 'Professional multi-layer PCB designs exported as KiCad-compatible files, ready for fabrication.' },
  { icon: '💻', title: 'Embedded Code AI', desc: 'Production-grade Arduino, ESP32, STM32 and Raspberry Pi firmware generated in seconds.' },
  { icon: '📄', title: 'IEEE Report Writer', desc: 'Full 15-25 page academic reports in IEEE format with abstract, methodology and citations.' },
  { icon: '📊', title: 'PPT Generator', desc: 'Structured 12-slide presentations with diagrams, analysis tables and professional design.' },
  { icon: '🏆', title: 'Patent Drafts', desc: 'Complete patent applications with claims, prior art search and abstract — ready to file.' },
  { icon: '🎓', title: 'Viva Preparation', desc: '50+ examiner-grade Q&A sets curated specifically for your project domain and technology.' },
  { icon: '💡', title: 'Project Idea AI', desc: 'Domain-specific project suggestions ranked by innovation score with full feasibility analysis.' },
];



/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function Home() {
  const navigate = useNavigate();
  const [carIdx, setCarIdx]     = useState(0);
  const [fading, setFading]     = useState(true);
  const [scrolled, setScrolled] = useState(false);

  /* Auto-advance carousel every 2s */
  useEffect(() => {
    const t = setInterval(() => {
      setFading(false);
      setTimeout(() => {
        setCarIdx(p => (p + 1) % carouselImages.length);
        setFading(true);
      }, 200);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  /* Navbar scroll */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      {/* ══════════════════════════════════════════════════
          GLOBAL STYLES  (matching AI Ignite Circuit CSS)
      ══════════════════════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Orbitron:wght@700;800;900&display=swap');

        :root {
          --primary:        #2563eb;
          --primary-hover:  #1d4ed8;
          --accent-orange:  #f97316;
          --bg-dark:        #0f172a;
          --bg-dark2:       #111827;
          --bg-white:       #ffffff;
          --bg-gray:        #f8fafc;
          --text-main:      #0f172a;
          --text-muted:     #64748b;
          --border:         #e2e8f0;
          --radius-md:      8px;
          --radius-lg:      16px;
          --radius-xl:      24px;
          --shadow-xl:      0 20px 60px rgba(0,0,0,.18);
          --transition:     all 0.65s cubic-bezier(0.19,1,0.22,1);
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Inter', sans-serif;
          color: var(--text-main);
          background: var(--bg-white);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Scrollbar ─────────────────────────────────── */
        ::-webkit-scrollbar { width: 7px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--primary); }

        /* ── Buttons ───────────────────────────────────── */
        .pf-btn-primary {
          background: var(--primary);
          color: #fff;
          padding: 13px 28px;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 15px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: var(--transition);
          box-shadow: 0 4px 14px rgba(37,99,235,.35);
          font-family: inherit;
        }
        .pf-btn-primary:hover {
          background: var(--primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37,99,235,.45);
        }

        .pf-btn-outline {
          background: rgba(255,255,255,.08);
          color: #e2e8f0;
          padding: 13px 26px;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 15px;
          border: 1.5px solid rgba(255,255,255,.18);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: var(--transition);
          font-family: inherit;
          backdrop-filter: blur(8px);
        }
        .pf-btn-outline:hover {
          background: rgba(255,255,255,.16);
          border-color: rgba(255,255,255,.38);
          transform: translateY(-2px);
        }

        /* ── AI Pulse Button (Navbar) ──────────────────── */
        @keyframes aiGlow {
          0%  { box-shadow: 0 0 8px rgba(168,85,247,.4); }
          50% { box-shadow: 0 0 18px rgba(236,72,153,.7); }
          100%{ box-shadow: 0 0 8px rgba(168,85,247,.4); }
        }
        @keyframes sparkle {
          0%,100%{ opacity:0; transform:scale(.5); }
          50%    { opacity:1; transform:scale(1.2); }
        }
        .ai-pulse-btn {
          background: linear-gradient(90deg, #a855f7, #ec4899);
          color: #fff !important;
          padding: 8px 18px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,.35);
          cursor: pointer;
          font-family: inherit;
          animation: aiGlow 2.5s infinite alternate;
          transition: all .3s;
          text-decoration: none;
          position: relative;
        }
        .ai-pulse-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }

        /* ── Navbar ────────────────────────────────────── */
        .pf-navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1000;
          padding: 0 48px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,.88);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(226,232,240,.8);
          transition: var(--transition);
        }
        .pf-navbar.scrolled {
          box-shadow: 0 2px 24px rgba(0,0,0,.06);
          background: rgba(255,255,255,.97);
        }
        .pf-brand {
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          font-size: 1.2rem;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pf-brand-icon {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(37,99,235,.35);
          flex-shrink: 0;
        }
        .pf-nav-links { display: flex; gap: 6px; }
        .pf-nav-link {
          padding: 7px 15px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-muted);
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: all .2s;
          position: relative;
        }
        .pf-nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 50%; right: 50%;
          height: 2px;
          background: var(--primary);
          border-radius: 999px;
          transition: all .3s;
        }
        .pf-nav-link:hover { color: var(--text-main); background: #f1f5f9; }
        .pf-nav-link:hover::after { left: 12px; right: 12px; }
        .pf-nav-actions { display: flex; align-items: center; gap: 10px; }
        .pf-login-btn {
          padding: 8px 20px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          background: none;
          border: 1.5px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: all .2s;
        }
        .pf-login-btn:hover { border-color: var(--primary); color: var(--primary); background: #eff6ff; }
        .pf-signup-btn {
          padding: 9px 22px;
          font-size: 14px;
          font-weight: 700;
          color: white;
          background: var(--primary);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: all .2s;
          box-shadow: 0 3px 10px rgba(37,99,235,.3);
        }
        .pf-signup-btn:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,.4); }

        /* ── HERO ──────────────────────────────────────── */
        .pf-hero {
          min-height: 100vh;
          background: linear-gradient(145deg, #f0f7ff 0%, #ffffff 55%, #f5f3ff 100%);
          display: flex;
          align-items: center;
          padding-top: 68px;
          position: relative;
          overflow: hidden;
        }

        /* subtle top glow */
        .pf-hero::after {
          content: '';
          position: absolute;
          top: -200px; left: 10%;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .pf-hero-inner {
          max-width: 1320px;
          margin: 0 auto;
          padding: 60px 48px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: center;
          position: relative;
          z-index: 1;
          width: 100%;
        }

        /* ── Hero Left ─────────────────────────────────── */
        .pf-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          color: #1d4ed8;
          text-transform: uppercase;
          letter-spacing: .07em;
          margin-bottom: 28px;
        }
        .pf-hero-badge span.dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #3b82f6;
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(.8); }
        }

        .pf-hero-title {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(30px, 3.8vw, 52px);
          font-weight: 900;
          line-height: 1.12;
          color: #0f172a;
          margin-bottom: 20px;
          letter-spacing: -.01em;
        }
        .pf-hero-title .accent-blue   { color: #2563eb; }
        .pf-hero-title .accent-orange { color: var(--accent-orange); }

        .pf-hero-sub {
          font-size: 17px;
          line-height: 1.75;
          color: #475569;
          margin-bottom: 36px;
          max-width: 490px;
        }

        .pf-hero-actions { display: flex; gap: 14px; margin-bottom: 36px; flex-wrap: wrap; }

        .pf-hero-hint {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
        }

        /* Feature checkmarks */
        .pf-feature-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 24px;
          margin-top: 32px;
        }
        .pf-feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }
        .pf-feature-item .check {
          width: 18px; height: 18px;
          background: rgba(34,197,94,.15);
          border: 1px solid rgba(34,197,94,.3);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 10px;
        }

        /* ── Hero Right: Carousel ──────────────────────── */
        .pf-hero-visual {
          position: relative;
        }
        .pf-carousel-wrap {
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,.14), 0 8px 24px rgba(37,99,235,.12);
          border: 1px solid #e2e8f0;
          position: relative;
          aspect-ratio: 4/3;
          background: #f1f5f9;
        }
        .pf-carousel-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity .25s ease;
        }
        .pf-carousel-img.visible { opacity: 1; }
        .pf-carousel-img.hidden  { opacity: 0; }
        /* gradient overlay */
        .pf-carousel-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(15,23,42,.9) 0%, rgba(15,23,42,.2) 50%, transparent 100%);
          pointer-events: none;
        }
        .pf-carousel-label {
          position: absolute;
          bottom: 22px; left: 22px; right: 22px;
          z-index: 2;
        }
        .pf-carousel-label h3 {
          font-family: 'Orbitron', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }
        .pf-carousel-label p { font-size: 12px; color: #94a3b8; }
        .pf-dots {
          display: flex; gap: 5px; margin-top: 10px; flex-wrap: wrap;
        }
        .pf-dot {
          height: 4px;
          border-radius: 999px;
          background: rgba(255,255,255,.25);
          cursor: pointer;
          transition: all .3s;
          flex-shrink: 0;
        }
        .pf-dot.active { background: #3b82f6; }

        /* LIVE badge on carousel */
        .pf-live-badge {
          position: absolute;
          top: 16px; right: 16px;
          z-index: 3;
          display: flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          background: rgba(15,23,42,.7);
          border: 1px solid rgba(34,197,94,.3);
          border-radius: 999px;
          backdrop-filter: blur(8px);
          font-size: 11px;
          font-weight: 700;
          color: #22c55e;
        }
        .pf-live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse-dot 1.5s infinite;
        }

        /* Floating chips */
        .pf-chip {
          position: absolute;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 16px;
          display: flex; align-items: center; gap: 10px;
          box-shadow: 0 8px 28px rgba(0,0,0,.10);
          z-index: 4;
        }
        .pf-chip-icon { font-size: 18px; }
        .pf-chip-text { font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.3; }
        .pf-chip-sub  { font-size: 10px; color: #64748b; }

        /* ── SLIDER / IMAGE MARQUEE SECTION ───────────── */
        .pf-slider-section {
          background: #f8fafc;
          padding: 56px 0;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .pf-slider-label {
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: #94a3b8;
          margin-bottom: 28px;
        }
        .pf-marquee-row { overflow: hidden; margin-bottom: 14px; }
        .pf-marquee-row-2 { overflow: hidden; }
        .pf-marquee-track {
          display: flex;
          gap: 14px;
          width: max-content;
        }
        @keyframes marq  { 0%{ transform:translateX(0);    } 100%{ transform:translateX(-50%); } }
        @keyframes marq2 { 0%{ transform:translateX(-50%); } 100%{ transform:translateX(0);    } }
        .pf-marquee-track   { animation: marq  35s linear infinite; }
        .pf-marquee-track-r { animation: marq2 40s linear infinite; }
        .pf-marquee-img-card {
          flex-shrink: 0;
          width: 200px;
          height: 130px;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(0,0,0,.07);
        }
        .pf-marquee-img-card img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .pf-marquee-img-label {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 6px 10px;
          background: linear-gradient(to top, rgba(15,23,42,.82), transparent);
          font-size: 11px;
          font-weight: 700;
          color: white;
        }

        /* ── SECTIONS common ───────────────────────────── */
        .pf-section { padding: 96px 48px; }
        .pf-section-inner { max-width: 1280px; margin: 0 auto; }
        .pf-section-badge {
          display: inline-block;
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .1em;
          margin-bottom: 16px;
        }
        .pf-section-title {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(26px, 3vw, 42px);
          font-weight: 900;
          color: var(--text-main);
          letter-spacing: -.02em;
          line-height: 1.15;
          margin-bottom: 14px;
        }
        .pf-section-sub {
          font-size: 16px;
          color: var(--text-muted);
          max-width: 560px;
          line-height: 1.7;
        }
        .pf-section-header { text-align: center; margin-bottom: 56px; }
        .pf-section-header .pf-section-sub { margin: 0 auto; }

        /* ── FEATURES GRID ─────────────────────────────── */
        .pf-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .pf-feature-card {
          background: #fff;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 28px 24px;
          transition: all .3s;
          cursor: default;
        }
        .pf-feature-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 8px 32px rgba(37,99,235,.1);
          transform: translateY(-4px);
        }
        .pf-feature-icon {
          font-size: 32px;
          margin-bottom: 14px;
        }
        .pf-feature-card h3 {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 8px;
          font-family: inherit;
        }
        .pf-feature-card p { font-size: 13px; color: var(--text-muted); line-height: 1.65; }

        /* ── PROJECT GRID ──────────────────────────────── */
        .pf-projects-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .pf-proj-card {
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: 0 2px 12px rgba(0,0,0,.05);
          cursor: pointer;
          transition: all .3s;
        }
        .pf-proj-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(0,0,0,.12); border-color: #3b82f6; }
        .pf-proj-img-wrap { height: 190px; overflow: hidden; position: relative; }
        .pf-proj-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }
        .pf-proj-card:hover .pf-proj-img-wrap img { transform: scale(1.06); }
        .pf-proj-ai-badge {
          position: absolute;
          top: 12px; right: 12px;
          padding: 3px 10px;
          background: rgba(15,23,42,.75);
          color: #93c5fd;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(59,130,246,.3);
        }
        .pf-proj-body { padding: 20px; }
        .pf-proj-body h3 { font-size: 15px; font-weight: 800; color: var(--text-main); margin-bottom: 8px; }
        .pf-proj-body p  { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 14px; }
        .pf-proj-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .pf-proj-tag {
          padding: 3px 10px;
          background: var(--bg-gray);
          border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
        }
        .pf-proj-cta { margin-top: 14px; font-size: 13px; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 6px; }

        /* ── STATS ─────────────────────────────────────── */
        .pf-stats {
          background: #0f172a;
          padding: 48px;
        }
        .pf-stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 0;
        }
        .pf-stat {
          text-align: center;
          padding: 20px 24px;
          border-right: 1px solid rgba(255,255,255,.07);
        }
        .pf-stat:last-child { border-right: none; }
        .pf-stat-val {
          font-family: 'Orbitron', sans-serif;
          font-size: 36px;
          font-weight: 900;
          color: #f1f5f9;
          letter-spacing: -.03em;
          margin-bottom: 4px;
        }
        .pf-stat-val span { color: #3b82f6; }
        .pf-stat-label { font-size: 13px; color: #64748b; font-weight: 500; }

        /* ── CTA SECTION ───────────────────────────────── */
        .pf-cta-section {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          padding: 100px 48px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .pf-cta-section::before {
          content: '';
          position: absolute;
          top: -150px; left: 50%;
          transform: translateX(-50%);
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,.2) 0%, transparent 70%);
          pointer-events: none;
        }
        .pf-cta-section::after {
          content: '';
          position: absolute;
          bottom: -100px; right: 5%;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .pf-cta-inner { max-width: 720px; margin: 0 auto; position: relative; z-index: 1; }
        .pf-cta-title {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(26px, 4vw, 48px);
          font-weight: 900;
          color: #f1f5f9;
          letter-spacing: -.025em;
          line-height: 1.1;
          margin-bottom: 20px;
        }
        .pf-cta-sub { font-size: 17px; color: #94a3b8; line-height: 1.75; margin-bottom: 44px; }
        .pf-cta-actions { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
        .pf-trust-row { display: flex; justify-content: center; gap: 28px; margin-top: 28px; flex-wrap: wrap; }
        .pf-trust-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; }

        /* ── FOOTER ────────────────────────────────────── */
        .pf-footer {
          background: #020617;
          padding: 36px 48px;
          border-top: 1px solid rgba(255,255,255,.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .pf-footer-brand {
          font-family: 'Orbitron', sans-serif;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pf-footer-links { display: flex; gap: 24px; }
        .pf-footer-link { font-size: 13px; color: #475569; text-decoration: none; transition: color .2s; }
        .pf-footer-link:hover { color: #94a3b8; }
        .pf-footer-copy { font-size: 12px; color: #334155; }

        /* ── Responsive ────────────────────────────────── */
        @media (max-width: 1024px) {
          .pf-hero-inner { grid-template-columns: 1fr; gap: 40px; padding: 40px 24px; }
          .pf-hero-visual { max-width: 600px; margin: 0 auto; width: 100%; }
          .pf-features-grid { grid-template-columns: repeat(2,1fr); }
          .pf-projects-grid { grid-template-columns: repeat(2,1fr); }
          .pf-navbar { padding: 0 20px; }
          .pf-section { padding: 64px 24px; }
          .pf-stats { padding: 36px 24px; }
          .pf-cta-section { padding: 72px 24px; }
          .pf-footer { padding: 24px 20px; flex-direction: column; align-items: flex-start; }
          .pf-stats-inner { grid-template-columns: repeat(2,1fr); }
          .pf-stat { border-right: none; border-bottom: 1px solid rgba(255,255,255,.07); }
          .pf-stat:nth-child(odd) { border-right: 1px solid rgba(255,255,255,.07); }
        }
        @media (max-width: 640px) {
          .pf-features-grid { grid-template-columns: 1fr; }
          .pf-projects-grid { grid-template-columns: 1fr; }
          .pf-hero-title { font-size: 26px; }
          .pf-nav-links { display: none; }
          .pf-feature-list { grid-template-columns: 1fr; }
          .pf-stats-inner { grid-template-columns: 1fr; }
          .pf-nav-actions .ai-pulse-btn { display: none; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════ */}
      <nav className={`pf-navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="pf-brand">
          <div className="pf-brand-icon">⚡</div>
          <span>
            <span style={{ color: '#3b82f6' }}>PROJECT</span>
            <span style={{ color: '#f97316' }}>FORGE</span>
            <span style={{ color: '#f1f5f9', fontSize: 12, display: 'block', fontFamily: 'Inter', fontWeight: 500, letterSpacing: 2, marginTop: -2 }}>AI ENGINEERING</span>
          </span>
        </div>

        <div className="pf-nav-links">
          {['Features', 'Pricing', 'Docs', 'Contact'].map(l => (
            <button key={l} className="pf-nav-link">{l}</button>
          ))}
        </div>

        <div className="pf-nav-actions">
          <button className="ai-pulse-btn" onClick={() => navigate('/signup')}>
            ✨ Ask AI Project Idea
          </button>
          <button className="pf-login-btn" onClick={() => navigate('/login')}>Log In</button>
          <button className="pf-signup-btn" onClick={() => navigate('/signup')}>Sign Up Free</button>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════
          HERO — Dark Navy, 2-Column
      ════════════════════════════════════════════════ */}
      <section className="pf-hero">
        <div className="pf-hero-inner">

          {/* ── LEFT ── */}
          <div>
            <div className="pf-hero-badge">
              <span className="dot" />
              Professional Engineering AI Platform
            </div>

            <h1 className="pf-hero-title">
              Forge Engineering<br />
              Projects <span className="accent-blue">with AI</span><br />
              <span className="accent-orange">In Seconds</span>
            </h1>

            <p className="pf-hero-sub">
              Generate circuits, PCB layouts, embedded code, IEEE reports, presentations, patents and viva preparation — all from a single prompt. Built for AICTE IDEA Labs &amp; engineering students across India.
            </p>

            <div className="pf-hero-actions">
              <button className="pf-btn-primary" onClick={() => navigate('/signup')}>
                ⚡ Start Building Free
              </button>
              <button className="pf-btn-outline" onClick={() => navigate('/projects')}>
                🗂 Browse Projects
              </button>
            </div>

            <div className="pf-hero-hint">
              <span>⚡</span> <span style={{ color: '#f97316', fontWeight: 700 }}>No sign-up needed</span>&nbsp;— generate your first project instantly
            </div>

            <div className="pf-feature-list">
              {[
                '✓ Unlimited Project Ideas',
                '✓ AI Powered by Gemini',
                '✓ Circuit + PCB Design',
                '✓ PPT + Report Generator',
                '✓ Patent Generator',
                '✓ Student Friendly',
                '✓ AICTE IDEA Lab Ready',
                '✓ IEEE Format Output',
              ].map((f, i) => (
                <div key={i} className="pf-feature-item">
                  <div className="check">✓</div>
                  <span>{f.replace('✓ ', '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Image Carousel ── */}
          <div className="pf-hero-visual">
            <div className="pf-carousel-wrap">
              {/* Images */}
              {carouselImages.map((img, i) => (
                <img
                  key={i}
                  src={img.src}
                  alt={img.alt}
                  className={`pf-carousel-img ${i === carIdx && fading ? 'visible' : 'hidden'}`}
                />
              ))}

              {/* Gradient overlay */}
              <div className="pf-carousel-overlay" />


            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          IMAGE GALLERY MARQUEE — Real engineering photos
      ════════════════════════════════════════════════ */}
      <section className="pf-slider-section">
        <div className="pf-slider-label">Powering the next generation of engineering students across India</div>

        {/* Row 1 — scrolls left */}
        <div className="pf-marquee-row">
          <div className="pf-marquee-track">
            {[...marqueeImages, ...marqueeImages].map((img, i) => (
              <div key={i} className="pf-marquee-img-card">
                <img src={img.src} alt={img.label} loading="lazy" />
                <div className="pf-marquee-img-label">{img.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right (reversed images) */}
        <div className="pf-marquee-row-2">
          <div className="pf-marquee-track pf-marquee-track-r">
            {[...[...marqueeImages].reverse(), ...[...marqueeImages].reverse()].map((img, i) => (
              <div key={i} className="pf-marquee-img-card">
                <img src={img.src} alt={img.label} loading="lazy" />
                <div className="pf-marquee-img-label">{img.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          STATS — dark section
      ════════════════════════════════════════════════ */}
      <div className="pf-stats">
        <div className="pf-stats-inner">
          {[
            { val: '127', unit: 'K+', label: 'Projects Generated' },
            { val: '18',  unit: 'K+', label: 'Active Engineers' },
            { val: '14',  unit: ' hrs', label: 'Avg. Time Saved' },
            { val: '98',  unit: '.4%', label: 'Satisfaction Rate' },
          ].map((s, i) => (
            <div key={i} className="pf-stat">
              <div className="pf-stat-val">{s.val}<span>{s.unit}</span></div>
              <div className="pf-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          FEATURES GRID
      ════════════════════════════════════════════════ */}
      <section className="pf-section" style={{ background: '#f8fafc' }}>
        <div className="pf-section-inner">
          <div className="pf-section-header">
            <div className="pf-section-badge" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }}>
              ALL-IN-ONE PLATFORM
            </div>
            <h2 className="pf-section-title">Bring Your Hardware Ideas<br />to Life</h2>
            <p className="pf-section-sub">8 AI modules. One unified workspace. Complete engineering coverage — from idea to submission-ready output.</p>
          </div>
          <div className="pf-features-grid">
            {features.map((f, i) => (
              <div key={i} className="pf-feature-card">
                <div className="pf-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ════════════════════════════════════════════════
          DARK CTA
      ════════════════════════════════════════════════ */}
      <section className="pf-cta-section">
        <div className="pf-cta-inner">
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚡</div>
          <h2 className="pf-cta-title">
            Your Engineering Projects<br />
            <span style={{ color: '#3b82f6' }}>Deserve Better Tools</span>
          </h2>
          <p className="pf-cta-sub">
            Join 18,200+ students and engineers using ProjectForge AI to design, build and present extraordinary engineering projects — faster than ever before.
          </p>
          <div className="pf-cta-actions">
            <button className="pf-btn-primary" onClick={() => navigate('/signup')} style={{ fontSize: 16, padding: '15px 36px' }}>
              🚀 Start for Free — No Credit Card
            </button>
            <button className="pf-btn-outline" onClick={() => navigate('/login')} style={{ fontSize: 15, padding: '15px 28px' }}>
              Sign In →
            </button>
          </div>
          <div className="pf-trust-row">
            {['Free Forever Plan', 'No Watermarks', 'IEEE Compliant', 'AICTE IDEA Lab Ready'].map((item, i) => (
              <div key={i} className="pf-trust-item">
                <span style={{ color: '#22c55e' }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════ */}
      <footer className="pf-footer">
        <div className="pf-footer-brand">
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
          <span>
            <span style={{ color: '#3b82f6' }}>PROJECT</span>
            <span style={{ color: '#f97316' }}>FORGE</span>
            <span style={{ color: '#64748b' }}> AI</span>
          </span>
        </div>
        <div className="pf-footer-links">
          {['Privacy', 'Terms', 'Contact', 'GitHub', 'Docs'].map(l => (
            <a key={l} href="#" className="pf-footer-link">{l}</a>
          ))}
        </div>
        <div className="pf-footer-copy">© 2025 ProjectForge AI. All rights reserved.</div>
      </footer>
    </>
  );
}
