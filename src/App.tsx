import { useEffect, useState } from "react";
import CodeEditor from "./components/code-editor";
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
    <>
      <CodeEditor
        value={sourceCode}
        onChange={handleCodeChange}
        errors={errors}
      />
    </>
  );
};

export default App;
