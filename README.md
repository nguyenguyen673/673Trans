<img width="120px" src="public/icon.svg" align="left"/>

# 673Trans

> Trình dịch chọn-là-dịch cho Windows, bản fork cá nhân của [Pot](https://github.com/pot-app/pot-desktop): giao diện tiếng Việt gọn hiện đại, dịch bằng AI (DeepSeek, Claude, GPT, Gemini), OCR và giọng đọc AI, thanh icon nổi khi bôi đen chữ ở bất kỳ app nào.

![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![Tauri](https://img.shields.io/badge/Tauri-1.x-blue?logo=tauri)
![React](https://img.shields.io/badge/-React-61dafb?logo=react&logoColor=white)
![Rust](https://img.shields.io/badge/-Rust-orange?logo=rust&logoColor=white)
![Windows](https://img.shields.io/badge/-Windows-blue?logo=windows&logoColor=white)

<br/>
<hr/>

<table>
<tr>
    <td> <img src="asset/673trans-toolbar.png">
    <td> <img src="asset/673trans-translate-settings.png">
</table>

## Thêm gì so với Pot

Bảng dưới là những thứ **673Trans có mà Pot 3.0.7 gốc không có** (bản hiện tại: 3.18.1). Phần còn lại của Pot giữ nguyên.

| Nhóm | Tính năng thêm | Pot gốc |
|---|---|---|
| **Thanh icon nổi** | Hiện cạnh con trỏ khi bôi đen chữ, nhấp đúp một từ, hoặc Ctrl+A trong ô nhập, ở bất kỳ app nào | Không có |
| | 7 nút bật/tắt: Dịch, Dịch và thay thế (dán bản dịch đè lên đoạn chọn), Dịch và sao chép, Đọc to, Tra từ điển, Gõ từ, Sao chép | |
| | Kéo thả đổi thứ tự nút; ngang/dọc; chỉ icon/chỉ chữ/cả hai; độ lệch; danh sách app không hiện thanh; có ô xem trước | |
| **Dịch bằng AI** | DeepSeek, Claude, GPT, Gemini, "Tương thích OpenAI" (OpenRouter, Qwen, Kimi, SiliconFlow, LM Studio…) | Cần tự viết plugin |
| | Nút **Trau chuốt** và **Tóm tắt** ngay trong cửa sổ dịch (dịch vụ AI) | Không có |
| | Công tắc nguồn từng dịch vụ: tắt thì chỉ dịch khi bạn mở thẻ của nó | Không có |
| **Từ điển** | Popup từ điển gần con trỏ khi tô từ, kiểu Cambridge, có IPA UK/US | Không có |
| | 3 từ điển đổi bằng menu: **Anh–Việt offline** (103k từ, tra ngược Việt → Anh, gợi ý từ gần giống), **Wiktionary** (giọng ghi âm thật, câu ví dụ, lưu đệm), **Từ điển AI** | |
| | ⭐ lưu từ vào sổ từ vựng, 🕘 lịch sử tra từ, ô gõ từ (có phím tắt riêng), nút "Giải thích bằng AI" chạy khi bấm | |
| | Nhớ kích thước popup, tuỳ chọn giọng US bằng TTS, giọng US to hơn | |
| **OCR** | OCR bằng AI: DeepSeek, Gemini, GPT, Claude, tương thích OpenAI | Chỉ OCR có sẵn/plugin |
| **Giọng đọc** | ElevenLabs, OpenAI TTS, Gemini TTS, **Local TTS** (server riêng: Edge, Piper offline, kho audio người thật; tự bật server ẩn khi cần) | Chỉ Lingva + plugin |
| **Dịch vụ** | Công tắc bật/tắt cho mọi dịch vụ (dịch, OCR, giọng nói, từ điển, sổ từ vựng) không cần xoá; hộp thoại thêm dịch vụ có chọn hãng | Phải xoá/thêm lại |
| **Phím tắt** | Trang mới: bật/tắt tất cả, bật/tắt thanh trợ lý, dịch+chép / dịch+thay thế / đọc to vùng chọn, OCR+chép, dịch ảnh+chép, đổi cặp ngôn ngữ đích, tra từ điển, tra từ gõ tay | Ít phím hơn |
| **Cửa sổ dịch** | Vị trí riêng cho chữ nhập và chữ chọn/ảnh chụp, ẩn vùng nhập hoặc thanh ngôn ngữ, tự chỉnh chiều cao, ghim mặc định, đóng khi mất tiêu điểm; xem trước popup dịch | Không có |
| **Giao diện** | Tiếng Việt, font Inter có sẵn, màu chủ đạo chọn được, sáng/tối, cỡ chữ kéo theo từng px, các ô xem trước thu gọn sẵn, nhớ kích thước cửa sổ cài đặt | Giao diện gốc |
| **Khác** | Đổi tên 673Trans; tắt tự kiểm tra cập nhật (Pot đã ngừng cập nhật) | |

Bản này dùng chung cấu hình và plugin với Pot gốc nên **không chạy cùng lúc với Pot**.

## Cài đặt và build

Cần Node.js 18+, pnpm, Rust, và Visual Studio Build Tools (Desktop development with C++).

```
pnpm install
pnpm tauri dev      # chạy thử
pnpm tauri build    # ra bản cài đặt
```

Hướng dẫn chi tiết, chỗ sửa từng phần của giao diện và cách tự thêm hãng AI: xem [HUONG-DAN.md](HUONG-DAN.md).

## Ghi công và giấy phép

673Trans là bản fork của [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop) 3.0.7 (dự án gốc đã ngừng cập nhật), giữ nguyên giấy phép [GPL-3.0](LICENSE). Cảm ơn tác giả và những người đóng góp cho Pot.
