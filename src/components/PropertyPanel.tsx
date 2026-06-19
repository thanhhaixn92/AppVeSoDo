import React from 'react';
import { X, Trash } from 'lucide-react';
import { usePropertyUpdateActions } from '../hooks/usePropertyUpdateActions';

interface PropertyPanelProps {
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  currentFigure: any;
  currentFigureId: string | null;
  setSavedFigures: React.Dispatch<React.SetStateAction<any[]>>;
  setPreviewFigure?: React.Dispatch<React.SetStateAction<any>>;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedConnectionId: (id: string | null) => void;
  executeCommand: (cmd: string) => void;
  setCommandInput: (val: string) => void;
  setIsLeftSidebarOpen: (val: boolean) => void;
  focusCommandInput: () => void;
  showToast: (msg: string) => void;
  saveToHistory?: () => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNodeId,
  selectedConnectionId,
  currentFigure,
  currentFigureId,
  setSavedFigures,
  setPreviewFigure,
  setSelectedNodeId,
  setSelectedConnectionId,
  executeCommand,
  setCommandInput,
  setIsLeftSidebarOpen,
  focusCommandInput,
  showToast,
  saveToHistory,
}) => {
  const activeFigure = currentFigure;

  const { updateActiveFigureWithHistory, updateActiveFigureWithSessionHistory, resetPropertyHistorySession } = usePropertyUpdateActions({
    currentFigureId,
    setPreviewFigure,
    setSavedFigures,
    saveToHistory,
  });
  
  return (
    <div className="flex-1 shrink-0 bg-surface flex flex-col h-full overflow-hidden">
      {/* If an element is selected, show its properties */}
      {selectedNodeId && (() => {
        const selectedDiagramNode = activeFigure.diagram?.nodes.find((n: any) => n.id === selectedNodeId);
        if (!selectedDiagramNode) return null;
        
        return (
          <div className="flex flex-col w-[245px] h-full">
            <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0 bg-surface-soft/50">
              <span className="text-[10px] font-bold text-text-main uppercase tracking-widest">
                Cấu trúc: {selectedDiagramNode.id}
              </span>
              <button onClick={() => setSelectedNodeId(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto flex-1 font-sans custom-scrollbar bg-surface">
              {/* ID & Label header */}
              <div className="bg-header-bg border border-header-border p-3 rounded-xl text-xs space-y-1 shadow-md">
                <div className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">Định danh đối tượng</div>
                <div className="font-bold text-white break-all tracking-tight">
                  {selectedDiagramNode.id} — {selectedDiagramNode.label || 'CHƯA ĐẶT TÊN'}
                </div>
              </div>

              {/* Nhãn (Label) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nội dung hiển thị</label>
                <input 
                  type="text"
                  value={selectedDiagramNode.label}
                  onChange={(e) => {
                     const newVal = e.target.value;
                     updateActiveFigureWithSessionHistory('node_label', f => {
                       if (f.diagram) {
                         return {
                           ...f,
                           diagram: {
                             ...f.diagram,
                             nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, label: newVal } : n)
                           }
                         };
                       }
                       return f;
                     });
                  }}
                  onBlur={() => resetPropertyHistorySession('node_label')}
                  onKeyDown={(e) => { if (e.key === 'Enter') resetPropertyHistorySession('node_label'); }}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none bg-surface-soft hover:bg-surface transition-all"
                />
              </div>

              {/* Màu nền (Fill Color) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Màu nền (Fill) / {selectedDiagramNode.fillColor || 'Mặc định'}</label>
                <div className="flex flex-wrap gap-1">
                  {['#ffffff', '#f8fafc', '#f1f5f9', '#e0e7ff', '#dcfce7', '#fee2e2', '#fef3c7'].map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        updateActiveFigureWithHistory(f => {
                           if (f.diagram) {
                             return {
                               ...f,
                               diagram: {
                                 ...f.diagram,
                                 nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, fillColor: color } : n)
                               }
                             };
                           }
                           return f;
                        });
                      }}
                      className={`w-6 h-6 rounded-md border cursor-pointer transition-all ${selectedDiagramNode.fillColor === color ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-text-subtle'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input 
                  type="color"
                  value={selectedDiagramNode.fillColor?.startsWith('#') ? selectedDiagramNode.fillColor : '#ffffff'}
                  onChange={(e) => {
                     const color = e.target.value;
                     updateActiveFigureWithSessionHistory('node_fill_color_picker', f => {
                       if (f.diagram) {
                         return {
                           ...f,
                           diagram: {
                             ...f.diagram,
                             nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, fillColor: color } : n)
                           }
                         };
                       }
                       return f;
                     });
                  }}
                  onBlur={() => resetPropertyHistorySession('node_fill_color_picker')}
                  className="w-full h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-surface"
                />
              </div>

              {/* Màu viền (Stroke Color) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Màu viền</label>
                <input 
                  type="color"
                  value={selectedDiagramNode.strokeColor?.startsWith('#') ? selectedDiagramNode.strokeColor : '#1e293b'}
                  onChange={(e) => {
                     const color = e.target.value;
                     updateActiveFigureWithSessionHistory('node_stroke_color_picker', f => {
                       if (f.diagram) {
                         return {
                           ...f,
                           diagram: {
                             ...f.diagram,
                             nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, strokeColor: color } : n)
                           }
                         };
                       }
                       return f;
                     });
                  }}
                  onBlur={() => resetPropertyHistorySession('node_stroke_color_picker')}
                  className="w-full h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-surface"
                />
              </div>

              {/* Kiểu viền & Độ dày */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Kiểu viền</label>
                  <select 
                    value={selectedDiagramNode.outlineStyle || 'solid'}
                    onChange={(e) => {
                      const newVal = e.target.value as 'solid' | 'dashed' | 'none';
                      updateActiveFigureWithHistory(f => {
                         if (f.diagram) {
                           return {
                             ...f,
                             diagram: {
                               ...f.diagram,
                               nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, outlineStyle: newVal } : n)
                             }
                           };
                         }
                         return f;
                      });
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-surface-soft font-sans outline-none focus:border-primary transition-all"
                  >
                    <option value="solid">Liền</option>
                    <option value="dashed">Nét đứt</option>
                    <option value="none">Không viền</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Độ dày viền</label>
                  <input 
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={selectedDiagramNode.strokeWidth || 1.5}
                    onChange={(e) => {
                      const newVal = parseFloat(e.target.value) || 1.5;
                      updateActiveFigureWithSessionHistory('node_stroke_width', f => {
                         if (f.diagram) {
                           return {
                             ...f,
                             diagram: {
                               ...f.diagram,
                               nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, strokeWidth: newVal } : n)
                             }
                           };
                         }
                         return f;
                      });
                    }}
                    onBlur={() => resetPropertyHistorySession('node_stroke_width')}
                    onKeyDown={(e) => { if (e.key === 'Enter') resetPropertyHistorySession('node_stroke_width'); }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-surface-soft outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Cỡ chữ & In đậm */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Cỡ chữ</label>
                  <input 
                    type="number"
                    min="8"
                    max="36"
                    value={selectedDiagramNode.fontSize || 11}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value, 10) || 11;
                      updateActiveFigureWithSessionHistory('node_font_size', f => {
                         if (f.diagram) {
                           return {
                             ...f,
                             diagram: {
                               ...f.diagram,
                               nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, fontSize: newVal } : n)
                             }
                           };
                         }
                         return f;
                      });
                    }}
                    onBlur={() => resetPropertyHistorySession('node_font_size')}
                    onKeyDown={(e) => { if (e.key === 'Enter') resetPropertyHistorySession('node_font_size'); }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-surface-soft outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Kiểu chữ</label>
                  <div className="flex items-center h-8 gap-2">
                    <input 
                      type="checkbox"
                      id="font_bold_chk"
                      checked={selectedDiagramNode.fontWeight === 'bold'}
                      onChange={(e) => {
                        const isBold = e.target.checked;
                        updateActiveFigureWithHistory(f => {
                           if (f.diagram) {
                             return {
                               ...f,
                               diagram: {
                                 ...f.diagram,
                                 nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, fontWeight: isBold ? 'bold' : 'normal' } : n)
                               }
                             };
                           }
                           return f;
                        });
                      }}
                      className="accent-primary rounded cursor-pointer"
                    />
                    <label htmlFor="font_bold_chk" className="text-xs font-bold text-text-main cursor-pointer uppercase tracking-tight">In đậm</label>
                  </div>
                </div>
              </div>

              {/* Căn chữ (textAlign) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Căn chữ (Align)</label>
                <div className="grid grid-cols-3 gap-1">
                  {['left', 'center', 'right'].map(align => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => {
                        updateActiveFigureWithHistory(f => {
                           if (f.diagram) {
                             return {
                               ...f,
                               diagram: {
                                 ...f.diagram,
                                 nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, textAlign: align as any } : n)
                               }
                             };
                           }
                           return f;
                        });
                      }}
                      className={`py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all ${selectedDiagramNode.textAlign === align ? 'bg-primary-soft border-primary text-primary shadow-sm' : 'bg-surface-soft border-border text-text-muted hover:bg-surface'}`}
                    >
                      {align === 'left' ? 'Trái' : align === 'center' ? 'Giữa' : 'Phải'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chiều rộng & Chiều cao */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Chiều rộng</label>
                  <input 
                    type="number"
                    min="30"
                    max="800"
                    value={selectedDiagramNode.w}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value, 10) || 120;
                      updateActiveFigureWithSessionHistory('node_width', f => {
                         if (f.diagram) {
                           return {
                             ...f,
                             diagram: {
                               ...f.diagram,
                               nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, w: newVal } : n)
                             }
                           };
                         }
                         return f;
                      });
                    }}
                    onBlur={() => resetPropertyHistorySession('node_width')}
                    onKeyDown={(e) => { if (e.key === 'Enter') resetPropertyHistorySession('node_width'); }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-surface-soft outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Chiều cao</label>
                  <input 
                    type="number"
                    min="20"
                    max="600"
                    value={selectedDiagramNode.h}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value, 10) || 60;
                      updateActiveFigureWithSessionHistory('node_height', f => {
                         if (f.diagram) {
                           return {
                             ...f,
                             diagram: {
                               ...f.diagram,
                               nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, h: newVal } : n)
                             }
                           };
                         }
                         return f;
                      });
                    }}
                    onBlur={() => resetPropertyHistorySession('node_height')}
                    onKeyDown={(e) => { if (e.key === 'Enter') resetPropertyHistorySession('node_height'); }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-surface-soft outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Bo góc (rx) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Bo góc (rx)</label>
                <input 
                  type="range"
                  min="0"
                  max="30"
                  value={selectedDiagramNode.borderRadius !== undefined ? selectedDiagramNode.borderRadius : 0}
                  onChange={(e) => {
                    const newVal = parseInt(e.target.value, 10);
                    updateActiveFigureWithSessionHistory('node_border_radius', f => {
                       if (f.diagram) {
                         return {
                           ...f,
                           diagram: {
                             ...f.diagram,
                             nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, borderRadius: newVal, rx: newVal } : n)
                           }
                         };
                       }
                       return f;
                     });
                  }}
                  onMouseUp={() => resetPropertyHistorySession('node_border_radius')}
                  onTouchEnd={() => resetPropertyHistorySession('node_border_radius')}
                  onBlur={() => resetPropertyHistorySession('node_border_radius')}
                  onKeyUp={() => resetPropertyHistorySession('node_border_radius')}
                  className="w-full accent-primary"
                />
              </div>

              {/* Tọa độ X/Y */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tọa độ X</label>
                  <input 
                    type="number"
                    value={selectedDiagramNode.x}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value, 10) || 0;
                      updateActiveFigureWithSessionHistory('node_x', f => {
                         if (f.diagram) {
                           return {
                             ...f,
                             diagram: {
                               ...f.diagram,
                               nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, x: newVal } : n)
                             }
                           };
                         }
                         return f;
                      });
                    }}
                    onBlur={() => resetPropertyHistorySession('node_x')}
                    onKeyDown={(e) => { if (e.key === 'Enter') resetPropertyHistorySession('node_x'); }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-surface-soft outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tọa độ Y</label>
                  <input 
                    type="number"
                    value={selectedDiagramNode.y}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value, 10) || 0;
                      updateActiveFigureWithSessionHistory('node_y', f => {
                         if (f.diagram) {
                           return {
                             ...f,
                             diagram: {
                               ...f.diagram,
                               nodes: f.diagram.nodes.map((n: any) => n.id === selectedNodeId ? { ...n, y: newVal } : n)
                             }
                           };
                         }
                         return f;
                      });
                    }}
                    onBlur={() => resetPropertyHistorySession('node_y')}
                    onKeyDown={(e) => { if (e.key === 'Enter') resetPropertyHistorySession('node_y'); }}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-surface-soft outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Thứ tự hiển thị (Z-Order) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Thứ tự hiển thị (Z-Order)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveFigureWithHistory(f => {
                         if (f.diagram) {
                           const target = f.diagram.nodes.find((n: any) => n.id === selectedNodeId);
                           if (!target) return f;
                           const remaining = f.diagram.nodes.filter((n: any) => n.id !== selectedNodeId);
                           return {
                             ...f,
                             diagram: {
                               ...f.diagram,
                               nodes: [...remaining, target]
                             }
                           };
                         }
                         return f;
                       });
                      showToast("Đã đưa đối tượng lên lớp trên cùng");
                    }}
                    className="py-2 text-[10px] font-bold uppercase text-text-main bg-surface border border-border hover:border-primary hover:bg-surface-soft rounded-lg transition-all cursor-pointer"
                  >
                    Đưa lên trước
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveFigureWithHistory(f => {
                         if (f.diagram) {
                           const target = f.diagram.nodes.find((n: any) => n.id === selectedNodeId);
                           if (!target) return f;
                           const remaining = f.diagram.nodes.filter((n: any) => n.id !== selectedNodeId);
                           return {
                             ...f,
                             diagram: {
                               ...f.diagram,
                               nodes: [target, ...remaining]
                             }
                           };
                         }
                         return f;
                       });
                      showToast("Đã hạ đối tượng xuống lớp dưới cùng");
                    }}
                    className="py-2 text-[10px] font-bold uppercase text-text-main bg-surface border border-border hover:border-primary hover:bg-surface-soft rounded-lg transition-all cursor-pointer"
                  >
                    Đưa xuống sau
                  </button>
                </div>
              </div>

              {/* Quick actions */}
              <div className="pt-3 border-t border-border space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Thao tác nhanh</label>
                <button 
                  type="button"
                  className="w-full py-2.5 text-[10px] uppercase tracking-widest text-white bg-primary hover:bg-primary-hover rounded-xl font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  onClick={() => executeCommand(`nhân bản node ${selectedDiagramNode.id}`)}
                >
                  Nhân bản
                </button>
                <button 
                  type="button"
                  className="w-full py-2.5 text-[10px] uppercase tracking-widest text-text-main bg-surface border border-border hover:bg-surface-soft rounded-xl font-bold transition-all active:scale-95 cursor-pointer"
                  onClick={() => {
                    setCommandInput(`nối ${selectedDiagramNode.id} với `);
                    setIsLeftSidebarOpen(true);
                    focusCommandInput();
                  }}
                >
                  Kết nối tới...
                </button>
                <button 
                  type="button"
                  className="w-full py-2.5 text-[10px] uppercase tracking-widest font-bold text-danger bg-danger-soft hover:bg-danger/20 rounded-xl transition-all border border-danger/20 active:scale-95 cursor-pointer"
                  onClick={() => executeCommand(`xóa node ${selectedDiagramNode.id}`)}
                >
                  Xóa đối tượng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {selectedConnectionId && (() => {
        const selectedDiagramConn = currentFigure.diagram?.connections.find((c: any) => c.id === selectedConnectionId);
        if (!selectedDiagramConn) return null;
        
        return (
          <div className="flex flex-col w-[245px] h-full">
            <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0 bg-surface-soft/50">
              <span className="text-[10px] font-bold text-text-main uppercase tracking-widest">
                Đang chỉnh: {selectedDiagramConn.id}
              </span>
              <button onClick={() => setSelectedConnectionId(null)} className="p-1.5 hover:bg-surface-muted rounded-lg text-text-subtle hover:text-text-main transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto flex-1 font-sans custom-scrollbar bg-surface">
              {/* Connection Description */}
              <div className="bg-header-bg border border-header-border p-3 rounded-xl text-xs space-y-1 shadow-md">
                <div className="text-[9px] font-bold text-text-subtle uppercase tracking-widest">Đối tượng liên kết</div>
                <div className="font-bold text-white break-all tracking-tight">
                  {selectedDiagramConn.id} — {selectedDiagramConn.fromId} → {selectedDiagramConn.toId}
                </div>
              </div>

              {/* Nhãn đường nối */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nhãn đường nối</label>
                <input 
                  type="text"
                  value={selectedDiagramConn.label || ''}
                  placeholder="Không có nhãn"
                  onChange={(e) => {
                     const newVal = e.target.value;
                     updateActiveFigureWithSessionHistory('connection_label', f => {
                       if (f.diagram) {
                         return {
                           ...f,
                           diagram: {
                             ...f.diagram,
                             connections: f.diagram.connections.map((c: any) => c.id === selectedConnectionId ? { ...c, label: newVal } : c)
                           }
                         };
                       }
                       return f;
                     });
                  }}
                  onBlur={() => resetPropertyHistorySession('connection_label')}
                  onKeyDown={(e) => { if (e.key === 'Enter') resetPropertyHistorySession('connection_label'); }}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface-soft focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Kiểu nét (style) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Kiểu nét</label>
                <select 
                  value={selectedDiagramConn.style || 'solid'}
                  onChange={(e) => {
                    const newVal = e.target.value as any;
                    updateActiveFigureWithHistory(f => {
                        if (f.diagram) {
                          return {
                            ...f,
                            diagram: {
                              ...f.diagram,
                              connections: f.diagram.connections.map((c: any) => c.id === selectedConnectionId ? { ...c, style: newVal } : c)
                            }
                          };
                        }
                        return f;
                      });
                  }}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface-soft outline-none focus:border-primary transition-all font-sans"
                >
                  <option value="solid">Nét liền (Solid)</option>
                  <option value="dashed">Nét đứt (Dashed)</option>
                  <option value="dotted">Chấm tròn (Dotted)</option>
                </select>
              </div>

              {/* Độ dày đường (strokeWidth) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Độ dày đường nối</label>
                <input 
                  type="number"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={selectedDiagramConn.strokeWidth || 1.5}
                  onChange={(e) => {
                    const newVal = parseFloat(e.target.value) || 1.5;
                    updateActiveFigureWithSessionHistory('connection_stroke_width', f => {
                       if (f.diagram) {
                         return {
                           ...f,
                           diagram: {
                             ...f.diagram,
                             connections: f.diagram.connections.map((c: any) => c.id === selectedConnectionId ? { ...c, strokeWidth: newVal } : c)
                           }
                         };
                       }
                       return f;
                     });
                  }}
                  onBlur={() => resetPropertyHistorySession('connection_stroke_width')}
                  onKeyDown={(e) => { if (e.key === 'Enter') resetPropertyHistorySession('connection_stroke_width'); }}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface-soft outline-none focus:border-primary transition-all"
                />
              </div>

              {/* Ký hiệu Mũi tên (arrowEnd) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Mũi tên định hướng</label>
                <div className="flex items-center h-8 gap-2">
                  <input 
                    type="checkbox"
                    id="arrow_end_chk"
                    checked={selectedDiagramConn.arrowEnd !== false}
                    onChange={(e) => {
                      const hasArrow = e.target.checked;
                      updateActiveFigureWithHistory(f => {
                        if (f.diagram) {
                          return {
                            ...f,
                            diagram: {
                              ...f.diagram,
                              connections: f.diagram.connections.map((c: any) => c.id === selectedConnectionId ? { ...c, arrowEnd: hasArrow } : c)
                            }
                          };
                        }
                        return f;
                      });
                    }}
                    className="accent-primary rounded cursor-pointer"
                  />
                  <label htmlFor="arrow_end_chk" className="text-xs font-bold text-text-main cursor-pointer uppercase tracking-tight">Đầu mũi tên cuối</label>
                </div>
              </div>

              {/* Màu viền/đường nối */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Màu sắc đường nối</label>
                <input 
                  type="color"
                  value={(selectedDiagramConn as any).stroke || '#475569'}
                  onChange={(e) => {
                     const color = e.target.value;
                     updateActiveFigureWithSessionHistory('connection_stroke_color_picker', f => {
                       if (f.diagram) {
                         return {
                           ...f,
                           diagram: {
                             ...f.diagram,
                             connections: f.diagram.connections.map((c: any) => c.id === selectedConnectionId ? { ...c, stroke: color } : c)
                           }
                         };
                       }
                       return f;
                     });
                  }}
                  onBlur={() => resetPropertyHistorySession('connection_stroke_color_picker')}
                  className="w-full h-10 rounded-lg cursor-pointer border border-border p-0.5 bg-surface"
                />
              </div>

              {/* Delete connection */}
              <div className="pt-4 border-t border-border">
                <button 
                  type="button"
                  className="w-full py-2.5 text-[10px] uppercase tracking-widest text-danger bg-danger-soft hover:bg-danger/20 border border-danger/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-sm"
                  onClick={() => {
                    updateActiveFigureWithHistory(f => {
                       if (f.diagram) {
                         return {
                           ...f,
                           diagram: {
                             ...f.diagram,
                             connections: f.diagram.connections.filter((c: any) => c.id !== selectedConnectionId)
                           }
                         };
                       }
                       return f;
                     });
                    setSelectedConnectionId(null);
                    showToast(`Đã xóa đường liên kết ${selectedDiagramConn.id}`);
                  }}
                >
                  <Trash className="w-3.5 h-3.5" />
                  Xóa đường nối
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {!selectedNodeId && !selectedConnectionId && activeFigure && (
        <div className="flex flex-col h-full bg-surface">
          <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0 bg-slate-50">
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
              Thuộc tính hình
            </span>
          </div>
          
          <div className="p-5 space-y-6 overflow-y-auto flex-1 custom-scrollbar scrollbar-hide">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tiêu đề chính</label>
              <textarea 
                rows={2}
                value={activeFigure.title || ''}
                onChange={(e) => {
                   const newVal = e.target.value;
                   updateActiveFigureWithSessionHistory('figure_title', f => ({ ...f, title: newVal }));
                }}
                onBlur={() => resetPropertyHistorySession('figure_title')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none bg-slate-50 hover:bg-white transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chú thích</label>
              <textarea 
                rows={3}
                value={(activeFigure.type === 'chart' ? activeFigure.chart?.config?.caption : activeFigure.type === 'table' ? activeFigure.table?.caption : activeFigure.diagram?.caption) || ''}
                onChange={(e) => {
                   const newVal = e.target.value;
                   updateActiveFigureWithSessionHistory('figure_caption', f => {
                      if (f.type === 'chart' && f.chart) return { ...f, chart: { ...f.chart, config: { ...f.chart.config, caption: newVal } } };
                      if (f.type === 'table' && f.table) return { ...f, table: { ...f.table, caption: newVal } };
                      if (f.type === 'diagram' && f.diagram) return { ...f, diagram: { ...f.diagram, caption: newVal } };
                      return f;
                   });
                }}
                onBlur={() => resetPropertyHistorySession('figure_caption')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none bg-slate-50 hover:bg-white transition-all italic font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nguồn số liệu</label>
              <textarea 
                rows={2}
                value={(activeFigure.type === 'chart' ? activeFigure.chart?.config?.source : activeFigure.type === 'table' ? activeFigure.table?.source : activeFigure.diagram?.source) || ''}
                onChange={(e) => {
                   const newVal = e.target.value;
                   updateActiveFigureWithSessionHistory('figure_source', f => {
                      if (f.type === 'chart' && f.chart) return { ...f, chart: { ...f.chart, config: { ...f.chart.config, source: newVal } } };
                      if (f.type === 'table' && f.table) return { ...f, table: { ...f.table, source: newVal } };
                      if (f.type === 'diagram' && f.diagram) return { ...f, diagram: { ...f.diagram, source: newVal } };
                      return f;
                   });
                }}
                onBlur={() => resetPropertyHistorySession('figure_source')}
                placeholder="Nguồn: (nếu có)"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none bg-slate-50 hover:bg-white transition-all italic"
              />
            </div>

            {activeFigure.type === 'chart' && activeFigure.chart && (
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">Cấu hình biểu đồ</label>
                
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">Hiển thị chú giải</span>
                  <input 
                    type="checkbox" 
                    checked={activeFigure.chart.config?.showLegend ?? true} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateActiveFigureWithHistory(f => (f.chart) ? { ...f, chart: { ...f.chart, config: { ...f.chart.config, showLegend: checked } } } : f);
                    }}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">Hiển thị nhãn</span>
                  <input 
                    type="checkbox" 
                    checked={activeFigure.chart.config?.showLabels ?? true} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateActiveFigureWithHistory(f => (f.chart) ? { ...f, chart: { ...f.chart, config: { ...f.chart.config, showLabels: checked } } } : f);
                    }}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vị trí chú giải</label>
                  <select 
                    value={activeFigure.chart.config?.legendPosition || 'bottom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateActiveFigureWithHistory(f => (f.chart) ? { ...f, chart: { ...f.chart, config: { ...f.chart.config, legendPosition: val as any } } } : f);
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="bottom">Dưới đáy</option>
                    <option value="right">Bên phải</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-8 flex flex-col gap-3">
              <button 
                onClick={focusCommandInput}
                className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                Tùy chỉnh bằng Lệnh AI
              </button>
            </div>
          </div>
        </div>
      )}

      {!activeFigure && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest">Chưa chọn bản vẽ</p>
        </div>
      )}
    </div>
  );
};
