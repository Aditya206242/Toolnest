import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Workflow, Plus, Trash2, ArrowRight, Play, CheckCircle, Clock, Cpu, Sparkles, Sliders, ChevronRight } from 'lucide-react';
import SEO from '../components/SEO';

const AVAILABLE_ACTIONS = [
  { id: 'pdf-merge', name: 'Merge PDF', category: 'pdf', desc: 'Combine multiple PDF files into one.' },
  { id: 'pdf-compress', name: 'Compress PDF', category: 'pdf', desc: 'Optimize and shrink PDF size.' },
  { id: 'pdf-watermark', name: 'Add PDF Watermark', category: 'pdf', desc: 'Apply branding or signature overlay.' },
  { id: 'image-resize', name: 'Resize Image', category: 'image', desc: 'Scale image width and height.' },
  { id: 'image-compress', name: 'Compress Image', category: 'image', desc: 'Optimize JPG, PNG or WebP files.' },
  { id: 'image-watermark', name: 'Watermark Image', category: 'image', desc: 'Add text watermark on images.' }
];

const PRESETS = [
  {
    name: 'Invoice Compression Flow',
    steps: ['pdf-compress', 'pdf-watermark'],
    desc: 'Compress documents and stamp them with your standard watermark.'
  },
  {
    name: 'Teammate Presentation Prep',
    steps: ['pdf-merge', 'pdf-compress'],
    desc: 'Merge slides/documents and optimize them for email attachments.'
  }
];

export default function Workflows() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowSteps, setNewFlowSteps] = useState([]);
  
  const [simulatingFlowId, setSimulatingFlowId] = useState(null);
  const [simulationStep, setSimulationStep] = useState(0);
  const [simulationLog, setSimulationLog] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('toolnest_saved_workflows');
    if (stored) {
      setWorkflows(JSON.parse(stored));
    } else {
      // Set defaults
      const defaults = [
        {
          id: 'w-1',
          name: 'Premium Asset Pipeline',
          steps: ['image-resize', 'image-compress', 'image-watermark'],
          createdAt: new Date().toLocaleDateString()
        }
      ];
      setWorkflows(defaults);
      localStorage.setItem('toolnest_saved_workflows', JSON.stringify(defaults));
    }
  }, []);

  const handleCreateFlow = (e) => {
    e.preventDefault();
    if (!newFlowName.trim()) return;
    if (newFlowSteps.length === 0) {
      alert('Please add at least one step to your workflow.');
      return;
    }

    const newFlow = {
      id: 'w-' + Date.now().toString(),
      name: newFlowName,
      steps: [...newFlowSteps],
      createdAt: new Date().toLocaleDateString()
    };

    const updated = [...workflows, newFlow];
    setWorkflows(updated);
    localStorage.setItem('toolnest_saved_workflows', JSON.stringify(updated));

    setNewFlowName('');
    setNewFlowSteps([]);
  };

  const handleAddStep = (actionId) => {
    setNewFlowSteps([...newFlowSteps, actionId]);
  };

  const handleRemoveNewStep = (index) => {
    const updated = [...newFlowSteps];
    updated.splice(index, 1);
    setNewFlowSteps(updated);
  };

  const handleDeleteFlow = (id) => {
    const updated = workflows.filter(w => w.id !== id);
    setWorkflows(updated);
    localStorage.setItem('toolnest_saved_workflows', JSON.stringify(updated));
  };

  const handleApplyPreset = (preset) => {
    setNewFlowName(preset.name);
    setNewFlowSteps(preset.steps);
  };

  const handleRunSimulation = async (flow) => {
    setSimulatingFlowId(flow.id);
    setSimulationStep(0);
    setSimulationLog(['Initializing Workflow Pipeline Engine...']);

    for (let i = 0; i < flow.steps.length; i++) {
      const stepId = flow.steps[i];
      const action = AVAILABLE_ACTIONS.find(a => a.id === stepId);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSimulationStep(i + 1);
      setSimulationLog(prev => [
        ...prev,
        `[Step ${i+1}/${flow.steps.length}] Executed action: "${action?.name}" successfully. Output optimized.`
      ]);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    setSimulationLog(prev => [
      ...prev,
      `[Pipeline Complete] Workflow finished. Ready to process files!`
    ]);
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <SEO title="Automated Workflows - ToolNest" description="Build automated multi-step document pipelines on ToolNest." />

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
          Automated Workflows
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Connect multiple PDF and image optimization steps into unified pipelines for zero-touch file processing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creator Panel (Left) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              <Workflow className="h-5 w-5 text-violet-500" />
              Build Custom Workflow
            </h2>

            <form onSubmit={handleCreateFlow} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Workflow Name
                </label>
                <input
                  type="text"
                  required
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder="e.g. Invoice Autoprocessor"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-3 px-4 text-sm focus:border-violet-500 focus:outline-none dark:text-slate-100 font-semibold"
                />
              </div>

              {/* Steps Canvas */}
              <div>
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Workflow Steps
                </span>
                
                {newFlowSteps.length === 0 ? (
                  <div className="border border-dashed border-slate-350 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-950/20">
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500">
                      Add steps below to construct your pipeline.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-[17px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                    {newFlowSteps.map((stepId, idx) => {
                      const action = AVAILABLE_ACTIONS.find(a => a.id === stepId);
                      return (
                        <div
                          key={idx}
                          className="relative flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 p-3 ml-1 shadow-sm"
                        >
                          <div className="flex items-center gap-3 z-10">
                            <div className="h-7 w-7 rounded-full bg-violet-600 text-white font-extrabold text-xs flex items-center justify-center border border-white dark:border-slate-850">
                              {idx + 1}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-850 dark:text-slate-100">{action?.name}</span>
                              <span className="text-[10px] text-slate-450 dark:text-slate-400 font-medium">{action?.desc}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveNewStep(idx)}
                            className="p-2 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Step Selection */}
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-850 pt-5">
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Available Pipeline Actions
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {AVAILABLE_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleAddStep(action.id)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-left hover:border-violet-500 hover:bg-violet-500/[0.02] cursor-pointer transition flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400">{action.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{action.desc}</div>
                      </div>
                      <Plus className="h-4 w-4 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={newFlowSteps.length === 0}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-750 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-violet-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  Save Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Presets & Active Pipelines (Right) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active Workflows */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Active Pipelines
            </h2>

            {workflows.length === 0 ? (
              <div className="text-center py-10">
                <Workflow className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2.5" />
                <span className="block text-xs font-bold text-slate-400 dark:text-slate-500">No active pipelines.</span>
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {workflows.map((flow) => (
                  <div
                    key={flow.id}
                    className="border border-slate-200 dark:border-slate-800/80 rounded-xl bg-slate-50/20 dark:bg-slate-950/20 p-4 space-y-3.5 hover:border-violet-500/50 transition duration-300 group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">{flow.name}</h3>
                        <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider block mt-0.5">Created: {flow.createdAt}</span>
                      </div>
                      <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition duration-300">
                        <button
                          onClick={() => handleRunSimulation(flow)}
                          disabled={simulatingFlowId === flow.id}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-500 disabled:opacity-50 transition cursor-pointer"
                          title="Test Pipeline"
                        >
                          <Play className="h-3.5 w-3.5 fill-emerald-500/15" />
                        </button>
                        <button
                          onClick={() => handleDeleteFlow(flow.id)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-red-500/20 hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          title="Delete Pipeline"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      {flow.steps.map((stepId, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800 max-w-[85px] truncate">
                            {AVAILABLE_ACTIONS.find(a => a.id === stepId)?.name}
                          </span>
                          {idx < flow.steps.length - 1 && <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-violet-500" />
              Workflow Templates
            </h2>

            <div className="space-y-3">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-violet-500 hover:bg-violet-500/[0.02] cursor-pointer transition-all duration-300"
                >
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{preset.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Simulator Modal */}
      {simulatingFlowId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <Cpu className="h-6 w-6 text-violet-600 animate-spin" />
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">Pipeline Simulation Engine</h3>
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-450 block mt-0.5">Testing pipeline integrity</span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950 p-4 font-mono text-[10px] text-emerald-400 h-64 overflow-y-auto space-y-2">
              {simulationLog.map((log, idx) => (
                <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-slate-600 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                onClick={() => setSimulatingFlowId(null)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-350 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
