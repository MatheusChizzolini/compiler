import { useEffect, useState } from "react";
import CodeEditor from "./components/code-editor";
import SideBar from "./components/side-bar";
import type { LexicalError } from "./lexer/types";
import { Scanner } from "./lexer/scanner";

const App = () => {
  const [sourceCode, setSourceCode] = useState("");
  const [errors, setErrors] = useState<LexicalError[]>([]);

  const handleCodeChange = (newCode: string) => {
    setSourceCode(newCode);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceCode.trim() !== "") {
        console.clear();
        const scanner = new Scanner(sourceCode);
        const result = scanner.scanTokens();
        setErrors(result.errors);
      } else {
        setErrors([]);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [sourceCode]);

  return (
    <div className="flex h-screen">
      <div className="w-[25%]">
        <SideBar onLoadFile={setSourceCode} sourceCode={sourceCode} />
      </div>
      <div className="flex-1">
        <CodeEditor
          value={sourceCode}
          onChange={handleCodeChange}
          errors={errors}
        />
      </div>
    </div>
  );
};

export default App;
