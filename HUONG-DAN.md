# 673Trans

Bản Pot riêng của Nguyen, fork từ [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop) bản 3.0.7 (repo gốc đã archive 9/2026). Giấy phép GPL-3.0 như bản gốc.

## Khác gì bản gốc

1. **Thanh 3 icon khi tô chữ** ở bất kỳ app nào: Dịch · Thay bằng bản dịch · Đọc.
2. **Tên mới 673Trans** (file chạy, tooltip ở khay, trang About). Icon vẫn là icon Pot.
3. **Giao diện cài đặt mới**: font Inter (có sẵn trong app, hỗ trợ tiếng Việt), bảng màu mới, sidebar và các dòng cài đặt gọn hơn.
4. **Tắt tự kiểm tra cập nhật** lúc mở app (bản gốc không còn cập nhật nữa).

Mọi thứ khác giữ nguyên. Bản này dùng chung cấu hình và plugin với Pot gốc (`%APPDATA%\com.pot-app.desktop`), nên plugin TTS, từ điển, OCR đã cài vẫn chạy. Vì vậy **không mở được cùng lúc với Pot gốc**: thoát Pot gốc ở khay hệ thống trước.

## Thanh 3 icon

Kéo chuột tô chữ, hoặc double-click một từ, thanh sẽ hiện cạnh con trỏ.

| Nút | Làm gì |
|---|---|
| Dịch | Mở cửa sổ dịch quen thuộc với đoạn đang tô |
| Thay bằng bản dịch | Dịch rồi dán đè lên đoạn đang tô. Dùng dịch vụ dịch đầu tiên trong danh sách trả được chữ thuần; ngôn ngữ đích lấy theo cài đặt Dịch (đoạn đã là ngôn ngữ đích thì dịch sang ngôn ngữ phụ) |
| Đọc | Đọc đoạn đang tô bằng dịch vụ TTS đầu tiên trong danh sách. Bấm lần nữa để dừng |

Thanh tự ẩn sau 6 giây, hoặc khi click chỗ khác, cuộn chuột.

Cài đặt nằm cuối trang **Config → Translate**:

- **Selection Toolbar**: bật/tắt.
- **only when the cursor is a text cursor**: chỉ hiện khi con trỏ là hình chữ I. Nhờ vậy kéo thả trong After Effects, Photoshop, Explorer… không làm thanh bật lên. Nếu một app có chữ mà thanh không hiện (app tự vẽ con trỏ riêng, ví dụ Word), tắt mục này.
- **disabled in these apps**: danh sách tên file exe không muốn thanh xuất hiện, cách nhau bằng dấu phẩy. Ví dụ `AfterFX.exe, Photoshop.exe`.

Chưa làm: tô chữ bằng bàn phím (Shift + mũi tên, Ctrl + A) chưa bật thanh.

## Code nằm ở đâu

| Muốn sửa | File |
|---|---|
| Giao diện thanh 3 icon (màu, bo góc, cỡ icon) | `src/window/SelToolbar/style.css` |
| Nút và hành vi từng nút | `src/window/SelToolbar/index.jsx` |
| Khi nào thanh hiện, vị trí, thời gian tự ẩn, kích thước cửa sổ | `src-tauri/src/sel_toolbar.rs` |
| Cửa sổ dịch | `src/window/Translate/` |
| Trang cài đặt | `src/window/Config/pages/` |
| Bảng màu sáng/tối, màu nhấn (`primary`) | `tailwind.config.cjs` |
| Font chữ toàn app (`--app-font`) | `src/style.css` |
| Khung cửa sổ cài đặt, sidebar, kiểu các dòng cài đặt | `src/window/Config/style.css`, `src/window/Config/index.jsx`, `src/window/Config/components/SideBar/index.jsx` |
| Tên app | `productName` trong `src-tauri/tauri.conf.json` |
| Chữ trên giao diện | `src/i18n/locales/en_US.json` |
| Phím tắt, khay hệ thống, cửa sổ (Rust) | `src-tauri/src/` |

Giao diện viết bằng React + Tailwind + NextUI. Phần hệ thống viết bằng Rust (Tauri 1).

Thêm một nút vào thanh: thêm một mục vào mảng `buttons` trong `src/window/SelToolbar/index.jsx`, rồi tăng `BAR_W` trong `src-tauri/src/sel_toolbar.rs` thêm khoảng 40.

## Build lại sau khi sửa

**Cách 1: nhờ Claude.** Đưa thư mục này cho Claude, nói muốn sửa gì. Claude build được file exe cho Windows ngay trên máy chủ của nó bằng `tools/build-windows-from-linux.sh`, rồi chép `673Trans.exe` mới về.

**Cách 2: tự build trên Windows.** Cài một lần:

- Node.js 18 trở lên, rồi `npm install -g pnpm`
- Rust: https://rustup.rs
- Visual Studio Build Tools, chọn "Desktop development with C++"

Sau đó mở terminal trong thư mục `source`:

```
pnpm install
pnpm tauri dev        # chạy thử, sửa giao diện là thấy ngay
pnpm tauri build      # ra file cài đặt trong src-tauri\target\release\bundle
```
