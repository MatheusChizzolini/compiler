import Editor, { useMonaco, type OnMount } from "@monaco-editor/react";
import type { LexicalError } from "../lexer/types";
import { useEffect } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  errors?: LexicalError[];
}

const CodeEditor = ({ value, onChange, errors = [] }: CodeEditorProps) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      const model = monaco.editor.getModels()[0];
      if (model) {
        const markers = errors.map((err) => ({
          severity: monaco.MarkerSeverity.Error,
          message: `[ERRO LÉXICO] ${err.message}`,
          startLineNumber: err.line,
          startColumn: err.column,
          endLineNumber: err.line,
          endColumn: err.column + err.length,
        }));
        monaco.editor.setModelMarkers(model, "linguagem", markers);
      }
    }
  }, [monaco, errors]);

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
      />
    </div>
  );
};

export default CodeEditor;
