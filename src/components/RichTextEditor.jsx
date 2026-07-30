import { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  List, ListOrdered, Quote, Heading2, Heading3, 
  Link as LinkIcon, RemoveFormatting, Code,
  Maximize2, Minimize2, Eye, FileCode
} from 'lucide-react';

export default function RichTextEditor({ value, onChange, placeholder = 'Write your content here...' }) {
  const editorRef = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState(value || '');

  // Sync editor innerHTML with external value changes safely (avoids cursor jump)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value && !isSourceMode) {
      editorRef.current.innerHTML = value || '<p><br></p>';
    }
    setSourceCode(value || '');
  }, [value, isSourceMode]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceCode(html);
    }
  };

  const handleSourceChange = (e) => {
    const val = e.target.value;
    setSourceCode(val);
    onChange(val);
  };

  const executeCommand = (command, arg = null) => {
    if (isSourceMode) return;
    document.execCommand(command, false, arg);
    handleInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const insertLink = () => {
    if (isSourceMode) return;
    const selection = window.getSelection().toString();
    const url = window.prompt('Enter URL:', selection.startsWith('http') ? selection : 'https://');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const formatBlock = (tag) => {
    if (isSourceMode) return;
    executeCommand('formatBlock', tag);
  };

  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Sync from sourceCode text back to editor DOM element
      setIsSourceMode(false);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = sourceCode || '<p><br></p>';
        }
      }, 50);
    } else {
      setIsSourceMode(true);
    }
  };

  const getWordCount = () => {
    const cleanText = sourceCode.replace(/<[^>]*>/g, ' ');
    return cleanText.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const getCharCount = () => {
    return sourceCode.replace(/<[^>]*>/g, '').length;
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 border transition shadow-sm ${
      isFullScreen 
        ? 'fixed inset-0 z-50 p-6 bg-slate-50 dark:bg-slate-950 border-transparent overflow-hidden' 
        : 'w-full border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/10'
    }`}>
      
      {/* Visual Formatter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Paragraph / Headings */}
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => formatBlock('<p>')}
            className="px-2 py-1 rounded text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Normal Paragraph"
          >
            P
          </button>
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => formatBlock('<h2>')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => formatBlock('<h3>')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-750 mx-1" />

          {/* Text Decoration */}
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-750 mx-1" />

          {/* Lists & Quotes */}
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => formatBlock('<blockquote>')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Quote Block"
          >
            <Quote className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => formatBlock('<pre>')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-750 mx-1" />

          {/* Links & Clear */}
          <button
            type="button"
            disabled={isSourceMode}
            onClick={insertLink}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isSourceMode}
            onClick={() => executeCommand('removeFormat')}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-30"
            title="Clear Formatting"
          >
            <RemoveFormatting className="h-4 w-4" />
          </button>
        </div>

        {/* Immersive control buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleSourceMode}
            className={`p-1.5 rounded transition ${
              isSourceMode 
                ? 'bg-violet-500/10 text-violet-500' 
                : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title={isSourceMode ? "Visual mode" : "Source Code mode"}
          >
            {isSourceMode ? <Eye className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
          </button>
          
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            title={isFullScreen ? "Minimize editor" : "Maximize editor"}
          >
            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Editing Area */}
      <div className={`relative flex-1 min-h-[350px] overflow-hidden ${
        isFullScreen ? 'max-h-full' : 'max-h-[600px]'
      }`}>
        {isSourceMode ? (
          <textarea
            value={sourceCode}
            onChange={handleSourceChange}
            placeholder="Write raw HTML source code here..."
            className="w-full h-full min-h-[350px] p-5 outline-none font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border-0 focus:ring-0 resize-none overflow-y-auto"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className="w-full h-full min-h-[350px] overflow-y-auto p-5 outline-none prose dark:prose-invert prose-slate dark:prose-violet text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 font-sans focus:outline-none"
            style={{
              fontSize: '0.95rem',
              lineHeight: '1.65',
            }}
          />
        )}
      </div>

      {/* Footer statistics counter bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-400">
        <span>Words: {getWordCount()}</span>
        <span>Characters: {getCharCount()}</span>
      </div>
    </div>
  );
}
