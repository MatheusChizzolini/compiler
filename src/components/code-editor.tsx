import Editor, { useMonaco, type OnMount } from "@monaco-editor/react";
import { useEffect } from "react";
import type {
  LexicalError,
  SemanticError,
  SemanticWarning,
  SyntaxError,
} from "../types";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  lexicalErrors?: LexicalError[];
  syntaxErrors?: SyntaxError[];
  semanticErrors?: SemanticError[];
  semanticWarnings?: SemanticWarning[];
}

const CodeEditor = ({
  value,
  onChange,
  lexicalErrors = [],
  syntaxErrors = [],
  semanticErrors = [],
  semanticWarnings = [],
}: CodeEditorProps) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      const model = monaco.editor.getModels()[0];

      const lexicalMarkers = lexicalErrors.map((err) => ({
        severity: monaco.MarkerSeverity.Error,
        message: `[ERRO LEXICO] ${err.message}`,
        startLineNumber: err.line,
        startColumn: err.column,
        endLineNumber: err.line,
        endColumn: err.column + err.length,
      }));

      const syntaxMarkers = syntaxErrors.map((err) => ({
        severity: monaco.MarkerSeverity.Warning,
        message: `[ERRO SINTATICO] ${err.message}`,
        startLineNumber: err.line,
        startColumn: err.column,
        endLineNumber: err.line,
        endColumn: err.column + Math.max(err.length, 1),
      }));

      const semanticMarkers = semanticErrors.map((err) => ({
        severity: monaco.MarkerSeverity.Warning,
        message: `[ERRO SEMANTICO] ${err.message}`,
        startLineNumber: err.line,
        startColumn: err.column,
        endLineNumber: err.line,
        endColumn: err.column + Math.max(err.length, 1),
      }));

      const semanticWarningMarkers = semanticWarnings.map((warning) => ({
        severity: monaco.MarkerSeverity.Info,
        message: `[AVISO SEMANTICO] ${warning.message}`,
        startLineNumber: warning.line,
        startColumn: warning.column,
        endLineNumber: warning.line,
        endColumn: warning.column + Math.max(warning.length, 1),
      }));

      monaco.editor.setModelMarkers(model, "linguagem", [
        ...lexicalMarkers,
        ...syntaxMarkers,
        ...semanticMarkers,
        ...semanticWarningMarkers,
      ]);
    }
  }, [monaco, lexicalErrors, syntaxErrors, semanticErrors, semanticWarnings]);

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

    monaco.languages.setLanguageConfiguration("linguagem", {
      autoClosingPairs: [
        { open: "(", close: ")" },
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });
  };

  return (
    <div className="h-full">
      <Editor
        defaultLanguage="linguagem"
        theme="vs-dark"
        value={value}
        onChange={(value) => onChange(value || "")}
        onMount={handleEditorMount}
        options={{ minimap: { enabled: false }, fontSize: 17 }}
      />
    </div>
  );
};

export default CodeEditor;
