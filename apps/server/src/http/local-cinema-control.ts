import type { Express, Request, Response } from "express";

import { CinemaService } from "../services/cinema-service.js";

function getClientIp(req: Request) {
  const xff = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  return xff || req.ip || req.socket.remoteAddress || "";
}

function isLocalIp(ip: string) {
  const raw = ip.trim().replace(/^\[|\]$/gu, "").replace(/^::ffff:/u, "");
  const value = raw.includes(":") && raw.split(":").length === 2 ? raw.split(":")[0] : raw;
  if (!value) return false;
  if (value === "127.0.0.1" || value === "::1" || value === "localhost") return true;
  if (value.startsWith("10.")) return true;
  if (value.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./u.test(value)) return true;
  return false;
}

function requireLocal(req: Request, res: Response) {
  const ip = getClientIp(req);
  if (!isLocalIp(ip)) {
    res.status(403).json({ error: "Trang này chỉ cho phép truy cập local (127.0.0.1)." });
    return false;
  }
  return true;
}

function renderLocalCinemaControlHtml() {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Local Cinema Control</title>
  <style>
    body{margin:0;padding:18px;background:#0b1220;color:#e5ecff;font-family:Segoe UI,Arial,sans-serif}
    .card{background:#121a2b;border:1px solid #2b3a57;border-radius:12px;padding:14px;margin-bottom:14px}
    .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .btn{padding:9px 12px;background:#1d4ed8;color:white;border:0;border-radius:9px;cursor:pointer}
    .btn:disabled{opacity:.6;cursor:not-allowed}
    .muted{opacity:.8}
    .bar{height:8px;background:#1f2937;border-radius:999px;overflow:hidden;margin-top:8px}
    .bar>div{height:100%;background:#22c55e}
    h1,h2,p{margin:0}
    .list{display:grid;gap:10px}
  </style>
</head>
<body>
  <div class="card">
    <h1>Local Cinema Control</h1>
    <p class="muted">Trang local riêng để quét toàn bộ và tạo lại preview/thumbnail.</p>
    <div class="row" style="margin-top:10px">
      <button id="ensureBtn" class="btn">Tạo storage Telegram</button>
      <span id="message" class="muted"></span>
    </div>
  </div>
  <div id="list" class="list"></div>
  <script>
    const msg=document.getElementById('message');
    const list=document.getElementById('list');
    const ensureBtn=document.getElementById('ensureBtn');
    const state={channels:[],jobs:[]};
    async function api(path,init){
      const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json'},...init});
      const j=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.error||('HTTP '+r.status));
      return j;
    }
    function render(){
      const full=state.channels.filter(x=>x.isEnabled&&x.role==='FULL_SOURCE');
      list.innerHTML=full.map(ch=>{
        const job=state.jobs.find(j=>j.channelId===ch.id);
        const total=Math.max(0,Number(job&&job.totalDetected||0));
        const done=Math.max(0,Number((job&&job.totalInserted||0)+(job&&job.totalFailed||0)));
        const pct=total?Math.min(100,Math.round(done*100/total)):0;
        const failed=Math.max(0,Number(job&&job.totalFailed||0));
        const inserted=Math.max(0,Number(job&&job.totalInserted||0));
        const color=(job&&job.status==='FAILED')?'#ef4444':(failed>0?'#f59e0b':'#22c55e');
        return '<div class="card">'+
          '<h2>'+ch.displayName+'</h2>'+
          '<p class="muted">'+ch.platform+' / '+ch.sourceChannelId+'</p>'+
          '<p class="muted" style="margin-top:6px">'+(job?('Job: '+job.status+' | xử lý '+done+'/'+total+' | thành công '+inserted+' | lỗi '+failed):'Chưa có job')+'</p>'+
          '<div class="bar"><div style="width:'+pct+'%;background:'+color+'"></div></div>'+
          '<div class="row" style="margin-top:10px">'+
            '<button class="btn" data-scan="'+ch.id+'">Quét toàn bộ + tạo lại preview/thumbnail</button>'+
            '<span class="muted">'+(job&&job.failureReason?('Lỗi: '+job.failureReason):'')+'</span>'+
          '</div>'+
        '</div>';
      }).join('');
      [...document.querySelectorAll('[data-scan]')].forEach((btn)=>{
        btn.addEventListener('click',async()=>{
          const channelId=btn.getAttribute('data-scan');
          if(!channelId) return;
          btn.disabled=true;
          msg.textContent='Đang gửi job scan...';
          try{
            await api('/api/local/cinema/scan',{method:'POST',body:JSON.stringify({channelId,forceRegenerate:true,autoEnsureStorage:true})});
            msg.textContent='Đã bắt đầu quét.';
            await load();
          }catch(e){ msg.textContent=e&&e.message?e.message:'Lỗi'; }
          finally{ btn.disabled=false; }
        });
      });
    }
    async function load(){
      const [channels,jobs]=await Promise.all([
        api('/api/local/cinema/channels'),
        api('/api/local/cinema/jobs?limit=100'),
      ]);
      state.channels=channels; state.jobs=jobs; render();
    }
    ensureBtn.addEventListener('click',async()=>{
      ensureBtn.disabled=true;
      try{
        await api('/api/local/cinema/storage/ensure',{method:'POST'});
        msg.textContent='Đã tạo/cập nhật storage Telegram.';
      }catch(e){ msg.textContent=e&&e.message?e.message:'Lỗi'; }
      finally{ ensureBtn.disabled=false; }
    });
    load().catch((e)=>{ msg.textContent=e&&e.message?e.message:'Lỗi tải dữ liệu'; });
    setInterval(()=>{ load().catch(()=>{}); },2000);
  </script>
</body>
</html>`;
}

export function registerLocalCinemaControlRoutes(app: Express, cinemaService: CinemaService) {
  app.get("/local/cinema-control", async (req, res) => {
    if (!requireLocal(req, res)) return;
    res.type("html").send(renderLocalCinemaControlHtml());
  });

  app.get("/api/local/cinema/channels", async (req, res) => {
    if (!requireLocal(req, res)) return;
    res.json(await cinemaService.listAllChannels());
  });

  app.get("/api/local/cinema/jobs", async (req, res) => {
    if (!requireLocal(req, res)) return;
    const limit = Number(req.query.limit ?? 100);
    res.json(await cinemaService.listScanJobs(Number.isFinite(limit) ? limit : 100));
  });

  app.post("/api/local/cinema/storage/ensure", async (req, res) => {
    if (!requireLocal(req, res)) return;
    await cinemaService.ensureTelegramStorageChannels();
    res.json({ ok: true });
  });

  app.post("/api/local/cinema/scan", async (req, res) => {
    if (!requireLocal(req, res)) return;
    const body = req.body as { channelId?: string; forceRegenerate?: boolean; autoEnsureStorage?: boolean };
    const channelId = String(body.channelId ?? "");
    if (!channelId) {
      res.status(400).json({ error: "channelId is required" });
      return;
    }
    const job = await cinemaService.createScanJob({ channelId, requestedBy: "local-control" });
    void cinemaService.runScanJob(job.id, {
      forceRegenerate: body.forceRegenerate !== false,
      autoEnsureStorage: body.autoEnsureStorage !== false,
    });
    res.json(job);
  });
}
