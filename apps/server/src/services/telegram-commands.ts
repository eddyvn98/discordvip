import { TelegramBotCommand } from "./telegram-types.js";

export function getTelegramUserCommands(): TelegramBotCommand[] {
  return [
    { command: "start", description: "Bat dau va xem huong dan su dung" },
    { command: "invite", description: "Mo menu referral bang nut" },
    { command: "donate", description: "Chon goi VIP 39k / 99k / 199k" },
    { command: "trialvip", description: "Kich hoat VIP trial (1 lan/30 ngay)" },
    { command: "vipstatus", description: "Xem trang thai VIP hien tai" },
  ];
}

export function getTelegramAdminCommands(): TelegramBotCommand[] {
  return [
    { command: "adminstats", description: "Thong ke VIP (chi admin)" },
    { command: "admingrant", description: "Admin cong/tru VIP. Vi du: /admingrant 123456 30" },
    { command: "adminrevoke", description: "Admin thu hoi VIP. Vi du: /adminrevoke 123456" },
  ];
}
