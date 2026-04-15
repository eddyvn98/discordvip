import type { Request } from "express";
import { MembershipService } from "./membership-service.js";
import { CinemaAuthService } from "./cinema/cinema-auth-service.js";
import { CinemaChannelService } from "./cinema/cinema-channel-service.js";
import { CinemaItemService } from "./cinema/cinema-item-service.js";
import { CinemaMediaService } from "./cinema/cinema-media-service.js";
import { CinemaScanJobService } from "./cinema/cinema-scan-job-service.js";
import { CinemaStreamService } from "./cinema/cinema-stream-service.js";
import { CinemaViewService } from "./cinema/cinema-view-service.js";
import type { PlatformKey } from "./platform.js";
import type { CinemaSession, ListItemsForWebInput, TelegramChannelPostInput } from "./cinema/types.js";

export class CinemaService {
  public readonly authService: CinemaAuthService;
  public readonly channelService: CinemaChannelService;
  public readonly itemService: CinemaItemService;
  public readonly mediaService: CinemaMediaService;
  public readonly scanJobService: CinemaScanJobService;
  public readonly streamService: CinemaStreamService;
  public readonly viewService: CinemaViewService;

  constructor(private readonly membershipService: MembershipService) {
    this.authService = new CinemaAuthService(this.membershipService);
    this.channelService = new CinemaChannelService();
    this.viewService = new CinemaViewService();
    this.itemService = new CinemaItemService(this.viewService);
    this.mediaService = new CinemaMediaService();
    this.scanJobService = new CinemaScanJobService(this.mediaService, this.channelService);
    this.streamService = new CinemaStreamService();
  }

  // --- Auth & Session ---
  async createEntryUrl(input: { platform: "discord" | "telegram"; platformUserId: string; platformChatId: string; bypassVipCheck?: boolean }) {
    return this.authService.createEntryUrl(input);
  }
  async exchangeEntryTicket(session: CinemaSession, req: Request, token: string, telegramInitData?: string) {
    return this.authService.exchangeEntryTicket(session, req, token, telegramInitData);
  }
  async exchangeTelegramWebAppSession(session: CinemaSession, req: Request, telegramInitData: string) {
    return this.authService.exchangeTelegramWebAppSession(session, req, telegramInitData);
  }
  requireCinemaSession(req: Request) {
    return this.authService.requireCinemaSession(req);
  }

  // --- Channels ---
  async listChannels() {
    return this.channelService.listChannels();
  }
  async listChannelsForWeb() {
    return this.channelService.listChannelsForWeb();
  }
  async createOrUpdateChannel(input: { id?: string; platform: PlatformKey; sourceChannelId: string; role: "FULL_SOURCE" | "PREVIEW_STORAGE" | "POSTER_STORAGE"; displayName: string; slug: string; isEnabled: boolean }) {
    return this.channelService.createOrUpdateChannel(input);
  }
  async listAllChannels() {
    return this.channelService.listAllChannels();
  }
  async deleteChannel(id: string) {
    return this.channelService.deleteChannel(id);
  }
  async ensureTelegramStorageChannels() {
    return this.channelService.ensureTelegramStorageChannels();
  }

  // --- Items ---
  async listItems(channelId: string) {
    return this.itemService.listItems(channelId);
  }
  async listItemsForWeb(channelId: string, options?: ListItemsForWebInput) {
    return this.itemService.listItemsForWeb(channelId, options);
  }
  async listFeedItemsForWeb(input: { userKey?: string; limit?: number }) {
    return this.itemService.listFeedItemsForWeb(input);
  }
  async getItemForWeb(itemId: string) {
    return this.itemService.getItemForWeb(itemId);
  }
  async getTelegramSourceForItem(itemId: string) {
    return this.itemService.getTelegramSourceForItem(itemId);
  }
  async importTelegramChannelPost(input: TelegramChannelPostInput) {
    return this.itemService.importTelegramChannelPost(input);
  }

  // --- Views ---
  async markItemViewed(itemId: string, userKey: string) {
    return this.viewService.markItemViewed(itemId, userKey);
  }

  // --- Streaming & Links ---
  async getSignedPlaybackLinks(input: { itemId: string; userId: string }) {
    return this.streamService.getSignedPlaybackLinks(input);
  }
  async resolveStream(input: { itemId: string; kind: "full"; token: string }) {
    return this.streamService.resolveStream(input);
  }
  async resolveTelegramFile(fileId: string, rangeHeader?: string) {
    return this.streamService.resolveTelegramFile(fileId, rangeHeader);
  }

  // --- Scan Jobs ---
  async createScanJob(input: { channelId: string; requestedBy: string }) {
    return this.scanJobService.createScanJob(input);
  }
  async runScanJob(jobId: string, options?: { forceRegenerate?: boolean; autoEnsureStorage?: boolean }) {
    return this.scanJobService.runScanJob(jobId, options);
  }
  async listScanJobs(limit?: number) {
    return this.scanJobService.listScanJobs(limit);
  }

  // --- Media & Assets ---
  async refreshTelegramFullAssetFileIdByItemId(itemId: string) {
    return this.mediaService.refreshTelegramFullAssetFileIdByItemId(itemId);
  }
}
