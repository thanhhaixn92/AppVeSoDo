import { EditableFigure, useFigureEditingWorkflow } from '../hooks/useFigureEditingWorkflow';
import { PRIMARY_THEMES } from '../components/ThemeSelector';
interface M1DLitePropertyPanelProps {
  activeFigure: EditableFigure | null;
  onApply: (figure: EditableFigure) => void;
}

export function M1DLitePropertyPanel({ activeFigure, onApply }: M1DLitePropertyPanelProps) {
  const editing = useFigureEditingWorkflow({ activeFigure, onApply });
  const draft = editing.draft;

  if (!draft) {
    return <div className="p-4 text-xs text-text-muted">Chọn một hình để chỉnh sửa.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Tiêu đề</label>
        <input className="mt-1.5 w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none" value={draft.title} onChange={e => editing.updateTitle(e.target.value)} />
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Ghi chú / Phụ đề</label>
        <textarea 
          className="mt-1.5 w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none" 
          rows={2}
          value={
            (draft.type === 'chart' ? draft.chart?.config?.caption : 
             draft.type === 'diagram' ? draft.diagram?.caption : 
             draft.type === 'table' ? draft.table?.caption : '') || ''
          } 
          onChange={e => editing.updateCaption(e.target.value)} 
        />
      </div>

      {'theme' in draft && (
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Giao diện (Theme)</label>
          <select 
            className="mt-1.5 w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none" 
            value={draft.theme} 
            onChange={e => editing.updateTheme(e.target.value)}
          >
            {PRIMARY_THEMES.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>
        </div>
      )}

      {draft.type === 'chart' && draft.chart && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Bố cục biểu đồ</div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-border text-primary focus:ring-primary"
                  checked={draft.chart.config.showLegend ?? true}
                  onChange={e => editing.updateChartLayout({ showLegend: e.target.checked })}
                />
                Bật chú giải
              </label>
              <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-border text-primary focus:ring-primary"
                  checked={draft.chart.config.showLabels ?? false}
                  onChange={e => editing.updateChartLayout({ showLabels: e.target.checked })}
                />
                Hiển thị nhãn dữ liệu
              </label>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Trục tọa độ</div>
            <div className="grid grid-cols-2 gap-3">
              <input className="rounded-md border border-border bg-surface-soft px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none" placeholder="Tên trục X" value={draft.chart.config.xAxisLabel || ''} onChange={e => editing.updateChartAxisLabel('x', e.target.value)} />
              <input className="rounded-md border border-border bg-surface-soft px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none" placeholder="Tên trục Y" value={draft.chart.config.yAxisLabel || ''} onChange={e => editing.updateChartAxisLabel('y', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Điểm dữ liệu biểu đồ</div>
              <button className="text-xs font-semibold text-primary hover:text-primary-hover" onClick={editing.addChartPoint}>+ Thêm điểm</button>
            </div>
            {draft.chart.data.map((point, index) => (
              <div key={index} className="flex gap-2">
                <input className="min-w-0 flex-1 rounded-md border border-border bg-surface-soft px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none" value={point.label} onChange={e => editing.updateChartPoint(index, { label: e.target.value })} />
                <input className="w-24 rounded-md border border-border bg-surface-soft px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none" type="number" value={point.value} onChange={e => editing.updateChartPoint(index, { value: Number(e.target.value) })} />
                <button 
                  className="flex w-9 items-center justify-center rounded-md border border-border bg-surface-soft text-text-muted transition-colors hover:bg-surface-hover hover:text-danger disabled:opacity-50"
                  disabled={draft.chart!.data.length <= 1}
                  onClick={() => editing.removeChartPoint(index)}
                  title="Xóa điểm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {draft.type === 'table' && draft.table && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Dữ liệu bảng</div>
            <button className="text-xs font-semibold text-primary hover:text-primary-hover" onClick={editing.addTableRow}>+ Thêm dòng</button>
          </div>
          {draft.table.rows.map((row, rowIndex) => (
            <div key={rowIndex} className="relative rounded-md border border-border p-3 space-y-2.5">
              <div className="absolute right-2 top-2">
                <button 
                  className="flex h-6 w-6 items-center justify-center rounded bg-surface-soft text-text-muted transition-colors hover:bg-surface-hover hover:text-danger disabled:opacity-50"
                  disabled={draft.table!.rows.length <= 1}
                  onClick={() => editing.removeTableRow(rowIndex)}
                  title="Xóa dòng"
                >
                  ×
                </button>
              </div>
              <div className="pr-8 space-y-2.5">
                {draft.table!.columns.map(column => (
                  <label key={column.key} className="block text-[11px] font-medium text-text-muted">
                    {column.header}
                    <input className="mt-1.5 w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-text-main transition-colors focus:border-primary focus:outline-none" value={row[column.key] || ''} onChange={e => editing.updateTableCell(rowIndex, column.key, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {draft.type === 'diagram' && draft.diagram && (
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Nhãn khối sơ đồ</div>
          {draft.diagram.nodes.map(node => (
            <input key={node.id} className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none" value={node.label} onChange={e => editing.updateDiagramNodeLabel(node.id, e.target.value)} />
          ))}
        </div>
      )}

      {editing.applyError && <p className="text-sm font-medium text-danger">{editing.applyError}</p>}
      <div className="flex gap-3 pt-2">
        <button className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-bold transition-colors hover:bg-surface-soft disabled:opacity-50" disabled={!editing.dirty} onClick={editing.cancel}>
          Khôi phục
        </button>
        <button className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2" disabled={!editing.dirty || !editing.validation.valid} onClick={editing.apply}>
          Áp dụng
          {editing.dirty && <span className="flex h-2 w-2 rounded-full bg-white opacity-75"></span>}
        </button>
      </div>
    </div>
  );
}
