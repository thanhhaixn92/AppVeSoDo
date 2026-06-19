import { DiagramTheme } from './types';

export const COMPREHENSIVE_THEMES: Record<string, Record<'blackWhite' | 'color', DiagramTheme>> = {
  classic_academic: {
    blackWhite: {
      id: 'classic_academic_bw',
      name: 'Classic Academic (Đen Trắng)',
      variant: 'blackWhite',
      fontFamily: '"Times New Roman", Times, serif',
      canvas: { background: '#ffffff', margin: 40 },
      node: {
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 1.5,
        radius: 0,
        paddingX: 16,
        paddingY: 10,
        minWidth: 130,
        minHeight: 50,
        fontSize: 12,
        fontWeight: 600,
        textColor: '#000000',
        lineHeight: 1.4
      },
      line: { stroke: '#000000', strokeWidth: 1.5, style: 'solid', arrowSize: 8 },
      spacing: { horizontal: 160, vertical: 100, groupGap: 40 },
      caption: { fontSize: 11, textColor: '#000000', align: 'center' }
    },
    color: {
      id: 'classic_academic_color',
      name: 'Classic Academic (Bản Màu)',
      variant: 'color',
      fontFamily: '"Times New Roman", Times, serif',
      canvas: { background: '#fcfcf9', margin: 40 },
      node: {
        fill: '#f4f4eb',
        stroke: '#434338',
        strokeWidth: 1.5,
        radius: 0,
        paddingX: 16,
        paddingY: 10,
        minWidth: 130,
        minHeight: 50,
        fontSize: 12,
        fontWeight: 600,
        textColor: '#1c1c16',
        lineHeight: 1.4
      },
      line: { stroke: '#434338', strokeWidth: 1.5, style: 'solid', arrowSize: 8 },
      spacing: { horizontal: 160, vertical: 100, groupGap: 40 },
      caption: { fontSize: 11, textColor: '#434338', align: 'center' }
    }
  },
  modern_minimal: {
    blackWhite: {
      id: 'modern_minimal_bw',
      name: 'Modern Minimal (Đen Trắng)',
      variant: 'blackWhite',
      fontFamily: '"Inter", system-ui, sans-serif',
      canvas: { background: '#ffffff', margin: 40 },
      node: {
        fill: '#ffffff',
        stroke: '#1e293b',
        strokeWidth: 1.5,
        radius: 6,
        paddingX: 18,
        paddingY: 12,
        minWidth: 140,
        minHeight: 55,
        fontSize: 11,
        fontWeight: 500,
        textColor: '#1e293b',
        lineHeight: 1.3
      },
      line: { stroke: '#1e293b', strokeWidth: 1.5, style: 'solid', arrowSize: 6 },
      spacing: { horizontal: 180, vertical: 110, groupGap: 45 },
      caption: { fontSize: 11, textColor: '#1e293b', align: 'center' }
    },
    color: {
      id: 'modern_minimal_color',
      name: 'Modern Minimal (Bản Màu)',
      variant: 'color',
      fontFamily: '"Inter", system-ui, sans-serif',
      canvas: { background: '#ffffff', margin: 40 },
      node: {
        fill: '#eef2ff',
        stroke: '#4f46e5',
        strokeWidth: 1.5,
        radius: 8,
        paddingX: 18,
        paddingY: 12,
        minWidth: 140,
        minHeight: 55,
        fontSize: 11,
        fontWeight: 600,
        textColor: '#1e1b4b',
        lineHeight: 1.3
      },
      line: { stroke: '#6366f1', strokeWidth: 1.5, style: 'solid', arrowSize: 6 },
      spacing: { horizontal: 180, vertical: 110, groupGap: 45 },
      caption: { fontSize: 11, textColor: '#4f46e5', align: 'center' }
    }
  },
  policy_professional: {
    blackWhite: {
      id: 'policy_professional_bw',
      name: 'Policy Professional (Đen Trắng)',
      variant: 'blackWhite',
      fontFamily: '"Georgia", serif',
      canvas: { background: '#ffffff', margin: 40 },
      node: {
        fill: '#ffffff',
        stroke: '#1e293b',
        strokeWidth: 1.5,
        radius: 4,
        paddingX: 20,
        paddingY: 14,
        minWidth: 150,
        minHeight: 60,
        fontSize: 12,
        fontWeight: 500,
        textColor: '#0f172a',
        lineHeight: 1.4
      },
      line: { stroke: '#1e293b', strokeWidth: 1.5, style: 'solid', arrowSize: 7 },
      spacing: { horizontal: 190, vertical: 120, groupGap: 50 },
      caption: { fontSize: 11.5, textColor: '#1e293b', align: 'left' }
    },
    color: {
      id: 'policy_professional_color',
      name: 'Policy Professional (Bản Màu)',
      variant: 'color',
      fontFamily: '"Georgia", serif',
      canvas: { background: '#f8fafc', margin: 40 },
      node: {
        fill: '#f0fdf4',
        stroke: '#166534',
        strokeWidth: 1.5,
        radius: 4,
        paddingX: 20,
        paddingY: 14,
        minWidth: 150,
        minHeight: 60,
        fontSize: 12,
        fontWeight: 600,
        textColor: '#14532d',
        lineHeight: 1.4
      },
      line: { stroke: '#15803d', strokeWidth: 1.5, style: 'solid', arrowSize: 7 },
      spacing: { horizontal: 190, vertical: 120, groupGap: 50 },
      caption: { fontSize: 11.5, textColor: '#166534', align: 'left' }
    }
  },
  technical_clean: {
    blackWhite: {
      id: 'technical_clean_bw',
      name: 'Technical Clean (Đen Trắng)',
      variant: 'blackWhite',
      fontFamily: '"Courier New", Courier, monospace',
      canvas: { background: '#ffffff', margin: 40 },
      node: {
        fill: '#ffffff',
        stroke: '#171717',
        strokeWidth: 1.5,
        radius: 0,
        paddingX: 14,
        paddingY: 10,
        minWidth: 130,
        minHeight: 50,
        fontSize: 11,
        fontWeight: 500,
        textColor: '#171717',
        lineHeight: 1.3
      },
      line: { stroke: '#171717', strokeWidth: 1.5, style: 'solid', arrowSize: 6 },
      spacing: { horizontal: 170, vertical: 100, groupGap: 40 },
      caption: { fontSize: 11, textColor: '#171717', align: 'center' }
    },
    color: {
      id: 'technical_clean_color',
      name: 'Technical Clean (Bản Màu)',
      variant: 'color',
      fontFamily: '"Courier New", Courier, monospace',
      canvas: { background: '#fafafa', margin: 40 },
      node: {
        fill: '#ecfeff',
        stroke: '#0891b2',
        strokeWidth: 1.5,
        radius: 0,
        paddingX: 14,
        paddingY: 10,
        minWidth: 130,
        minHeight: 50,
        fontSize: 11,
        fontWeight: 600,
        textColor: '#083344',
        lineHeight: 1.3
      },
      line: { stroke: '#06b6d4', strokeWidth: 1.5, style: 'solid', arrowSize: 6 },
      spacing: { horizontal: 170, vertical: 100, groupGap: 40 },
      caption: { fontSize: 11, textColor: '#0891b2', align: 'center' }
    }
  },
  premium_soft: {
    blackWhite: {
      id: 'premium_soft_bw',
      name: 'Premium Soft (Đen Trắng)',
      variant: 'blackWhite',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      canvas: { background: '#ffffff', margin: 40 },
      node: {
        fill: '#ffffff',
        stroke: '#404040',
        strokeWidth: 1.2,
        radius: 12,
        paddingX: 20,
        paddingY: 12,
        minWidth: 140,
        minHeight: 55,
        fontSize: 11.5,
        fontWeight: 500,
        textColor: '#171717',
        lineHeight: 1.4
      },
      line: { stroke: '#404040', strokeWidth: 1.2, style: 'solid', arrowSize: 6 },
      spacing: { horizontal: 180, vertical: 110, groupGap: 45 },
      caption: { fontSize: 11, textColor: '#171717', align: 'center' }
    },
    color: {
      id: 'premium_soft_color',
      name: 'Premium Soft (Bản Màu)',
      variant: 'color',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      canvas: { background: '#fdfbf7', margin: 40 },
      node: {
        fill: '#fff7ed',
        stroke: '#ea580c',
        strokeWidth: 1.5,
        radius: 14,
        paddingX: 20,
        paddingY: 12,
        minWidth: 140,
        minHeight: 55,
        fontSize: 11.5,
        fontWeight: 600,
        textColor: '#431407',
        lineHeight: 1.4
      },
      line: { stroke: '#f97316', strokeWidth: 1.5, style: 'solid', arrowSize: 6 },
      spacing: { horizontal: 180, vertical: 110, groupGap: 45 },
      caption: { fontSize: 11, textColor: '#c2410c', align: 'center' }
    }
  },
  formal_report: {
    blackWhite: {
      id: 'formal_report_bw',
      name: 'Formal Report (Đen Trắng)',
      variant: 'blackWhite',
      fontFamily: '"Arial", sans-serif',
      canvas: { background: '#ffffff', margin: 40 },
      node: {
        fill: '#ffffff',
        stroke: '#262626',
        strokeWidth: 1.5,
        radius: 2,
        paddingX: 18,
        paddingY: 12,
        minWidth: 140,
        minHeight: 55,
        fontSize: 12,
        fontWeight: 600,
        textColor: '#171717',
        lineHeight: 1.3
      },
      line: { stroke: '#262626', strokeWidth: 1.5, style: 'solid', arrowSize: 7 },
      spacing: { horizontal: 180, vertical: 110, groupGap: 45 },
      caption: { fontSize: 12, textColor: '#171717', align: 'center' }
    },
    color: {
      id: 'formal_report_color',
      name: 'Formal Report (Bản Màu)',
      variant: 'color',
      fontFamily: '"Arial", sans-serif',
      canvas: { background: '#fafafa', margin: 40 },
      node: {
        fill: '#eff6ff',
        stroke: '#1d4ed8',
        strokeWidth: 1.5,
        radius: 2,
        paddingX: 18,
        paddingY: 12,
        minWidth: 140,
        minHeight: 55,
        fontSize: 12,
        fontWeight: 600,
        textColor: '#1e3a8a',
        lineHeight: 1.3
      },
      line: { stroke: '#2563eb', strokeWidth: 1.5, style: 'solid', arrowSize: 7 },
      spacing: { horizontal: 180, vertical: 110, groupGap: 45 },
      caption: { fontSize: 12, textColor: '#1d4ed8', align: 'center' }
    }
  }
};
