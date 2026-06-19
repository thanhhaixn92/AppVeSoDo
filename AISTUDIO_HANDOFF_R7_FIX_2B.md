# R7-FIX-2B Final Report

phase: "R7-FIX-2B - Chart Number/Unit/Tooltip/Color Fidelity"
status: "PASS"
mode: "implement"
code_changed: true
changed_files:
  - src/lib/workflowUtils.ts
  - src/components/FigureRenderer.tsx
tests_added: true
tests_updated: false
commands:
  lint: PASS
  targeted_test: PASS
  test: PASS
  build: PASS
acceptance_criteria: PASS
manual_qa: "Cần kiểm tra trên Preview: hover vào cột, đồ thị để xem hiển thị số ngàn, Tooltip không bị lỗi, v.v."
remaining_risks: NONE
commit_created: false
pr_created: false

## What Changed
- Đã thêm các hàm tiện ích (`formatVietnameseNumber`, `getDisplayUnitFromCanonicalUnit`, `formatVietnameseValueWithUnit`) vào \`workflowUtils.ts\` để xử lý format chuẩn Việt Nam (VD: \`1.000.000\`) và hiển thị đơn vị chính xác.
- Ở \`FigureRenderer.tsx\`, tạo \`CustomCartesianTooltip\` cho hiển thị Tooltip không còn lỗi value nối chữ tiếng Anh mặc định (ví dụ: `value: 1234`).
- Label XAxis được truncate (tối đa 12 ký tự rồi thêm dấu ...) bằng hàm \`truncateAxisLabel\`.
- Đã gắn \`cursor={{ fill: 'rgba(0,0,0,0.02)' }}\` để giảm độ xám mặc định gây cảm giác lỗi khi hover ở Bar chart. 
- Component \`<Bar>\` đã thêm thẻ \`<LabelList>\` để hiển thị data label dạng \`compact\` nếu như \`config.showLabels === true\`.
- Cho phép render unit chính xác khi metadata đã được thêm sẵn ở pha R7-FIX-1B.
- Các biểu đồ Pie legend, label cũng đã sử dụng custom formatter đảm bảo format nghìn, phần trăm không bị sai.
- Không phá vỡ luồng Table.
- Không sửa server hay cơ chế layout tổng.

## Number Formatting Improvements
Sử dụng \`Intl.NumberFormat('vi-VN')\` để chuyển từ format hệ thống sang format Việt Nam, giữ chuẩn form (hàng nghìn cách nhau bởi dấu chấm, thập phân cách qua phẩy). Support param \`compact\` khi gắn trên nhãn cột bar giúp string hiển thị không quá dài (20K thay vì 20.000 nếu quá tải).

## Unit Display Improvements
Thay vì sinh ngẫu nhiên Unit, dùng fallback an toàn với \`getDisplayUnitFromCanonicalUnit\` cho phép convert \`currency_vnd_billion\` sang \`tỷ đồng\`, \`percentage\` sang \`%\`, v.v. Các unit chuẩn không tự ép kiểu hay làm metadata sai với original data.

## Tooltip Improvements
Thay thế tooltip chuẩn của Recharts trên Cartesian Chart thành \`CustomCartesianTooltip\`. Hiển thị nhãn giá trị bằng tiếng Việt "Giá trị:", color mã màu trùng với mã column/line point tương ứng, text màu đậm dễ nhìn.

## Data Label Improvements
Hỗ trợ config \`showLabels\` trong \`ReBarChart\`. Data value trên cell Bar sẽ format dưới dạng Compact tránh bị lấn sang layout khác. 

## X-axis Label Improvements
Nhãn dài dưới Axis đã được giới hạn chiều dài (\`substring\`) và \`...\` nhờ \`tickFormatter={truncateAxisLabel}\`.  

## Color/Hover Improvements
Vùng \`hover\` tooltip hiện mờ nhạt \`fill: 'rgba(0,0,0,0.02)'\` không còn vùng xám nặng cản trở thị giác. Giữ nguyên default màu \`black/white theme\` không can thiệp ép lại toàn bộ class.

## Tests Added or Updated
Đã bổ sung \`tests/displayFormatting.test.ts\` cover cho:
- \`formatVietnameseNumber\`
- \`getDisplayUnitFromCanonicalUnit\`
- \`formatVietnameseValueWithUnit\`

Regression tests 1B pass toàn bộ.

## Commands Run
- `npm run lint` / `npx tsc --noEmit`: PASS
- `npx vitest run`: PASS (đạt 31 tests passed, bao gồm của display format mới + regression 1B)
- `npm run build`: PASS 

## Manual QA Required
- Bật màn hình Preview, load chart.
- Hover qua các bar, đường line để check Tooltip hiển thị text tiếng việt đính kèm đơn vị chính xác hay không.
- Nhìn biểu đồ cột nếu set `Hiển thị dữ liệu` thì số ngắn phải xuất hiện.
- Nhìn nhãn XAxis phải bị cắt gọn gàng tránh đè line nếu dài quá 15 ký tự.

## Remaining Risks
Không có vấn đề logic/data hỏng hoặc rủi ro phát hiện trong test environment. Việc rút gọn X-axis label chỉ áp dụng cắt text `...`, tùy vào design có thể nâng cấp bọc wrap 2 rows ở phiên bản sâu hơn.
