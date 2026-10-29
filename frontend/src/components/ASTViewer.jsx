import { useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
export default function ASTViewer({ ast, theme, onLocate }) {
  const [selected, setSelected] = useState(null);
  const graph = useMemo(() => {
    const nodes = [], edges = []; let leaf = 0;
    function walk(n, depth, parent) {
      const id = String(nodes.length), item = { id, data: { label: n.type + (n.name || n.value || n.operator ? '\n' + (n.name || n.value || n.operator) : ''), detail: n }, position: { x: 0, y: depth * 110 } };
      nodes.push(item);
      const positions = (n.children || []).map(c => walk(c, depth + 1, id));
      item.position.x = positions.length ? (positions[0] + positions.at(-1)) / 2 : leaf++ * 205;
      if (parent !== undefined) edges.push({ id: parent + '-' + id, source: parent, target: id, type: 'smoothstep' });
      return item.position.x;
    }
    if (ast) walk(ast, 0);
    return { nodes, edges };
  }, [ast]);
  if (!ast) return <div className="empty">Format valid source to explore its syntax tree. Parsing errors must be resolved first.</div>;
  if (graph.nodes.length > 2000) return <div className="empty">This AST has {graph.nodes.length} nodes. Use a smaller program for interactive visualization.</div>;
  return <div className="tree-wrap"><ReactFlow {...graph} colorMode={theme} fitView minZoom={0.05} onNodeClick={(_, n) => { setSelected(n.data.detail); }}><Background gap={22}/><Controls/><MiniMap pannable zoomable/></ReactFlow>
    {selected && <aside className="node-detail"><button onClick={() => setSelected(null)} aria-label="Close node details">×</button><strong>{selected.type}</strong><pre>{JSON.stringify({ ...selected, children: selected.children?.map(c => c.type) }, null, 2)}</pre>{selected.location && <button className="reveal-button" onClick={() => onLocate(selected.location)}>Reveal source ? {selected.location.line}:{selected.location.column}</button>}</aside>}</div>;
}
