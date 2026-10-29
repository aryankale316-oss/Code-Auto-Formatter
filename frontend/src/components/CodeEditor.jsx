import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
export default function CodeEditor({ value, onChange, theme, diagnostics = [], readOnly = false, reveal }) {
  const editor = useRef(), monaco = useRef();
  function markers() {
    if (!editor.current) return;
    monaco.current.editor.setModelMarkers(editor.current.getModel(), 'codecraft', diagnostics.filter(d => d.line).map(d => ({
      startLineNumber: d.line, startColumn: d.column, endLineNumber: d.line, endColumn: d.column + 1,
      message: d.message + (d.suggestion ? '\n' + d.suggestion : ''), severity: monaco.current.MarkerSeverity.Error,
    })));
  }
  useEffect(markers, [diagnostics]);
  function revealPosition() {
    if (reveal && editor.current) {
      editor.current.revealLineInCenter(reveal.line);
      editor.current.setPosition({ lineNumber: reveal.line, column: reveal.column });
      editor.current.focus();
    }
  }
  useEffect(revealPosition, [reveal]);
  return <Editor height="100%" language="c" value={value} onChange={v => onChange?.(v || '')} theme={theme === 'dark' ? 'vs-dark' : 'light'}
    loading={<div className="editor-loading">Loading editor…</div>}
    onMount={(e, m) => { editor.current = e; monaco.current = m; markers(); revealPosition(); }}
    options={{ readOnly, minimap: { enabled: false }, fontSize: 13, fontFamily: 'Consolas, monospace', lineHeight: 23,
      padding: { top: 20 }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4,
      renderLineHighlight: 'line', wordWrap: 'on', contextmenu: true, ariaLabel: readOnly ? 'Formatted C source' : 'Original C source' }}/>
}
