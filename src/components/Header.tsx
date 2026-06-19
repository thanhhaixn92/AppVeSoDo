
import React from 'react';
import { 
  History, 
  Settings, 
  Save,
  Menu,
  Compass
} from 'lucide-react';
import { AcademicTheme, WorkflowState } from '../types';

interface HeaderProps {
  activeFigureTitle: string | null;
  figureStatus: string;
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: (val: boolean) => void;
  onHistoryClick: () => void;
  onSettingsClick: () => void;
  onSaveClick: () => void;
  isSaveDisabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeFigureTitle,
  figureStatus,
  isLeftSidebarOpen,
  setIsLeftSidebarOpen,
  onHistoryClick,
  onSettingsClick,
  onSaveClick,
  isSaveDisabled
}) => {
  return (
    <header className="h-[52px] bg-header-bg border-b border-header-border flex items-center justify-between px-4 shrink-0 z-50 relative">
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
            <Compass className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <span className="text-text-main font-black text-[13px] tracking-tight block uppercase">Hoa Tiêu MB</span>
            <span className="text-text-muted font-bold text-[9px] block tracking-[0.15em] uppercase leading-tight">VMS Navigator</span>
          </div>
        </div>

        <div className="hidden md:block h-6 w-[1px] bg-header-border mx-2"></div>
        
        {/* Center: Title and Status */}
        <div className="flex flex-col flex-1 min-w-0 pl-1 md:pl-0">
          <span className="text-[13px] md:text-sm text-text-main font-black truncate uppercase tracking-widest max-w-[200px] md:max-w-md">
            {activeFigureTitle || "CHƯA CÓ BẢN VẼ MỚI"}
          </span>
          <span className="text-[10px] sm:text-[11px] text-primary-soft font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            {figureStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button 
          onClick={onHistoryClick}
          className="p-2 sm:px-3 sm:py-2 flex items-center gap-2 rounded-xl transition-all cursor-pointer text-text-muted hover:text-text-main hover:bg-surface-soft border-transparent shadow-sm"
          title="Lịch sử các bản vẽ"
          aria-label="Lịch sử"
        >
          <History className="w-4 h-4 sm:w-4 sm:h-4" />
          <span className="hidden md:inline text-[11px] font-bold">Lịch sử</span>
        </button>

        <button 
          onClick={onSettingsClick}
          className="p-2 sm:px-3 sm:py-2 flex items-center gap-2 rounded-xl transition-all cursor-pointer text-text-muted hover:text-text-main hover:bg-surface-soft border-transparent shadow-sm"
          title="Cài đặt hệ thống"
          aria-label="Cài đặt"
        >
          <Settings className="w-4 h-4 sm:w-4 sm:h-4" />
          <span className="hidden md:inline text-[11px] font-bold">Cài đặt</span>
        </button>

        <div className="h-6 w-[1px] bg-header-border mx-1 hidden sm:block"></div>

        <button
          onClick={onSaveClick}
          disabled={isSaveDisabled}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 rounded-xl transition-all text-[11px] font-bold shadow-sm ${isSaveDisabled ? 'opacity-40 cursor-not-allowed bg-slate-800 border border-slate-700 text-slate-500' : 'bg-primary text-white hover:bg-primary-hover border border-primary-hover active:scale-95'}`}
          title="Lưu bản vẽ vào hệ thống"
          aria-label="Lưu bản vẽ"
        >
          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline font-bold tracking-wider uppercase">Lưu bản vẽ</span>
        </button>
      </div>
    </header>
  );
};
