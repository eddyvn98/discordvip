import { useEffect, useState } from "react";

import { api } from "../api";
import { Table } from "../components/common/Table";
import type { PlanItem } from "../types";
import { datetime } from "../utils/format";

type EditState = Record<
  string,
  {
    name: string;
    amount: string;
    durationDays: string;
    isActive: boolean;
  }
>;

export function PlansPage() {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [editState, setEditState] = useState<EditState>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    amount: "39000",
    durationDays: "30",
    isActive: true,
  });

  const syncEditState = (plans: PlanItem[]) => {
    setEditState(
      Object.fromEntries(
        plans.map((plan) => [
          plan.id,
          {
            name: plan.name,
            amount: String(plan.amount),
            durationDays: String(plan.durationDays),
            isActive: plan.isActive,
          },
        ]),
      ),
    );
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<PlanItem[]>("/api/admin/plans");
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

  const createPlan = async () => {
    setCreateLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await api.post<PlanItem[]>("/api/admin/plans", {
        code: createForm.code,
        name: createForm.name,
        amount: Number(createForm.amount),
        durationDays: Number(createForm.durationDays),
        isActive: createForm.isActive,
      });
      setItems(data);
      syncEditState(data);
      setMessage("Đã tạo plan.");
      setCreateForm({
        code: "",
        name: "",
        amount: "39000",
        durationDays: "30",
        isActive: true,
      });
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  const updatePlan = async (id: string) => {
    const current = editState[id];
    if (!current) return;
    setSavingId(id);
    setError("");
    setMessage("");
    try {
      const data = await api.post<PlanItem[]>(`/api/admin/plans/${id}/update`, {
        name: current.name,
        amount: Number(current.amount),
        durationDays: Number(current.durationDays),
        isActive: current.isActive,
      });
      setItems(data);
      syncEditState(data);
      setMessage("Đã cập nhật plan.");
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setSavingId("");
    }
  };

  const deletePlan = async (id: string) => {
    if (
      !window.confirm(
        "Xóa plan này? Nếu plan đã có lịch sử order, hệ thống sẽ tự chuyển sang ngừng bán và gỡ mapping kênh Telegram.",
      )
    )
      return;
    setError("");
    setMessage("");
    try {
      const data = await api.post<PlanItem[]>(`/api/admin/plans/${id}/delete`);
      setItems(data);
      syncEditState(data);
      setMessage("Đã xử lý xóa plan (hoặc chuyển sang ngừng bán nếu plan có lịch sử order).");
    } catch (value) {
      setError((value as Error).message);
    }
  };

  const visibleItems = showInactive ? items : items.filter((item) => item.isActive);

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h1>Plan VIP</h1>
          <p>Thêm, sửa, xóa plan áp dụng chung cho cả bot Discord và Telegram.</p>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Hiện plan đã tắt
        </label>
      </div>

      <div className="manual-grant-panel">
        <div>
          <h2>Ghi chú quan trọng</h2>
          <p>Plan lưu ở đây là nguồn dùng chung cho mọi nền tảng.</p>
        </div>
        <div className="manual-grant-result">
          <p>1. Lưu plan xong là Discord và Telegram đều dùng ngay.</p>
          <p>2. Với Telegram, cần gán thêm plan vào kênh ở mục Kênh Telegram VIP.</p>
          <p>
            3. Khi bấm xóa plan đã có lịch sử order, hệ thống sẽ tự chuyển sang ngừng bán (isActive=false)
            để giữ lịch sử.
          </p>
        </div>
      </div>

      <div className="manual-grant-panel">
        <div>
          <h2>Thêm plan mới</h2>
          <p>Mã plan dùng cho bot, ví dụ: VIP_30_DAYS.</p>
        </div>
        <div className="promo-form-grid">
          <input
            value={createForm.code}
            onChange={(event) => setCreateForm((current) => ({ ...current, code: event.target.value }))}
            placeholder="Mã plan"
          />
          <input
            value={createForm.name}
            onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Tên plan hiển thị"
          />
          <input
            value={createForm.amount}
            onChange={(event) => setCreateForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder="Giá tiền (VND)"
            inputMode="numeric"
          />
          <input
            value={createForm.durationDays}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, durationDays: event.target.value }))
            }
            placeholder="Số ngày VIP"
            inputMode="numeric"
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(event) => setCreateForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Đang hoạt động
          </label>
          <button className="button" type="button" onClick={() => void createPlan()} disabled={createLoading}>
            {createLoading ? "Đang tạo..." : "Tạo plan"}
          </button>
        </div>
      </div>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <Table
          headers={["Code", "Tên", "Giá", "Ngày", "Trạng thái", "Cập nhật", "Thao tác"]}
          rows={visibleItems.map((item) => {
            const editor = editState[item.id];
            return [
              <strong>{item.code}</strong>,
              <input
                value={editor?.name ?? ""}
                onChange={(event) =>
                  setEditState((current) => ({
                    ...current,
                    [item.id]: {
                      ...(current[item.id] ?? {
                        name: item.name,
                        amount: String(item.amount),
                        durationDays: String(item.durationDays),
                        isActive: item.isActive,
                      }),
                      name: event.target.value,
                    },
                  }))
                }
              />,
              <input
                value={editor?.amount ?? ""}
                onChange={(event) =>
                  setEditState((current) => ({
                    ...current,
                    [item.id]: {
                      ...(current[item.id] ?? {
                        name: item.name,
                        amount: String(item.amount),
                        durationDays: String(item.durationDays),
                        isActive: item.isActive,
                      }),
                      amount: event.target.value,
                    },
                  }))
                }
                inputMode="numeric"
              />,
              <input
                value={editor?.durationDays ?? ""}
                onChange={(event) =>
                  setEditState((current) => ({
                    ...current,
                    [item.id]: {
                      ...(current[item.id] ?? {
                        name: item.name,
                        amount: String(item.amount),
                        durationDays: String(item.durationDays),
                        isActive: item.isActive,
                      }),
                      durationDays: event.target.value,
                    },
                  }))
                }
                inputMode="numeric"
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
                          name: item.name,
                          amount: String(item.amount),
                          durationDays: String(item.durationDays),
                          isActive: item.isActive,
                        }),
                        isActive: event.target.checked,
                      },
                    }))
                  }
                />
                Active
              </label>,
              datetime(item.updatedAt),
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => void updatePlan(item.id)}
                  disabled={savingId === item.id}
                >
                  Lưu
                </button>
                <button className="button secondary" type="button" onClick={() => void deletePlan(item.id)}>
                  Xóa
                </button>
              </div>,
            ];
          })}
        />
      )}
    </section>
  );
}
