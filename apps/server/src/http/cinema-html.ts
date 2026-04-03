import type { Request, Response } from "express";

import { env } from "../config.js";

export function renderCinemaHtml(_req: Request, res: Response) {
  if (!env.CINEMA_WEB_ENABLED) {
    res.status(404).send("Cinema is disabled.");
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.type("html").send(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <title>VIP Cinema</title>
  <style>
    :root{
      --bg:#090b10;--panel:#121722;--line:#263247;--text:#eef2ff;--muted:#9aa9c7;--accent:#45d0ff;
      --radius:14px;
    }
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{margin:0;width:100%;height:100%;min-height:var(--app-vh,100dvh)}
    body{background:radial-gradient(1200px 600px at 20% -20%,#15203a 0%,#090b10 55%);color:var(--text);font-family:Segoe UI,Arial,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%}
    .wrap{max-width:1100px;margin:0 auto;padding:16px;min-height:var(--app-vh,100dvh)}
    .top{display:flex;gap:10px;align-items:center;justify-content:space-between}
    .title{font-size:28px;font-weight:800;letter-spacing:.4px}
    .status{color:var(--muted);font-size:13px}
    .toolbar{display:flex;gap:8px;margin-top:12px}
    .input,.btn{border:1px solid var(--line);background:#0f1420;color:var(--text);border-radius:10px}
    .input{padding:10px 12px;min-width:230px}
    .btn{padding:10px 12px;cursor:pointer}
    .btn:hover{border-color:#3f5378}
    .crumb{margin:16px 0;color:var(--muted);font-size:13px}
    .hero{border:1px solid var(--line);background:linear-gradient(120deg,#132039,#101827);border-radius:var(--radius);padding:14px;margin-bottom:14px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
    .load-more-wrap{display:flex;justify-content:center;margin-top:14px}
    .load-more{padding:10px 14px;border:1px solid var(--line);background:#0f1420;color:var(--text);border-radius:10px;cursor:pointer}
    .load-more:hover{border-color:#3f5378}
    .card{border:1px solid var(--line);background:var(--panel);border-radius:var(--radius);overflow:hidden;cursor:pointer;display:flex;flex-direction:column;min-height:320px}
    .media{position:relative}
    .cover{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:#1a2233}
    .preview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;opacity:0;transition:opacity .2s}
    .card:hover .preview{opacity:1}
    .meta{padding:10px;display:flex;flex-direction:column;gap:6px;min-height:88px}
    .name{font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;overflow-wrap:anywhere}
    .sub{color:var(--muted);font-size:12px;min-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .badge{display:inline-block;margin-top:8px;font-size:11px;padding:3px 7px;border-radius:999px;background:#1c2b45;border:1px solid #2d4264}
    .player{border:1px solid var(--line);background:var(--panel);border-radius:var(--radius);padding:12px}
    video{width:100%;max-height:55vh;background:#000;border-radius:10px}
    .viewer-image{width:100%;max-height:55vh;object-fit:contain;background:#000;border-radius:10px}
    .fullscreen-fab{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:calc(68px + env(safe-area-inset-bottom,0px));z-index:21;border:1px solid var(--line);background:rgba(15,20,32,0.92);color:var(--text);border-radius:999px;padding:9px 12px;font-size:13px;cursor:pointer;backdrop-filter:blur(4px)}
    .fullscreen-fab:hover{border-color:#3f5378}
    .related{margin-top:10px}
    .empty,.error{border:1px dashed var(--line);padding:18px;border-radius:12px;background:#0f1420;color:var(--muted)}
    .fab-back{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:20;padding:10px 14px;border:1px solid var(--line);background:rgba(15,20,32,0.92);color:var(--text);border-radius:999px;cursor:pointer;backdrop-filter:blur(4px)}
    .fab-back:hover{border-color:#3f5378}
    /* === Pseudo-fullscreen: chiếm toàn bộ màn hình kể cả khi xoay ngang === */
    .pseudo-fullscreen{
      position:fixed!important;
      top:0!important;left:0!important;right:0!important;bottom:0!important;
      width:100dvw!important;height:var(--app-vh,100dvh)!important;
      z-index:9998!important;
      background:#000!important;
      margin:0!important;padding:0!important;
      border-radius:0!important;
      overflow:hidden!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
    }
    .pseudo-fullscreen #playerTitle,.pseudo-fullscreen #playerDesc,.pseudo-fullscreen .related{display:none!important}
    .pseudo-fullscreen video,.pseudo-fullscreen .viewer-image{
      width:100dvw!important;
      height:var(--app-vh,100dvh)!important;
      max-width:100dvw!important;
      max-height:var(--app-vh,100dvh)!important;
      object-fit:contain!important;
      border-radius:0!important;
      background:#000!important;
    }
    .pseudo-fullscreen .fullscreen-fab{
      position:fixed!important;
      bottom:max(12px,env(safe-area-inset-bottom))!important;
      right:max(14px,env(safe-area-inset-right))!important;
    }
    @media (orientation:landscape){
      .pseudo-fullscreen video,.pseudo-fullscreen .viewer-image{
        width:100dvw!important;
        height:var(--app-vh,100dvh)!important;
      }
      video{max-height:80vh}
      .viewer-image{max-height:80vh}
    }
    body.no-scroll{overflow:hidden!important;position:fixed!important;width:100%!important}
    .hide{display:none}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="title">VIP Cinema</div>
      <div id="sessionStatus" class="status">Đang xác thực...</div>
    </div>

    <div class="toolbar">
      <input id="search" class="input" placeholder="Tìm kênh hoặc phim..." />
      <button id="backHomeBtn" class="btn hide">Quay về</button>
      <button id="retryBtn" class="btn hide">Thử lại</button>
    </div>

    <div id="crumb" class="crumb">Home</div>
    <section id="hero" class="hero hide"></section>
    <section id="state" class="empty hide"></section>
    <section id="grid" class="grid"></section>
    <div id="loadMoreWrap" class="load-more-wrap hide">
      <button id="loadMoreBtn" class="load-more">Tải thêm</button>
    </div>

    <section id="playerWrap" class="player hide">
      <h3 id="playerTitle"></h3>
      <p id="playerDesc" class="status"></p>
      <video id="player" controls playsinline webkit-playsinline x5-playsinline x5-video-player-type="h5" x5-video-orientation="landscape"></video>
      <img id="imageViewer" class="viewer-image hide" alt="Cinema media" />
      <div class="related">
        <h4>Phim con liên quan</h4>
        <div id="relatedGrid" class="grid"></div>
      </div>
    </section>
  </div>
  <button id="fullscreenFabBtn" class="fullscreen-fab hide">Toàn màn hình</button>
  <button id="backFabBtn" class="fab-back hide">← Quay về</button>

  <script>
    const state={channels:[],itemsByChannel:new Map(),currentChannel:null,currentItem:null,query:'',channelRows:[],visibleCount:20,pageSize:20,tg:null,pseudoFullscreen:false,mainBtnBound:false,autoCinemaByLandscape:false,orientTimer:null};
    const $=(id)=>document.getElementById(id);
    const dom={status:$('sessionStatus'),search:$('search'),back:$('backHomeBtn'),retry:$('retryBtn'),crumb:$('crumb'),hero:$('hero'),state:$('state'),grid:$('grid'),loadMoreWrap:$('loadMoreWrap'),loadMoreBtn:$('loadMoreBtn'),backFab:$('backFabBtn'),fullscreenFab:$('fullscreenFabBtn'),playerWrap:$('playerWrap'),playerTitle:$('playerTitle'),playerDesc:$('playerDesc'),player:$('player'),image:$('imageViewer'),related:$('relatedGrid')};

    function showState(msg,isError=false){
      dom.state.textContent=msg; dom.state.className=isError?'error':'empty';
      dom.state.classList.remove('hide');
    }
    function initTelegramWebApp(){
      const tg=window.Telegram&&window.Telegram.WebApp?window.Telegram.WebApp:null;
      state.tg=tg;
      if(!tg) return;
      try{ tg.ready&&tg.ready(); }catch(_e){}
      try{ tg.expand&&tg.expand(); }catch(_e){}
      try{ tg.unlockOrientation&&tg.unlockOrientation(); }catch(_e){}
      try{ tg.setHeaderColor&&tg.setHeaderColor('#000000'); }catch(_e){}
      try{ tg.setBackgroundColor&&tg.setBackgroundColor('#000000'); }catch(_e){}
      try{ tg.setBottomBarColor&&tg.setBottomBarColor('#000000'); }catch(_e){}
      try{ tg.disableVerticalSwipes&&tg.disableVerticalSwipes(); }catch(_e){}
      const applyViewport=()=>{
        try{
          const stable=tg.viewportStableHeight||tg.viewportHeight||0;
          if(stable>0){
            document.documentElement.style.setProperty('--app-vh', stable+'px');
            return;
          }
          const vv=(window.visualViewport&&window.visualViewport.height)||window.innerHeight||0;
          if(vv>0) document.documentElement.style.setProperty('--app-vh', vv+'px');
        }catch(_e){}
      };
      applyViewport();
      try{ tg.onEvent&&tg.onEvent('viewportChanged',applyViewport); }catch(_e){}
      try{ tg.onEvent&&tg.onEvent('fullscreenFailed',()=>{}); }catch(_e){}
      try{ tg.onEvent&&tg.onEvent('fullscreenChanged',()=>{}); }catch(_e){}
    }
    function syncFullscreenMainButton(active){
      const tg=state.tg;
      if(!tg||!tg.MainButton) return;
      try{
        tg.MainButton.hide();
      }catch(_e){}
    }
    function isLandscape(){
      if(screen&&screen.orientation&&screen.orientation.type){
        return screen.orientation.type.startsWith('landscape');
      }
      return window.matchMedia?window.matchMedia('(orientation:landscape)').matches:(window.innerWidth>window.innerHeight);
    }
    function onOrientationLikeChange(){
      if(!state.currentItem) return;
      if(!isLandscape()){
        if(state.autoCinemaByLandscape && state.pseudoFullscreen){ togglePseudoFullscreen(false); }
        state.autoCinemaByLandscape=false;
        return;
      }
      state.autoCinemaByLandscape=true;
      if(!state.pseudoFullscreen){ togglePseudoFullscreen(true); }
    }
    function togglePseudoFullscreen(force){
      const next=typeof force==='boolean'?force:!state.pseudoFullscreen;
      state.pseudoFullscreen=next;
      if(next){
        dom.playerWrap.classList.add('pseudo-fullscreen');
        document.body.classList.add('no-scroll');
        dom.fullscreenFab.textContent='Thoát toàn màn hình';
        syncFullscreenMainButton(true);
        try{ const tg=state.tg; if(tg&&tg.requestFullscreen){ tg.requestFullscreen(); } }catch(_e){}
        /* Luôn unlock để user xoay thiết bị tự do - KHÔNG lock landscape */
        try{ const tg=state.tg; if(tg&&tg.unlockOrientation) tg.unlockOrientation(); }catch(_e){}
        try{ if(screen&&screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); }catch(_e){}
      }else{
        dom.playerWrap.classList.remove('pseudo-fullscreen');
        document.body.classList.remove('no-scroll');
        state.autoCinemaByLandscape=false;
        dom.fullscreenFab.textContent='Toàn màn hình';
        syncFullscreenMainButton(false);
        try{ const tg=state.tg; if(tg&&tg.isFullscreen&&tg.exitFullscreen){ tg.exitFullscreen(); } }catch(_e){}
        try{ const tg=state.tg; if(tg&&tg.unlockOrientation) tg.unlockOrientation(); }catch(_e){}
        try{ if(screen&&screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); }catch(_e){}
      }
    }
    function hideState(){dom.state.classList.add('hide')}
    function resetPlayer(){dom.playerWrap.classList.add('hide'); dom.fullscreenFab.classList.add('hide'); syncFullscreenMainButton(false); dom.player.pause(); dom.player.removeAttribute('src'); dom.player.load(); dom.player.classList.remove('hide'); dom.image.classList.add('hide'); dom.image.removeAttribute('src');}
    async function api(path,opts){
      const r=await fetch(path,{credentials:'include',...opts}); const j=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.error||('HTTP '+r.status)); return j;
    }
    const notFoundCover='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="#1a2233"/><text x="50%" y="50%" fill="#8798bb" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20">No Poster</text></svg>');
    function escAttr(v){return String(v||'').replace(/"/g,'&quot;')}
    function cardHtml(name,sub,poster,badge,preview){return '<article class="card"><div class="media"><img class="cover" src="'+(poster||notFoundCover)+'" loading="lazy"/>'+(preview?'<video class="preview" muted loop playsinline preload="none" data-preview="'+escAttr(preview)+'"></video>':'')+'</div><div class="meta"><div class="name">'+name+'</div><div class="sub">'+sub+'</div>'+(badge?'<span class="badge">'+badge+'</span>':'')+'</div></article>'}

    function bindCardClicks(root,onClick){
      [...root.querySelectorAll('.card')].forEach((el,i)=>el.addEventListener('click',()=>onClick(i)));
      [...root.querySelectorAll('.preview')].forEach((v)=>{
        v.addEventListener('mouseenter',()=>{
          if (!v.src) {
            const src=v.dataset.preview||'';
            if (src) v.src=src;
          }
          v.play().catch(()=>{});
        });
        v.addEventListener('mouseleave',()=>{v.pause(); v.currentTime=0;});
        v.addEventListener('touchstart',()=>{
          if (!v.src) {
            const src=v.dataset.preview||'';
            if (src) v.src=src;
          }
          v.play().catch(()=>{});
        },{passive:true});
      });
    }

    function filtered(list,pick){
      const q=state.query.trim().toLowerCase(); if(!q) return list;
      return list.filter((x)=>pick(x).toLowerCase().includes(q));
    }

    function navBack(){
      if(state.currentItem){ state.currentItem=null; dom.grid.classList.remove('hide'); dom.player.pause(); dom.playerWrap.classList.add('hide'); renderChannelItems(); return; }
      if(state.currentChannel){ state.currentChannel=null; dom.search.value=''; state.query=''; renderChannels(); return; }
    }

    function renderChannels(){
      try{ const tg=state.tg; if(tg&&tg.unlockOrientation){ tg.unlockOrientation(); } }catch(_e){}
      dom.crumb.textContent='Home'; dom.hero.classList.add('hide'); resetPlayer(); dom.back.classList.add('hide'); dom.backFab.classList.add('hide'); dom.grid.classList.remove('hide'); dom.loadMoreWrap.classList.add('hide');
      const rows=filtered(state.channels,(x)=>x.displayName);
      if(!rows.length){dom.grid.innerHTML=''; showState('Chưa có kênh phim nào hoặc không khớp từ khóa.'); return;}
      hideState();
      dom.grid.innerHTML=rows.map((x)=>cardHtml(x.displayName,x.itemCount+' phim con',x.posterUrl,'VIP Full',null)).join('');
      bindCardClicks(dom.grid,(idx)=>openChannel(rows[idx]));
    }
    function renderChannelItems(){
      const rows=state.channelRows;
      if(!rows.length){dom.grid.innerHTML=''; dom.loadMoreWrap.classList.add('hide'); showState('Kênh này chưa có phim con.'); return;}
      hideState();
      const visible=rows.slice(0,state.visibleCount);
      dom.grid.innerHTML=visible.map((x)=>cardHtml(x.title,x.createdAt?new Date(x.createdAt).toLocaleDateString('vi-VN'):'',x.posterUrl,(x.mediaType==='image'?'Ảnh':'VIP Full'),x.previewUrl||null)).join('');
      bindCardClicks(dom.grid,(idx)=>openItem(visible[idx]));
      if(state.visibleCount<rows.length){dom.loadMoreWrap.classList.remove('hide');}else{dom.loadMoreWrap.classList.add('hide');}
    }
    async function openChannel(channel){
      state.currentChannel=channel; resetPlayer(); dom.grid.classList.remove('hide');
      dom.crumb.textContent='Home > '+channel.displayName; dom.back.classList.remove('hide'); dom.backFab.classList.remove('hide');
      dom.hero.innerHTML='<h3 style="margin:0">'+channel.displayName+'</h3><p class="status" style="margin:8px 0 0">Tổng '+channel.itemCount+' phim con</p>';
      dom.hero.classList.remove('hide');
      const cache=state.itemsByChannel.get(channel.id);
      const items=cache||await api('/api/cinema/channels/'+channel.id+'/items');
      state.itemsByChannel.set(channel.id,items);
      const rows=filtered(items,(x)=>x.title);
      state.channelRows=rows;
      state.visibleCount=state.pageSize;
      renderChannelItems();
    }

    async function openItem(item){
      state.currentItem=item;
      const detail=await api('/api/cinema/items/'+item.id);
      const links=await api('/api/cinema/items/'+item.id+'/playback');
      dom.crumb.textContent='Home > '+detail.channel.displayName+' > '+detail.title;
      dom.playerTitle.textContent=detail.title;
      const mediaType=(links&&links.mediaType)||detail.mediaType||item.mediaType||'video';
      dom.playerDesc.textContent=detail.description||(mediaType==='image'?'Ảnh full cho thành viên VIP.':'Đang phát full cho thành viên VIP.');
      if(mediaType==='image'){
        dom.player.pause();
        dom.player.classList.add('hide');
        dom.image.classList.remove('hide');
        dom.image.src=links.fullUrl;
      }else{
        dom.image.classList.add('hide');
        dom.image.removeAttribute('src');
        dom.player.classList.remove('hide');
        dom.player.src=links.fullUrl;
      }
      dom.grid.classList.add('hide');
      dom.loadMoreWrap.classList.add('hide');
      dom.playerWrap.classList.remove('hide');
      dom.fullscreenFab.classList.remove('hide');
      dom.playerWrap.scrollIntoView({behavior:'smooth',block:'start'});
      if(mediaType!=='image'){ dom.player.play().catch(()=>{}); }
      const related=detail.related||[];
      if(!related.length){dom.related.innerHTML='<div class="empty">Không có phim liên quan trong kênh.</div>'; return;}
      dom.related.innerHTML=related.map((x)=>cardHtml(x.title,'',x.posterUrl,'VIP Full',null)).join('');
      bindCardClicks(dom.related,(idx)=>openItem(related[idx]));
    }

    async function boot(){
      try{
        await api('/api/cinema/session/me');
        dom.status.textContent='Phiên VIP hợp lệ';
        state.channels=await api('/api/cinema/channels');
        renderChannels();
      }catch(e){
        try{
          const tg=window.Telegram&&window.Telegram.WebApp?window.Telegram.WebApp:null;
          const initData = (tg&&tg.initData) ? tg.initData : '';
          if(initData){
            await api('/api/cinema/session/exchange-telegram-init',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({ initData }),
            });
            await api('/api/cinema/session/me');
            dom.status.textContent='Phiên VIP hợp lệ';
            state.channels=await api('/api/cinema/channels');
            renderChannels();
            return;
          }
        }catch(_e){}
        dom.status.textContent='Không thể xác thực phiên VIP';
        dom.grid.innerHTML='';
        showState((e&&e.message)?e.message:'Không tìm thấy phiên Cinema. Hãy mở lại từ bot Telegram.',true);
        dom.retry.classList.remove('hide');
      }
    }

    dom.search.addEventListener('input',()=>{state.query=dom.search.value; state.currentChannel?openChannel(state.currentChannel):renderChannels();});
    dom.back.addEventListener('click',()=>navBack());
    dom.backFab.addEventListener('click',()=>navBack());
    dom.loadMoreBtn.addEventListener('click',()=>{
      if(!state.currentChannel) return;
      state.visibleCount=Math.min(state.visibleCount+state.pageSize,state.channelRows.length);
      renderChannelItems();
    });
    dom.retry.addEventListener('click',()=>location.reload());
    dom.fullscreenFab.addEventListener('click',()=>{
      /* Đang pseudo-fullscreen -> thoát */
      if(state.pseudoFullscreen){ togglePseudoFullscreen(false); return; }
      togglePseudoFullscreen(true);
    });
    let touchStartX=0,touchStartY=0;
    document.addEventListener('touchstart',(e)=>{ const t=e.touches&&e.touches[0]; if(!t) return; touchStartX=t.clientX; touchStartY=t.clientY; },{passive:true});
    function swipeItem(direction){
      if(!state.currentItem || !state.channelRows.length) return false;
      const idx=state.channelRows.findIndex((x)=>x.id===state.currentItem.id);
      if(idx<0) return false;
      const nextIdx=direction>0?idx+1:idx-1;
      if(nextIdx<0||nextIdx>=state.channelRows.length) return false;
      openItem(state.channelRows[nextIdx]);
      return true;
    }
    document.addEventListener('touchend',(e)=>{
      const t=e.changedTouches&&e.changedTouches[0]; if(!t) return;
      const dx=t.clientX-touchStartX; const dy=Math.abs(t.clientY-touchStartY);
      if(dy>=50) return;
      if(state.currentItem){
        if(dx<=-70){ swipeItem(1); return; }
        if(dx>=70){ swipeItem(-1); return; }
      }
      if(dx>70 && (state.currentItem||state.currentChannel)){ navBack(); }
    },{passive:true});
    function scheduleOrientationCheck(){
      if(state.orientTimer) clearTimeout(state.orientTimer);
      /* Chờ 200ms để browser cập nhật xong kích thước viewport sau khi xoay */
      state.orientTimer=setTimeout(onOrientationLikeChange,200);
    }
    window.addEventListener('orientationchange',scheduleOrientationCheck,{passive:true});
    if(screen&&screen.orientation){
      screen.orientation.addEventListener('change',scheduleOrientationCheck);
    }
    window.addEventListener('resize',scheduleOrientationCheck,{passive:true});
    initTelegramWebApp();
    boot();
  </script>
</body>
</html>`);
}


