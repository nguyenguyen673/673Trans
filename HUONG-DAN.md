# 673Trans

Bản Pot riêng của Nguyen, fork từ [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop) bản 3.0.7 (repo gốc đã archive 9/2026). Giấy phép GPL-3.0 như bản gốc.

## Tính năng riêng của 673Trans

1. **Thanh icon khi chọn chữ** ở bất kỳ app nào (kéo chuột, nhấp đúp, hoặc Ctrl+A trong ô nhập). Có 7 nút bật/tắt và kéo đổi thứ tự được: Dịch · Dịch và thay thế · Dịch và sao chép · Đọc to · Tra từ điển · Gõ từ · Sao chép.
2. **Tên mới 673Trans** (file chạy, tooltip ở khay, trang About). Icon vẫn là icon Pot.
3. **Giao diện cài đặt mới**: font Inter (có sẵn trong app, hỗ trợ tiếng Việt), bảng màu mới, sidebar và các dòng cài đặt gọn hơn.
4. **Giao diện tiếng Việt** (Cài đặt chung → Ngôn ngữ ứng dụng) và **màu chủ đạo** chọn được.
5. **Trình dịch AI có sẵn**: DeepSeek, Claude, GPT (OpenAI), Gemini, và "Tương thích OpenAI" cho mọi hãng khác (OpenRouter, Qwen, Kimi, SiliconFlow, LM Studio…: tự nhập địa chỉ API và tên mô hình). Thêm ở Dịch vụ → Thêm dịch vụ có sẵn, cần khóa API của từng hãng. Tên mô hình tự nhập được.
6. **OCR bằng AI**: DeepSeek, Gemini, GPT, Claude, và "tương thích OpenAI" (ảnh chụp được gửi cho mô hình đọc chữ). **Giọng đọc**: ElevenLabs, OpenAI TTS, Gemini TTS, Local TTS (giọng Edge có sẵn trong exe qua lệnh Rust `edge_tts`; server Python riêng chỉ cần cho Piper offline / kho audio). Thêm ở Dịch vụ → OCR / Giọng nói.
7. **Nút nguồn cho từng dịch vụ dịch** (trang Dịch vụ): sáng = tự dịch; tắt = dịch vụ vẫn hiện trong cửa sổ dịch nhưng chỉ dịch khi bạn bấm mở thẻ của nó. Tiện cho dịch vụ tốn tiền hoặc chậm.
8. **Trang Phím tắt mới**: mỗi hành động một phím (bấm nút bàn phím rồi nhấn tổ hợp), trạng thái Đã tắt/Đang bật/Thất bại. Có bật/tắt tất cả phím tắt, bật/tắt trợ lý chọn, dịch+chép / dịch+thay thế / đọc to vùng chọn, OCR+chép, dịch ảnh+chép, và phím chuyển cặp ngôn ngữ đích. Code: `src/window/Config/pages/Hotkey/index.jsx`, `src-tauri/src/hotkey.rs`.
9. **Tự cập nhật từ GitHub Releases** (`src-tauri/src/updater.rs`): mở app là kiểm tra bản mới; Release phải có file `.exe` đính kèm và tag dạng `v3.20.0`. Tắt ở Cài đặt chung.
10. **Từ điển** (trang Dịch vụ → Từ điển): tô một từ rồi bấm icon quyển sách, hoặc dùng phím tắt, popup nhỏ hiện ngay cạnh con trỏ. Có 3 từ điển, đổi bằng menu ở góc popup: **Anh–Việt offline** (Hồ Ngọc Đức, 103k từ, nhúng sẵn trong exe: lần đầu mở app tự giải nén ra thư mục cấu hình, file có sẵn ở đó thì giữ nguyên; có tra ngược Việt → Anh và gợi ý từ gần giống), **Wiktionary kiểu Cambridge** (IPA UK/US, giọng ghi âm thật, định nghĩa và câu ví dụ; lưu đệm vào máy), **Từ điển AI** (AI viết mục từ điển, có hãng AI + khoá API + mô hình riêng ở Dịch vụ → Từ điển → Từ điển AI, không dùng chung với danh sách dịch; đọc bằng TTS của bạn). Nút ⭐ lưu từ vào sổ từ vựng, nút đồng hồ xem lịch sử tra, ô tìm trên cùng để gõ từ (có phím tắt và icon "Gõ từ" trên thanh trợ lý). Nút "Giải thích bằng AI" chỉ chạy khi bấm.
11. **Trau chuốt / Viết lại, chính tả / Tóm tắt** ngay trong cửa sổ dịch (chỉ với dịch vụ AI).
12. **Công tắc bật/tắt** cho từng dịch vụ (dịch, OCR, giọng nói, từ điển, sổ từ vựng) mà không phải xoá. Cửa sổ cài đặt và popup từ điển nhớ kích thước.

Mọi thứ khác giữ nguyên. Bản này dùng chung cấu hình và plugin với Pot gốc (`%APPDATA%\com.pot-app.desktop`), nên plugin TTS, từ điển, OCR đã cài vẫn chạy. Vì vậy **không mở được cùng lúc với Pot gốc**: thoát Pot gốc ở khay hệ thống trước.

## Dịch vụ bật sẵn khi cài mới

Dịch: Google, Bing. OCR: System (OCR của Windows), Tesseract (dữ liệu eng, vie, chi_sim, chi_tra nằm trong `public/tessdata`, các ngôn ngữ khác tải lần đầu). Giọng đọc: Local TTS (Edge có sẵn), Lingva TTS. Từ điển: Anh–Việt offline, Wiktionary, Từ điển AI (cần khoá). Mặc định nằm ở các `useConfig('..._service_list', [...])`.

## Thanh icon khi chọn chữ

Kéo chuột tô chữ, nhấp đúp một từ, hoặc bấm Ctrl+A trong ô nhập: thanh hiện cạnh con trỏ (với Ctrl+A là cạnh dấu nháy nếu Windows biết vị trí). Thanh tự ẩn sau 6 giây, hoặc khi click chỗ khác, cuộn chuột.

Mọi cài đặt nằm ở trang **Trợ lý chọn văn bản**: bật/tắt từng cách kích hoạt, chọn nút nào hiện trên thanh, danh sách app không muốn thanh xuất hiện.

- "Dịch và thay thế" / "Dịch và sao chép" dùng dịch vụ dịch đầu tiên trong danh sách trả được chữ thuần; ngôn ngữ đích lấy theo Cài đặt dịch.
- "Đọc to" dùng dịch vụ giọng nói đầu tiên trong danh sách.
- "Chỉ khi con trỏ là con trỏ văn bản" giúp kéo thả trong After Effects, Photoshop, Explorer… không làm thanh bật lên. App nào có chữ mà thanh không hiện (vd Word) thì tắt mục này.

Chưa làm: chọn chữ bằng Shift + mũi tên chưa bật thanh.

## Số phiên bản

Mỗi bản build có số riêng, xem ở tooltip của icon khay hệ thống hoặc trang Giới thiệu (bản này: 3.26.5). Đổi số ở `version` trong `src-tauri/tauri.conf.json`.

## Code nằm ở đâu

| Muốn sửa | File |
|---|---|
| Giao diện thanh icon (màu, bo góc, cỡ icon) | `src/window/SelToolbar/style.css` |
| Nút và hành vi từng nút | `src/window/SelToolbar/index.jsx` |
| Khi nào thanh hiện, vị trí, thời gian tự ẩn, kích thước cửa sổ | `src-tauri/src/sel_toolbar.rs` |
| Cửa sổ dịch | `src/window/Translate/` |
| Trang cài đặt | `src/window/Config/pages/` (khối dựng sẵn `Section`, `Row` ở `src/window/Config/components/Setting`) |
| Trang Trợ lý chọn văn bản | `src/window/Config/pages/Toolbar/index.jsx` |
| Danh sách màu chủ đạo | `src/utils/accent.js` |
| Icon các trình dịch | `public/logo/<tên dịch vụ>.svg` (thay file cùng tên rồi build lại) |
| Hộp thoại thêm/sửa dịch vụ dịch | `src/window/Config/pages/Service/Translate/ConfigModal/index.jsx` |
| OCR / giọng đọc bằng AI | `src/services/recognize/*_ai/`, `src/services/tts/{openai,elevenlabs,gemini}/`, phần dùng chung ở `src/services/_ai/` |
| Trình dịch AI (form chung, prompt mặc định) | `src/services/translate/_llm/`, từng hãng ở `deepseek/`, `claude/`, `openai/`, `geminipro/` |
| Bảng màu sáng/tối, màu nhấn (`primary`) | `tailwind.config.cjs` |
| Font chữ toàn app (`--app-font`) | `src/style.css` |
| Khung cửa sổ cài đặt, sidebar, kiểu các dòng cài đặt | `src/window/Config/style.css`, `src/window/Config/index.jsx`, `src/window/Config/components/SideBar/index.jsx` |
| Tên app | `productName` trong `src-tauri/tauri.conf.json` |
| Chữ trên giao diện | `src/i18n/locales/vi_VN.json` (tiếng Việt), `en_US.json` (tiếng Anh) |
| Phím tắt, khay hệ thống, cửa sổ (Rust) | `src-tauri/src/` |

Giao diện viết bằng React + Tailwind + NextUI. Phần hệ thống viết bằng Rust (Tauri 1).

Thêm một loại nút mới cho thanh: thêm vào `actions` trong `src/window/SelToolbar/index.jsx` và `ACTION_IDS` trong `src/window/Config/pages/Toolbar/index.jsx`. Thanh tự giãn theo số nút.

Thêm một hãng AI tương thích OpenAI: copy thư mục `src/services/translate/deepseek`, đổi địa chỉ và mô hình mặc định, rồi đăng ký ở `src/services/translate/index.jsx`, `src-tauri/src/config.rs` (`builtin_translate_list`) và file ngôn ngữ.

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
