'use client';

import { useState, useEffect, useCallback } from 'react';

interface XformWorkspaceProps {
  targetLang: string;
  targetDb: string;
  onBack: () => void;
}

type Stage = 'plan' | 'transform' | 'parity' | 'performance';

interface ProgramEntry {
  name: string;
  loc: number;
  calls: number;
  sql: number;
  complexity: 'LOW' | 'MED' | 'HIGH';
  domain: string;
}

const PROGRAMS: ProgramEntry[] = [
  { name: 'BILL0030', loc: 2340, calls: 6, sql: 14, complexity: 'HIGH', domain: 'Billing' },
  { name: 'PAY0100', loc: 1180, calls: 3, sql: 8, complexity: 'MED', domain: 'Payments' },
  { name: 'CUST0200', loc: 860, calls: 2, sql: 5, complexity: 'MED', domain: 'Customer' },
  { name: 'RPT0400', loc: 420, calls: 1, sql: 0, complexity: 'LOW', domain: 'Reporting' },
  { name: 'CLAIM055', loc: 3120, calls: 9, sql: 22, complexity: 'HIGH', domain: 'Billing' },
];

const COBOL_SOURCE = `       2400-COMPUTE-TOTALS.
           EXEC SQL
               SELECT BILL_AMT, CUST_ID
               INTO :WS-BILL-AMT, :WS-CUST-ID
               FROM BILLING_MASTER
               WHERE CYCLE_NO = :WS-CYCLE
           END-EXEC.
           ADD WS-BILL-AMT TO WS-CYCLE-TOTAL.
           IF WS-BILL-AMT > WS-CREDIT-LIMIT
               PERFORM 3000-HOLD-ACCOUNT
           END-IF.
           CALL 'ANBX-RATE'
               USING WS-RATE-AREA.
           PERFORM 2500-NEXT-RECORD.`;

const JAVA_OUTPUT = `@Service
public class BillingCycleService {
  private final BillingMasterRepository repo;
  private final CreditHoldService holdService;
  private final AnnubexRateAdapter rateAdapter;

  public CycleTotals computeTotals(int cycleNo) {
    List<BillingRecord> records =
        repo.findByCycleNo(cycleNo);
    BigDecimal total = BigDecimal.ZERO;
    for (BillingRecord r : records) {
      total = total.add(r.billAmount());
      if (r.billAmount()
           .compareTo(CREDIT_LIMIT) > 0) {
        holdService.holdAccount(r.custId());
      }
      rateAdapter.applyRate(r); // ANBX-RATE
    }
    return new CycleTotals(cycleNo, total);
  }
}`;

const FILE_TREE = [
  'com.acme.billing/',
  '  BillingCycleService.java',
  '  BillingMasterRepository.java',
  '  CreditHoldService.java',
  '  AnnubexRateAdapter.java',
  '  model/',
  '    BillingRecord.java',
  '    CycleTotals.java',
  '  config/',
  '    DataSourceConfig.java',
];

interface ParityDataset {
  name: string;
  records: number;
  desc: string;
}

const PARITY_DATASETS: ParityDataset[] = [
  { name: 'GOLDEN.CYCLE.D0721', records: 11204, desc: 'Full July billing cycle extract' },
  { name: 'EDGE.CASES.QA', records: 1480, desc: 'Curated edge cases' },
  { name: 'SMOKE.MIN.SET', records: 120, desc: 'Fast smoke set' },
];

const COMPLEXITY_COLORS: Record<string, string> = {
  LOW: '#4ade80',
  MED: '#fbbf24',
  HIGH: '#f97316',
};

/* ---------- Performance Types & Mock Data ---------- */

interface PerfCategory {
  name: string;
  cobol_score: number;
  modern_score: number;
  cobol_notes: string;
  modern_notes: string;
  recommendation: string;
}

interface PerfData {
  summary: string;
  verdict: 'faster' | 'comparable' | 'slower';
  categories: PerfCategory[];
  overall_cobol_score: number;
  overall_modern_score: number;
}

const MOCK_PERF_DATA: PerfData = {
  summary:
    'The modernized Java code offers significant improvements in maintainability, ' +
    'parallelism potential, and error resilience. COBOL retains an edge in raw ' +
    'sequential batch I/O throughput due to its optimized record-level processing. ' +
    'Overall, the Java implementation is the stronger choice for long-term ' +
    'operational efficiency and team velocity.',
  verdict: 'faster',
  categories: [
    {
      name: 'CPU / Compute',
      cobol_score: 72,
      modern_score: 85,
      cobol_notes:
        'Sequential PERFORM loop with no parallelism. Efficient for single-threaded batch but cannot leverage multi-core.',
      modern_notes:
        'Stream-based iteration with potential for parallel streams. JIT compilation optimizes hot paths over time.',
      recommendation:
        'Consider converting the billing loop to a parallel stream for large cycle batches to fully exploit multi-core.',
    },
    {
      name: 'Memory Usage',
      cobol_score: 88,
      modern_score: 74,
      cobol_notes:
        'Fixed WORKING-STORAGE allocation with no dynamic memory. Predictable footprint, zero GC overhead.',
      modern_notes:
        'Heap-allocated objects per record with GC pressure. BigDecimal creates intermediate objects during arithmetic.',
      recommendation:
        'Profile GC pauses under peak load. Consider primitive accumulators or value types if memory pressure is observed.',
    },
    {
      name: 'I/O & File Handling',
      cobol_score: 90,
      modern_score: 70,
      cobol_notes:
        'Native VSAM/QSAM record-level I/O with OS-level buffering. Extremely efficient for sequential batch reads.',
      modern_notes:
        'JDBC result set fetch over network. Additional serialization/deserialization overhead per row.',
      recommendation:
        'Use JDBC fetch-size tuning (e.g., 1000 rows) and connection pooling to narrow the I/O gap.',
    },
    {
      name: 'SQL / DB Efficiency',
      cobol_score: 65,
      modern_score: 82,
      cobol_notes:
        'Embedded SQL with singleton SELECT inside a loop. Each iteration issues a separate DB call.',
      modern_notes:
        'Repository pattern with Spring Data JPA. findByCycleNo fetches all records in one query, reducing round-trips.',
      recommendation:
        'The Java approach is already superior here. Consider adding batch insert/update for downstream writes.',
    },
    {
      name: 'Error Resilience',
      cobol_score: 55,
      modern_score: 80,
      cobol_notes:
        'SQLCODE checking with GO TO error paragraphs. Limited structured error handling, abend on unhandled conditions.',
      modern_notes:
        'Try-catch with Spring transactional rollback. Structured exception hierarchy allows granular recovery.',
      recommendation:
        'Add circuit-breaker patterns around the rate adapter call for production resilience.',
    },
    {
      name: 'Maintainability',
      cobol_score: 40,
      modern_score: 92,
      cobol_notes:
        'Flat paragraph structure with implicit control flow. Requires deep domain knowledge to modify safely.',
      modern_notes:
        'Clean separation of concerns with dependency injection. Unit-testable services, IDE-supported refactoring.',
      recommendation:
        'Ensure comprehensive unit and integration test coverage to preserve the maintainability advantage.',
    },
  ],
  overall_cobol_score: 68,
  overall_modern_score: 80,
};

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const sans = { fontFamily: "'IBM Plex Sans', sans-serif" };

export function XformWorkspace({ targetLang, targetDb, onBack }: XformWorkspaceProps) {
  const [stage, setStage] = useState<Stage>('plan');
  const [selectedProgram, setSelectedProgram] = useState<ProgramEntry>(PROGRAMS[0]);
  const [transformProgress, setTransformProgress] = useState(0);
  const [transformDone, setTransformDone] = useState(false);
  const [parityRunning, setParityRunning] = useState(false);
  const [parityDone, setParityDone] = useState(false);
  const [cobolProgress, setCobolProgress] = useState(0);
  const [modernProgress, setModernProgress] = useState(0);
  const [selectedDataset, setSelectedDataset] = useState<ParityDataset>(PARITY_DATASETS[0]);

  // Performance stage state
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfData, setPerfData] = useState<PerfData | null>(null);
  const [perfError, setPerfError] = useState<string | null>(null);

  const stages: { key: Stage; label: string }[] = [
    { key: 'plan', label: 'Plan' },
    { key: 'transform', label: 'Transform' },
    { key: 'parity', label: 'Parity Testing' },
    { key: 'performance', label: 'Performance' },
  ];

  const handleStartTransform = useCallback(() => {
    setStage('transform');
    setTransformProgress(0);
    setTransformDone(false);
  }, []);

  // Simulate transform progress
  useEffect(() => {
    if (stage !== 'transform' || transformDone) return;
    if (transformProgress >= 100) {
      setTransformDone(true);
      return;
    }
    const timer = setTimeout(() => {
      setTransformProgress((p) => Math.min(p + Math.random() * 12 + 3, 100));
    }, 200);
    return () => clearTimeout(timer);
  }, [stage, transformProgress, transformDone]);

  // Simulate parity test
  useEffect(() => {
    if (!parityRunning || parityDone) return;
    if (cobolProgress >= 100 && modernProgress >= 100) {
      setParityDone(true);
      setParityRunning(false);
      return;
    }
    const timer = setTimeout(() => {
      setCobolProgress((p) => Math.min(p + Math.random() * 8 + 2, 100));
      setModernProgress((p) => Math.min(p + Math.random() * 7 + 2, 100));
    }, 150);
    return () => clearTimeout(timer);
  }, [parityRunning, parityDone, cobolProgress, modernProgress]);

  const handleRunParity = useCallback(() => {
    setParityRunning(true);
    setParityDone(false);
    setCobolProgress(0);
    setModernProgress(0);
  }, []);

  const handleProceedToPerformance = useCallback(() => {
    setStage('performance');
    // Load mock data immediately for the current mock-only flow
    setPerfData(MOCK_PERF_DATA);
    setPerfError(null);
  }, []);

  const handleRunPerfEval = useCallback(async () => {
    setPerfLoading(true);
    setPerfError(null);
    try {
      const res = await fetch('/api/demystifier/perf-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cobol_source: COBOL_SOURCE,
          modern_source: JAVA_OUTPUT,
          target_lang: targetLang === 'java' ? 'Java' : targetLang === 'csharp' ? 'C#' : targetLang === 'python' ? 'Python' : 'Microservices',
          program_name: selectedProgram.name,
        }),
      });
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      const data: PerfData = await res.json();
      setPerfData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setPerfError(msg);
      // Fall back to mock data on failure
      setPerfData(MOCK_PERF_DATA);
    } finally {
      setPerfLoading(false);
    }
  }, [targetLang, selectedProgram.name]);

  const langLabel = targetLang === 'java' ? 'Java' : targetLang === 'csharp' ? 'C#' : targetLang === 'python' ? 'Python' : 'Microservices';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-header with back + stepper */}
      <div className="flex items-center gap-4 px-5 py-3 bg-[#0c1018] border-b border-[#1e2736]">
        <button
          onClick={onBack}
          className="text-[11px] text-[#7a869a] hover:text-[#dbe4f0] transition-colors"
          style={mono}
        >
          {'\u2190'} Back
        </button>
        <div className="flex-1 flex items-center justify-center gap-1">
          {stages.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (s.key === 'plan') setStage('plan');
                  if (s.key === 'transform' && stage !== 'plan') setStage('transform');
                  if (s.key === 'parity' && transformDone) setStage('parity');
                  if (s.key === 'performance' && parityDone) setStage('performance');
                }}
                className={`px-3 py-1 text-[11px] rounded-md transition-colors ${
                  stage === s.key
                    ? 'bg-[#182233] text-[#45c4b0] border border-[#45c4b0]/30'
                    : 'text-[#5b6577] hover:text-[#9fb0c6]'
                }`}
                style={mono}
              >
                {i + 1}. {s.label}
              </button>
              {i < stages.length - 1 && (
                <span className="text-[#2a3140] text-xs">{'\u2192'}</span>
              )}
            </div>
          ))}
        </div>
        <div className="text-[10px] text-[#5b6577]" style={mono}>
          {langLabel} / {targetDb}
        </div>
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-auto p-5">
        {stage === 'plan' && (
          <PlanStage
            programs={PROGRAMS}
            selectedProgram={selectedProgram}
            onSelect={setSelectedProgram}
            onStartTransform={handleStartTransform}
          />
        )}
        {stage === 'transform' && (
          <TransformStage
            program={selectedProgram}
            progress={transformProgress}
            done={transformDone}
            langLabel={langLabel}
            onProceedToParity={() => setStage('parity')}
          />
        )}
        {stage === 'parity' && (
          <ParityStage
            datasets={PARITY_DATASETS}
            selectedDataset={selectedDataset}
            onSelectDataset={setSelectedDataset}
            onRunParity={handleRunParity}
            running={parityRunning}
            done={parityDone}
            cobolProgress={cobolProgress}
            modernProgress={modernProgress}
            langLabel={langLabel}
            onProceedToPerformance={handleProceedToPerformance}
          />
        )}
        {stage === 'performance' && (
          <PerformanceStage
            perfData={perfData}
            perfLoading={perfLoading}
            perfError={perfError}
            langLabel={langLabel}
            onRunLLMAnalysis={handleRunPerfEval}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Plan Stage ---------- */

function PlanStage({
  programs,
  selectedProgram,
  onSelect,
  onStartTransform,
}: {
  programs: ProgramEntry[];
  selectedProgram: ProgramEntry;
  onSelect: (p: ProgramEntry) => void;
  onStartTransform: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-[14px] font-semibold text-[#e6edf7] mb-1" style={mono}>
        Programs to Transform
      </h2>
      <p className="text-[11px] text-[#7a869a] mb-4" style={sans}>
        Select a program to begin transformation. Complexity is computed from LOC, call depth, and SQL density.
      </p>

      <div className="space-y-2">
        {programs.map((p) => (
          <button
            key={p.name}
            onClick={() => onSelect(p)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
              selectedProgram.name === p.name
                ? 'bg-[#111823] border-[#45c4b0]/40'
                : 'bg-[#0c1018] border-[#1e2736] hover:border-[#2a3a50]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[13px] font-semibold text-[#dbe4f0]" style={mono}>
                  {p.name}
                </span>
                <span className="text-[10px] text-[#5b6577] px-2 py-0.5 bg-[#111823] rounded" style={mono}>
                  {p.domain}
                </span>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  ...mono,
                  color: COMPLEXITY_COLORS[p.complexity],
                  backgroundColor: COMPLEXITY_COLORS[p.complexity] + '15',
                }}
              >
                {p.complexity}
              </span>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <Stat label="LOC" value={p.loc.toLocaleString()} />
              <Stat label="Calls" value={String(p.calls)} />
              <Stat label="SQL stmts" value={String(p.sql)} />
              <Stat label="Black-box deps" value={p.calls > 5 ? String(Math.floor(p.calls / 2)) : '1'} />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onStartTransform}
          className="px-5 py-2 text-[12px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
          style={mono}
        >
          Start Transform: {selectedProgram.name}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[10.5px]" style={mono}>
      <span className="text-[#5b6577]">{label} </span>
      <span className="text-[#9fb0c6]">{value}</span>
    </span>
  );
}

/* ---------- Transform Stage ---------- */

function TransformStage({
  program,
  progress,
  done,
  langLabel,
  onProceedToParity,
}: {
  program: ProgramEntry;
  progress: number;
  done: boolean;
  langLabel: string;
  onProceedToParity: () => void;
}) {
  if (!done) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <h2 className="text-[14px] font-semibold text-[#e6edf7] mb-2" style={mono}>
          Transforming {program.name}
        </h2>
        <p className="text-[11px] text-[#7a869a] mb-6" style={sans}>
          Analyzing call graph, extracting SQL, mapping to {langLabel} idioms...
        </p>
        <div className="w-full bg-[#111823] rounded-full h-2 border border-[#1e2736] overflow-hidden">
          <div
            className="h-full bg-[#45c4b0] rounded-full transition-all duration-200"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <p className="text-[11px] text-[#5b6577] mt-2" style={mono}>
          {Math.round(progress)}%
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-semibold text-[#e6edf7]" style={mono}>
          {program.name} {'\u2192'} {langLabel}
        </h2>
        <button
          onClick={onProceedToParity}
          className="px-4 py-1.5 text-[11px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
          style={mono}
        >
          Proceed to Parity Testing {'\u2192'}
        </button>
      </div>

      {/* Side-by-side code view */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* COBOL */}
        <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-[#1e2736] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f97316]" />
            <span className="text-[11px] text-[#7a869a]" style={mono}>COBOL Source</span>
          </div>
          <pre className="p-4 text-[11px] text-[#9fb0c6] overflow-x-auto leading-relaxed" style={mono}>
            {COBOL_SOURCE}
          </pre>
        </div>

        {/* Target */}
        <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-[#1e2736] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#45c4b0]" />
            <span className="text-[11px] text-[#7a869a]" style={mono}>{langLabel} Output</span>
          </div>
          <pre className="p-4 text-[11px] text-[#9fb0c6] overflow-x-auto leading-relaxed" style={mono}>
            {JAVA_OUTPUT}
          </pre>
        </div>
      </div>

      {/* File tree */}
      <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl p-4">
        <h3 className="text-[11px] font-semibold text-[#7a869a] mb-2 uppercase tracking-wider" style={mono}>
          Generated Package Structure
        </h3>
        <div className="text-[11px] text-[#9fb0c6] leading-relaxed" style={mono}>
          {FILE_TREE.map((line, i) => (
            <div key={i} className="whitespace-pre">
              {line.includes('/') ? (
                <span className="text-[#60a5fa]">{line}</span>
              ) : (
                <span>{line}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Parity Stage ---------- */

function ParityStage({
  datasets,
  selectedDataset,
  onSelectDataset,
  onRunParity,
  running,
  done,
  cobolProgress,
  modernProgress,
  langLabel,
  onProceedToPerformance,
}: {
  datasets: ParityDataset[];
  selectedDataset: ParityDataset;
  onSelectDataset: (d: ParityDataset) => void;
  onRunParity: () => void;
  running: boolean;
  done: boolean;
  cobolProgress: number;
  modernProgress: number;
  langLabel: string;
  onProceedToPerformance: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-[14px] font-semibold text-[#e6edf7] mb-1" style={mono}>
        Parity Testing
      </h2>
      <p className="text-[11px] text-[#7a869a] mb-5" style={sans}>
        Run the original COBOL and the generated {langLabel} code in parallel, then compare outputs record-by-record.
      </p>

      {/* Dataset selection */}
      <div className="space-y-2 mb-6">
        {datasets.map((d) => (
          <button
            key={d.name}
            onClick={() => onSelectDataset(d)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
              selectedDataset.name === d.name
                ? 'bg-[#111823] border-[#45c4b0]/40'
                : 'bg-[#0c1018] border-[#1e2736] hover:border-[#2a3a50]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#dbe4f0]" style={mono}>{d.name}</span>
              <span className="text-[10px] text-[#5b6577]" style={mono}>
                {d.records.toLocaleString()} records
              </span>
            </div>
            <p className="text-[10.5px] text-[#7a869a] mt-1" style={sans}>{d.desc}</p>
          </button>
        ))}
      </div>

      {/* Run button */}
      {!running && !done && (
        <button
          onClick={onRunParity}
          className="w-full py-2.5 text-[12px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors mb-6"
          style={mono}
        >
          Run Parity Test: {selectedDataset.name}
        </button>
      )}

      {/* Progress */}
      {(running || done) && (
        <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[#f97316]" style={mono}>COBOL (mainframe)</span>
              <span className="text-[10px] text-[#5b6577]" style={mono}>{Math.round(cobolProgress)}%</span>
            </div>
            <div className="w-full bg-[#111823] rounded-full h-1.5 border border-[#1e2736] overflow-hidden">
              <div
                className="h-full bg-[#f97316] rounded-full transition-all duration-150"
                style={{ width: `${Math.round(cobolProgress)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[#45c4b0]" style={mono}>{langLabel} (cloud)</span>
              <span className="text-[10px] text-[#5b6577]" style={mono}>{Math.round(modernProgress)}%</span>
            </div>
            <div className="w-full bg-[#111823] rounded-full h-1.5 border border-[#1e2736] overflow-hidden">
              <div
                className="h-full bg-[#45c4b0] rounded-full transition-all duration-150"
                style={{ width: `${Math.round(modernProgress)}%` }}
              />
            </div>
          </div>

          {done && (
            <div className="mt-4 pt-4 border-t border-[#1e2736]">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[16px] text-[#4ade80]">{'\u2713'}</span>
                <span className="text-[13px] font-semibold text-[#e6edf7]" style={mono}>
                  Parity Complete
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#111823] rounded-lg p-3 text-center border border-[#1e2736]">
                  <div className="text-[18px] font-bold text-[#4ade80]" style={mono}>
                    {(selectedDataset.records - 1).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#5b6577] mt-1" style={mono}>Match</div>
                </div>
                <div className="bg-[#111823] rounded-lg p-3 text-center border border-[#1e2736]">
                  <div className="text-[18px] font-bold text-[#fbbf24]" style={mono}>1</div>
                  <div className="text-[10px] text-[#5b6577] mt-1" style={mono}>To review</div>
                </div>
                <div className="bg-[#111823] rounded-lg p-3 text-center border border-[#1e2736]">
                  <div className="text-[18px] font-bold text-[#dbe4f0]" style={mono}>
                    {selectedDataset.records.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#5b6577] mt-1" style={mono}>Total</div>
                </div>
              </div>
              <p className="text-[11px] text-[#9fb0c6] mt-3" style={sans}>
                {(selectedDataset.records - 1).toLocaleString()}/{selectedDataset.records.toLocaleString()} match / 1 to review
              </p>

              {/* Proceed to Performance button */}
              <div className="mt-5 flex justify-end">
                <button
                  onClick={onProceedToPerformance}
                  className="px-4 py-1.5 text-[11px] font-semibold rounded-lg bg-[#45c4b0] text-[#0a0e14] hover:bg-[#3db3a0] transition-colors"
                  style={mono}
                >
                  Proceed to Performance Evaluation {'\u2192'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Performance Stage ---------- */

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-[#111823] rounded-full h-2 border border-[#1e2736] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-semibold w-8 text-right" style={{ ...mono, color }}>
        {score}
      </span>
    </div>
  );
}

function PerformanceStage({
  perfData,
  perfLoading,
  perfError,
  langLabel,
  onRunLLMAnalysis,
}: {
  perfData: PerfData | null;
  perfLoading: boolean;
  perfError: string | null;
  langLabel: string;
  onRunLLMAnalysis: () => void;
}) {
  if (perfLoading) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <div className="inline-block w-8 h-8 border-2 border-[#45c4b0] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-[14px] font-semibold text-[#e6edf7] mb-2" style={mono}>
          Running Performance Analysis
        </h2>
        <p className="text-[11px] text-[#7a869a]" style={sans}>
          Sending COBOL and {langLabel} code to LLM for static performance evaluation...
        </p>
      </div>
    );
  }

  if (!perfData) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <p className="text-[11px] text-[#7a869a]" style={sans}>
          No performance data available.
        </p>
      </div>
    );
  }

  const verdictConfig = {
    faster: { label: `${langLabel} is faster overall`, bg: 'bg-[#4ade80]/10', border: 'border-[#4ade80]/30', text: 'text-[#4ade80]' },
    comparable: { label: 'Roughly comparable', bg: 'bg-[#fbbf24]/10', border: 'border-[#fbbf24]/30', text: 'text-[#fbbf24]' },
    slower: { label: 'COBOL is faster overall', bg: 'bg-[#f87171]/10', border: 'border-[#f87171]/30', text: 'text-[#f87171]' },
  };
  const vc = verdictConfig[perfData.verdict];

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-[14px] font-semibold text-[#e6edf7] mb-1" style={mono}>
        Performance Evaluation
      </h2>
      <p className="text-[11px] text-[#7a869a] mb-5" style={sans}>
        Static analysis comparing COBOL and {langLabel} performance characteristics across six categories.
      </p>

      {/* Error banner */}
      {perfError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[#f87171]/10 border border-[#f87171]/30">
          <p className="text-[11px] text-[#f87171]" style={mono}>
            LLM analysis failed: {perfError}. Showing mock data instead.
          </p>
          <button
            onClick={onRunLLMAnalysis}
            className="mt-2 text-[11px] text-[#f87171] underline hover:text-[#fca5a5] transition-colors"
            style={mono}
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary card */}
      <div className="bg-[#0c1018] border border-[#1e2736] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${vc.bg} ${vc.border} ${vc.text}`} style={mono}>
              {vc.label}
            </span>
          </div>
          <button
            onClick={onRunLLMAnalysis}
            className="px-4 py-1.5 text-[11px] font-semibold rounded-lg border border-[#45c4b0]/30 text-[#45c4b0] hover:bg-[#45c4b0]/10 transition-colors"
            style={mono}
          >
            Run LLM Analysis
          </button>
        </div>

        {/* Overall scores side-by-side */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#111823] rounded-lg p-4 border border-[#1e2736] text-center">
            <div className="text-[24px] font-bold text-[#f97316]" style={mono}>
              {perfData.overall_cobol_score}
            </div>
            <div className="text-[10px] text-[#7a869a] mt-1 flex items-center justify-center gap-1.5" style={mono}>
              <span className="w-2 h-2 rounded-full bg-[#f97316]" />
              COBOL Overall
            </div>
          </div>
          <div className="bg-[#111823] rounded-lg p-4 border border-[#1e2736] text-center">
            <div className="text-[24px] font-bold text-[#45c4b0]" style={mono}>
              {perfData.overall_modern_score}
            </div>
            <div className="text-[10px] text-[#7a869a] mt-1 flex items-center justify-center gap-1.5" style={mono}>
              <span className="w-2 h-2 rounded-full bg-[#45c4b0]" />
              {langLabel} Overall
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#9fb0c6] leading-relaxed" style={sans}>
          {perfData.summary}
        </p>
      </div>

      {/* Category cards — 2×3 grid */}
      <div className="grid grid-cols-2 gap-4">
        {perfData.categories.map((cat) => (
          <div
            key={cat.name}
            className="bg-[#0c1018] border border-[#1e2736] rounded-xl p-4"
          >
            <h3 className="text-[12px] font-semibold text-[#e6edf7] mb-3" style={mono}>
              {cat.name}
            </h3>

            {/* Score bars */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#f97316] w-14 shrink-0" style={mono}>COBOL</span>
                <ScoreBar score={cat.cobol_score} color="#f97316" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#45c4b0] w-14 shrink-0" style={mono}>{langLabel}</span>
                <ScoreBar score={cat.modern_score} color="#45c4b0" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 mb-3">
              <p className="text-[10px] text-[#7a869a] leading-relaxed" style={sans}>
                <span className="text-[#f97316] font-semibold" style={mono}>COBOL: </span>
                {cat.cobol_notes}
              </p>
              <p className="text-[10px] text-[#7a869a] leading-relaxed" style={sans}>
                <span className="text-[#45c4b0] font-semibold" style={mono}>{langLabel}: </span>
                {cat.modern_notes}
              </p>
            </div>

            {/* Recommendation */}
            <div className="pt-2 border-t border-[#1e2736]">
              <p className="text-[10px] text-[#60a5fa] leading-relaxed" style={sans}>
                <span className="font-semibold" style={mono}>Rec: </span>
                {cat.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
