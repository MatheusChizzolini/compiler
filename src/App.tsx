import { useState } from "react";
import CodeEditor from "./components/code-editor";
import SideBar from "./components/side-bar";
import Console from "./components/console";
import { useCompiler } from "./hooks/use-compiler";
import OutputPanel from "./components/output-panel";

export default function App() {
  const [code, setCode] = useState("");
  const {
    lexicalErrors,
    syntaxErrors,
    semanticErrors,
    semanticWarnings,
    intermediateCode,
    optimizedCode,
    optimizationLogs,
    machineCode,
    logs,
    compile,
  } = useCompiler();

  const handleChange = (value: string) => {
    setCode(value);
  };

  const handleLoadFile = (content: string) => {
    handleChange(content);
  };

  const handleCompile = () => {
    compile(code);
  };

  const handleGenerateAsm = () => {
    if (machineCode.length === 0) return;

    const blob = new Blob([machineCode.join("\n")], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "program.asm";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen">
      <SideBar
        onLoadFile={handleLoadFile}
        onCompile={handleCompile}
        onGenerateAsm={handleGenerateAsm}
        canGenerateAsm={machineCode.length > 0}
        sourceCode={code}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex flex-1 min-h-0">
          <div className="min-w-0 flex-1">
            <CodeEditor
              value={code}
              onChange={handleChange}
              lexicalErrors={lexicalErrors}
              syntaxErrors={syntaxErrors}
              semanticErrors={semanticErrors}
              semanticWarnings={semanticWarnings}
            />
          </div>
          <OutputPanel
            intermediateCode={intermediateCode}
            optimizedCode={optimizedCode}
            optimizationLogs={optimizationLogs}
            machineCode={machineCode}
          />
        </div>
        <Console logs={logs} /> 
      </div>
    </div>
  );
}
