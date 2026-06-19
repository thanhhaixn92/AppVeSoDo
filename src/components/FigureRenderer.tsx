
import React from 'react';
import { SavedFigure, PreviewFigure } from '../types';
import { hasRenderablePayload, getFigurePayloadError, formatVietnameseNumber, formatVietnameseValueWithUnit, getDisplayUnitFromCanonicalUnit, formatTableCellDisplayValue } from '../lib/workflowUtils';
import { COMPREHENSIVE_THEMES } from '../themes';
import { getThemeColors, getThemeFont } from './ThemeSelector';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie,
  LineChart as ReLineChart,
  Line,
  ScatterChart as ReScatterChart,
  Scatter,
  ZAxis,
  AreaChart as ReAreaChart,
  Area,
  Legend,
  LabelList
} from 'recharts';
import { AlertCircle, FileWarning, Inbox } from 'lucide-react';

export function sanitizeSvgId(id: string): string {
  return (id || '').replace(/[^a-zA-Z0-9]/g, '-');
}

export function splitSvgTextIntoLines(text: string, options: {
  maxWidth: number;
  maxLines: number;
  fontSize: number;
  avgCharWidthFactor?: number;
}): string[] {
  if (!text) return [];
  const { maxWidth, maxLines, fontSize, avgCharWidthFactor = 0.55 } = options;
  const avgCharWidth = fontSize * avgCharWidthFactor;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
  
  const rawLines = text.split(/\r\n|\r|\n/);
  const result: string[] = [];
  
  for (const rawLine of rawLines) {
    if (result.length >= maxLines) break;
    let currentLine = rawLine;
    while (currentLine.length > 0 && result.length < maxLines) {
      if (currentLine.length <= maxCharsPerLine) {
        result.push(currentLine);
        break;
      }
      
      let breakIndex = currentLine.lastIndexOf(' ', maxCharsPerLine);
      if (breakIndex === -1 || breakIndex === 0) {
        breakIndex = maxCharsPerLine;
      }
      
      let nextLine = currentLine.substring(0, breakIndex);
      currentLine = currentLine.substring(breakIndex).trim();
      
      if (result.length === maxLines - 1 && currentLine.length > 0) {
        nextLine = nextLine.substring(0, nextLine.length - 1) + '…';
        result.push(nextLine);
        break;
      } else {
        result.push(nextLine);
      }
    }
  }
  
  return result;
}

interface FigureRendererProps {
  figure: SavedFigure | PreviewFigure | null;
  onMouseDownNode?: (e: React.MouseEvent, node: any) => void;
  onTouchStartNode?: (e: React.TouchEvent, node: any) => void;
  onMouseMoveCanvas?: (e: React.MouseEvent) => void;
  onMouseUpCanvas?: (e: React.MouseEvent) => void;
  onTouchMoveCanvas?: (e: React.TouchEvent) => void;
  onTouchEndCanvas?: (e: React.TouchEvent) => void;
  canvasRef?: React.RefObject<SVGSVGElement | null>;
  zoomLevel?: number;
  gridEnabled?: boolean;
  onSelectFigure?: () => void;
  isSelected?: boolean;
  academicCaption?: {
    label?: string;
    ordinal?: number;
    captionText?: string;
    sourceCitation?: string;
    isPreview?: boolean;
  };
}

export const FigureRenderer = React.forwardRef<HTMLDivElement, FigureRendererProps>(({
  figure,
  onMouseDownNode,
  onTouchStartNode,
  onMouseMoveCanvas,
  onMouseUpCanvas,
  onTouchMoveCanvas,
  onTouchEndCanvas,
  canvasRef,
  zoomLevel = 1,
  gridEnabled = true,
  onSelectFigure,
  isSelected,
  academicCaption
}, ref) => {
  if (!figure) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
        <Inbox className="w-12 h-12 opacity-20" />
        <div className="text-center px-8">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest opacity-60">Không gian làm việc trống</p>
          <p className="text-xs mt-2 text-slate-400 font-medium">Hãy nạp dữ liệu nguồn hoặc chọn đề xuất từ thanh bên trái</p>
        </div>
      </div>
    );
  }

  const error = getFigurePayloadError(figure);
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4 bg-red-50/10">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <div>
          <h3 className="text-red-900 font-black uppercase tracking-tight text-sm">Lỗi dữ liệu đề xuất</h3>
          <p className="text-red-600 text-[11px] mt-1 font-semibold max-w-xs mx-auto italic leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  const isPreview = (figure as any).isPreview === true;

  const themeId = (figure as any).theme || 'classic_academic_bw';
  const isColor = themeId.endsWith('_color');
  const baseTheme = themeId.replace('_bw', '').replace('_color', '');
  
  const diagramThemeGroup = COMPREHENSIVE_THEMES[baseTheme] || COMPREHENSIVE_THEMES['classic_academic'];
  const diagramTheme = isColor ? diagramThemeGroup.color : diagramThemeGroup.blackWhite;
  
  let chartColors = getThemeColors(themeId);
  const fontClass = getThemeFont(themeId);

  // Helper for Pie labels
  const getPieTotal = () => {
    if (figure.type !== 'chart' || !figure.chart) return 0;
    return figure.chart.data.reduce((sum, d) => sum + (d.value || 0), 0);
  };

  const formatPieLabel = (props: any) => {
    const { label, percent, value } = props;
    const mode = figure.type === 'chart' ? figure.chart?.config.labelMode : 'name_percent';
    const pct = (percent * 100).toFixed(1);
    const formattedVal = formatVietnameseNumber(value, { compact: false });
    
    if (mode === 'percent') return `${pct}%`;
    if (mode === 'value') return formattedVal;
    if (mode === 'value_percent') return `${formattedVal} (${pct}%)`;
    // default name_percent
    const shortLabel = label.length > 15 ? label.substring(0, 12) + '...' : label;
    return `${shortLabel}: ${pct}%`;
  };

  const formatPieTooltip = (value: number, name: string, props: any) => {
    const total = getPieTotal();
    const percent = props.payload.percent !== undefined ? props.payload.percent : (value / total * 100);
    const unit = props.payload.unit || getDisplayUnitFromCanonicalUnit(props.payload.canonicalUnit, figure.type === 'chart' ? figure.chart?.config.valueUnit : undefined);
    const formattedVal = formatVietnameseValueWithUnit(value, unit);
    return [`${formattedVal} (${percent.toFixed(1)}%)`, name];
  };

  const CustomCartesianTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const fullLabel = data.label || label;
      const unit = data.unit || getDisplayUnitFromCanonicalUnit(data.canonicalUnit, figure.type === 'chart' ? figure.chart?.config.valueUnit : undefined);
      const formattedVal = formatVietnameseValueWithUnit(payload[0].value, unit);

      return (
        <div className="bg-white p-3 border border-slate-100 shadow-md rounded-xl">
          <p className="font-bold text-[12px] text-slate-800 mb-1">{fullLabel}</p>
          <p className="font-bold text-[13px]" style={{ color: payload[0].color || chartColors[0] }}>
            Giá trị: <span className="text-slate-900">{formattedVal}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const truncateAxisLabel = (value: any) => {
    if (typeof value !== 'string') return value;
    return value; // M1.5 Light: Do not truncate, let XAxis rotation handle it
  };

  const getTableAlignClass = (align?: any) => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  const yAxisTickFormatter = (value: any) => {
    return formatVietnameseNumber(value, { compact: true });
  };

  // Zoom logic: now handled entirely by outer viewport in App.tsx. 
  // We keep width and height 100% to fill the scaled container.
  const contentStyle = {
    width: '100%',
    height: '100%',
  };

  // Dynamic semantic color mapping for charts based on yAxisLabel / metric
  if (figure.type === 'chart' && figure.chart) {
    const metricLower = (figure.chart.config.yAxisLabel || '').toLowerCase();
    let semanticColor = null;
    
    // Only apply mapping for single series charts or to chartColors[0]
    if (/(lượt tàu|lưu lượng|sản lượng|doanh thu)/i.test(metricLower)) semanticColor = '#1E3A8A'; // Navy / Blue
    else if (/(sự cố|lỗi|vụ|rủi ro)/i.test(metricLower)) semanticColor = '#EA580C'; // Risk Orange
    else if (/(tỷ lệ|tỉ lệ|hoàn thành|tích cực|phần trăm)/i.test(metricLower)) semanticColor = '#0F766E'; // Teal / Emerald
    else if (/(cảnh báo|chi phí|kinh phí)/i.test(metricLower)) semanticColor = '#D97706'; // Amber
    else if (/(lợi nhuận)/i.test(metricLower)) semanticColor = '#059669'; // Emerald
    
    // Override first color if a semantic color is matched, 
    // ensuring we don't end up with completely black default if we shouldn't
    if (semanticColor) {
      chartColors = [semanticColor, ...chartColors.slice(1)];
    } else if (chartColors[0] === '#000000' && isColor) {
      // Avoid plain black for color themes
      chartColors = ['#2563EB', ...chartColors.slice(1)];
    } else if (chartColors[0] === '#000000' && !isColor) {
      // In B/W themes, keep as is
    }
  }

  return (
    <div 
      className={`relative w-full h-full flex flex-col group/canvas transition-all ${fontClass} ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}`}
      onClick={onSelectFigure}
    >
      {isPreview && (
        <div className="absolute top-6 left-6 z-40 px-3 py-1.5 bg-amber-500 text-white rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-xl shadow-amber-500/20 border border-white/20 animate-pulse flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full ring-2 ring-white/50 animate-ping"></div>
          Chế độ xem trước
        </div>
      )}

      {/* INTERNAL CONTENT WRAPPER FOR MEASUREMENT - wraps both core and footer to measure full bounds */}
      <div 
        ref={ref}
        className="mx-auto my-auto bg-white shadow-2xl border border-slate-200 relative overflow-visible inline-flex flex-col w-full max-w-full min-w-0 h-fit"
      >
        {/* RENDERER CORE */}
        <div className="w-full aspect-[1.414] overflow-hidden relative flex items-center justify-center bg-white">
          <div style={contentStyle} className="w-full h-full flex items-center justify-center">
            {figure.type === 'diagram' && figure.diagram && Array.isArray(figure.diagram.nodes) && (
              <div 
                className="w-full h-full flex flex-col relative"
              data-figure-type={figure.type}
              data-export-target="true"
            >
              <svg
                ref={canvasRef}
                viewBox="0 0 800 500"
                className="w-full h-full touch-none select-none"
                style={{ 
                  backgroundColor: '#ffffff',
                  backgroundImage: gridEnabled ? 'radial-gradient(#e2e8f0 1px, transparent 1px)' : 'none', 
                  backgroundSize: '24px 24px'
                }}
                onMouseMove={onMouseMoveCanvas}
                onMouseUp={onMouseUpCanvas}
                onTouchMove={onTouchMoveCanvas}
                onTouchEnd={onTouchEndCanvas}
              >
                {(() => {
                  const diagramId = sanitizeSvgId('id' in figure ? String((figure as any).id) : 'preview');
                  const markerId = `diagram-arrowhead-${diagramId}`;
                  return (
                    <>
                      <defs>
                        <marker id={markerId} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill={diagramTheme.line.stroke} />
                        </marker>
                      </defs>

                      {/* Connections */}
                      {Array.isArray(figure.diagram?.connections) && figure.diagram?.connections.map((conn) => {
                        const fromNode = figure.diagram?.nodes.find(n => n.id === conn.fromId);
                        const toNode = figure.diagram?.nodes.find(n => n.id === conn.toId);
                        if (!fromNode || !toNode) return null;
                        const startX = fromNode.x + fromNode.w/2;
                        const startY = fromNode.y + fromNode.h/2;
                        const endX = toNode.x + toNode.w/2;
                        const endY = toNode.y + toNode.h/2;
                        
                        const strokeColor = diagramTheme.line.stroke;
                        const strokeWidth = conn.strokeWidth || diagramTheme.line.strokeWidth;
                        
                        let dashArray: string | undefined = undefined;
                        if (conn.style === 'dashed') dashArray = `${strokeWidth * 3},${strokeWidth * 3}`;
                        if (conn.style === 'dotted') dashArray = `${strokeWidth},${strokeWidth * 2}`;

                        return (
                          <g key={conn.id}>
                            <line 
                              x1={startX} y1={startY} x2={endX} y2={endY} 
                              stroke={strokeColor} strokeWidth={strokeWidth}
                              strokeDasharray={dashArray}
                              markerEnd={conn.arrowEnd !== false ? `url(#${markerId})` : undefined}
                            />
                            {conn.label && (
                              <text 
                                x={(startX + endX) / 2} 
                                y={(startY + endY) / 2 - 8} 
                                fill={diagramTheme.line.stroke} 
                                fontSize={10} 
                                textAnchor="middle"
                                style={{ fontWeight: 600, fontFamily: diagramTheme.fontFamily }}
                              >
                                {conn.label}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Nodes */}
                      {figure.diagram?.nodes.map((node) => {
                        const isTextNode = node.type === 'text';
                        const fillColor = isTextNode ? 'transparent' : (node.fillColor || diagramTheme.node.fill);
                        const strokeColor = isTextNode ? 'transparent' : (node.strokeColor || diagramTheme.node.stroke);
                        const strokeWidth = diagramTheme.node.strokeWidth;
                        const radius = diagramTheme.node.radius;
                        const textColor = isTextNode ? (node.strokeColor || diagramTheme.node.stroke) : diagramTheme.node.textColor;
                        
                        const fontSize = 10;
                        const lineHeightFactor = 1.2;
                        const padding = 8;
                        const availableHeight = node.h - padding * 2;
                        const maxLines = Math.max(1, Math.floor(availableHeight / (fontSize * lineHeightFactor)));
                        
                        const lines = splitSvgTextIntoLines(node.label || '', {
                          maxWidth: node.w - padding * 2,
                          maxLines,
                          fontSize
                        });
                        
                        const totalTextHeight = lines.length * fontSize * lineHeightFactor;
                        // Vertically center the block of text (the first tspan's y is its baseline, so we offset by ~0.8em)
                        const startY = (node.h - totalTextHeight) / 2 + fontSize * 0.8;

                        return (
                          <g 
                            key={node.id} 
                            transform={`translate(${node.x}, ${node.y})`}
                            onMouseDown={(e) => onMouseDownNode?.(e, node)}
                            onTouchStart={(e) => onTouchStartNode?.(e, node)}
                            className="cursor-move"
                          >
                            {(node.type === 'circle' && !isTextNode) ? (
                              <ellipse cx={node.w/2} cy={node.h/2} rx={node.w/2} ry={node.h/2} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
                            ) : (node.type === 'diamond' && !isTextNode) ? (
                              <polygon points={`${node.w/2},0 ${node.w},${node.h/2} ${node.w/2},${node.h} 0,${node.h/2}`} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
                            ) : (node.type === 'cylinder' && !isTextNode) ? (
                              <g>
                                <rect x={0} y={node.h * 0.15} width={node.w} height={node.h * 0.85} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
                                <ellipse cx={node.w/2} cy={node.h * 0.15} rx={node.w/2} ry={node.h * 0.15} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
                                <path d={`M 0 ${node.h * 0.15} A ${node.w/2} ${node.h * 0.15} 0 0 0 ${node.w} ${node.h * 0.15}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                              </g>
                            ) : (node.type === 'actor' && !isTextNode) ? (
                              <g stroke={strokeColor} strokeWidth={strokeWidth} fill={fillColor}>
                                <circle cx={node.w/2} cy={node.h * 0.2} r={node.h * 0.2} />
                                <line x1={node.w/2} y1={node.h * 0.4} x2={node.w/2} y2={node.h * 0.7} />
                                <line x1={node.w * 0.2} y1={node.h * 0.5} x2={node.w * 0.8} y2={node.h * 0.5} />
                                <line x1={node.w/2} y1={node.h * 0.7} x2={node.w * 0.2} y2={node.h} />
                                <line x1={node.w/2} y1={node.h * 0.7} x2={node.w * 0.8} y2={node.h} />
                              </g>
                            ) : (!isTextNode) ? (
                              <rect 
                                width={node.w} height={node.h} rx={radius} 
                                fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} 
                              />
                            ) : null}

                            <text 
                              y={startY} 
                              fill={textColor} 
                              fontFamily={diagramTheme.fontFamily || "sans-serif"}
                              fontSize={fontSize}
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {lines.map((line, i) => (
                                <tspan key={i} x={node.w / 2} dy={i === 0 ? 0 : fontSize * lineHeightFactor}>
                                  {line}
                                </tspan>
                              ))}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          )}
  
          {figure.type === 'chart' && figure.chart && Array.isArray(figure.chart.data) && (
            <div 
              className="w-full h-full p-12 bg-white flex flex-col items-center justify-center" 
              data-figure-type={figure.type}
              data-export-target="true"
            >
              {figure.chart.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                  <FileWarning className="w-8 h-8 opacity-45" />
                  <p className="text-xs font-semibold">Không có dữ liệu để hiển thị</p>
                </div>
              ) : !['bar', 'line', 'pie', 'scatter', 'area'].includes(figure.chart.config.type) ? (
                <div className="flex flex-col items-center justify-center text-red-500 gap-2 border border-red-200 bg-red-50/50 p-4 rounded-lg">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-xs font-bold">Lỗi loại biểu đồ</p>
                  <p className="text-[10px] text-red-700">Loại biểu đồ "{figure.chart.config.type}" hiện chưa được hỗ trợ hiển thị.</p>
                </div>
              ) : (
                <div className="w-full h-full min-h-[350px] relative flex flex-col">
                  <ResponsiveContainer width="100%" height={350} debounce={50}>
                    {figure.chart.config.type === 'area' ? (
                      <ReAreaChart data={figure.chart.data}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors[0]} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" tickFormatter={truncateAxisLabel} fontSize={10} fontWeight={600} height={80} tick={{ fill: '#475569', angle: -45, textAnchor: 'end', dy: 10 }} axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} interval={0} />
                        <YAxis tickFormatter={yAxisTickFormatter} fontSize={12} fontWeight={500} tick={{ fill: '#475569' }} axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} />
                        <Tooltip content={<CustomCartesianTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                        {figure.chart.config.showLegend && <Legend verticalAlign={figure.chart.config.legendPosition === 'bottom' ? 'bottom' : 'middle'} align={figure.chart.config.legendPosition === 'bottom' ? 'center' : 'right'} layout={figure.chart.config.legendPosition === 'bottom' ? 'horizontal' : 'vertical'} />}
                        <Area type="monotone" dataKey="value" stroke={chartColors[0]} strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                      </ReAreaChart>
                    ) : figure.chart.config.type === 'pie' ? (
                      <RePieChart>
                        <Pie
                          data={figure.chart.data}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={figure.chart.config.showLabels !== false ? formatPieLabel : false}
                          labelLine={figure.chart.config.showLabels !== false}
                        >
                          {figure.chart.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={formatPieTooltip} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '13px' }} />
                        {figure.chart.config.showLegend !== false && (
                          <Legend 
                            verticalAlign={figure.chart.config.legendPosition === 'right' ? 'middle' : 'bottom'} 
                            align={figure.chart.config.legendPosition === 'right' ? 'right' : 'center'} 
                            layout={figure.chart.config.legendPosition === 'right' ? 'vertical' : 'horizontal'}
                            formatter={(value, entry: any) => {
                              const val = entry.payload.value;
                              const total = getPieTotal();
                              const pct = (val / total * 100).toFixed(1);
                              const formattedVal = formatVietnameseNumber(val, { compact: false });
                              return <span className="text-[11px] font-bold text-slate-800">{value}: {formattedVal} ({pct}%)</span>;
                            }}
                          />
                        )}
                      </RePieChart>
                    ) : figure.chart.config.type === 'line' ? (
                      <ReLineChart data={figure.chart.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" tickFormatter={truncateAxisLabel} fontSize={10} fontWeight={600} height={80} tick={{ fill: '#475569', angle: -45, textAnchor: 'end', dy: 10 }} axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} interval={0} />
                        <YAxis tickFormatter={yAxisTickFormatter} fontSize={12} fontWeight={500} tick={{ fill: '#475569' }} axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} />
                        <Tooltip content={<CustomCartesianTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                        {figure.chart.config.showLegend && <Legend verticalAlign={figure.chart.config.legendPosition === 'bottom' ? 'bottom' : 'middle'} align={figure.chart.config.legendPosition === 'bottom' ? 'center' : 'right'} layout={figure.chart.config.legendPosition === 'bottom' ? 'horizontal' : 'vertical'} />}
                        <Line type="monotone" dataKey="value" stroke={chartColors[0]} strokeWidth={3} dot={{ r: 5, fill: chartColors[0], strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                      </ReLineChart>
                    ) : figure.chart.config.type === 'scatter' ? (
                      <ReScatterChart>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis type="category" dataKey="label" tickFormatter={truncateAxisLabel} fontSize={10} fontWeight={600} height={80} tick={{ fill: '#475569', angle: -45, textAnchor: 'end', dy: 10 }} axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} interval={0} />
                        <YAxis type="number" dataKey="value" tickFormatter={yAxisTickFormatter} fontSize={12} fontWeight={500} tick={{ fill: '#475569' }} axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} />
                        <ZAxis type="number" range={[80, 80]} />
                        <Tooltip content={<CustomCartesianTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                        {figure.chart.config.showLegend && <Legend verticalAlign={figure.chart.config.legendPosition === 'bottom' ? 'bottom' : 'middle'} align={figure.chart.config.legendPosition === 'bottom' ? 'center' : 'right'} layout={figure.chart.config.legendPosition === 'bottom' ? 'horizontal' : 'vertical'} />}
                        <Scatter name="Dữ liệu" data={figure.chart.data} fill={chartColors[0]} />
                      </ReScatterChart>
                    ) : (
                      <ReBarChart data={figure.chart.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" tickFormatter={truncateAxisLabel} fontSize={10} fontWeight={600} height={80} tick={{ fill: '#475569', angle: -45, textAnchor: 'end', dy: 10 }} axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} interval={0} />
                        <YAxis tickFormatter={yAxisTickFormatter} fontSize={12} fontWeight={500} tick={{ fill: '#475569' }} axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} />
                        <Tooltip content={<CustomCartesianTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                        {figure.chart.config.showLegend && <Legend verticalAlign={figure.chart.config.legendPosition === 'bottom' ? 'bottom' : 'middle'} align={figure.chart.config.legendPosition === 'bottom' ? 'center' : 'right'} layout={figure.chart.config.legendPosition === 'bottom' ? 'horizontal' : 'vertical'} />}
                        <Bar dataKey="value" fill={chartColors[0]} radius={[6, 6, 0, 0]}>
                          {figure.chart.config.showLabels && (
                            <LabelList dataKey="value" position="top" formatter={(val: number) => formatVietnameseNumber(val, { compact: true })} style={{ fontSize: '10px', fill: '#475569', fontWeight: 'bold' }} />
                          )}
                        </Bar>
                      </ReBarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
  
          {figure.type === 'table' && figure.table && Array.isArray(figure.table.columns) && Array.isArray(figure.table.rows) && (
            <div 
              className="w-full h-full p-12 bg-white overflow-auto max-w-full"
              data-figure-type={figure.type}
              data-export-target="true"
            >
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse bg-white border-t-[3px] border-b-[3px] border-slate-800 min-w-[500px]">
                  <thead>
                    <tr className="border-b-2 border-slate-300">
                      {figure.table.columns.map(col => (
                        <th key={col.key} className={`px-6 py-4 text-sm font-bold text-slate-800 uppercase tracking-widest ${getTableAlignClass(col.align)}`}>
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {figure.table.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors" style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : '#f8fafc' }}>
                        {figure.table!.columns.map(col => (
                          <td key={col.key} className={`px-6 py-3 text-sm text-slate-700 font-medium ${getTableAlignClass(col.align)}`} style={{ color: diagramTheme.node.textColor }}>
                            {formatTableCellDisplayValue(row[col.key]) || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
        
      {/* COMMON FOOTER (CAPTION) - now inside measurement ref wrapper */}
      <div className="px-12 py-8 bg-slate-50/50 border-t border-slate-100 w-full overflow-visible shrink-0 mt-auto">
        {(() => {
          if (academicCaption) {
            const { label, ordinal, captionText, sourceCitation, isPreview } = academicCaption;
            const displayTitle = figure.title && captionText && figure.title.toLowerCase().trim() === captionText.toLowerCase().trim() ? null : figure.title;
            return (
              <React.Fragment>
                {displayTitle && (
                  <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight break-words">{displayTitle}</h2>
                )}
                {captionText && (
                  <p className="text-sm text-slate-700 mt-2 font-medium leading-relaxed italic break-words">
                    {isPreview ? captionText : `${label} ${ordinal}. ${captionText}`}
                  </p>
                )}
                {sourceCitation && sourceCitation.trim() !== '' && (
                  <p className="text-[11px] text-slate-500 mt-2 italic break-words">
                    Nguồn: {sourceCitation}
                  </p>
                )}
              </React.Fragment>
            );
          }
          
          // Legacy fallback
          const rawCaption = figure.type === 'chart' ? figure.chart?.config.caption : figure.type === 'table' ? figure.table?.caption : figure.diagram?.caption;
          const rawSource = figure.type === 'chart' ? figure.chart?.config.source : figure.type === 'table' ? figure.table?.source : figure.diagram?.source;
          return (
            <React.Fragment>
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight break-words">{figure.title}</h2>
              {rawCaption && (
                <p className="text-sm text-slate-700 mt-2 font-medium leading-relaxed italic break-words">
                  {rawCaption}
                </p>
              )}
              {rawSource && rawSource.trim() !== '' && (
                <p className="text-[11px] text-slate-500 mt-2 italic break-words">
                  Nguồn: {rawSource}
                </p>
              )}
            </React.Fragment>
          );
        })()}
      </div>
    </div>
  </div>
);
});

FigureRenderer.displayName = 'FigureRenderer';
