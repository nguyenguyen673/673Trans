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

## Tính năng

**Thanh icon khi chọn chữ**
- Hiện cạnh con trỏ khi bôi đen chữ, nhấp đúp một từ, hoặc bấm Ctrl+A trong ô nhập.
- 5 nút bật/tắt được: Dịch, Dịch và thay thế (dán bản dịch đè lên đoạn đang chọn), Dịch và sao chép, Đọc to, Sao chép.
- Tuỳ chỉnh hướng ngang/dọc, chỉ biểu tượng/chỉ chữ/cả hai, độ lệch ngang và dọc, danh sách app không hiện thanh.

**Dịch bằng AI**
- Có sẵn DeepSeek, Claude, GPT, Gemini và "Tương thích OpenAI" (OpenRouter, Qwen, Kimi, SiliconFlow, LM Studio…).
- Nút nguồn cho từng dịch vụ: tắt thì dịch vụ vẫn hiện trong cửa sổ dịch nhưng chỉ dịch khi bạn mở thẻ của nó.

**OCR và giọng đọc**
- OCR bằng AI: DeepSeek, Gemini, GPT, Claude, tương thích OpenAI.
- Giọng đọc: ElevenLabs, OpenAI TTS, Gemini TTS, và **Local TTS** (server của riêng bạn: Edge, Piper offline, kho audio người thật; tự bật server ẩn khi cần).

**Cửa sổ dịch**
- Vị trí riêng cho văn bản nhập và văn bản chọn/ảnh chụp, ẩn vùng nhập hoặc thanh ngôn ngữ, tự chỉnh chiều cao theo nội dung, ghim mặc định, đóng khi mất tiêu điểm.

**Giao diện**
- Tiếng Việt, font Inter có sẵn trong app, màu chủ đạo chọn được, sáng/tối.

Mọi thứ khác của Pot giữ nguyên (dịch dịch vụ miễn phí, từ điển, plugin, lịch sử, sao lưu…). Bản này dùng chung cấu hình và plugin với Pot gốc nên **không chạy cùng lúc với Pot**.

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
