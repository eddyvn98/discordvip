import { useEffect, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type {
  TelegramChannelVerificationCreateResponse,
  TelegramChannelVerificationItem,
  TelegramVipChannelItem,
  TelegramVipConfigResponse,
  TelegramVipPlan,
} from "../types";
import { datetime } from "../utils/format";

const emptyForm = {
  chatId: "",
  title: "",
  isActive: true,
  planCodes: [] as string[],
};

export function TelegramChannelsPage() {
  const [plans, setPlans] = useState<TelegramVipPlan[]>([]);
  const [channels, setChannels] = useState<TelegramVipChannelItem[]>([]);
  const [verifications, setVerifications] = useState<TelegramChannelVerificationItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState<(typeof emptyForm & { id: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [cleaningExpired, setCleaningExpired] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [latestToken, setLatestToken] = useState("");
  const [copiedToken, setCopiedToken] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<TelegramVipConfigResponse>("/api/admin/telegram-vip-config");
      setPlans(data.plans);
      setChannels(data.channels);
      setVerifications(data.verifications ?? []);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!editForm) {
      document.body.style.removeProperty("overflow");
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [editForm]);

  const togglePlanCode = (planCode: string) => {
    setForm((current) => ({
      ...current,
      planCodes: current.planCodes.includes(planCode)
        ? current.planCodes.filter((item) => item !== planCode)
        : [...current.planCodes, planCode],
    }));
  };

  const saveNewChannel = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await api.post<TelegramVipConfigResponse>("/api/admin/telegram-vip-channels", {
        chatId: form.chatId.trim(),
        title: form.title.trim(),
        isActive: form.isActive,
        planCodes: form.planCodes,
      });
      setPlans(data.plans);
      setChannels(data.channels);
      setVerifications(data.verifications ?? []);
      setMessage("Đã thêm kênh Telegram VIP.");
      setForm(emptyForm);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEditPlanCode = (planCode: string) => {
    setEditForm((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        planCodes: current.planCodes.includes(planCode)
          ? current.planCodes.filter((item) => item !== planCode)
          : [...current.planCodes, planCode],
      };
    });
  };

  const saveEditChannel = async () => {
    if (!editForm) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await api.post<TelegramVipConfigResponse>("/api/admin/telegram-vip-channels", {
        id: editForm.id,
        chatId: editForm.chatId.trim(),
        title: editForm.title.trim(),
        isActive: editForm.isActive,
        planCodes: editForm.planCodes,
      });
      setPlans(data.plans);
      setChannels(data.channels);
      setVerifications(data.verifications ?? []);
      setMessage("Đã cập nhật kênh Telegram VIP.");
      setEditForm(null);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const createVerificationToken = async () => {
    setCreatingToken(true);
    setError("");
    setMessage("");
    try {
      const created = await api.post<TelegramChannelVerificationCreateResponse>(
        "/api/admin/telegram-vip-verifications/create",
        {},
      );
      setLatestToken(created.token);
      await load();
      setMessage(`Đã tạo mã xác thực: ${created.token} (hết hạn lúc ${datetime(created.expiresAt)}).`);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setCreatingToken(false);
    }
  };

  const cleanupExpiredVerifications = async () => {
    setCleaningExpired(true);
    setError("");
    setMessage("");
    try {
      const result = await api.post<{ deletedCount: number }>(
        "/api/admin/telegram-vip-verifications/cleanup-expired",
        {},
      );
      await load();
      setMessage(`Đã dọn ${result.deletedCount} mã xác thực hết hạn.`);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setCleaningExpired(false);
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedToken(value);
      setMessage(`Đã copy: ${value}`);
      setTimeout(() => {
        setCopiedToken((current) => (current === value ? "" : current));
      }, 1400);
    } catch {
      setError("Không thể copy tự động. Hãy copy thủ công.");
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!window.confirm("Xóa kênh này khỏi cấu hình VIP?")) {
      return;
    }

    setError("");
    setMessage("");
    try {
      const data = await api.post<TelegramVipConfigResponse>(
        `/api/admin/telegram-vip-channels/${channelId}/delete`,
      );
      setPlans(data.plans);
      setChannels(data.channels);
      setVerifications(data.verifications ?? []);
      setMessage("Đã xóa kênh Telegram VIP.");
      if (editForm?.id === channelId) setEditForm(null);
    } catch (value) {
      setError((value as Error).message);
    }
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Kênh Telegram VIP</h1>
          <p>Quản lý kênh VIP Telegram và map plan trực tiếp trên admin web.</p>
        </div>
      </div>

      <div className="manual-grant-panel">
        <div>
          <h2>Xác thực kênh tự động</h2>
          <p>Khuyến nghị dùng mã xác thực thay vì nhập tay Chat ID.</p>
        </div>
        <div className="manual-grant-result">
          <p>1. Thêm bot làm admin trong kênh Telegram VIP của bạn.</p>
          <p>2. Quyền bắt buộc: Invite Users, Manage Join Requests, Ban/Restrict Users.</p>
          <p>3. Bấm nút Tạo mã xác thực bên dưới.</p>
          <p>4. Đăng chính mã đó lên kênh Telegram cần kết nối (1 tin nhắn bất kỳ).</p>
          <p>5. Bot tự map chat id + tên kênh vào hệ thống. Sau đó chỉ cần gán plan.</p>
          <button className="button" type="button" onClick={() => void createVerificationToken()} disabled={creatingToken}>
            {creatingToken ? "Đang tạo mã..." : "Tạo mã xác thực"}
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => void cleanupExpiredVerifications()}
            disabled={cleaningExpired}
            style={{ marginLeft: 8 }}
          >
            {cleaningExpired ? "Đang dọn..." : "Dọn mã hết hạn"}
          </button>
          {latestToken ? (
            <button
              className="button secondary"
              type="button"
              onClick={() => void copyText(latestToken)}
              style={{ marginLeft: 8 }}
            >
              {copiedToken === latestToken ? "Đã copy ✓" : "Copy mã mới nhất"}
            </button>
          ) : null}
        </div>
      </div>

      {verifications.length ? (
        <Table
          headers={["Mã xác thực", "Copy", "Trạng thái", "Kênh đã map", "Hết hạn", "Cập nhật"]}
          rows={verifications.map((item) => [
            item.token,
            <button className="button secondary" type="button" onClick={() => void copyText(item.token)}>
              {copiedToken === item.token ? "Đã copy ✓" : "Copy"}
            </button>,
            item.usedAt ? "Đã dùng" : new Date(item.expiresAt).getTime() > Date.now() ? "Còn hạn" : "Hết hạn",
            item.verifiedChatId ? `${item.verifiedChatTitle ?? "Telegram"} (${item.verifiedChatId})` : "-",
            datetime(item.expiresAt),
            datetime(item.updatedAt),
          ])}
        />
      ) : null}

      <div className="manual-grant-panel">
        <div>
          <h2>Thêm kênh</h2>
          <p>Bot cần là admin của kênh để tạo link mời, duyệt request và thu hồi user.</p>
        </div>
        <div className="promo-form-grid">
          <input
            value={form.chatId}
            onChange={(event) => setForm((current) => ({ ...current, chatId: event.target.value }))}
            placeholder="Chat ID (ví dụ: -1001234567890)"
          />
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Tên kênh hiển thị"
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Kênh hoạt động
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={{ margin: "0 0 8px" }}>Áp dụng cho plan:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {plans.map((plan) => (
                <label key={plan.code} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.planCodes.includes(plan.code)}
                    onChange={() => togglePlanCode(plan.code)}
                  />
                  {plan.name}
                </label>
              ))}
            </div>
          </div>
          <button className="button" type="button" onClick={() => void saveNewChannel()} disabled={saving}>
            {saving ? "Đang lưu..." : "Thêm kênh"}
          </button>
        </div>
      </div>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <Table
          headers={["Tên kênh", "Chat ID", "Plan áp dụng", "Trạng thái", "Cập nhật", "Thao tác"]}
          rows={channels.map((channel) => [
            channel.title,
            channel.chatId,
            channel.planCodes.length ? channel.planCodes.join(", ") : "Chưa gán plan",
            channel.isActive ? "Đang hoạt động" : "Đã tắt",
            datetime(channel.updatedAt),
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  setEditForm({
                    id: channel.id,
                    chatId: channel.chatId,
                    title: channel.title,
                    isActive: channel.isActive,
                    planCodes: channel.planCodes,
                  })
                }
              >
                Sửa
              </button>
              <button className="button secondary" type="button" onClick={() => void deleteChannel(channel.id)}>
                Xóa
              </button>
            </div>,
          ])}
        />
      )}

      {editForm ? (
        <div className="modal-backdrop">
          <div className="manual-grant-panel modal-panel">
            <div>
              <h2>Chỉnh sửa kênh</h2>
              <p>Sửa cấu hình ngay tại đây rồi bấm Lưu cập nhật.</p>
            </div>
            <div className="promo-form-grid modal-grid">
              <input
                value={editForm.chatId}
                onChange={(event) =>
                  setEditForm((current) => (current ? { ...current, chatId: event.target.value } : current))
                }
                placeholder="Chat ID (ví dụ: -1001234567890)"
              />
              <input
                value={editForm.title}
                onChange={(event) =>
                  setEditForm((current) => (current ? { ...current, title: event.target.value } : current))
                }
                placeholder="Tên kênh hiển thị"
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current ? { ...current, isActive: event.target.checked } : current,
                    )
                  }
                />
                Kênh hoạt động
              </label>
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ margin: "0 0 8px" }}>Áp dụng cho plan:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {plans.map((plan) => (
                    <label key={plan.code} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={editForm.planCodes.includes(plan.code)}
                        onChange={() => toggleEditPlanCode(plan.code)}
                      />
                      {plan.name}
                    </label>
                  ))}
                </div>
              </div>
              <button className="button" type="button" onClick={() => void saveEditChannel()} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu cập nhật"}
              </button>
              <button className="button secondary" type="button" onClick={() => setEditForm(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
