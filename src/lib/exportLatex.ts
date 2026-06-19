import { SavedFigure, PreviewFigure } from '../types';
import { ResolvedFigureExportMetadata } from './figureCaptionMetadata';

export function escapeLatexText(value: string): string {
  if (!value) return '';
  // Mapping approach to prevent double escaping
  const map: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '{': '\\{',
    '}': '\\}',
    '$': '\\$',
    '&': '\\&',
    '%': '\\%',
    '#': '\\#',
    '_': '\\_',
    '^': '\\textasciicircum{}',
    '~': '\\textasciitilde{}',
  };
  
  // Also normalize line breaks to spaces
  const normalized = value.replace(/\r\n|\r|\n/g, ' ');
  
  let escaped = '';
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (map[char]) {
      escaped += map[char];
    } else {
      escaped += char;
    }
  }
  
  return escaped;
}

export function toLatexIdentifier(value: string, fallback: string = 'node'): string {
  if (!value) return fallback;
  // Replace non-alphanumeric with hyphen
  let safe = value.replace(/[^a-zA-Z0-9]/g, '-');
  // Remove consecutive hyphens
  safe = safe.replace(/-+/g, '-');
  // Trim hyphens
  safe = safe.replace(/^-+|-+$/g, '');
  return safe || fallback;
}

export function generateFigureLatex(args: {
  figure: SavedFigure | PreviewFigure;
  metadata: ResolvedFigureExportMetadata;
  options?: {
    useLatexNativeNumbering?: boolean;
    isDoubleColumn?: boolean;
  };
}): string {
  const { figure, metadata, options = {} } = args;
  const isDoubleColumn = !!options.isDoubleColumn;
  
  let code = '';

  const renderCaptionAndSource = () => {
    let output = '';
    if (metadata.captionText) {
      output += `\\caption{${escapeLatexText(metadata.captionText)}}\n`;
    }
    if (metadata.sourceCitation && metadata.sourceCitation.trim() !== '') {
      output += `\\par\\smallskip\n{\\footnotesize\\itshape Nguồn: ${escapeLatexText(metadata.sourceCitation)}\\par}\n`;
    }
    return output.trimEnd();
  };

  if (figure.type === 'table' && figure.table) {
    const { columns, rows } = figure.table;
    const colSpec = columns
      .map((c) => (c.align === 'left' ? 'l' : c.align === 'right' ? 'r' : 'c'))
      .join('');

    // If booktabs is used, add note
    code = `% Requires \\usepackage{booktabs}
\\begin{table}[htbp]
\\centering
${renderCaptionAndSource()}
\\label{tab:academic_generated_${'id' in figure ? (figure as any).id : 'preview'}}
\\begin{tabular}{${colSpec}}
\\toprule
\\textbf{${columns.map((c) => escapeLatexText(c.header)).join(' & ')}} \\\\
\\midrule
${rows.map((r) => columns.map((c) => escapeLatexText(String(r[c.key] ?? ''))).join(' & ') + ' \\\\').join('\n')}
\\bottomrule
\\end{tabular}
\\end{table}`;

  } else if (figure.type === 'chart' && figure.chart) {
    const { config, data } = figure.chart;
    code = `% Plotting in PGFPlots (LaTeX standard)
\\begin{figure}[htbp]
\\centering
\\begin{tikzpicture}
\\begin{axis}[
    title={${escapeLatexText(config.title || '')}},
    xlabel={${escapeLatexText(config.xAxisLabel || '')}},
    ylabel={${escapeLatexText(config.yAxisLabel || '')}},
    grid=${config.showGrid ? 'major' : 'none'},
    width=${isDoubleColumn ? '0.48\\textwidth' : '0.9\\textwidth'}
]
\\addplot[color=blue,mark=x] coordinates {
  ${data.map((d) => `(${escapeLatexText(String(d.label))},${d.value})`).join(' ')}
};
\\end{axis}
\\end{tikzpicture}
${renderCaptionAndSource()}
\\end{figure}`;

  } else if (figure.type === 'diagram' && figure.diagram) {
    code = `% Drawing via TikZ Flowchart (LaTeX)
\\begin{figure}[htbp]
\\centering
\\begin{tikzpicture}[node distance=2cm, every node/.style={fill=white, draw, text centered}]
  % Nodes
  ${(figure.diagram.nodes || []).map((n) => `\\node (${toLatexIdentifier(String(n.id))}) [rectangle, minimum width=${n.w / 40}cm, minimum height=${n.h / 40}cm] at (${n.x / 100},-${n.y / 100}) {${escapeLatexText(n.label || '')}};`).join('\n  ')}
  
  % Arrows
  ${(figure.diagram.connections || []).map((c) => `\\draw [->${c.style === 'dashed' ? ',dashed' : ''}] (${toLatexIdentifier(String(c.fromId))}) -- node[anchor=south] {${escapeLatexText(c.label || '')}} (${toLatexIdentifier(String(c.toId))});`).join('\n  ')}
\\end{tikzpicture}
${renderCaptionAndSource()}
\\end{figure}`;

  } else {
    code = `% Hình chưa được hỗ trợ mã TikZ/LaTeX`;
  }
  
  return code;
}
