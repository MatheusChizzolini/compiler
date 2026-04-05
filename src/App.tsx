import { useState } from "react";
import CodeEditor from "./components/code-editor";
import SideBar from "./components/side-bar";
import { useCompiler } from "./hooks/use-compiler";

export default function App() {
  const [code, setCode] = useState("");
  const { lexicalErrors, syntaxErrors, compile } = useCompiler();

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
      <div className="flex-1 min-w-0">
        <CodeEditor
          value={code}
          onChange={handleChange}
          lexicalErrors={lexicalErrors}
          syntaxErrors={syntaxErrors}
        />
      </div>
    </div>
  );
}
