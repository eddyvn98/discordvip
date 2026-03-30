import { TelegramBotCommand } from "./telegram-types.js";

export function getTelegramUserCommands(): TelegramBotCommand[] {
  return [
    { command: "start", description: "Mở Home menu bằng nút" },
    { command: "menu", description: "Mở lại Home menu" },
  ];
}

export function getTelegramAdminCommands(): TelegramBotCommand[] {
  return [
    { command: "adminstats", description: "Thống kê VIP (chỉ admin)" },
    { command: "admingrant", description: "Admin cộng/trừ VIP. Ví dụ: /admingrant 123456 30" },
    { command: "adminrevoke", description: "Admin thu hồi VIP. Ví dụ: /adminrevoke 123456" },
  ];
}
