import { useParams, useNavigate } from 'react-router-dom';
import { PROJECTS } from '../data/projects';
import { Cpu, Zap, CircuitBoard, Code, Presentation, FileText, ArrowLeft, Layers, CheckSquare, DollarSign, Star } from 'lucide-react';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = PROJECTS.find(p => p.id === Number(id));

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-8">
        <Layers className="w-16 h-16 text-slate-600 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-slate-800">Project Not Found</h2>
        <p className="text-slate-600 mt-2">The engineering project details you requested could not be retrieved.</p>
        <button onClick={() => navigate('/projects')} className="btn-primary mt-6">
          Back to Projects
        </button>
      </div>
    );
  }

  // Pre-fill state helper navigation
  const openTool = (path: string) => {
    navigate(path, {
      state: {
        projectName: project.title,
        components: project.components,
        description: project.description
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header banner */}
      <div className="bg-white border-b border-slate-200 py-12 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <button 
            onClick={() => navigate('/projects')} 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-wider mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Discover
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2.5">
                <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold rounded-lg uppercase tracking-wider">
                  {project.category}
                </span>
                <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider border ${
                  project.difficulty === 'Beginner' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                  project.difficulty === 'Intermediate' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                  'bg-rose-50 border-rose-100 text-rose-600'
                }`}>
                  {project.difficulty}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <span className="text-4xl">{project.image}</span>
                {project.title}
              </h1>
              <p className="text-slate-600 font-mono text-xs">Project Identifier: #{project.id}</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-center items-center shadow-inner md:min-w-[180px]">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-600" /> Est. Cost
              </span>
              <span className="text-3xl font-extrabold text-slate-955 mt-1">₹{project.cost}</span>
              <span className="text-[10px] text-slate-600 mt-0.5">INR (Estimated BOM)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Description */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" /> Project Summary & Scope
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                {project.description}
              </p>
            </div>

            {/* Components list */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600" /> Required Bill of Materials (BOM)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {project.components.map((comp, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700">{comp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: AI Generators launchpad */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Engineering Workspaces</h3>
                <p className="text-xs text-slate-600 mt-1">Directly import this project configuration into our specialized AI design tools.</p>
              </div>

              <div className="space-y-3">
                {/* Circuit Wiring */}
                <button 
                  onClick={() => openTool('/dashboard/circuit')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100 hover:border-blue-200 text-left transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-600 text-slate-900 shadow-blue">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Wiring Diagram</span>
                      <span className="block text-[10px] text-slate-600 mt-0.5">Generate Fritzing wiring schematic</span>
                    </div>
                  </div>
                  <span className="text-blue-600 text-lg group-hover:translate-x-1.5 transition-transform">&rarr;</span>
                </button>

                {/* PCB Layout */}
                <button 
                  onClick={() => openTool('/dashboard/pcb')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-200 text-left transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-slate-900 shadow-emerald">
                      <CircuitBoard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">PCB Layout</span>
                      <span className="block text-[10px] text-slate-600 mt-0.5">Generate KiCad Gerber & tracks</span>
                    </div>
                  </div>
                  <span className="text-emerald-600 text-lg group-hover:translate-x-1.5 transition-transform">&rarr;</span>
                </button>

                {/* Firmware Code */}
                <button 
                  onClick={() => openTool('/dashboard/code')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 text-left transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-indigo-600 text-slate-900 shadow-indigo">
                      <Code className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Firmware Code</span>
                      <span className="block text-[10px] text-slate-600 mt-0.5">Generate C++ / MicroPython compiler code</span>
                    </div>
                  </div>
                  <span className="text-indigo-600 text-lg group-hover:translate-x-1.5 transition-transform">&rarr;</span>
                </button>

                {/* Presentation PPT */}
                <button 
                  onClick={() => openTool('/dashboard/presentation')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-purple-50/50 hover:bg-purple-50 border border-purple-100 hover:border-purple-200 text-left transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-purple-600 text-slate-900 shadow-purple">
                      <Presentation className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Presentation Slides</span>
                      <span className="block text-[10px] text-slate-600 mt-0.5">Generate 15-slide PowerPoint deck</span>
                    </div>
                  </div>
                  <span className="text-purple-600 text-lg group-hover:translate-x-1.5 transition-transform">&rarr;</span>
                </button>

                {/* IEEE Report */}
                <button 
                  onClick={() => openTool('/dashboard/report')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-rose-50/50 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 text-left transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-rose-600 text-slate-900 shadow-rose">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Report Writer</span>
                      <span className="block text-[10px] text-slate-600 mt-0.5">Generate full IEEE academic report</span>
                    </div>
                  </div>
                  <span className="text-rose-600 text-lg group-hover:translate-x-1.5 transition-transform">&rarr;</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
