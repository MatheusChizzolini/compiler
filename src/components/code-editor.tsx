import Editor, { useMonaco, type OnMount } from "@monaco-editor/react";
import type { LexicalError, SyntaxError } from "../types";
import { useEffect } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  lexicalErrors?: LexicalError[];
  syntaxErrors?: SyntaxError[];
}

const CodeEditor = ({
  value,
  onChange,
  lexicalErrors = [],
  syntaxErrors = [],
}: CodeEditorProps) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      const model = monaco.editor.getModels()[0];
  
      const lexicalMarkers = lexicalErrors.map((err) => ({
        severity: monaco.MarkerSeverity.Error,
        message: `[ERRO LÉXICO] ${err.message}`,
        startLineNumber: err.line,
        startColumn: err.column,
        endLineNumber: err.line,
        endColumn: err.column + err.length,
      }));
  
      const syntaxMarkers = syntaxErrors.map((err) => ({
        severity: monaco.MarkerSeverity.Warning,
        message: `[ERRO SINTÁTICO] ${err.message}`,
        startLineNumber: err.line,
        startColumn: err.column,
        endLineNumber: err.line,
        endColumn: err.column + Math.max(err.length, 1),
      }));
  
      monaco.editor.setModelMarkers(model, "linguagem", [
        ...lexicalMarkers,
        ...syntaxMarkers,
      ]);
    }

  }, [monaco, lexicalErrors, syntaxErrors]);

  const handleEditorMount: OnMount = (_, monaco) => {
    monaco.languages.register({ id: "linguagem" });

    monaco.languages.setMonarchTokensProvider("linguagem", {
      tokenizer: {
        root: [
          [/\b(if|else|while)\b/, "keyword"],
          [/\b(int|decimal|char|bool)\b/, "type"],
          [/\b(true|false)\b/, "number"],
          [/[a-zA-Z_][a-zA-Z0-9_]*/, "identifier"],
          [/\d+\.\d+/, "number.float"],
          [/\d+/, "number"],
          [/[+\-*/%]/, "operator"],
          [/==|!=|>=|<=|>|</, "operator"],
          [/[&|!]/, "operator"],
          [/[{}()]/, "delimiter"],
          [/;/, "delimiter"],
          [/'[^']'/, "string"],
        ],
      },
    });
  };

  return (
    <div className="h-screen">
      <Editor
        defaultLanguage="linguagem"
        theme="vs-dark"
        value={value}
        onChange={(value) => onChange(value || "")}
        onMount={handleEditorMount}
        options={{ minimap: { enabled: false } }}
      />
    </div>
  );
};

export default CodeEditor;
