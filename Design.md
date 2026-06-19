# ThesisDraw Pro - Architectural Design Document

Tài liệu thiết kế kiến trúc hệ thống phục vụ vẽ sơ đồ, biểu đồ & bảng biểu khoa học chuẩn hóa trong Luận án / Luận văn nghiên cứu khoa học.

---

## 1. Mảnh ghép Kiến trúc & Quy chuẩn Thiết kế

Sản phẩm được thiết kế theo lớp bảo vệ nghiêm ngặt "**100% Epistemological Lock**", đảm bảo tính chân thực của dữ liệu đầu vào và đầu ra khoa học mà không có hiện tượng ảo giác (hallucination):

-   **Mô đun hoá Tuyệt đối**: Mỗi định dạng dữ liệu (Bảng, Biểu đồ thống kê, Sơ đồ khối chức năng) liên kết chặt chẽ với một mô hình định nghĩa trong hệ thống (`TableModel`, `ChartModel`, `DiagramModel`).
-   **Định dạng Quy chuẩn Học thuật**: Hoạt động phối màu và canh chỉnh tuân theo 4 trường phái xuất bản học thuật danh giá thế giới:
    1.  **APA 7th Edition**: Phông chữ có chân (Georgia/Times New Roman), dải màu tương phản mịn Slate/Charcoal, cấu trúc bảng bọc dưới đầu - khóa lề dọc.
    2.  **IEEE Transactions**: Phông chữ kỹ thuật cứng cáp, bố cục hai cột thu nhỏ vừa vặn trang in, khung sơ đồ mũi tên nét nhỏ sắc bén.
    3.  **Nature / Springer**: Phối màu mượt sinh động Emerald/Cobalt Blue, tối ưu hóa mật độ hiển thị để truyền tải lượng thông tin khoa học dày đặc.
    4.  **Grayscale**: Bản in đen trắng kinh điển với độ tương phản tuyệt đối tốt nhất cho in ấn phôi học trình.

---

## 2. Các Tính năng Đột phá mới Nâng cấp

### A. Chỉnh sửa bản vẽ gốc thông qua AI đọc - hiểu chi tiết (AI Edit Mode)
Thay vì chỉ sinh hình vẽ mới từ hư vô, giờ đây trợ lý AI có khả năng **đọc và hiểu chi tiết cấu trúc** của hình vẽ đang được hiển thị. 
*   **Điểm chạm UI**: Nút chuyển đổi chế độ `Vẽ mới` và `Sửa hình đang hiển thị` ngay trên Thanh Prompt.
*   **Bảo toàn ngữ cảnh**: Khi ở chế độ chỉnh sửa, ứng dụng sẽ serialize và gửi toàn bộ trạng thái tọa độ gốc, liên kết, bảng số liệu hiện tại làm `currentContext`.
*   **Sát sao ý muốn**: AI sẽ đưa ra đề xuất cập nhật trúng đích dưới dạng cấu trúc JSON chính xác thay vì sinh lại từ đầu, hỗ trợ hoàn hảo hệ thống Hoàn tác/Làm lại (Undo/Redo).

### B. Tối ưu 1 chạm siêu đỉnh (1-Touch Super Optimizer)
Một thuật toán căn chỉnh hình học và số liệu thông minh được tích hợp trực tiếp trên bảng điều khiển trung tâm:
1.  **Thuật toán Sơ đồ (Diagram Repulsion System & Grid Snapping)**:
    *   Tự động làm tròn và gắn (snap) tọa độ khối vào mắt lưới `40px` ẩn.
    *   Tự động tính toán số ký tự nhãn (`label` metric length) để sinh chiều rộng khuyên dùng, chống tràn văn bản.
    *   Giải quyết chồng chéo vật lý bằng thuật toán đẩy cơ học (repulsion nudger) khi có 2 nút trùng tọa độ khít nhau.
    *   Đồng bộ hóa lại bộ mã màu biên (`strokeColor`) và nền (`fillColor`) thống nhất tuyệt đối theo Style Học thuật đã chọn.
2.  **Thuật toán Biểu đồ (Chart Data Smoother)**:
    *   Khử nhiễu số thập phân dư thừa bám đuôi, đưa về chuẩn hóa hiển thị chính xác tối đa 1 chữ số thập phân.
    *   Tự động kích hoạt lưới đếm học thuật đo lường khoa học (`showGrid = true`).
3.  **Thuật toán Bảng biểu (Table Align Auto-Formatter)**:
    *   Căn lề thông minh theo ngữ cảnh kiểu dữ liệu: Nếu giá trị cột chứa ký số/độ sai lệch/chỉ số F1/độ lỗi/%, cột tự dịch sát về bên **Phải** (`right`). Nếu là văn bản chỉ định, tự cân thẳng lề **Trái** (`left`).
    *   Tự động viết hoa tiêu đề cột (Title Case), lọc sạch các khoảng trống thừa (`trim`).

### C. Khung hiển thị rộng hơn & Collapsible Panels Workspace
Nhằm tối ưu hóa công tác chỉnh sửa luồng sơ đồ khổng lồ, ứng dụng bổ sung chế độ thu gọn không gian CAD chuyên nghiệp:
*   **Bật/Tắt Panel Trái**: Giấu danh sách hình vẽ & Thư viện kéo khối, nhường chỗ cho vùng vẽ rộng.
*   **Bật/Tắt Panel Phải**: Thu nhỏ vùng cấu hình chi tiết khi cảm thấy vừa ý.
*   **Khung vẽ rộng (1200px)**: Vượt thoát kích thước chuẩn A4 giới hạn của IEEE để vẽ các đề toán đồ sộ hơn trước khi thu nhỏ biên để in ấn.

---

## 3. Quy chuẩn An toàn Toàn diện

-   **API proxy bảo mật tuyệt đối**: Tất cả các lệnh kết nối Gemini SDK được vận hành ở máy chủ trung tâm (`/api/gemini/generate`), ẩn giấu khóa bảo mật `GEMINI_API_KEY` khỏi tầm mắt của Trình duyệt khách.
-   **An toàn Trạng thái**: Cơ chế `saveToHistory` chụp ảnh trạng thái ngay trước các tác vụ AI và Tối ưu 1 chạm giúp bảo toàn 100% dữ liệu nghiên cứu của người dùng, sẵn sàng hoàn tác bất kỳ lúc nào.
