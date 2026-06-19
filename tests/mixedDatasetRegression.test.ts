import { describe, it, expect } from 'vitest';
import { runRuleAnalysis } from '../src/analysis/ruleAnalyzer';
import { parseVietnameseMeasure } from '../src/lib/workflowUtils';

describe('Mixed Dataset Regression (Semantic Grouping & Canonical Units)', () => {

  it('Test A - Same currency but different sections must not mix', async () => {
    const text = `
Đầu tư 2026–2030:
- Tổng mức đầu tư dự kiến: 711,118 tỷ đồng
- Kinh phí bố trí: 637,384 tỷ đồng

Kế hoạch 2026–2030:
- Doanh thu: 914.691 triệu đồng
- Lợi nhuận: 315.577 triệu đồng
    `;
    const res = await runRuleAnalysis(text);
    
    // Should have 2 chart candidates (one for each section)
    const charts = res.recommendedCandidates.filter(c => c.data.type === 'chart' && (c as any).sourceGroupId);
    expect(charts.length).toBe(2);

    const check1 = charts.some(c => 
      c.data.chart?.data.some(d => d.label === 'Tổng mức đầu tư dự kiến') &&
      !c.data.chart?.data.some(d => d.label === 'Doanh thu')
    );
    expect(check1).toBe(true);

    const check2 = charts.some(c => 
      c.data.chart?.data.some(d => d.label === 'Doanh thu') &&
      !c.data.chart?.data.some(d => d.label === 'Tổng mức đầu tư dự kiến')
    );
    expect(check2).toBe(true);
  });

  it('Test B - Count canonical units must not mix', async () => {
    const text = `
Nguồn lực:
- Hoa tiêu II: 15 người
- Hoa tiêu VI: 8 người
- Phương tiện thủy: 2 chiếc
- Lượt tàu dẫn: 1.200 lượt tàu
    `;
    const res = await runRuleAnalysis(text);
    
    const charts = res.recommendedCandidates.filter(c => c.data.type === 'chart' && (c as any).sourceGroupId);
    
    // Sould only be 1 chart for 'người' because it has >= 2 points
    expect(charts.length).toBe(1);
    const chart = charts[0].data.chart!;
    expect(chart.data.length).toBe(2);
    expect(chart.data[0].label).toBe('Hoa tiêu II');
    expect(chart.data[1].label).toBe('Hoa tiêu VI');
  });

  it('Test C - Income per person month', async () => {
    const text = `
Thu nhập 2023:
- Hoa tiêu II: 37.874.213 đồng/người/tháng
- Hoa tiêu III: 33.007.833 đồng/người/tháng
    `;
    const res = await runRuleAnalysis(text);
    const charts = res.recommendedCandidates.filter(c => c.data.type === 'chart' && (c as any).sourceGroupId);
    
    expect(charts.length).toBe(1);
    const chart = charts[0].data.chart!;
    // check canonicalUnit
    expect(chart.data[0].canonicalUnit).toBe('income_vnd_per_person_month');
    expect(chart.config.yAxisLabel).toBe('VNĐ/người/tháng');
  });

  it('Test D - Percentage separated from currency', async () => {
    const text = `
ROE/ROA:
- ROE: 42,86%
- ROA: 34,61%

Tài chính:
- Doanh thu: 914.691 triệu đồng
- Lợi nhuận: 315.577 triệu đồng
    `;
    const res = await runRuleAnalysis(text);
    const charts = res.recommendedCandidates.filter(c => c.data.type === 'chart' && (c as any).sourceGroupId);
    
    expect(charts.length).toBe(2);
    
    const pctChart = charts.find(c => c.data.chart?.data[0].unitFamily === 'percentage');
    expect(pctChart).toBeDefined();
    expect(pctChart?.data.chart?.data.length).toBe(2);

    const currChart = charts.find(c => c.data.chart?.data[0].unitFamily === 'currency');
    expect(currChart).toBeDefined();
    expect(currChart?.data.chart?.data.length).toBe(2);
  });

  it('Test E - Table chart still works', async () => {
    const text = `
Bảng kế hoạch 2026–2030
| Chỉ tiêu | ĐVT | 2026 | 2027 | 2028 | 2029 | 2030 |
|---|---|---:|---:|---:|---:|---:|
| Lượt dẫn tàu | Lượt | 50000 | 53000 | 56000 | 59000 | 63125 |
| Doanh thu | Tr. đồng | 724521 | 767992 | 814072 | 862916 | 914691 |
    `;
    const res = await runRuleAnalysis(text);
    
    const tableCand = res.recommendedCandidates.find(c => c.data.type === 'table');
    expect(tableCand).toBeDefined();
    
    const chartCand = res.recommendedCandidates.find(c => c.data.type === 'chart' && !c.sourceGroupId);
    expect(chartCand).toBeDefined();
  });

  it('Test F - Parser unit coverage', () => {
    let p;
    
    p = parseVietnameseMeasure('711,118 tỷ đồng');
    expect(p?.value).toBe(711.118);
    expect(p?.unitFamily).toBe('currency');
    expect(p?.canonicalUnit).toBe('currency_vnd_billion');

    p = parseVietnameseMeasure('914.691 triệu đồng');
    expect(p?.value).toBe(914691);
    expect(p?.unitFamily).toBe('currency');
    expect(p?.canonicalUnit).toBe('currency_vnd_million');

    p = parseVietnameseMeasure('42,86%');
    expect(p?.value).toBe(42.86);
    expect(p?.unitFamily).toBe('percentage');
    expect(p?.canonicalUnit).toBe('percentage');

    p = parseVietnameseMeasure('37.874.213 đồng/người/tháng');
    expect(p?.value).toBe(37874213);
    expect(p?.unitFamily).toBe('income_per_person_month');
    expect(p?.canonicalUnit).toBe('income_vnd_per_person_month');

    p = parseVietnameseMeasure('15 người');
    expect(p?.value).toBe(15);
    expect(p?.unitFamily).toBe('count');
    expect(p?.canonicalUnit).toBe('person_count');

    p = parseVietnameseMeasure('2 chiếc');
    expect(p?.value).toBe(2);
    expect(p?.unitFamily).toBe('count');
    expect(p?.canonicalUnit).toBe('vehicle_count');

    p = parseVietnameseMeasure('1.200 lượt tàu');
    expect(p?.value).toBe(1200);
    expect(p?.unitFamily).toBe('count');
    expect(p?.canonicalUnit).toBe('vessel_trip_count');

    p = parseVietnameseMeasure('45.000 Tr.GTHL');
    expect(p?.value).toBe(45000);
    expect(p?.unitFamily).toBe('volume_or_output');
    expect(p?.canonicalUnit).toBe('volume_or_output_tr_gthl');
  });

});
