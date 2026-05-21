import { useMemo, useState } from "react";
import type { OptimizationLog } from "../intermediate/code-optimizer";

interface OutputPanelProps {
  intermediateCode: string[];
  optimizedCode: string[];
  optimizationLogs: OptimizationLog[];
  machineCode: string[];
}

type OutputTab = "intermediate" | "optimized" | "machine";

const tabs: { id: OutputTab; label: string }[] = [
  { id: "intermediate", label: "Intermediario" },
  { id: "optimized", label: "Otimizado" },
  { id: "machine", label: "SimpSIM" },
];

const OutputPanel = ({
  intermediateCode,
  optimizedCode,
  optimizationLogs,
  machineCode,
}: OutputPanelProps) => {
  const [activeTab, setActiveTab] = useState<OutputTab>("intermediate");
  const [copyLabel, setCopyLabel] = useState("Copiar");

  const activeLines = useMemo(() => {
    switch (activeTab) {
      case "intermediate":
        return intermediateCode;
      case "optimized":
        return optimizedCode;
      case "machine":
        return machineCode;
    }
  }, [activeTab, intermediateCode, machineCode, optimizedCode]);

  const emptyMessage = useMemo(() => {
    if (activeTab === "machine") {
      return "Codigo SimpSIM ainda nao gerado.";
    }

    return "Compile um programa sem erros para visualizar esta saida.";
  }, [activeTab]);

  const handleCopy = async () => {
    if (activeLines.length === 0) return;

    await navigator.clipboard.writeText(activeLines.join("\n"));
    setCopyLabel("Copiado");
    window.setTimeout(() => setCopyLabel("Copiar"), 1500);
  };

  return (
    <aside className="flex h-full w-[420px] min-w-[320px] flex-col border-l border-zinc-700 bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-zinc-700 bg-[#252526] px-3 py-2">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                activeTab === tab.id
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={activeLines.length === 0}
          className="px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-600"
        >
          {copyLabel}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-sm">
        {activeLines.length === 0 ? (
          <div className="text-zinc-600 italic">{emptyMessage}</div>
        ) : (
          <ol className="space-y-1">
            {activeLines.map((line, index) => (
              <li key={`${line}-${index}`} className="flex gap-4">
                <span className="w-8 shrink-0 select-none text-right text-zinc-600">
                  {index + 1}
                </span>
                <code className="whitespace-pre-wrap break-all text-blue-300">
                  {line}
                </code>
              </li>
            ))}
          </ol>
        )}
      </div>

      {activeTab === "optimized" && optimizationLogs.length > 0 && (
        <div className="max-h-44 overflow-auto border-t border-zinc-700 bg-[#181818] p-3 font-mono text-xs">
          <div className="mb-2 font-semibold uppercase tracking-wider text-zinc-400">
            Otimizacoes aplicadas
          </div>
          <ul className="space-y-2">
            {optimizationLogs.map((optimization, index) => (
              <li key={`${optimization.rule}-${index}`} className="text-zinc-400">
                <span className="text-green-400">{optimization.rule}</span>
                <div className="text-red-300">- {optimization.before}</div>
                {optimization.after && (
                  <div className="text-blue-300">+ {optimization.after}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
};

export default OutputPanel;
