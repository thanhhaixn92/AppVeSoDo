import React from 'react';
import { 
  FileText, 
  Search, 
  Wand2, 
  ShieldCheck, 
  Download,
  ChevronRight
} from 'lucide-react';
import { WorkflowState } from '../types';

interface WorkflowStepperProps {
  workflowState: WorkflowState;
  activeHeaderTab: string;
  onStepClick: (stepId: string) => void;
  isFocusMode: boolean;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ 
  workflowState,
  activeHeaderTab, 
  onStepClick,
  isFocusMode
}) => {
  if (isFocusMode) return null;

  const steps = [
    { id: 'document', label: 'Nhập liệu', icon: FileText, states: ['EMPTY', 'INPUT_READY'] },
    { id: 'analysis', label: 'Phân tích', icon: Search, states: ['ANALYZING'] },
    { id: 'visualization', label: 'Trực quan', icon: Wand2, states: ['CANDIDATES_READY', 'PREVIEWING_CANDIDATE', 'APPLYING_CANDIDATE', 'APPLIED_FIGURE', 'EDITING_FIGURE'] },
    { id: 'publication', label: 'Kiểm soát', icon: ShieldCheck, states: ['QUALITY_CHECKING'] },
    { id: 'export', label: 'Xuất', icon: Download, states: ['EXPORTING'] }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mb-3 bg-surface border border-border rounded-xl p-1 shadow-sm overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1 min-w-max md:min-w-0 md:flex-1">
        {steps.map((step, idx) => {
        const currentStepIndex = steps.findIndex(s => s.id === activeHeaderTab);
        const isActive = step.id === activeHeaderTab;
        const isCompleted = idx < currentStepIndex && currentStepIndex !== -1;
        const isPending = idx > currentStepIndex || currentStepIndex === -1;
        
        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onStepClick(step.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                isActive ? 'bg-primary text-white shadow-sm font-semibold ring-1 ring-primary-soft' : 
                isCompleted ? 'text-text-main hover:bg-surface-soft font-medium' :
                'text-text-subtle hover:text-text-main hover:bg-surface-soft opacity-60'
              }`}
              title={isActive ? 'Đang thực hiện' : isCompleted ? 'Đã hoàn thành' : 'Chưa thực hiện'}
            >
              <step.icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] uppercase font-bold tracking-wider">{step.label}</span>
            </button>
            {idx < steps.length - 1 && <ChevronRight className={`w-3 h-3 ${isCompleted ? 'text-primary opacity-50' : 'text-border'}`} />}
          </React.Fragment>
        );
      })}
      </div>
    </div>
  );
};
