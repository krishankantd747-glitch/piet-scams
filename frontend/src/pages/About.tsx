import { Target, Lightbulb, Mail, Cpu, Layers, Globe, Award, Sparkles, Github, Linkedin, Twitter, ExternalLink } from 'lucide-react';

export default function About() {
  const stats = [
    { value: '10K+', label: 'Active Engineers', desc: 'Students & developers worldwide' },
    { value: '50K+', label: 'Blueprints Created', desc: 'Circuits, PCBs, and system architectures' },
    { value: '1.2M+', label: 'Lines of Code Generated', desc: 'Flawless firmware & compiler scripts' },
    { value: '99.4%', label: 'Satisfaction Rate', desc: 'Based on academic project grading' },
  ];

  const coreValues = [
    {
      icon: <Target className="w-6 h-6 text-purple-600" />,
      title: 'Our Mission',
      desc: 'To accelerate hardware innovation by providing engineering students and research professionals with an intelligent, end-to-end design workspace that automates manual documentation and schematic layout processes.',
      bg: 'from-purple-500/10 to-indigo-500/5',
      border: 'border-purple-100',
    },
    {
      icon: <Lightbulb className="w-6 h-6 text-emerald-600" />,
      title: 'Our Vision',
      desc: 'We envision a world where anyone with a product idea can go from concept to a manufactured, fully-functioning prototype in days, not months, powered by generative AI models optimized for electronics engineering.',
      bg: 'from-emerald-500/10 to-teal-500/5',
      border: 'border-emerald-100',
    },
  ];

  const team = [
    {
      name: 'Krishankant Dixit',
      role: 'Founder & Lead Developer',
      bio: 'Founder of ProjectForge AI, Core Committee Member of AICTE IDEA Lab and Core Member of the Udaan Aeromodelling Club at PIET, specializing in Artificial Intelligence, Full Stack Development, Embedded Systems, Robotics, Aeromodelling and next-generation engineering solutions.',
      image: null,
      photoUrl: '/krishankant-dixit.jpg' as string | null,
      subtitle: 'Computer Science Engineer • AI Engineer',
      institute: 'Poornima Institute of Engineering & Technology, Jaipur',
      qualification: 'B.Tech – Computer Science Engineering',
      additionalRoles: ['Core Committee Member – AICTE IDEA Lab, PIET', 'Core Member – Udaan Aeromodelling Club, PIET'],
      socials: { github: '#', linkedin: '#', twitter: null as string | null, email: '#', research: null as string | null, website: '#' },
    },
    {
      name: 'Dr. Payal Bansal',
      role: 'Professor & Head (Research & Outreach)',
      bio: 'Leading AI, IoT and Engineering Innovation initiatives while mentoring students in research, patents, startups and next-generation engineering projects.',
      image: null,
      photoUrl: '/dr-payal-bansal.jpg' as string | null,
      subtitle: 'Head – Department of IoT',
      institute: 'Poornima Institute of Engineering & Technology, Jaipur',
      qualification: 'SMIEEE • FMIETE • LMISTE',
      socials: { github: null as string | null, linkedin: '#', twitter: null as string | null, email: 'payal.bansal@poornima.org', research: '#', website: '#' },
    },
    {
      name: 'Dr. Ashish Laddha',
      role: 'Associate Professor',
      bio: 'Leading research in Power Electronics, Renewable Energy, Smart Grid Technologies and AI while mentoring students in innovation, patents, startups and advanced engineering research.',
      image: null,
      photoUrl: '/dr-ashish-laddha.jpg' as string | null,
      subtitle: 'Power Electronics & Smart Energy Research',
      institute: 'Poornima Institute of Engineering & Technology, Jaipur',
      qualification: 'Ph.D. | IEEE | ISTE',
      socials: { github: null as string | null, linkedin: '#', twitter: null as string | null, email: 'ashish.laddha@poornima.org', research: '#', website: '#' },
    },
    {
      name: 'Manish Sharma',
      role: 'AI Core Research Engineer',
      bio: 'AI Core Research Engineer at ProjectForge AI and Core Member of AICTE IDEA Lab, PIET. Passionate about AI, Embedded Systems, IoT, Laser Cutting, 3D Printing, 3D Scanning and next-generation engineering. Builds intelligent automation solutions, AI-assisted engineering workflows and innovative hardware-software integrations.',
      image: null,
      photoUrl: '/manish-sharma.jpg' as string | null,
      subtitle: 'AI Engineer • IoT • 3D Printing & Scanning • Laser Cutting',
      institute: 'Poornima Institute of Engineering & Technology, Jaipur',
      qualification: 'B.Tech – Computer Science Engineering',
      additionalRoles: ['Core Member – AICTE IDEA Lab, PIET'],
      socials: { github: null as string | null, linkedin: 'https://www.linkedin.com/in/manish-sharma-360a6928b', twitter: null as string | null, email: 'mani.sharma85466@gmail.com', research: null as string | null, website: null as string | null },
      skills: ['Laser Cutting', '3D Printing', '3D Scanning'],
    },
  ];

  // ── Leadership data (editable) ──────────────────────────────────────────
  const leadership = [
    {
      tag: 'Founder',
      name: 'Krishankant Dixit',
      position: 'Founder & Lead Developer',
      subtitle: 'Computer Science Engineer • AI Engineer • Software Architect',
      photoUrl: '/krishankant-dixit.jpg',
      bio: 'Krishankant Dixit is the Founder and Lead Developer of ProjectForge AI — an AI-powered engineering platform designed to simplify the complete engineering project lifecycle. He independently designed, architected and developed ProjectForge AI with the vision of helping students, researchers, startups and innovators generate professional engineering deliverables using Artificial Intelligence.',
      expertise: ['Artificial Intelligence', 'Full Stack Development', 'Software Architecture', 'Embedded Systems', 'IoT', 'Robotics', 'PCB Design', 'Aeromodelling'],
      org: 'ProjectForge AI',
      qualification: 'B.Tech – Computer Science Engineering, PIET Jaipur',
      roles: ['Core Committee Member – AICTE IDEA Lab, PIET', 'Core Member – Udaan Aeromodelling Club, PIET'],
      linkedin: '#',
      email: '#',
      github: '#',
      accent: 'from-purple-600 to-indigo-600',
      glow: 'shadow-purple-200',
    },
    {
      tag: 'Co-Founder',
      name: 'Sapna Kumari',
      position: 'Co-Founder & Product Strategy Lead',
      subtitle: 'Computer Science Engineer • Product Strategist',
      photoUrl: '/sapna-kumari.jpg' as string | null,
      bio: 'Sapna Kumari is the Co-Founder of ProjectForge AI, driving product strategy, engineering workflow, operational planning, and user experience. She has hands-on expertise in 3D Printing, Laser Cutting, PCB Prototyping, Embedded Systems, IoT, and AICTE IDEA Lab technologies — transforming innovative engineering concepts into practical real-world solutions.',
      expertise: ['Product Strategy', 'Engineering Workflow', 'AICTE IDEA Lab', '3D Printing', 'Laser Cutting', 'Embedded Systems', 'IoT', 'Arduino', 'ESP32', 'PCB Prototyping', 'Robotics Hardware', 'CAD Fabrication', 'Rapid Prototyping', 'AI Applications'],
      org: 'ProjectForge AI',
      qualification: 'B.Tech – Computer Science Engineering, PIET Jaipur',
      roles: ['Co-Founder & Product Strategy Lead – ProjectForge AI', 'Student Member – ISTE'],
      linkedin: '#',
      email: '#',
      github: null as string | null,
      accent: 'from-rose-500 to-orange-500',
      glow: 'shadow-rose-200',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 overflow-x-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200/40 rounded-full filter blur-3xl -z-10 animate-pulse duration-[8000ms]" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-rose-200/30 rounded-full filter blur-3xl -z-10 animate-pulse duration-[10000ms]" />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center relative">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200/60 rounded-full text-xs font-bold text-purple-700 tracking-wide uppercase mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> About ProjectForge AI
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15] mb-6">
          Empowering the Next Generation of{' '}
          <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 bg-clip-text text-transparent">
            Hardware Engineers
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
          ProjectForge AI replaces hundreds of hours of manual documentation, circuit drafting, and code writing with instant, industry-grade engineering deliverables.
        </p>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all group duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="text-3xl font-black text-slate-900 group-hover:text-purple-600 transition-colors flex items-baseline gap-1">
                  {stat.value}
                </div>
                <div className="text-sm font-bold text-slate-700 mt-2">{stat.label}</div>
              </div>
              <div className="text-xs text-slate-600 mt-1 font-medium">{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission & Vision Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="grid md:grid-cols-2 gap-8">
          {coreValues.map((val, i) => (
            <div
              key={i}
              className={`bg-gradient-to-br ${val.bg} p-8 md:p-10 rounded-3xl border border-white shadow-sm flex flex-col justify-between`}
            >
              <div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md mb-6">
                  {val.icon}
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">{val.title}</h2>
                <p className="text-slate-600 leading-relaxed text-sm font-medium">{val.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Story & Tech Pillar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="bg-slate-100 text-slate-900 rounded-3xl overflow-hidden shadow-2xl relative border border-slate-200">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          <div className="grid md:grid-cols-2 gap-10 p-8 md:p-12 items-center relative z-10">
            <div>
              <span className="text-purple-400 text-xs font-bold uppercase tracking-widest block mb-3">
                Built For Excellence
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight mb-6">
                Our Technology Core & Principles
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="p-2 rounded-lg bg-slate-200 shrink-0 text-purple-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">LLM Guided Hardware Design</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Custom prompts map specifications to valid schematic models, BOM counts, and C++ code.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="p-2 rounded-lg bg-slate-200 shrink-0 text-emerald-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Visual Realism Engine</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Our custom SVG compiler creates beautiful, highly realistic breadboard wiring and PCB visual previews.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="p-2 rounded-lg bg-slate-200 shrink-0 text-rose-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Standard Conformance</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Academic reports follow standard IEEE formats and template designs accepted by top universities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-200/50 backdrop-blur-xl border border-slate-700/60 p-6 md:p-8 rounded-2xl space-y-6 self-stretch flex flex-col justify-center">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Our Quality Standard</h3>
              <p className="text-xs text-slate-350 leading-relaxed font-medium">
                We believe engineering shouldn't be about fighting with Word document alignments or debugging basic microcontroller syntax for days. 
              </p>
              <p className="text-xs text-slate-350 leading-relaxed font-medium">
                ProjectForge AI focuses on accelerating the drafting phase. By automating the boilerplate—like PPT creations, PCB trace outline maps, and detailed manuals—we free up engineers to do what they do best: solve the hard problems.
              </p>
              <div className="border-t border-slate-700/60 pt-4 mt-2 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600">Certified Output Platform</span>
                <Award className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Leadership Team Section ──────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-28">
        {/* Section header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200/60 rounded-full text-xs font-bold text-purple-700 tracking-widest uppercase mb-5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Leadership
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Leadership{' '}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-500 bg-clip-text text-transparent">
              Team
            </span>
          </h2>
          <p className="text-sm md:text-base text-slate-500 mt-3 font-medium max-w-xl mx-auto">
            Meet the visionaries leading ProjectForge AI towards the future of AI-powered engineering.
          </p>
        </div>

        {/* Leadership cards grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {leadership.map((leader, i) => (
            <div
              key={i}
              className={`relative bg-white rounded-[2rem] border border-slate-200/80 shadow-xl ${leader.glow} shadow-2xl hover:shadow-3xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden group flex flex-col`}
            >
              {/* Top gradient accent bar */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${leader.accent}`} />

              {/* Card body */}
              <div className="p-8 flex flex-col gap-6 flex-1">

                {/* Header row: photo + name block */}
                <div className="flex items-center gap-5">
                  {/* Photo */}
                  <div className={`relative shrink-0`}>
                    <div className={`w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg ring-2 ring-offset-2 bg-gradient-to-br ${leader.accent} ring-purple-200 group-hover:scale-105 transition-transform duration-300`}>
                      {leader.photoUrl ? (
                        <img
                          src={leader.photoUrl}
                          alt={leader.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-3xl font-black">
                          {leader.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {/* Executive tag badge */}
                    <span className={`absolute -bottom-1 -right-1 bg-gradient-to-r ${leader.accent} text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-md tracking-widest uppercase whitespace-nowrap`}>
                      {leader.tag}
                    </span>
                  </div>

                  {/* Name + role */}
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{leader.name}</h3>
                    <p className={`text-sm font-bold mt-0.5 bg-gradient-to-r ${leader.accent} bg-clip-text text-transparent`}>
                      {leader.position}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">{leader.subtitle}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{leader.qualification}</p>
                  </div>
                </div>

                {/* Role badges */}
                {leader.roles && leader.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {leader.roles.map((r, ri) => (
                      <span key={ri} className="inline-flex items-center bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bio */}
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{leader.bio}</p>

                {/* Expertise chips */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Areas of Expertise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {leader.expertise.map((skill, si) => (
                      <span key={si} className="bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-default">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Divider + socials */}
                <div className="border-t border-slate-100 pt-5 flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{leader.org}</span>
                  <div className="flex gap-3">
                    {leader.github && (
                      <a href={leader.github} title="GitHub" className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-500 flex items-center justify-center transition-all duration-200">
                        <Github className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {leader.linkedin && (
                      <a href={leader.linkedin} title="LinkedIn" className="w-8 h-8 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-500 flex items-center justify-center transition-all duration-200">
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {leader.email && (
                      <a
                        href={leader.email.startsWith('#') ? leader.email : `mailto:${leader.email}`}
                        title="Email"
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center transition-all duration-200"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Meet the Architects Section ──────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Meet the Architects</h2>
          <p className="text-sm text-slate-600 mt-2 font-medium">The builders making automated hardware blueprint creation a reality.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between items-center text-center hover:shadow-md transition-shadow group"
            >
              <div className="space-y-4">
                {/* Avatar: real photo or emoji */}
                {member.photoUrl ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200/60 shadow-inner group-hover:scale-105 transition-transform mx-auto">
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-4xl shadow-inner border border-slate-200/60 group-hover:scale-105 transition-transform">
                    {member.image}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{member.name}</h3>
                  <p className="text-xs text-purple-600 font-bold mt-0.5">{member.role}</p>
                  {(member as any).qualification && (
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 tracking-wide">{(member as any).qualification}</p>
                  )}
                  {(member as any).subtitle && (
                    <p className="text-[10px] text-indigo-500 font-bold mt-0.5 tracking-wide">{(member as any).subtitle}</p>
                  )}
                  {(member as any).institute && (
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">{(member as any).institute}</p>
                  )}
                </div>
                {(member as any).additionalRoles && (
                  <div className="flex flex-col gap-1 mt-1 px-1">
                    {(member as any).additionalRoles.map((role: string, ri: number) => (
                      <span key={ri} className="inline-block bg-indigo-50 text-indigo-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-100 tracking-wide text-center">
                        {role}
                      </span>
                    ))}
                  </div>
                )}
                {(member as any).skills && (
                  <div className="flex flex-wrap gap-1 justify-center mt-2 px-1">
                    {(member as any).skills.map((skill: string, si: number) => (
                      <span key={si} className="bg-purple-50 text-purple-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-purple-100 tracking-wide">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-600 leading-relaxed font-medium px-2 mt-2">{member.bio}</p>
              </div>

              <div className="flex gap-4 mt-6 border-t border-slate-100 pt-5 w-full justify-center">
                {member.socials.github && (
                  <a href={member.socials.github} className="text-slate-600 hover:text-slate-700 transition" title="GitHub">
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {member.socials.linkedin && (
                  <a href={member.socials.linkedin} className="text-slate-600 hover:text-purple-600 transition" title="LinkedIn">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {member.socials.twitter && (
                  <a href={member.socials.twitter} className="text-slate-600 hover:text-blue-500 transition" title="Twitter">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {member.socials.email && (
                  <a
                    href={member.socials.email.startsWith('#') ? member.socials.email : `mailto:${member.socials.email}`}
                    className="text-slate-600 hover:text-rose-500 transition"
                    title="Email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
                {member.socials.research && (
                  <a href={member.socials.research} className="text-slate-600 hover:text-amber-500 transition" title="Research">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {member.socials.website && (
                  <a href={member.socials.website} className="text-slate-600 hover:text-teal-500 transition" title="Website">
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
