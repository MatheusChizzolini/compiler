import { useState } from "react";
import CodeEditor from "./components/code-editor";
import SideBar from "./components/side-bar";
import Console from "./components/console";
import { useCompiler } from "./hooks/use-compiler";

export default function App() {
  const [code, setCode] = useState("");
  const { lexicalErrors, syntaxErrors, semanticErrors, logs, compile } = useCompiler();

  const handleChange = (value: string) => {
    setCode(value);
    compile(value);
  };

  const handleLoadFile = (content: string) => {
    handleChange(content);
  };

  return (
    <div className="flex h-screen">
      <SideBar onLoadFile={handleLoadFile} sourceCode={code} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <div className="flex-1 min-h-0">
          <CodeEditor
            value={code}
            onChange={handleChange}
            lexicalErrors={lexicalErrors}
            syntaxErrors={syntaxErrors}
            semanticErrors={semanticErrors}
          />
        </div>
        <Console logs={logs} /> 
      </div>
    </div>
  );
}
