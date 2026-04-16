import { useEffect, useRef, useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  UserPlus, 
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Clock,
  X,
  Tv,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import type { DiscordLookupResult, MembershipItem } from "../types";
import { datetime, formatPlatformUser } from "../utils/format";
import { cn } from "@/lib/utils";

const MEMBERSHIP_DESC = "Quản trị thành viên VIP: xem, tìm kiếm, điều chỉnh hạn và thu hồi VIP.";
const SEARCH_PLACEHOLDER = "Tìm theo ID, tên, trạng thái hoặc nguồn...";
const MSG_REVOKED = "Đã thu hồi VIP thành công.";
const MSG_GRANTED = "Đã cấp/điều chỉnh VIP thành công.";
const MSG_LOADING = "Đang xử lý...";
const CACHE_PREFIX = "memberships-cache-v1";

export function MembershipsPage() {
  const [items, setItems] = useState<MembershipItem[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<"discord" | "telegram" | "all">("discord");
  const [manualDiscordUserId, setManualDiscordUserId] = useState("");
  const [manualDurationDays, setManualDurationDays] = useState("30");
  const [grantLoading, setGrantLoading] = useState(false);
  const [showManualTools, setShowManualTools] = useState(false);
  const [rowAdjustDays, setRowAdjustDays] = useState<Record<string, string>>({});
  const [editingMembershipId, setEditingMembershipId] = useState<string>("");
  const requestRef = useRef(0);

  const editingMembership = items.find((item) => item.id === editingMembershipId) ?? null;

  const stats = useMemo(() => {
    const active = items.filter(i => i.status === "ACTIVE").length;
    const expired = items.filter(i => i.status === "EXPIRED").length;
    return { active, expired, total: items.length };
  }, [items]);

  const load = async (query = "") => {
    setError("");
    setLoading(true);
    const requestId = ++requestRef.current;
    
    // API backend checks for names=1 or names=true literal string
    const buildPath = (includeNames: boolean) =>
      query.trim()
        ? `/api/admin/memberships/search?q=${encodeURIComponent(query.trim())}&platform=${platform}&names=${includeNames ? "1" : "0"}`
        : `/api/admin/memberships?platform=${platform}&names=${includeNames ? "1" : "0"}`;

    try {
      const fastData = await api.get<MembershipItem[]>(buildPath(false));
      if (requestRef.current !== requestId) return;
      setItems(fastData);
      
      const namedData = await api.get<MembershipItem[]>(buildPath(true));
      if (requestRef.current !== requestId) return;
      setItems(namedData);
    } catch (value) {
      if (requestRef.current === requestId) setError((value as Error).message);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  };

  // Load from cache on mount/platform change
  useEffect(() => {
    const cached = localStorage.getItem(`${CACHE_PREFIX}-${platform}`);
    if (cached) {
      try {
        setItems(JSON.parse(cached));
      } catch (e) {
        localStorage.removeItem(`${CACHE_PREFIX}-${platform}`);
      }
    }
  }, [platform]);

  // Save to cache when items change (and NO search active)
  useEffect(() => {
    if (items.length > 0 && !search.trim()) {
      localStorage.setItem(`${CACHE_PREFIX}-${platform}`, JSON.stringify(items));
    }
  }, [items, platform, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load(search);
    }, search.trim() ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [search, platform]);

  // NEW: Manual grant for NEW users
  const handleManualGrant = async () => {
    if (!manualDiscordUserId.trim()) {
      setError("Vui lòng nhập Discord User ID.");
      return;
    }
    const durationDays = Number(manualDurationDays);
    if (isNaN(durationDays) || durationDays === 0) {
      setError("Số ngày không hợp lệ.");
      return;
    }

    setGrantLoading(true);
    setError("");
    setMessage("");
    try {
      await api.post("/api/admin/memberships/manual-grant", {
        discordUserId: manualDiscordUserId.trim(),
        durationDays
      });
      setMessage(MSG_GRANTED);
      setManualDiscordUserId("");
      await load(search);
    } catch (value) {
      setError((value as Error).message);
    } finally {
      setGrantLoading(false);
    }
  };

  // Adjust EXISTING membership
  const handleAdjustMembership = async (membershipId: string) => {
    const durationDays = Number(rowAdjustDays[membershipId] ?? "30");
    if (isNaN(durationDays) || durationDays === 0) {
      setError("Số ngày điều chỉnh không hợp lệ.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await api.post(`/api/admin/memberships/${membershipId}/adjust`, { durationDays });
      setMessage(MSG_GRANTED);
      setEditingMembershipId("");
      await load(search);
    } catch (value) {
      setError((value as Error).message);
    }
  };

  const handleRevokeMembership = async (membershipId: string) => {
    if (!confirm("Bạn có chắc chắn muốn thu hồi quyền VIP của người dùng này?")) return;
    setError("");
    setMessage("");
    try {
      await api.post(`/api/admin/memberships/${membershipId}/revoke`);
      setMessage(MSG_REVOKED);
      setEditingMembershipId("");
      await load(search);
    } catch (value) {
      setError((value as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Thành viên VIP</h1>
          <p className="text-muted-foreground mt-1">{MEMBERSHIP_DESC}</p>
        </div>
        <Button variant="outline" onClick={() => setShowManualTools(!showManualTools)} className="gap-2">
          <UserPlus size={18} />
          {showManualTools ? "Ẩn công cụ" : "Cấp VIP thủ công"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng thành viên</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Đã hết hạn</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-destructive">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tools */}
      {showManualTools && (
        <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-4">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Discord User ID</label>
                <Input 
                  placeholder="Nhập ID người dùng..." 
                  value={manualDiscordUserId}
                  onChange={e => setManualDiscordUserId(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="w-full sm:w-32 space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Số ngày</label>
                <Input 
                  placeholder="30" 
                  type="number"
                  value={manualDurationDays}
                  onChange={e => setManualDurationDays(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleManualGrant} disabled={grantLoading} className="h-9">
                  {grantLoading ? MSG_LOADING : "Cấp VIP ngay"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Area */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
           <div className="flex flex-row items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={SEARCH_PLACEHOLDER}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <select 
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={platform}
              onChange={e => setPlatform(e.target.value as any)}
            >
              <option value="discord">Discord</option>
              <option value="telegram">Telegram</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          {loading && <RefreshCw size={16} className="animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-6">Người dùng</TableHead>
                <TableHead>Nền tảng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời hạn</TableHead>
                <TableHead className="text-right pr-6">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="group transition-colors">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-accent flex items-center justify-center font-bold text-accent-foreground border shadow-sm">
                        {item.discordDisplayName?.[0]?.toUpperCase() || item.platform[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{item.discordDisplayName || item.platformUserId}</div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate italic">ID: {item.platformUserId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{item.platform}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "ACTIVE" ? "default" : "destructive"} className="text-[10px] font-bold">
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
                        <Calendar size={12} className="text-primary/70" />
                        {datetime(item.expireAt)}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">Cấp: {datetime(item.createdAt)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setRowAdjustDays(curr => ({ ...curr, [item.id]: "30" }));
                        setEditingMembershipId(item.id);
                      }}
                    >
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {items.length === 0 && !loading && (
            <div className="py-24 text-center flex flex-col items-center gap-4 grayscale opacity-40">
              <Users size={64} strokeWidth={1} />
              <p className="text-sm font-medium">Không tìm thấy thành viên nào phù hợp.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side Panel Overlay */}
      {editingMembership && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setEditingMembershipId("")}>
          <Card className="w-full max-w-md h-full rounded-none border-l shadow-2xl animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-6">
              <div>
                <CardTitle className="text-xl">Quản trị Hội viên</CardTitle>
                <CardDescription>ID: {editingMembership.id}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setEditingMembershipId("")}><X size={20} /></Button>
            </CardHeader>
            <CardContent className="p-8 space-y-8 overflow-y-auto">
              {/* User Identity */}
              <div className="p-6 rounded-xl bg-accent/30 border flex items-center gap-4">
                 <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                    {editingMembership.discordDisplayName?.[0]?.toUpperCase() || editingMembership.platform[0].toUpperCase()}
                 </div>
                 <div className="min-w-0">
                    <p className="font-black text-lg truncate leading-tight">{editingMembership.discordDisplayName || "Chưa rõ tên"}</p>
                    <p className="text-sm text-muted-foreground font-medium">{editingMembership.platform.toUpperCase()} User</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1 tabular-nums">PID: {editingMembership.platformUserId}</p>
                 </div>
              </div>

              {/* Stats / Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-card border shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Nguồn cấp</p>
                  <p className="text-sm font-bold">{editingMembership.source}</p>
                </div>
                <div className="p-4 rounded-lg bg-card border shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Trạng thái</p>
                  <Badge variant={editingMembership.status === "ACTIVE" ? "default" : "destructive"}>{editingMembership.status}</Badge>
                </div>
              </div>

              {/* Adjust Section */}
              <div className="space-y-4 pt-4">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Clock size={16} className="text-primary" />
                  Gia hạn / Thu hồi ngày VIP
                </h4>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={rowAdjustDays[editingMembership.id] || "30"}
                    onChange={e => setRowAdjustDays(curr => ({ ...curr, [editingMembership.id]: e.target.value }))}
                    className="flex-1 h-11 text-lg font-bold"
                  />
                  <Button onClick={() => void handleAdjustMembership(editingMembership.id)} className="h-11 px-6 font-bold">Lưu</Button>
                </div>
                <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                   * Nhập số dương (+) để cộng thêm ngày, số âm (-) để trừ bớt ngày VIP hiện tại của người dùng.
                </p>
              </div>

              {/* Revoke Section */}
              <div className="pt-10 mt-10 border-t space-y-4">
                <h4 className="text-xs font-black text-destructive uppercase tracking-widest">Khu vực nguy hiểm</h4>
                <Button 
                  variant="destructive" 
                  className="w-full h-12 font-bold uppercase tracking-tight"
                  onClick={() => void handleRevokeMembership(editingMembership.id)}
                >
                  Thu hồi toàn bộ quyền VIP
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Hành động này sẽ hủy hiệu lực VIP ngay lập tức và không thể hoàn tác.
                </p>
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

// Helper icons missed in copy-paste
function RefreshCw(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round" 
      {...props}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
