export const handleEditorPaste = (
    e: React.ClipboardEvent,
    editorRef: React.RefObject<HTMLDivElement>,
    processContent: () => void
  ) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
  
    const range = selection.getRangeAt(0);
    range.deleteContents();
  
    let currentDiv = range.startContainer;
    while (currentDiv && currentDiv.parentElement !== editorRef.current) {
      currentDiv = currentDiv.parentElement;
    }
  
    const lines = text.split(/\r\n|\r|\n/);
    lines.forEach((line, index) => {
      if (!currentDiv || !(currentDiv instanceof HTMLElement)) {
        currentDiv = document.createElement("div");
        editorRef.current?.appendChild(currentDiv);
      }
  
      const textNode = document.createTextNode(line);
      currentDiv.appendChild(textNode);
  
      if (index < lines.length - 1) {
        currentDiv = document.createElement("div");
        editorRef.current?.appendChild(currentDiv);
      }
    });
  
    processContent();
  };