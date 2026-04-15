import { env } from "../../config.js";
import type { TelegramApiClient } from "./api.js";
import type { TelegramBotCommand } from "./types.js";

export class TelegramCommandSync {
  adminCommandsSynced = new Set<string>();
  userCommandsSynced = new Set<string>();

  constructor(private apiClient: TelegramApiClient) {}

  getUserCommands(): TelegramBotCommand[] {
    return [
      { command: "start", description: "Bat dau va xem huong dan su dung" },
      { command: "webvip", description: "Mo web phim VIP" },
    ];
  }

  getAdminCommands(): TelegramBotCommand[] {
    return [
      { command: "adminstats", description: "Thong ke VIP (chi admin)" },
      { command: "admingrant", description: "Admin cong/tru VIP. Vi du: /admingrant 123456 30" },
      { command: "adminrevoke", description: "Admin thu hoi VIP. Vi du: /adminrevoke 123456" },
    ];
  }

  async syncCommands() {
    const userCommands = this.getUserCommands();
    const adminCommands = this.getAdminCommands();

    await this.apiClient.apiCall("setMyCommands", {
      commands: userCommands,
    });
    await this.apiClient.apiCall("setMyCommands", {
      commands: userCommands,
      scope: {
        type: "all_private_chats",
      },
    });

    for (const adminId of env.adminTelegramIds) {
      await this.syncAdminCommandsForUser(adminId, userCommands, adminCommands);
    }
  }

  async syncAdminCommandsForUser(
    userId: string,
    userCommands: TelegramBotCommand[],
    adminCommands: TelegramBotCommand[],
  ) {
    const id = Number(userId);
    if (!Number.isFinite(id)) {
      return;
    }

    await this.apiClient.apiCall("setMyCommands", {
      commands: [...userCommands, ...adminCommands],
      scope: {
        type: "chat",
        chat_id: id,
      },
    });
    this.adminCommandsSynced.add(String(id));
  }

  async syncUserCommandsForUser(userId: string, userCommands: TelegramBotCommand[]) {
    const id = Number(userId);
    if (!Number.isFinite(id)) {
      return;
    }

    await this.apiClient.apiCall("setMyCommands", {
      commands: userCommands,
      scope: {
        type: "chat",
        chat_id: id,
      },
    });
    this.userCommandsSynced.add(String(id));
  }
}
