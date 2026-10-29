import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export default function DiffViewer({ original, modified, inline, theme }) {
  const container = useRef(null), editor = useRef(null);
  useEffect(() => {
    const before = monaco.editor.createModel(original, 'c');
    const after = monaco.editor.createModel(modified, 'c');
    const instance = monaco.editor.createDiffEditor(container.current, {
      automaticLayout: true, readOnly: true, originalEditable: false,
      ignoreTrimWhitespace: false, renderSideBySide: !inline,
      minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false,
    });
    instance.setModel({ original: before, modified: after });
    editor.current = instance;
    return () => {
      // Detach the diff computation before disposing either text model.
      instance.setModel(null);
      instance.dispose();
      before.dispose();
      after.dispose();
      editor.current = null;
    };
  }, []);
  useEffect(() => {
    const models = editor.current?.getModel();
    if (models) { models.original.setValue(original); models.modified.setValue(modified); }
  }, [original, modified]);
  useEffect(() => { editor.current?.updateOptions({ renderSideBySide: !inline }); }, [inline]);
  useEffect(() => { monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'light'); }, [theme]);
  return <div ref={container} style={{ width: '100%', height: '100%' }} aria-label="Original and formatted code comparison"/>;
}
