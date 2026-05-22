interface SideBarProps {
  onLoadFile: (content: string) => void;
  onCompile: () => void;
  onGenerateAsm: () => void;
  canGenerateAsm: boolean;
  sourceCode: string;
}

const SideBar = ({
  onLoadFile,
  onCompile,
  onGenerateAsm,
  canGenerateAsm,
  sourceCode,
}: SideBarProps) => {
  const handleLoadFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          onLoadFile(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSaveFile = () => {
    const blob = new Blob([sourceCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "file.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-67">
      <button
        onClick={onCompile}
        className="bg-green-700 font-bold py-2 px-4 m-4 shadow-2xl hover:bg-green-600 cursor-pointer"
      >
        Compilar
      </button>
      <button
        onClick={onGenerateAsm}
        disabled={!canGenerateAsm}
        className="bg-purple-700 font-bold py-2 px-4 mx-4 mb-4 shadow-2xl hover:bg-purple-600 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 cursor-pointer"
      >
        Gerar .asm
      </button>
      <button
        onClick={handleLoadFile}
        className="bg-blue-800 font-bold py-2 px-4 mx-4 mb-4 shadow-2xl hover:bg-blue-700 cursor-pointer"
      >
        Carregar arquivo
      </button>
      <button
        onClick={handleSaveFile}
        className="bg-blue-800 font-bold py-2 px-4 mx-4 shadow-2xl hover:bg-blue-700 cursor-pointer"
      >
        Salvar arquivo
      </button>
    </div>
  );
};

export default SideBar;
