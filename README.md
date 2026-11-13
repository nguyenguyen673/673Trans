<img width="120px" src="public/icon.png" align="left"/>

# 673Trans

>Trình dịch chọn-là-dịch cho Windows: giao diện tiếng Anh/Việt gọn hiện đại, Sử dụng nhiều dịch mặc định như Google, Bing và các dịch vụ tích hợp bằng AI (DeepSeek, Claude, GPT, Gemini...), Có sẵn từ điển Anh–Việt, voice US/UK, OCR và giọng đọc AI, thanh icon nổi khi bôi đen chữ ở bất kỳ app nào có khả năng dịch, viết lại, chữa chính tả, đọc, tra từ điển, bookmark...

![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![React](https://img.shields.io/badge/-React-61dafb?logo=react&logoColor=white)
![Rust](https://img.shields.io/badge/-Rust-orange?logo=rust&logoColor=white)
![Windows](https://img.shields.io/badge/-Windows-blue?logo=windows&logoColor=white)

<br/>

<p align="center">
  <a href="https://github.com/nguyenguyen673/673Trans/releases/latest"><img src="https://img.shields.io/badge/%E2%AC%87%20T%E1%BA%A3i%20673Trans%20(.exe)-Releases-bff03a?style=for-the-badge&labelColor=0b2a12" alt="Tải 673Trans"/></a>
</p>
<p align="center"><a href="https://github.com/nguyenguyen673/673Trans/releases/download/v3.27.1/673Trans-3.27.1.exe">Tải trực tiếp 673Trans-3.27.1.exe</a> &middot; <a href="https://github.com/nguyenguyen673/673Trans/releases">Tất cả bản phát hành</a></p>
<p align="center">Windows 10/11 &middot; Chỉ cần 1 file <code>.exe</code>, Không cần cài thêm gì &middot; Phiên bản hiện tại: 3.27.1</p>

<hr/>

## Tính năng

### Thanh icon nổi khi chọn chữ

<img src="asset/ui-toolbar-v2.png" align="right" width="520"/>

- Hiện cạnh con trỏ khi bôi đen chữ, nhấp đúp một từ, hoặc bấm Ctrl+A trong ô nhập, ở bất kỳ app nào.
- 7 nút bật/tắt được: Dịch, Dịch và thay thế (dán bản dịch đè lên đoạn đang chọn), Dịch và sao chép, Đọc to, Tra từ điển, Gõ từ, Sao chép.
- Kéo thả đổi thứ tự nút; ngang/dọc; chỉ icon, chỉ chữ hoặc cả hai; độ lệch; danh sách app không hiện thanh; có ô **Xem trước** ngay trong cài đặt.

<br clear="right"/>

### Dịch bằng AI: Trau chuốt, Viết lại / chính tả, Tóm tắt

Có sẵn DeepSeek, Claude, GPT, Gemini và "Tương thích OpenAI" (OpenRouter, Qwen, Kimi, SiliconFlow, LM Studio…). Ngay dưới ô nhập của cửa sổ dịch có 3 nút chế độ; bấm một nút để AI xử lý đoạn đang chọn, bấm lại để quay về dịch thường. Ba chế độ chỉ chạy với dịch vụ AI (Google, Bing… sẽ báo không hỗ trợ).


<table>
<tr>
<td width="65%" align="center"><img src="asset/ui-mode-rewrite.png" width="560"/></td>
<td valign="middle">

**Trau chuốt**<br/>
Viết lại cho tự nhiên, mượt, chuyên nghiệp; giữ nguyên ý và ngôn ngữ. Hợp để chỉnh email, bài đăng.

**Viết lại, chính tả** (ảnh bên)<br/>
Sửa lỗi chính tả, ngữ pháp, dấu câu; giữ giọng văn và độ dài, ít can thiệp hơn Trau chuốt.

**Tóm tắt**<br/>
Rút gọn đoạn dài thành vài ý chính, ngắn gọn dễ đọc.

</td>
</tr>
</table>

Công tắc nguồn cho từng dịch vụ: tắt thì chỉ dịch khi bạn mở thẻ của nó.

### Từ điển

<img src="asset/ui-dict.png" align="right" width="300"/>

Tô một từ, bấm icon quyển sách hoặc dùng phím tắt.

- Popup kiểu Cambridge hiện cạnh con trỏ, có phiên âm IPA và nút loa phát giọng **UK** và **US** (ảnh minh hoạ: Wiktionary).
- 3 từ điển, đổi bằng menu: **Anh–Việt offline** (103k từ, **đã nhúng sẵn trong exe**, tra ngược Việt → Anh, gợi ý từ gần giống), **Wiktionary** (giọng ghi âm thật, định nghĩa, câu ví dụ, lưu đệm), **Từ điển AI** (chọn hãng DeepSeek, OpenAI, Claude, Gemini hoặc tương thích OpenAI, nhập khoá API riêng).
- ⭐ lưu từ vào sổ từ vựng, 🕘 lịch sử tra từ, ô gõ từ (có phím tắt riêng), nút "Giải thích bằng AI" chạy khi bấm.
- Nhớ kích thước popup; tuỳ chọn đọc giọng US bằng TTS.

<br clear="right"/>

### Dịch vụ, OCR và giọng đọc

Dịch, OCR và giọng nói đều có sẵn các hãng AI (DeepSeek, Claude, GPT/OpenAI, Gemini, tương thích OpenAI), bật/tắt và sắp xếp thứ tự bằng kéo thả:

<img src="asset/ui-services-v2.png" width="560"/>

- Công tắc bật/tắt cho mọi dịch vụ (dịch, OCR, giọng nói, từ điển, sổ từ vựng) mà không cần xoá. Mặc định bật Google và Bing.
- Có sẵn và bật sẵn: OCR của Windows (System) và **Tesseract** (dữ liệu tiếng Anh, Việt, Trung đã nhúng trong exe, chạy offline). OCR bằng AI: DeepSeek, Gemini, GPT, Claude, tương thích OpenAI.
- Giọng đọc: ElevenLabs, OpenAI TTS, Gemini TTS, và **Local TTS**: giọng Edge neural **có sẵn trong exe** (cần mạng, không cần cài gì); ai có server riêng thì dùng thêm Piper offline và kho audio người thật.

### Phím tắt

<img src="asset/ui-hotkeys-v2.png" width="620"/>

- Bật/tắt tất cả, bật/tắt thanh trợ lý, dịch và chép, dịch và thay thế, đọc to vùng chọn, OCR và chép, dịch ảnh và chép, đổi cặp ngôn ngữ đích, tra từ điển, tra từ gõ tay.
- Nút icon gọn: bấm để gán phím, ✕ để huỷ, thùng rác để xoá; rê chuột để xem chú thích.

### Cửa sổ dịch và giao diện

- Vị trí riêng cho chữ nhập và chữ chọn/ảnh chụp, ẩn vùng nhập hoặc thanh ngôn ngữ, tự chỉnh chiều cao, ghim mặc định, đóng khi mất tiêu điểm.
- Tiếng Việt, font Inter có sẵn, màu chủ đạo chọn được, sáng/tối, cỡ chữ kéo theo từng px, nhớ kích thước cửa sổ.

### Tự cập nhật

<img src="asset/ui-update.png" align="right" width="300"/>

Khi mở app, tự kiểm tra bản mới trên [Releases](https://github.com/nguyenguyen673/673Trans/releases); bấm Cập nhật là tự tải, thay file và mở lại.

<br clear="right"/>

Chỉ cần file `.exe` để chạy (Windows 10/11 có WebView2). Wiktionary và các dịch vụ AI cần internet; dịch vụ AI cần khoá API của bạn.

## Cài đặt và build

Cần Node.js 18+, pnpm, Rust, và Visual Studio Build Tools (Desktop development with C++).

```
pnpm install
pnpm tauri dev      # chạy thử
pnpm tauri build    # ra bản cài đặt
```

Hướng dẫn chi tiết, chỗ sửa từng phần của giao diện và cách tự thêm hãng AI: xem [HUONG-DAN.md](HUONG-DAN.md).

## Ghi công và giấy phép

673Trans là bản fork của [Pot](https://github.com/pot-app/pot-desktop) 3.0.7 (dự án gốc đã ngừng cập nhật), giữ nguyên giấy phép [GPL-3.0](LICENSE). Cảm ơn tác giả và những người đóng góp cho Pot. Bản này dùng chung cấu hình và plugin với Pot nên **không chạy cùng lúc với Pot**.

Dữ liệu từ điển Anh–Việt offline là của [Dự án Từ điển tiếng Việt miễn phí](https://www.informatik.uni-leipzig.de/~duc/Dict/) (Hồ Ngọc Đức); Wiktionary thuộc Wikimedia Foundation, nội dung theo CC BY-SA, dữ liệu trích qua [kaikki.org](https://kaikki.org).
