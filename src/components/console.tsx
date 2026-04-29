import { useEffect, useRef } from "react";
import type { Log } from "../types";

interface ConsoleProps {
  logs: Log[];
}

const Console = ({ logs }: ConsoleProps) => {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      case "success":
        return "text-green-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <div className="flex flex-col h-64 bg-[#1e1e1e] border-t border-gray-700 font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-gray-700">
        <span className="text-gray-400 font-semibold uppercase tracking-wider text-xs">Console</span>
      </div>
      <div 
        ref={consoleRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar"
      >
        {logs.length === 0 ? (
          <div className="text-gray-600 italic">Aguardando compilação...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex space-x-3 group animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-gray-600 shrink-0 select-none">[{log.timestamp}]</span>
              <span className={`${getLogColor(log.type)} break-all`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Console;
