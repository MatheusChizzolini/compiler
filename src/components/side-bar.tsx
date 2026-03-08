interface SideBarProps {
  onLoadFile: (content: string) => void;
  sourceCode: string;
}

const SideBar = ({ onLoadFile, sourceCode }: SideBarProps) => {
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
    <div className="flex flex-col">
      <button
        onClick={handleLoadFile}
        className="bg-blue-800 font-bold py-2 px-4 m-4 rounded-xl shadow-2xl hover:bg-blue-700"
      >
        Carregar Arquivo (.txt)
      </button>
      <button
        onClick={handleSaveFile}
        className="bg-blue-800 font-bold py-2 px-4 mx-4 rounded-xl shadow-2xl hover:bg-blue-700"
      >
        Salvar Arquivo (.txt)
      </button>
    </div>
  );
};

export default SideBar;
