# Digital SAT Master Suite (Bluebook 2026 Edition)

Ứng dụng web luyện thi **Digital SAT** chạy trực tiếp trên **GitHub Pages** (không cần cài đặt server/backend), bao gồm:

1. **Phần 1 — Ôn tập Lý thuyết & 80 Bài tập Áp dụng**:
   - Đầy đủ **8 chuyên đề chuẩn College Board**:
     - *Reading & Writing*: Information and Ideas, Craft and Structure, Expression of Ideas, Standard English Conventions.
     - *Math*: Algebra, Advanced Math, Problem-Solving & Data Analysis, Geometry and Trigonometry.
   - Mỗi chuyên đề có cẩm nang lý thuyết, công thức, các bẫy thường gặp, ví dụ minh họa và **đúng 10 bài tập áp dụng** kèm gợi ý tư duy và giải thích chi tiết.
2. **Phần 2 — 10 Đề thi thử Chuẩn Format Digital SAT (Bluebook UI)**:
   - 10 đề thi thử độc lập, mỗi đề gồm **2 Section (Reading & Writing + Math)** chia thành **4 Module Adaptive**.
   - Tích hợp đồng hồ đếm ngược, đánh dấu câu hỏi (*Mark for Review*), gạch phương án nhiễu (*Option Eliminator*), bảng công thức toán SAT (*Reference Sheet*), máy tính khoa học & bảng nháp, chấm điểm quy đổi thang **400–1600**.

## Cấu trúc thư mục dự án (GitHub Pages)

```text
├── index.html          # Giao diện chính của ứng dụng
├── css/
│   └── style.css       # Định dạng giao diện, font chữ và hiệu ứng Bluebook
├── js/
│   ├── data.js         # Ngân hàng dữ liệu: Lý thuyết, 80 bài tập áp dụng & 10 đề thi thử
│   └── app.js          # Xử lý sự kiện, đồng hồ phòng thi, máy tính và chấm điểm 400-1600
├── .nojekyll           # Tắt Jekyll để GitHub Pages triển khai tức thì
└── README.md           # Hướng dẫn cài đặt và triển khai
```

## Hướng dẫn đưa lên GitHub & Bật GitHub Pages

1. Tạo một Repository mới trên GitHub (ví dụ: `digital-sat-prep`).
2. Giải nén file `digital-sat-github-pages.zip` và tải toàn bộ các file (`index.html`, thư mục `css/`, thư mục `js/`, `.nojekyll`, `README.md`) lên nhánh `main` của Repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Digital SAT Prep App"
   git branch -M main
   git remote add origin https://github.com/<ten-tai-khoan>/<ten-repo>.git
   git push -u origin main
   ```
3. Trên giao diện GitHub của Repository, vào **Settings** → **Pages**.
4. Tại mục **Build and deployment**:
   - **Source**: Chọn `Deploy from a branch`.
   - **Branch**: Chọn `main` và thư mục `/ (root)`, sau đó bấm **Save**.
5. Đợi khoảng 30–60 giây, trang web sẽ hoạt động tại địa chỉ:
   `https://<ten-tai-khoan>.github.io/<ten-repo>/`
