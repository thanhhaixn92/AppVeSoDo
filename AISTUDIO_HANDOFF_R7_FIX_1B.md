# R7-FIX-1B Final Report

phase: "R7-FIX-1B - Semantic Grouping and Canonical Units"
status: "PASS"
branch_policy: "sửa tiếp trên branch hiện tại"
branch: "main"
latest_commit: "N/A"
environment:
  git_available: false
  node_available: true
  npm_available: true
code_changed: true
changed_files:
  - src/types.ts
  - src/lib/workflowUtils.ts
  - src/analysis/ruleAnalyzer.ts
tests_added: true
tests_updated: false
commands:
  lint: PASS
  targeted_test: PASS
  test: PASS
  build: PASS
acceptance_criteria: PASS
remaining_risks: NONE
commit_created: false
pr_created: false

## What Changed
- **`src/types.ts`**: Added `UnitFamily` and `ParsedMeasure` types. Extended `ChartDataPoint` and `VisualCandidate` to support `unitFamily`, `canonicalUnit`, and `sourceGroupId`.
- **`src/lib/workflowUtils.ts`**: Added `parseVietnameseMeasure` to extract both numeric values and robust unit metadata. Kept `normalizeVietnameseNumber` for backward compatibility.
- **`src/analysis/ruleAnalyzer.ts`**: Replaced the global list-extraction logic with a Semantic Grouping mechanism. Now groups items into blocks delimited by headings, colons, or empty lines, before evaluating canonical unit compatibility to generate chart candidates.
- **`tests/mixedDatasetRegression.test.ts`**: Created this file to cover the specified regression tests (A through F).

## Why This Prevents Mixed Dataset
The previous implementation extracted all matching list or key/value pairs from across the entire document into a single array (`bulletChartPoints`), only checking if the value was numeric.
This update enforces that chart candidates are only created if points share both the same semantic boundaries (like a specific subheading) and the exact same canonical unit type (e.g. `currency_vnd` vs `percentage`).

## How Semantic Grouping Works
`ruleAnalyzer.ts` now iterates through the document lines to form `SemanticMeasureGroup`s. A new semantic group is started (or an old one ended) whenever the parser encounters:
1. Markdown headings (`#`, `##`, etc.)
2. Text that ends with a colon (acting as a subtitle or prefix for a list block).
3. Empty lines.
4. Markdown table boundaries.
Each group strictly isolates its children points from points in other sections.

## How Canonical Unit Compatibility Works
Once points are extracted and bound to a specific semantic group, they undergo an evaluation mapping (`group.points.forEach(...)`). We group them into sub-arrays according to their combined `unitFamily + canonicalUnit` signature. Only subgroup arrays that contain at least 2 points proceed to chart generation. This ensures that a group with one "percentage" value and one "currency" value doesn't combine into a mixed-unit chart.

## Tests Added
Created `tests/mixedDatasetRegression.test.ts` implementing:
- **Test A:** Same currency but different sections must not mix.
- **Test B:** Count canonical units must not mix.
- **Test C:** Income per person month.
- **Test D:** Percentage separated from currency.
- **Test E:** Table chart still works.
- **Test F:** Parser unit coverage.

## Commands Run
- `npx tsc --noEmit` / `npm run lint`: PASS
- `npx vitest run`: PASS (all tests including regressions)
- `npm run build`: PASS

## Manual QA Required
- Tải app và mở dữ liệu mẫu.
- Click "Phân tích" và xem danh sách đề xuất.
- Đảm bảo "Tổng mức đầu tư dự kiến", "Doanh thu" và các số liệu người, xe (đương lượng) nằm tại các biểu đồ chuyên biệt chứ không bị gộp chung vào một biểu đồ toàn văn.
- Không bị crash preview.
- Xuất kết quả tốt.

## Remaining Risks
None identified. The parsing logic falls back correctly, the table extraction pipeline was preserved verbatim, and backward compatibility is fully intact.
