import { useEffect, useState, useMemo } from "react";
import { 
  Tv, 
  Plus, 
  Trash2, 
  Edit, 
  ShieldCheck, 
  Copy, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  X,
  Bot,
  Database,
  Eraser,
  Clock
} from "lucide-react";

import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import type {
  TelegramChannelVerificationCreateResponse,
  TelegramChannelVerificationItem,
  TelegramVipChannelItem,
  TelegramVipConfigResponse,
  TelegramVipPlan,
} from "../types";
import { datetime } from "../utils/format";
import { cn } from "@/lib/utils";

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
  const [showAddPanel, setShowAddPanel] = useState(false);
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

  const togglePlanCode = (planCode: string, isEdit = false) => {
    const setter = isEdit ? setEditForm : setForm;
    setter((current: any) => {
      if (!current) return current;
      return {
        ...current,
        planCodes: current.planCodes.includes(planCode)
          ? current.planCodes.filter((item: string) => item !== planCode)
          : [...current.planCodes, planCode],
      };
    });
  };

  const saveChannel = async (isEdit = false) => {
    const dataToSave = isEdit ? editForm : form;
    if (!dataToSave) return;
    
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await api.post<TelegramVipConfigResponse>("/api/admin/telegram-vip-channels", {
        ...dataToSave,
        chatId: dataToSave.chatId.trim(),
        title: dataToSave.title.trim(),
      });
      setPlans(result.plans);
      setChannels(result.channels);
      setVerifications(result.verifications ?? []);
      setMessage(isEdit ? "Đã cập nhật kênh." : "Đã thêm kênh mới.");
      setForm(emptyForm);
      setEditForm(null);
      setShowAddPanel(false);
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
        { requestedBy: "admin_web" }
      );
      setLatestToken(created.token);
      await load();
      setMessage(`Mã mới: ${created.token}`);
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
        {}
      );
      await load();
      setMessage(`Đã dọn dẹp ${result.deletedCount} mã xác thực hết hạn.`);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setCleaningExpired(false);
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!window.confirm("Xóa kênh này khỏi cấu hình?")) return;
    setError("");
    setMessage("");
    try {
      await api.post<TelegramVipConfigResponse>(
        `/api/admin/telegram-vip-channels/${channelId}/delete`
      );
      await load();
      setMessage("Đã xóa kênh.");
    } catch (value) {
      setError((value as Error).message);
    }
  };

  const copyText = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedToken(value);
    setTimeout(() => setCopiedToken(""), 2000);
  };

  const stats = useMemo(() => {
    return {
      total: channels.length,
      active: channels.filter(c => c.isActive).length,
      plans: plans.length
    };
  }, [channels, plans]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kênh Telegram VIP</h1>
          <p className="text-muted-foreground mt-1">Quản lý quyền truy cập và phân phối nội dung qua Telegram.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cleanupExpiredVerifications} disabled={cleaningExpired} className="gap-2">
            {cleaningExpired ? <RefreshCw size={16} className="animate-spin" /> : <Eraser size={16} />}
            Dọn mã hết hạn
          </Button>
          <Button onClick={() => setShowAddPanel(true)} className="gap-2">
            <Plus size={18} /> Thêm kênh mới
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng số kênh</CardTitle>
            <Tv className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Đang hoạt động</CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gói dịch vụ</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight">{stats.plans}</div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Workspace */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Bot size={28} />
            </div>
            <div>
              <CardTitle>Xác thực kênh tự động</CardTitle>
              <CardDescription>Bot tự nhận diện kênh qua mã token được tạo.</CardDescription>
            </div>
          </div>
          <Button onClick={createVerificationToken} disabled={creatingToken} variant="default" className="shadow-lg">
            {creatingToken ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />} Tạo mã mới
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {verifications.slice(0, 4).map(v => (
              <div key={v.token} className="p-4 bg-card rounded-lg border flex flex-col justify-between h-24 hover:border-primary/30 transition-colors group">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-primary text-lg tracking-wider">{v.token}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => copyText(v.token)}>
                    {copiedToken === v.token ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />}
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5 leading-none">
                  {v.usedAt ? (
                    <>
                      <CheckCircle2 size={10} className="text-green-500" />
                      <span className="truncate">Map: {v.verifiedChatTitle}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={10} className="text-primary/50" />
                      <span>Hết hạn: {datetime(v.expiresAt)}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
            {verifications.length === 0 && (
              <div className="col-span-full py-10 text-center flex flex-col items-center gap-3 grayscale opacity-40">
                <Bot size={40} strokeWidth={1} />
                <p className="text-xs font-medium italic">
                  Chưa có mã xác thực nào. Hãy bấm "Tạo mã" và gửi mã đó vào kênh Telegram.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map(channel => (
          <Card key={channel.id} className="flex flex-col group hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between pb-4">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary shrink-0 border group-hover:bg-primary/5 transition-colors">
                  <Tv size={24} />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-xl truncate leading-tight">{channel.title}</CardTitle>
                  <CardDescription className="font-mono text-[10px] mt-1 italic">ID: {channel.chatId}</CardDescription>
                </div>
              </div>
              <Badge variant={channel.isActive ? "default" : "destructive"} className="font-bold">
                {channel.isActive ? "ACTIVE" : "OFF"}
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 px-6">
              <div className="flex flex-wrap gap-2">
                {channel.planCodes.length > 0 ? channel.planCodes.map(code => (
                  <Badge key={code} variant="secondary" className="text-[10px] uppercase font-bold tracking-tight rounded-sm px-2">{code}</Badge>
                )) : <span className="text-[11px] text-muted-foreground italic font-medium">Chưa gán plan</span>}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 px-6 flex justify-between items-center bg-muted/20">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest tabular-nums">
                {datetime(channel.updatedAt)}
              </span>
              <div className="flex gap-1.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => setEditForm({ id: channel.id, chatId: channel.chatId, title: channel.title, isActive: channel.isActive, planCodes: channel.planCodes })}
                >
                  <Edit size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" onClick={() => deleteChannel(channel.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Side Panel Overlay */}
      {(showAddPanel || editForm) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => { setShowAddPanel(false); setEditForm(null); }}>
          <Card className="w-full max-w-lg h-full rounded-none border-l shadow-2xl animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between border-b p-8">
              <div>
                <CardTitle className="text-2xl font-black">{editForm ? "Chỉnh sửa kênh" : "Thêm kênh Telegram"}</CardTitle>
                <CardDescription>Cấu hình quyền truy cập và phân phối gói cước.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setShowAddPanel(false); setEditForm(null); }}><X size={24} /></Button>
            </CardHeader>
            <CardContent className="p-8 space-y-10 overflow-y-auto">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Tên hiển thị nội bộ</label>
                  <Input 
                    placeholder="Ví dụ: Cinema VIP #1" 
                    className="h-12 text-base font-semibold"
                    value={editForm ? editForm.title : form.title}
                    onChange={e => {
                      const setter = editForm ? setEditForm : setForm;
                      setter((curr: any) => ({ ...curr, title: e.target.value }));
                    }}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Telegram Chat ID</label>
                  <Input 
                    placeholder="-100..." 
                    className="h-12 font-mono"
                    value={editForm ? editForm.chatId : form.chatId}
                    onChange={e => {
                      const setter = editForm ? setEditForm : setForm;
                      setter((curr: any) => ({ ...curr, chatId: e.target.value }));
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Gói dịch vụ được phép truy cập</label>
                  <div className="grid grid-cols-2 gap-3">
                    {plans.map(plan => (
                      <label key={plan.code} className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        (editForm || form).planCodes.includes(plan.code) 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-transparent bg-muted/40 hover:bg-muted"
                      )}>
                        <input 
                          type="checkbox" 
                          className="rounded-full border-primary text-primary focus:ring-primary h-5 w-5"
                          checked={(editForm || form).planCodes.includes(plan.code)}
                          onChange={() => togglePlanCode(plan.code, !!editForm)}
                        />
                        <span className="text-sm font-black">{plan.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 px-1 pt-4">
                   <input 
                     type="checkbox" 
                     id="is_active_tg"
                     className="rounded-md border-primary text-primary focus:ring-primary h-5 w-5"
                     checked={(editForm || form).isActive}
                     onChange={e => {
                       const setter = editForm ? setEditForm : setForm;
                       setter((curr: any) => ({ ...curr, isActive: e.target.checked }));
                     }}
                   />
                   <label htmlFor="is_active_tg" className="text-base font-black cursor-pointer">Kênh đang hoạt động</label>
                </div>
              </div>

              <div className="pt-10 border-t">
                <Button className="w-full h-14 text-lg font-black uppercase tracking-tight shadow-xl shadow-primary/20" onClick={() => saveChannel(!!editForm)} disabled={saving}>
                  {saving && <RefreshCw className="mr-3 h-6 w-6 animate-spin" />}
                  {saving ? "Đang xử lý..." : (editForm ? "Cập nhật thay đổi" : "Kích hoạt kênh ngay")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications */}
      {message && <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-6 py-4 rounded-xl shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-6 flex items-center gap-3 font-bold border border-white/20">
        <CheckCircle2 size={20} />
        {message}
      </div>}
      {error && <div className="fixed bottom-6 right-6 bg-destructive text-destructive-foreground px-6 py-4 rounded-xl shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-6 flex items-center gap-3 font-bold border border-white/20">
        <AlertCircle size={20} />
        {error}
      </div>}
    </div>
  );
}
