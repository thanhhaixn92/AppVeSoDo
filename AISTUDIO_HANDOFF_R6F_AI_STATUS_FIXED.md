# R6F - AI Service Status State Machine Fix + Verified Repackage

Xác nhận đã sửa lỗi `DỊCH VỤ AI: ACTIVE` hiển thị khi AI không khả dụng.

## Thay đổi
- `aiStatus` khởi tạo với `state: "unknown"`.
- `getAiServiceLabel()` exhaustive map, không default fallback về ACTIVE.
- `handleSaveApiKey` chỉ ghi nhận key và đặt state về `unknown`, chờ check thực tế.
- Bắt lỗi trong quá trình chạy `interpretCommandByAI` để phản ánh đúng vào `aiStatus` (e.g. `unavailable`, `error`, `quota_limited`).
- Sửa lại state update block của `runAIAnalysis` để ghi nhận các state không-phải-active.
- Khôi phục `showToast` loop issue bằng cách chỉ render Toast khi previously `available`/`unknown`.

## Files changed
- `src/App.tsx`
