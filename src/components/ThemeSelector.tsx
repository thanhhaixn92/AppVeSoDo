/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AcademicTheme } from '../types';
import { BookOpen, Cpu, Leaf, Printer, Award, Settings } from 'lucide-react';

interface ThemeItem {
  id: AcademicTheme;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fontClass: string;
}

// 6 Primary Themes with 2 variants each (Màu vs Đen trắng)
export const PRIMARY_THEMES: ThemeItem[] = [
  {
    id: 'classic_academic_color',
    name: 'Học thuật cổ điển — Màu',
    description: 'Nghiêm ngặt, trang nghiêm truyền thống. Thích hợp cho thiết kế luận án Tiến sĩ, Thạc sĩ.',
    icon: BookOpen,
    fontClass: 'font-serif',
  },
  {
    id: 'classic_academic_bw',
    name: 'Học thuật cổ điển — Đen trắng',
    description: 'Cổ điển tối giản không màu. Chuẩn mực các đề tài nghiên cứu lý thuyết truyền thống.',
    icon: Printer,
    fontClass: 'font-serif',
  },
  {
    id: 'modern_minimal_color',
    name: 'Tối giản hiện đại — Màu',
    description: 'Thoáng đãng, thanh lịch. Khuyên dùng cho báo cáo hội thảo khoa học và công nghệ mới.',
    icon: Leaf,
    fontClass: 'font-sans',
  },
  {
    id: 'modern_minimal_bw',
    name: 'Tối giản hiện đại — Đen trắng',
    description: 'Đen trắng đơn giản hiện đại. Khử hoàn toàn yếu tố gây nhiễu thị giác trên trang báo cáo.',
    icon: Printer,
    fontClass: 'font-sans',
  },
  {
    id: 'policy_professional_color',
    name: 'Chính sách chuyên nghiệp — Màu',
    description: 'Phối sắc xanh lục đứng đắn, vững chãi. Phù hợp đề án chính sách, quy hoạch phát triển.',
    icon: Award,
    fontClass: 'font-serif',
  },
  {
    id: 'policy_professional_bw',
    name: 'Chính sách chuyên nghiệp — Đen trắng',
    description: 'Phiên bản đen trắng chuẩn mực chính quy. Định dạng sang trọng cho các văn kiện mẫu.',
    icon: Printer,
    fontClass: 'font-serif',
  },
  {
    id: 'technical_clean_color',
    name: 'Kỹ thuật rõ nét — Màu',
    description: 'Biểu diễn thuật toán khoa học máy tính chân thực. Nét vẽ dứt khoát trên nền cyan nhẹ.',
    icon: Cpu,
    fontClass: 'font-mono',
  },
  {
    id: 'technical_clean_bw',
    name: 'Kỹ thuật rõ nét — Đen trắng',
    description: 'Nét vẽ đơn lập đen trắng rõ ràng, mật độ thông tin cao. Tối ưu cho in sơ đồ giải thuật.',
    icon: Printer,
    fontClass: 'font-mono',
  },
  {
    id: 'premium_soft_color',
    name: 'Mềm mại cao cấp — Màu',
    description: 'Các góc bo mềm mại, màu sắc quý phái. Đem lại cảm giác nghệ thuật, công nghệ cao cấp.',
    icon: Leaf,
    fontClass: 'font-sans',
  },
  {
    id: 'premium_soft_bw',
    name: 'Mềm mại cao cấp — Đen trắng',
    description: 'Bản in đen trắng sang trọng với các đường bo góc tròn tự nhiên và nét vẽ tao nhã.',
    icon: Printer,
    fontClass: 'font-sans',
  },
  {
    id: 'formal_report_color',
    name: 'Báo cáo trang trọng — Màu',
    description: 'Tông xanh lam chính thống uy tín cao. Dành cho báo cáo cơ quan nhà nước, tổ chức lớn.',
    icon: BookOpen,
    fontClass: 'font-sans',
  },
  {
    id: 'formal_report_bw',
    name: 'Báo cáo trang trọng — Đen trắng',
    description: 'Phương án đen trắng chuẩn tối cao. Rõ nét, nhất quán dùng cho hồ sơ nghiệm thu hành chính.',
    icon: Printer,
    fontClass: 'font-sans',
  }
];

// Secondary Themes / Old Styles Group
export const SECONDARY_THEMES: ThemeItem[] = [
  {
    id: 'apa',
    name: 'APA 7th Edition',
    description: 'Chuẩn báo cáo tâm lý học, khoa học hành vi xã hội quốc tế.',
    icon: BookOpen,
    fontClass: 'font-serif',
  },
  {
    id: 'ieee',
    name: 'IEEE Transactions',
    description: 'Chuẩn định dạng tạp chí Kỹ thuật điện và Công nghệ thông tin.',
    icon: Cpu,
    fontClass: 'font-serif',
  },
  {
    id: 'nature',
    name: 'Nature / Springer',
    description: 'Phối màu tinh tế đặc trưng theo phong cách tạp chí Y sinh quốc tế.',
    icon: Leaf,
    fontClass: 'font-sans',
  },
  {
    id: 'black_white',
    name: 'Grayscale (Bản in xám)',
    description: 'Mẫu xám cơ bản đơn giản cho xuất bản phẩm đen trắng cổ điển.',
    icon: Printer,
    fontClass: 'font-sans',
  }
];

export const THEMES = [...PRIMARY_THEMES, ...SECONDARY_THEMES];

export function getThemeFont(theme: AcademicTheme): string {
  const base = theme.replace('_bw', '').replace('_color', '');
  switch (base) {
    case 'apa':
    case 'ieee':
    case 'classic_academic':
    case 'policy_professional':
      return 'font-serif';
    case 'technical_clean':
      return 'font-mono';
    case 'nature':
    case 'black_white':
    case 'modern_minimal':
    case 'premium_soft':
    case 'formal_report':
    default:
      return 'font-sans';
  }
}

export function getThemeColors(theme: AcademicTheme): string[] {
  const base = theme.replace('_bw', '').replace('_color', '');
  if (theme.endsWith('_bw') || base === 'black_white') {
    return ['#000000', '#404040', '#808080', '#c0c0c0', '#e0e0e0'];
  }
  switch (base) {
    case 'apa':
      return ['#18181b', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'];
    case 'ieee':
      return ['#0f172a', '#1d4ed8', '#b91c1c', '#047857', '#a21caf'];
    case 'nature':
      return ['#059669', '#1d4ed8', '#dc2626', '#d97706', '#6366f1'];
    case 'classic_academic':
      return ['#434338', '#ab5c1c', '#1e40af', '#4f46e5', '#10b981'];
    case 'modern_minimal':
      return ['#4f46e5', '#10b981', '#f59e0b', '#dc2626', '#14b8a6'];
    case 'policy_professional':
      return ['#15803d', '#1e3a8a', '#b91c1c', '#059669', '#ea580c'];
    case 'technical_clean':
      return ['#0891b2', '#4f46e5', '#0f172a', '#0d9488', '#2563eb'];
    case 'premium_soft':
      return ['#ea580c', '#6366f1', '#14b8a6', '#db2777', '#f59e0b'];
    case 'formal_report':
    default:
      return ['#1d4ed8', '#b91c1c', '#15803d', '#ea580c', '#2563eb'];
  }
}

interface ThemeSelectorProps {
  currentTheme: AcademicTheme;
  onChangeTheme: (theme: AcademicTheme) => void;
  isDoubleColumn: boolean;
  onChangeIsDoubleColumn: (value: boolean) => void;
}

export default function ThemeSelector({
  currentTheme,
  onChangeTheme,
  isDoubleColumn,
  onChangeIsDoubleColumn,
}: ThemeSelectorProps) {
  return (
    <div className="bg-surface backdrop-blur-md border border-border rounded-xl p-4 shadow-sm space-y-4">
      
      {/* Primary Academic Design Themes */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-text-main flex items-center gap-1.5 font-sans">
            <Award className="w-4 h-4 text-primary" />
            Mẫu thiết kế chính (Học thuật & Đề án Việt Nam)
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed font-sans">
            Tự động tái định dạng font mẫu văn bản tiêu chuẩn quốc gia, chỉnh dải màu tối giản và canh gióng lưới đồ họa đồng bộ.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PRIMARY_THEMES.map((theme) => {
            const Icon = theme.icon;
            const isSelected = theme.id === currentTheme;
            return (
              <button
                type="button"
                key={theme.id}
                className={`flex flex-col items-start text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary-soft ring-1 ring-primary/20'
                    : 'border-border hover:border-text-subtle hover:bg-surface-soft'
                }`}
                onClick={() => onChangeTheme(theme.id)}
              >
                <div className="flex items-center gap-1.5 font-bold text-[11.5px] text-text-main">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-text-muted'}`} />
                  {theme.name}
                </div>
                <span className="text-[10px] text-text-muted mt-1 leading-normal line-clamp-2">
                  {theme.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary / Legacy Options */}
      <div className="pt-3 border-t border-border space-y-2.5">
        <div>
          <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-sans">
            Mẫu cũ / tuỳ chọn phụ
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SECONDARY_THEMES.map((theme) => {
            const Icon = theme.icon;
            const isSelected = theme.id === currentTheme;
            return (
              <button
                type="button"
                key={theme.id}
                className={`flex flex-col items-start text-left p-2 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary-soft'
                    : 'border-border hover:border-text-subtle hover:bg-surface-soft'
                }`}
                onClick={() => onChangeTheme(theme.id)}
              >
                <div className="flex items-center gap-1.5 font-semibold text-[11px] text-text-main">
                  <Icon className={`w-3 h-3 ${isSelected ? 'text-primary' : 'text-text-subtle'}`} />
                  {theme.name}
                </div>
                <span className="text-[9.5px] text-text-muted mt-0.5 leading-snug line-clamp-1">
                  {theme.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Column Spacing block */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-text-main flex items-center gap-1 font-sans">
            <Settings className="w-3.5 h-3.5 text-text-muted" />
            Phân trang cột luận án (Column Spacing)
          </span>
          <p className="text-[10px] text-text-subtle">Điều phối khổ rộng bản vẽ đáp ứng đúng bố cục tài liệu in ấn.</p>
        </div>
        <div className="flex bg-surface-muted p-0.5 rounded-lg border border-border shrink-0">
          <button
            type="button"
            className={`px-2.5 py-1 text-[10.5px] rounded-md transition-all cursor-pointer ${
              !isDoubleColumn ? 'bg-white text-text-main shadow-xs font-bold' : 'text-text-muted hover:text-text-main'
            }`}
            onClick={() => onChangeIsDoubleColumn(false)}
          >
            Đơn cột (Toàn trang)
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 text-[10.5px] rounded-md transition-all cursor-pointer ${
              isDoubleColumn ? 'bg-white text-text-main shadow-xs font-bold' : 'text-text-muted hover:text-text-main'
            }`}
            onClick={() => onChangeIsDoubleColumn(true)}
          >
            Khổ 2 cột (IEEE)
          </button>
        </div>
      </div>
    </div>
  );
}
