import React, { useState } from 'react';
import { CircuitParams, PerformanceMetrics } from '../types';
import { controlMode } from '../engine/simulationMath';
import { EXPERIMENTS, QUIZ } from '../labContent';
import { CheckCircle2, Download, FlaskConical, HelpCircle, PlayCircle, Table2, Trash2, XCircle } from 'lucide-react';

interface LabSuiteProps {
  params: CircuitParams;
  metrics: PerformanceMetrics;
  onLoadPreset: (p: CircuitParams) => void;
}

type LabTab = 'procedures' | 'observations' | 'quiz';

interface Reading {
  id: number;
  time: string;
  config: string;
  alpha: number;
  vIn: number;
  vTheory: number | null;
  vSim: number;
  vRms: number;
  iDc: number;
  rf: number;
  thd: number;
  eff: number;
}

const configLabel = (p: CircuitParams) => {
  const mode = controlMode(p);
  const dev = mode === 'diode' ? 'Diode' : mode === 'full' ? 'SCR' : mode === 'semi' ? 'Semi' : 'Mixed';
  return `${p.phase === '1phase' ? '1Φ' : '3Φ'} ${p.rectifierType === 'fullwave' ? 'Bridge' : 'Half-wave'} · ${dev} · ${p.loadType}${p.hasFwd ? ' + FWD' : ''}`;
};

export const LabSuite: React.FC<LabSuiteProps> = ({ params, metrics, onLoadPreset }) => {
  const [tab, setTab] = useState<LabTab>('procedures');
  const [expId, setExpId] = useState(EXPERIMENTS[0].id);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const exp = EXPERIMENTS.find(e => e.id === expId)!;
  const correct = QUIZ.filter((q, i) => answers[i] === q.answer).length;
  const answered = Object.keys(answers).length;

  const record = () => {
    const thyr = controlMode(params) !== 'diode';
    setReadings(r => [
      ...r,
      {
        id: (r[r.length - 1]?.id ?? 0) + 1,
        time: new Date().toLocaleTimeString(),
        config: configLabel(params),
        alpha: thyr ? params.firingAngle : 0,
        vIn: params.vRms,
        vTheory: metrics.theoryVdc,
        vSim: metrics.vAvg,
        vRms: metrics.vRms,
        iDc: metrics.iAvg,
        rf: metrics.rippleFactor,
        thd: metrics.thdCurrent,
        eff: metrics.efficiency
      }
    ]);
  };

  const exportCsv = () => {
    const head = ['Record', 'Time', 'Configuration', 'alpha_deg', 'V_in_rms', 'Vdc_theory', 'Vdc_sim', 'Vrms_sim', 'Idc_sim', 'Ripple_factor', 'THD_percent', 'Efficiency_percent'];
    const rows = readings.map(r => [r.id, r.time, `"${r.config}"`, r.alpha, r.vIn, r.vTheory?.toFixed(2) ?? '', r.vSim.toFixed(2), r.vRms.toFixed(2), r.iDc.toFixed(3), r.rf.toFixed(4), r.thd.toFixed(2), r.eff.toFixed(2)]);
    const csv = [head, ...rows].map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rectifier-observations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabBtn = (t: LabTab, icon: React.ReactNode, text: string) => (
    <button
      onClick={() => setTab(t)}
      aria-pressed={tab === t}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${tab === t ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
    >
      {icon}
      {text}
    </button>
  );

  return (
    <section id="lab" className="bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl overflow-hidden scroll-mt-20">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">Virtual Laboratory Experimental Suite</h2>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 flex-wrap" role="tablist">
          {tabBtn('procedures', <FlaskConical className="w-3.5 h-3.5" />, 'Lab Procedures')}
          {tabBtn('observations', <Table2 className="w-3.5 h-3.5" />, `Observation Table (${readings.length})`)}
          {tabBtn('quiz', <HelpCircle className="w-3.5 h-3.5" />, 'Viva Voce Quiz')}
        </div>
      </div>

      {tab === 'procedures' && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
          <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Select experiment</div>
            {EXPERIMENTS.map(e => (
              <button
                key={e.id}
                onClick={() => setExpId(e.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${expId === e.id ? 'bg-cyan-950/50 border-cyan-500/50' : 'bg-slate-950/40 border-slate-800 hover:border-slate-600'}`}
              >
                <div className={`text-xs font-bold ${expId === e.id ? 'text-cyan-300' : 'text-slate-200'}`}>{e.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{e.summary}</div>
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5 text-xs text-slate-300 leading-relaxed">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-slate-100">{exp.title}</h3>
                <p className="text-slate-400">{exp.summary}</p>
              </div>
              <button
                onClick={() => {
                  onLoadPreset(exp.preset);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                Load preset into simulator
              </button>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1">1. Objective</h4>
              <p>{exp.aim}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1">2. Apparatus</h4>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-400">{exp.apparatus.map(a => <li key={a}>{a}</li>)}</ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1">3. Procedure</h4>
              <ol className="space-y-1.5">
                {exp.procedure.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-cyan-500 shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1">4. Governing formulas</h4>
              <div className="space-y-2">
                {exp.formulas.map(f => (
                  <div key={f.name} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                    <div className="text-slate-400">{f.name}</div>
                    <div className="font-mono text-amber-300 font-bold mt-0.5">{f.expr}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'observations' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Log live measurement</h3>
              <p className="text-[11px] text-slate-400">Records the current simulator state into the observation table.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={record} className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors">Record reading</button>
              <button onClick={exportCsv} disabled={!readings.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <Download className="w-3.5 h-3.5" />Export CSV
              </button>
              <button onClick={() => setReadings([])} disabled={!readings.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-200 text-xs border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <Trash2 className="w-3.5 h-3.5" />Clear
              </button>
            </div>
          </div>
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-[11px] text-left font-mono whitespace-nowrap">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  {['#', 'Time', 'Circuit config', 'α (°)', 'V_in (rms)', 'V_dc theory', 'V_dc sim', 'V_rms sim', 'I_dc sim', 'Ripple', 'THD (%)', 'η (%)'].map(h => (
                    <th key={h} className="p-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {readings.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-6 text-center text-slate-500 font-sans">No readings yet. Press “Record reading” to capture the current measurements.</td>
                  </tr>
                )}
                {readings.map(r => (
                  <tr key={r.id} className="text-slate-300">
                    <td className="p-2">{r.id}</td>
                    <td className="p-2 text-slate-500">{r.time}</td>
                    <td className="p-2 font-sans">{r.config}</td>
                    <td className="p-2">{r.alpha}</td>
                    <td className="p-2">{r.vIn}</td>
                    <td className="p-2 text-emerald-400">{r.vTheory !== null ? r.vTheory.toFixed(1) : 'n/a'}</td>
                    <td className="p-2 text-cyan-400">{r.vSim.toFixed(1)}</td>
                    <td className="p-2">{r.vRms.toFixed(1)}</td>
                    <td className="p-2">{r.iDc.toFixed(2)}</td>
                    <td className="p-2">{r.rf.toFixed(3)}</td>
                    <td className="p-2">{r.thd.toFixed(1)}</td>
                    <td className="p-2">{r.eff.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'quiz' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-bold text-slate-100">Viva voce quiz</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                Score: <b className="text-emerald-400">{correct}</b> / {QUIZ.length} <span className="text-slate-500">({answered} answered)</span>
              </span>
              <button onClick={() => setAnswers({})} className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">Reset quiz</button>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {QUIZ.map((q, i) => {
              const picked = answers[i];
              const done = picked !== undefined;
              return (
                <fieldset key={i} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                  <legend className="sr-only">Question {i + 1}</legend>
                  <div className="text-xs font-semibold text-slate-100 mb-2">{i + 1}. {q.q}</div>
                  <div className="space-y-1.5">
                    {q.options.map((o, k) => {
                      const isRight = done && k === q.answer;
                      const isWrong = done && k === picked && k !== q.answer;
                      return (
                        <button
                          key={k}
                          disabled={done}
                          onClick={() => setAnswers(a => ({ ...a, [i]: k }))}
                          className={`w-full flex items-center justify-between gap-2 text-left text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            isRight
                              ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300'
                              : isWrong
                                ? 'bg-red-950/50 border-red-500/60 text-red-300'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/50 disabled:hover:border-slate-700'
                          }`}
                        >
                          <span>{o}</span>
                          {isRight && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                          {isWrong && <XCircle className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  {done && <p className="mt-2 text-[11px] text-slate-400">{q.why}</p>}
                </fieldset>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
