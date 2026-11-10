// Jira stores rich text as Atlassian Document Format (ADF), a JSON tree.
// Agents and our readiness checks want plain text, so this flattens the tree
// into Markdown-like text. It is deliberately small: unknown nodes fall back
// to the text of their children, so nothing is silently dropped.

const MAX_DEPTH = 40; // ADF is shallow in practice; this only guards recursion.

function inline(node, depth) {
  if (!node || depth > MAX_DEPTH) return '';
  switch (node.type) {
    case 'text':
      return node.text || '';
    case 'hardBreak':
      return '\n';
    case 'mention':
      return node.attrs?.text || '@user';
    case 'emoji':
      return node.attrs?.text || node.attrs?.shortName || '';
    case 'inlineCard':
      return node.attrs?.url || '';
    case 'status':
      return `[${node.attrs?.text || ''}]`;
    case 'date':
      return node.attrs?.timestamp
        ? new Date(Number(node.attrs.timestamp)).toISOString().slice(0, 10)
        : '';
    default:
      return (node.content || []).map((c) => inline(c, depth + 1)).join('');
  }
}

function block(node, depth, indent) {
  if (!node || depth > MAX_DEPTH) return [];
  const kids = node.content || [];
  const pad = '  '.repeat(indent);
  switch (node.type) {
    case 'paragraph':
      return [pad + inline(node, depth)];
    case 'heading':
      return [`${'#'.repeat(node.attrs?.level || 1)} ${inline(node, depth)}`];
    case 'codeBlock':
      return ['```', inline(node, depth), '```'];
    case 'rule':
      return ['---'];
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
      return kids.flatMap((item, i) => listItem(node.type, item, i, depth + 1, indent));
    case 'table':
      return kids.map(
        (row) => '| ' + (row.content || []).map((cell) => blocks(cell, depth + 2, 0).join(' ')).join(' | ') + ' |'
      );
    case 'mediaSingle':
    case 'mediaGroup':
      return ['[attachment]'];
    default:
      // doc, blockquote, panel, expand, layout… : keep the children.
      return kids.length ? blocks(node, depth, indent) : [inline(node, depth)].filter(Boolean);
  }
}

function listItem(listType, item, index, depth, indent) {
  const pad = '  '.repeat(indent);
  let marker = '- ';
  if (listType === 'orderedList') marker = `${index + 1}. `;
  if (listType === 'taskList') marker = item.attrs?.state === 'DONE' ? '- [x] ' : '- [ ] ';

  // taskItem holds inline content directly; listItem holds blocks.
  if (item.type === 'taskItem') return [pad + marker + inline(item, depth)];

  const lines = blocks(item, depth, indent + 1);
  if (!lines.length) return [pad + marker];
  lines[0] = pad + marker + lines[0].trimStart();
  return lines;
}

function blocks(node, depth, indent) {
  return (node.content || []).flatMap((c) => block(c, depth + 1, indent));
}

// Entry point. Accepts an ADF document, a plain string (older APIs) or null.
export function adfToText(doc) {
  if (!doc) return '';
  if (typeof doc === 'string') return doc.trim();
  return blocks(doc, 0, 0)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
