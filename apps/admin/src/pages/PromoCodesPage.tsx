import { useEffect, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type { CreatePromoCodeInput, PromoCodeItem, UpdatePromoCodeInput } from "../types";
import { datetime } from "../utils/format";

function generatePromoCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomPart = Array.from({ length: 8 }, () => {
    const index = Math.floor(Math.random() * alphabet.length);
    return alphabet[index];
  }).join("");

  return `VIP-${randomPart}`;
}

function toLocalDateTimeValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  if (!value.trim()) {
    return null;
  }
  return new Date(value).toISOString();
}

type EditState = Record<
  string,
  {
    label: string;
    durationDays: string;
    maxUses: string;
    expiresAt: string;
    isActive: boolean;
  }
>;

export function PromoCodesPage() {
  const [items, setItems] = useState<PromoCodeItem[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    label: "",
    durationDays: "30",
    maxUses: "1",
    expiresAt: "",
    isActive: true,
  });
  const [editState, setEditState] = useState<EditState>({});

  const syncEditState = (promoCodes: PromoCodeItem[]) => {
    setEditState(
      Object.fromEntries(
        promoCodes.map((item) => [
          item.id,
          {
            label: item.label,
            durationDays: String(item.durationDays),
            maxUses: String(item.maxUses),
            expiresAt: toLocalDateTimeValue(item.expiresAt),
            isActive: item.isActive,
          },
        ]),
      ),
    );
  };

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api.get<PromoCodeItem[]>("/api/admin/promo-codes");
      setItems(data);
      syncEditState(data);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const copyCode = async (code: string) => {
    if (!code.trim()) {
      setError("Chưa có mã để copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setError("");
      setMessage(`Đã copy mã: ${code}`);
    } catch {
      setError("Không thể copy mã khuyến mãi.");
    }
  };

  const fillAutoCode = () => {
    setCreateForm((current) => ({
      ...current,
      code: generatePromoCode(),
    }));
  };

  const createPromoCode = async () => {
    setError("");
    setMessage("");
    setCreateLoading(true);

    try {
      const payload: CreatePromoCodeInput = {
        code: createForm.code,
        label: createForm.label,
        durationDays: Number(createForm.durationDays),
        maxUses: Number(createForm.maxUses),
        expiresAt: toIsoOrNull(createForm.expiresAt),
        isActive: createForm.isActive,
      };
      await api.post("/api/admin/promo-codes", payload);
      setMessage("Đã tạo mã khuyến mãi.");
      setCreateForm({
        code: "",
        label: "",
        durationDays: "30",
        maxUses: "1",
        expiresAt: "",
        isActive: true,
      });
      await load();
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  const updatePromoCode = async (id: string) => {
    const current = editState[id];
    if (!current) {
      return;
    }

    setError("");
    setMessage("");
    setSavingId(id);

    try {
      const payload: UpdatePromoCodeInput = {
        label: current.label,
        durationDays: Number(current.durationDays),
        maxUses: Number(current.maxUses),
        expiresAt: toIsoOrNull(current.expiresAt),
        isActive: current.isActive,
      };
      await api.post(`/api/admin/promo-codes/${id}/update`, payload);
      setMessage("Đã cập nhật mã khuyến mãi.");
      await load();
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setSavingId("");
    }
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Mã khuyến mãi</h1>
          <p>Tạo và quản lý mã redeem VIP cho người dùng Discord.</p>
        </div>
      </div>

      <div className="manual-grant-panel">
        <div>
          <h2>Tạo mã mới</h2>
          <p>Nhập mã, số ngày VIP, số lượt dùng và hạn dùng nếu cần.</p>
        </div>
        <div className="promo-form-grid">
          <div className="promo-code-field">
            <input
              value={createForm.code}
              onChange={(event) => setCreateForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="Mã khuyến mãi"
            />
            <button className="button secondary" type="button" onClick={fillAutoCode}>
              Tạo mã tự động
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => void copyCode(createForm.code)}
            >
              Copy
            </button>
          </div>
          <input
            value={createForm.label}
            onChange={(event) => setCreateForm((current) => ({ ...current, label: event.target.value }))}
            placeholder="Nhãn quản trị"
          />
          <input
            value={createForm.durationDays}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, durationDays: event.target.value }))
            }
            placeholder="Số ngày VIP"
            inputMode="numeric"
          />
          <input
            value={createForm.maxUses}
            onChange={(event) => setCreateForm((current) => ({ ...current, maxUses: event.target.value }))}
            placeholder="Số lượt dùng"
            inputMode="numeric"
          />
          <input
            type="datetime-local"
            value={createForm.expiresAt}
            onChange={(event) => setCreateForm((current) => ({ ...current, expiresAt: event.target.value }))}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(event) => setCreateForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Đang hoạt động
          </label>
          <button className="button" type="button" onClick={() => void createPromoCode()} disabled={createLoading}>
            {createLoading ? "Đang tải..." : "Tạo mã"}
          </button>
        </div>
      </div>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <Table
          headers={[
            "Mã",
            "Nhãn",
            "Ngày VIP",
            "Lượt dùng",
            "Hết hạn",
            "Trạng thái",
            "Tạo lúc",
            "Cập nhật",
          ]}
          rows={items.map((item) => {
            const editor = editState[item.id];
            return [
              <div className="promo-list-code">
                <strong>{item.code}</strong>
                <button
                  className="button secondary promo-copy-button"
                  type="button"
                  onClick={() => void copyCode(item.code)}
                >
                  Copy
                </button>
              </div>,
              <input
                value={editor?.label ?? ""}
                onChange={(event) =>
                  setEditState((current) => ({
                    ...current,
                    [item.id]: {
                      ...(current[item.id] ?? {
                        label: "",
                        durationDays: "",
                        maxUses: "",
                        expiresAt: "",
                        isActive: false,
                      }),
                      label: event.target.value,
                    },
                  }))
                }
              />,
              <input
                value={editor?.durationDays ?? ""}
                onChange={(event) =>
                  setEditState((current) => ({
                    ...current,
                    [item.id]: {
                      ...(current[item.id] ?? {
                        label: "",
                        durationDays: "",
                        maxUses: "",
                        expiresAt: "",
                        isActive: false,
                      }),
                      durationDays: event.target.value,
                    },
                  }))
                }
                inputMode="numeric"
              />,
              <div className="promo-usage-cell">
                <input
                  value={editor?.maxUses ?? ""}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      [item.id]: {
                        ...(current[item.id] ?? {
                          label: "",
                          durationDays: "",
                          maxUses: "",
                          expiresAt: "",
                          isActive: false,
                        }),
                        maxUses: event.target.value,
                      },
                    }))
                  }
                  inputMode="numeric"
                />
                <span>{`Đã dùng ${item.usedCount}`}</span>
              </div>,
              <input
                type="datetime-local"
                value={editor?.expiresAt ?? ""}
                onChange={(event) =>
                  setEditState((current) => ({
                    ...current,
                    [item.id]: {
                      ...(current[item.id] ?? {
                        label: "",
                        durationDays: "",
                        maxUses: "",
                        expiresAt: "",
                        isActive: false,
                      }),
                      expiresAt: event.target.value,
                    },
                  }))
                }
              />,
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={editor?.isActive ?? false}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      [item.id]: {
                        ...(current[item.id] ?? {
                          label: "",
                          durationDays: "",
                          maxUses: "",
                          expiresAt: "",
                          isActive: false,
                        }),
                        isActive: event.target.checked,
                      },
                    }))
                  }
                />
                {editor?.isActive ? "Đang bật" : "Tắt"}
              </label>,
              `${datetime(item.createdAt)}${item.expiresAt ? `\nHết hạn: ${datetime(item.expiresAt)}` : "\nKhông hết hạn"}`,
              <button
                className="button secondary"
                type="button"
                onClick={() => void updatePromoCode(item.id)}
                disabled={savingId === item.id}
              >
                {savingId === item.id ? "Đang tải..." : "Lưu"}
              </button>,
            ];
          })}
        />
      )}
    </section>
  );
}
