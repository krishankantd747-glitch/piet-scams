import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, Bot, Settings, CheckSquare } from 'lucide-react';
import { PROJECTS } from '../data/projects';

export default function Projects() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGeneratedProject, setAiGeneratedProject] = useState<any>(null);
  const [aiRelatedProjects, setAiRelatedProjects] = useState<any[]>([]);

  const categories = ['All', 'Embedded', 'Robotics', 'IoT', 'AI/ML', 'Agriculture', 'Security', 'Instrumentation', 'Biomedical'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredProjects = useMemo(() => {
    return PROJECTS.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchDiff = difficultyFilter === 'All' || p.difficulty === difficultyFilter;
      return matchSearch && matchCat && matchDiff;
    });
  }, [searchTerm, categoryFilter, difficultyFilter]);

  // Infinite Search Logic
  const handleSearch = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      if (filteredProjects.length === 0) {
        // No match -> Generate!
        setIsGenerating(true);
        setAiGeneratedProject(null);
        setAiRelatedProjects([]);
        try {
          const t = localStorage.getItem('forge_token');
          const res = await fetch('/api/ai/search-projects', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(t ? { 'Authorization': `Bearer ${t}` } : {})
            },
            body: JSON.stringify({ query: searchTerm })
          });
          const data = await res.json();
          if (res.ok) {
            setAiGeneratedProject(data.mainProject);
            setAiRelatedProjects(data.relatedProjects);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsGenerating(false);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">Discover Engineering Projects</h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">Search our database or let AI generate a complete project blueprint for any idea you have.</p>
          
          {/* Search Bar */}
          <div className="max-w-3xl mx-auto relative">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
               <Search className="h-6 w-6 text-slate-600" />
             </div>
             <input 
               type="text" 
               className="block w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-900 text-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
               placeholder="Search projects or type any idea and press Enter..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               onKeyDown={handleSearch}
             />
             <div className="absolute inset-y-0 right-2 flex items-center">
               <div className="px-3 py-1 bg-white border border-slate-200 text-xs text-slate-600 rounded-lg shadow-sm">Press Enter</div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 space-y-4 md:space-y-0">
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button 
                key={c} 
                onClick={() => setCategoryFilter(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${categoryFilter === c ? 'bg-slate-100 text-slate-900' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {difficulties.map(d => (
              <button 
                key={d} 
                onClick={() => setDifficultyFilter(d)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${difficultyFilter === d ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Loading AI State */}
        {isGenerating && (
          <div className="bg-white rounded-3xl p-12 text-center shadow-lg border border-slate-200">
             <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
             <h2 className="text-2xl font-bold text-slate-900 mb-2">AI is designing your project...</h2>
             <p className="text-slate-600">Creating blueprint, finding components, and generating alternatives.</p>
          </div>
        )}

        {/* AI Generated Result */}
        {!isGenerating && filteredProjects.length === 0 && aiGeneratedProject && (
          <div className="mb-16">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-1 mb-10 shadow-xl">
              <div className="bg-white rounded-[22px] p-8 md:p-10">
                <div className="flex items-center text-blue-600 font-bold mb-4 uppercase tracking-wider text-sm"><Bot className="w-5 h-5 mr-2" /> AI Generated Match</div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-4">{aiGeneratedProject.title}</h2>
                <p className="text-lg text-slate-600 mb-6">{aiGeneratedProject.description}</p>
                
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center"><Settings className="w-5 h-5 mr-2 text-slate-600"/> Core Components</h3>
                    <ul className="space-y-2">
                      {aiGeneratedProject.components.map((c: string, i: number) => (
                        <li key={i} className="flex items-center text-slate-600"><CheckSquare className="w-4 h-4 text-emerald-500 mr-2"/> {c}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center"><Zap className="w-5 h-5 mr-2 text-amber-500"/> Est. Cost</h3>
                    <p className="text-3xl font-bold text-slate-900">₹{aiGeneratedProject.cost}</p>
                  </div>
                </div>
                
                <button onClick={() => navigate('/dashboard/circuit')} className="w-full md:w-auto px-8 py-3 bg-blue-600 text-slate-900 font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                  Open in Workspace
                </button>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-6">Related AI Projects ({aiRelatedProjects.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {aiRelatedProjects.map((rp, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-slate-900 text-lg mb-2">{rp.title}</h4>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">{rp.description}</p>
                  <div className="text-sm font-medium text-blue-600">Cost: ₹{rp.cost}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Results */}
        {!isGenerating && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <div key={project.id} className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 transform hover:-translate-y-1 flex flex-col cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
                
                <div className="h-48 bg-slate-100 flex items-center justify-center text-6xl group-hover:bg-blue-50 transition-colors">
                  {project.image}
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">{project.category}</span>
                    <div className="flex items-center text-amber-500 font-bold text-sm bg-amber-50 px-2 py-1 rounded-lg">
                      ₹{project.cost}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{project.title}</h3>
                  <p className="text-slate-600 text-sm mb-4 flex-1 line-clamp-3">{project.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.components.slice(0, 3).map((comp, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-md">{comp}</span>
                    ))}
                    {project.components.length > 3 && (
                      <span className="px-2 py-1 bg-slate-50 text-slate-600 text-xs rounded-md">+{project.components.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
