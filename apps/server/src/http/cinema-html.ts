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
    .wrap{max-width:1100px;margin:0 auto;padding:16px 16px 92px;min-height:var(--app-vh,100dvh)}
    .top{display:flex;gap:10px;align-items:center;justify-content:space-between}
    .title{font-size:28px;font-weight:800;letter-spacing:.4px}
    .status{color:var(--muted);font-size:13px}
    .toolbar{display:flex;gap:8px;margin-top:12px}
    .toolbar-wrap{display:none;flex-direction:column;gap:8px}
    .toolbar-secondary{display:flex;gap:8px;flex-wrap:wrap}
    .input,.btn{border:1px solid var(--line);background:#0f1420;color:var(--text);border-radius:10px}
    .input{padding:10px 12px;min-width:230px}
    .btn,.bottom-nav-btn,.dock-btn,.dock-speed,.sort-opt,.load-more,.fullscreen-fab{
      transition:transform .08s ease,background-color .15s ease,border-color .15s ease,box-shadow .15s ease,opacity .15s ease;
      will-change:transform;
    }
    .btn:active,.bottom-nav-btn:active,.dock-btn:active,.dock-speed:active,.sort-opt:active,.load-more:active,.fullscreen-fab:active,
    .btn.is-pressed,.bottom-nav-btn.is-pressed,.dock-btn.is-pressed,.dock-speed.is-pressed,.sort-opt.is-pressed,.load-more.is-pressed,.fullscreen-fab.is-pressed{
      transform:scale(.96);
      background:#16233a;
      border-color:#4f76ad;
      box-shadow:0 0 0 1px rgba(79,118,173,.25) inset;
    }
    .btn:focus-visible,.bottom-nav-btn:focus-visible,.dock-btn:focus-visible,.dock-speed:focus-visible,.sort-opt:focus-visible,.load-more:focus-visible,.fullscreen-fab:focus-visible{
      outline:none;
      border-color:#5b88c8;
      box-shadow:0 0 0 2px rgba(91,136,200,.35);
    }
    select.input{
      min-width:170px;
      padding-right:36px;
      appearance:none;
      -webkit-appearance:none;
      -moz-appearance:none;
      background-image:
        linear-gradient(45deg,transparent 50%,#9aa9c7 50%),
        linear-gradient(135deg,#9aa9c7 50%,transparent 50%);
      background-position:
        calc(100% - 18px) calc(50% - 2px),
        calc(100% - 12px) calc(50% - 2px);
      background-size:6px 6px,6px 6px;
      background-repeat:no-repeat;
      line-height:1.2;
    }
    .btn{padding:10px 12px;cursor:pointer}
    .btn:hover{border-color:#3f5378}
    .btn.active{background:#1b3554;border-color:#45d0ff;color:#dff6ff}
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
    .player-media{position:relative;overflow:hidden;border-radius:10px;user-select:none;-webkit-user-select:none;background:#000;aspect-ratio:16/9;transition:transform .2s ease,opacity .2s ease}
    .player-media.sticky-player{position:sticky;top:0;z-index:30}
    .player-media.pip-active{
      position:fixed!important;
      z-index:10010!important;
      bottom:max(14px,env(safe-area-inset-bottom));
      right:max(14px,env(safe-area-inset-right));
      width:min(46vw,320px);
      max-width:calc(100dvw - 20px);
      border:1px solid var(--line);
      box-shadow:0 14px 30px rgba(0,0,0,.45);
      touch-action:none;
      animation:pip-slide-in .2s ease;
    }
    .player-media.pip-exit{animation:pip-slide-out .18s ease}
    @keyframes pip-slide-in{
      from{transform:translateY(14px) scale(.95);opacity:.86}
      to{transform:translateY(0) scale(1);opacity:1}
    }
    @keyframes pip-slide-out{
      from{transform:translateY(0) scale(1);opacity:1}
      to{transform:translateY(14px) scale(.95);opacity:.84}
    }
    video{width:100%;height:100%;max-height:none;background:#000;border-radius:10px;display:block;object-fit:contain}
    .viewer-image{width:100%;height:100%;max-height:none;object-fit:contain;background:#000;border-radius:10px;display:block}
    .swipe-hint{position:absolute;top:50%;transform:translateY(-50%);padding:7px 10px;border-radius:999px;background:rgba(9,11,16,0.7);border:1px solid var(--line);font-size:12px;color:var(--text);opacity:0;transition:opacity .16s;pointer-events:none}
    .swipe-hint.left{left:10px}
    .swipe-hint.right{right:10px}
    .swipe-hint.center{left:50%;transform:translate(-50%,-50%)}
    .player-nav{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
    .player-overlay-actions{
      position:absolute;
      top:10px;
      right:10px;
      z-index:10011;
      display:flex;
      gap:8px;
      pointer-events:auto;
    }
    .player-overlay-actions .btn{
      padding:7px 10px;
      font-size:12px;
      background:rgba(15,20,32,.82);
      backdrop-filter:blur(2px);
    }
    .fullscreen-fab{border:1px solid var(--line);background:#0f1420;color:var(--text);border-radius:10px;padding:10px 12px;font-size:16px;line-height:1;pointer-events:auto}
    .fullscreen-fab:hover{border-color:#3f5378}
    .related{margin-top:12px}
    .pip-mini-play{
      position:absolute;
      left:10px;
      bottom:10px;
      width:34px;
      height:34px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.35);
      background:rgba(15,20,32,.9);
      color:#fff;
      z-index:10011;
      display:none;
      align-items:center;
      justify-content:center;
      font-size:14px;
      touch-action:none;
    }
    .player-media.pip-active .pip-mini-play{display:flex}
    .empty,.error{border:1px dashed var(--line);padding:18px;border-radius:12px;background:#0f1420;color:var(--muted)}
    .fab-back{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:20;padding:10px 14px;border:1px solid var(--line);background:rgba(15,20,32,0.92);color:var(--text);border-radius:999px;cursor:pointer;backdrop-filter:blur(4px)}
    .fab-back:hover{border-color:#3f5378}
    /* === Pseudo-fullscreen: chim ton b mn hnh k c khi xoay ngang === */
    .pseudo-fullscreen{
      position:fixed!important;
      top:0!important;left:0!important;right:0!important;bottom:0!important;
      width:100dvw!important;height:100dvh!important;
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
    /* n cc phn khng cn khi fullscreen */
    .pseudo-fullscreen #playerTitle,
    .pseudo-fullscreen #playerDesc,
    .pseudo-fullscreen .related{display:none!important}
    .pseudo-fullscreen .player-nav{position:fixed!important;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));bottom:auto;z-index:10001;display:flex!important}
    /* Video/nh chim ton b khng gian */
    .pseudo-fullscreen video,.pseudo-fullscreen .viewer-image{
      width:100%!important;
      height:100%!important;
      max-width:100dvw!important;
      max-height:100dvh!important;
      object-fit:contain!important;
      border-radius:0!important;
      background:#000!important;
      flex:1!important;
    }
        .pseudo-fullscreen .fullscreen-fab{display:none!important}
    .pseudo-fullscreen #prevItemBtn,.pseudo-fullscreen #nextItemBtn{display:none!important}
    @media (orientation:landscape){
      video{max-height:80vh}
      .viewer-image{max-height:80vh}
      .player-overlay-actions{display:none!important}
      /* Khi landscape + pseudo-fullscreen: video chim ton mn khng b controls che */
      .pseudo-fullscreen video,.pseudo-fullscreen .viewer-image{
        width:100dvw!important;
        height:100dvh!important;
        max-height:100dvh!important;
      }
    }
    body.no-scroll{overflow:hidden!important;position:fixed!important;width:100%!important}
    .swiping{transition:none!important}
    .swipe-anim{transition:transform .16s ease-out}
    .hide{display:none}
    body.player-mode .top,
    body.player-mode .toolbar-wrap,
    body.player-mode #crumb,
    body.player-mode #hero{display:none!important}
    body.player-mode .wrap{padding-top:0}
    body.player-mode .player{border:none;background:transparent;border-radius:0;padding:0}
    body.player-mode .player-nav{display:none!important}
    body.player-mode #playerMedia.sticky-player{
      margin-left:-16px;
      margin-right:-16px;
      border-radius:0;
      border-left:none;
      border-right:none;
    }
    body.player-mode #playerMedia.sticky-player video,
    body.player-mode #playerMedia.sticky-player .viewer-image{border-radius:0}
    body.player-mode #playerTitle,
    body.player-mode #playerDesc,
    body.player-mode .related{padding-left:12px;padding-right:12px}
    body.player-mode .pseudo-fullscreen .player-nav{display:flex!important}
    body.player-mode .pseudo-fullscreen #playerMedia{
      margin-left:0!important;
      margin-right:0!important;
      border-radius:0!important;
      position:fixed!important;
      inset:0!important;
      width:100dvw!important;
      height:100dvh!important;
      max-width:100dvw!important;
      max-height:100dvh!important;
      background:#000!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      aspect-ratio:auto!important;
    }
    body.fullscreen-mode .bottom-nav,
    body.fullscreen-mode .bottom-panel{display:none!important}
    body.fullscreen-mode .playback-dock{
      display:none!important;
      z-index:10020!important;
      bottom:max(8px,env(safe-area-inset-bottom))!important;
      border-top:none!important;
      background:linear-gradient(180deg,rgba(9,11,16,.2),rgba(9,11,16,.88))!important;
    }
    body.fullscreen-mode.controls-visible .playback-dock{display:flex!important}
    #relatedGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .playback-dock{
      position:fixed;
      left:0;
      right:0;
      bottom:calc(62px + env(safe-area-inset-bottom));
      z-index:62;
      border-top:1px solid var(--line);
      background:rgba(9,11,16,.96);
      backdrop-filter:blur(6px);
      padding:8px 10px 10px;
      display:none;
      flex-direction:column;
      gap:8px;
    }
    .playback-dock.show{display:flex}
    .dock-timeline-row{
      display:flex;
      align-items:center;
      gap:8px;
      width:100%;
    }
    .dock-controls-row{
      display:flex;
      align-items:center;
      gap:8px;
      width:100%;
      flex-wrap:nowrap;
      overflow-x:auto;
      -webkit-overflow-scrolling:touch;
    }
    .dock-btn,.dock-speed{
      border:1px solid var(--line);
      background:#0f1420;
      color:var(--text);
      border-radius:8px;
      padding:8px 10px;
      font-size:12px;
      min-width:44px;
    }
    .dock-time{font-size:11px;color:var(--muted);min-width:78px;text-align:center}
    .dock-range{flex:1;min-width:120px}
    .dock-range input{width:100%}
    .dock-vol{display:none}
    .volume-panel{
      position:fixed;
      right:12px;
      bottom:calc(132px + env(safe-area-inset-bottom));
      z-index:64;
      display:none;
      width:44px;
      height:150px;
      border:1px solid var(--line);
      border-radius:12px;
      background:rgba(9,11,16,.92);
      backdrop-filter:blur(6px);
      padding:8px;
      align-items:center;
      justify-content:center;
    }
    .volume-panel.show{display:flex}
    .volume-panel input{
      writing-mode:vertical-lr;
      direction:rtl;
      width:26px;
      height:120px;
    }
    .pip-resize-zone{
      position:absolute;
      z-index:10013;
      display:none;
      pointer-events:none;
    }
    .player-media.pip-active .pip-resize-zone{
      display:block;
      pointer-events:auto;
      touch-action:none;
    }
    .pip-resize-zone.right{top:16px;bottom:16px;right:-8px;width:22px;cursor:ew-resize}
    .pip-resize-zone.left{top:16px;bottom:16px;left:-8px;width:22px;cursor:ew-resize}
    .pip-resize-zone.bottom{left:16px;right:16px;bottom:-8px;height:22px;cursor:ns-resize}
    .pip-resize-zone.corner{right:-10px;bottom:-10px;width:28px;height:28px;cursor:nwse-resize}
    .action-flash{animation:actionFlash .22s ease}
    @keyframes actionFlash{
      0%{transform:scale(1)}
      45%{transform:scale(.98)}
      100%{transform:scale(1)}
    }
    .bottom-nav{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      z-index:60;
      padding:6px 10px max(8px,env(safe-area-inset-bottom));
      border-top:1px solid var(--line);
      background:rgba(9,11,16,.96);
      backdrop-filter:blur(6px);
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:6px;
    }
    .bottom-nav-btn{
      border:1px solid transparent;
      background:transparent;
      color:var(--text);
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:2px;
      padding:6px 4px;
      border-radius:10px;
      cursor:pointer;
      min-height:48px;
    }
    .bottom-nav-btn .ico{font-size:17px;line-height:1}
    .bottom-nav-btn .lbl{font-size:11px;color:var(--muted)}
    .bottom-nav-btn.active{border-color:#2d4264;background:#111b2b}
    .bottom-panel{
      position:fixed;
      left:10px;
      right:10px;
      bottom:72px;
      z-index:65;
      border:1px solid var(--line);
      border-radius:12px;
      background:#0f1420;
      padding:10px;
      display:none;
    }
    .bottom-panel.show{display:block}
    .bottom-panel input,.bottom-panel button{
      width:100%;
      border:1px solid var(--line);
      border-radius:10px;
      background:#0c1220;
      color:var(--text);
      padding:10px 12px;
    }
    .sort-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="title">VIP Cinema</div>
      <div id="sessionStatus" class="status">Đang xác thực...</div>
    </div>

    <div class="toolbar-wrap">
      <div class="toolbar">
        <input id="search" class="input" placeholder="Tìm kênh hoặc phim..." />
        <button id="backHomeBtn" class="btn hide">Quay về</button>
        <button id="retryBtn" class="btn hide">Thử lại</button>
      </div>
      <div id="itemControls" class="toolbar-secondary hide">
        <select id="sortSelect" class="input">
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="most_viewed">Xem nhiều nhất</option>
          <option value="least_viewed">Xem ít nhất</option>
          <option value="unseen">Chưa xem</option>
          <option value="random">Ngẫu nhiên</option>
        </select>
        <button id="randomPickBtn" class="btn">Ngẫu nhiên: Tắt</button>
      </div>
    </div>

    <div id="crumb" class="crumb">Home</div>
    <section id="hero" class="hero hide"></section>
    <section id="state" class="empty hide"></section>
    <section id="grid" class="grid"></section>
    <div id="loadMoreWrap" class="load-more-wrap hide">
      <button id="loadMoreBtn" class="load-more">Tải thêm</button>
    </div>

    <section id="playerWrap" class="player hide">
      <div id="playerMedia" class="player-media sticky-player">
        <video id="player" controls playsinline webkit-playsinline x5-playsinline x5-video-player-type="h5" x5-video-orientation="landscape"></video>
        <img id="imageViewer" class="viewer-image hide" alt="Cinema media" />
        <div class="player-overlay-actions">
          <button id="pipToggleBtn" class="btn">Thu nhỏ</button>
        </div>
        <div class="pip-resize-zone left" data-pip-edge="left"></div>
        <div class="pip-resize-zone right" data-pip-edge="right"></div>
        <div class="pip-resize-zone bottom" data-pip-edge="bottom"></div>
        <div class="pip-resize-zone corner" data-pip-edge="corner"></div>
        <button id="pipMiniPlayBtn" class="pip-mini-play" aria-label="Phát hoặc tạm dừng">▶</button>
        <div id="swipeHintLeft" class="swipe-hint left">Độ sáng</div>
        <div id="swipeHintRight" class="swipe-hint right">Âm lượng</div>
        <div id="swipeHintCenter" class="swipe-hint center">Vuốt lên/xuống để chuyển phim</div>
      </div>
      <h3 id="playerTitle"></h3>
      <p id="playerDesc" class="status"></p>
      <div class="player-nav">
        <button id="prevItemBtn" class="btn">← Trước</button>
        <button id="nextItemBtn" class="btn">Sau →</button>
        <span id="fullscreenFabBtn" class="fullscreen-fab hide" aria-label="Toàn màn hình">⤢</span>
      </div>
      <div class="related">
        <h4>Phim liên quan</h4>
        <div id="relatedGrid" class="grid"></div>
      </div>
    </section>
  </div>
  <div id="searchPanel" class="bottom-panel">
    <input id="bottomSearchInput" placeholder="Tìm kênh hoặc phim..." />
  </div>
  <div id="sortPanel" class="bottom-panel">
    <div class="sort-grid">
      <button class="sort-opt" data-sort="newest">Mới nhất</button>
      <button class="sort-opt" data-sort="oldest">Cũ nhất</button>
      <button class="sort-opt" data-sort="most_viewed">Xem nhiều</button>
      <button class="sort-opt" data-sort="least_viewed">Xem ít</button>
      <button class="sort-opt" data-sort="unseen">Chưa xem</button>
      <button class="sort-opt" data-sort="random">Ngẫu nhiên</button>
    </div>
  </div>
  <div id="playbackDock" class="playback-dock">
    <div class="dock-timeline-row">
      <div id="dockTime" class="dock-time">0:00/0:00</div>
      <div class="dock-range"><input id="dockTimeline" type="range" min="0" max="100" value="0" step="0.1" /></div>
    </div>
    <div class="dock-controls-row">
      <button id="dockPlayBtn" class="dock-btn">⏯</button>
      <button id="dockPrevBtn" class="dock-btn">⏮</button>
      <button id="dockNextBtn" class="dock-btn">⏭</button>
      <button id="dockMuteBtn" class="dock-btn">🔊</button>
      <button id="dockSpeedBtn" class="dock-speed">1x</button>
      <button id="dockRotateBtn" class="dock-btn">⤢</button>
      <button id="dockMinBtn" class="dock-btn">▣</button>
    </div>
  </div>
  <div id="volumePanel" class="volume-panel">
    <input id="volumeVertical" type="range" min="0" max="1" value="0" step="0.01" />
  </div>
  <nav class="bottom-nav">
    <button id="navHomeBtn" class="bottom-nav-btn"><span class="ico">⌂</span><span class="lbl">Home</span></button>
    <button id="navSearchBtn" class="bottom-nav-btn"><span class="ico">⌕</span><span class="lbl">Search</span></button>
    <button id="navSortBtn" class="bottom-nav-btn"><span class="ico">↕</span><span class="lbl">Sort</span></button>
    <button id="navBackBtn" class="bottom-nav-btn"><span class="ico">←</span><span class="lbl">Back</span></button>
  </nav>
  <button id="backFabBtn" class="fab-back hide">← Quay về</button>
  <!-- Nt thot fullscreen overlay - lun ni trn phim khi  pseudo-fullscreen -->
  <script>
    const state={channels:[],itemsByChannel:new Map(),currentChannel:null,currentItem:null,currentMediaType:'video',query:'',channelRows:[],visibleCount:20,pageSize:20,tg:null,pseudoFullscreen:false,mainBtnBound:false,autoCinemaByLandscape:false,orientTimer:null,fullscreenControlsTimer:null,itemFilters:{sort:'newest'},randomMode:false,viewCounts:{},brightness:1,playbackRate:1,lastTapAt:0,lastTapSide:'none',suppressTapUntil:0,isPip:false,pipRect:null,pipDrag:null,pipResize:null,touch:{active:false,startX:0,startY:0,lastX:0,lastY:0,startVolume:0,startBrightness:1,startCurrentTime:0,seekTime:0,isSeeking:false,isBoosting:false,mode:'pending',longPressTimer:null,rightBoostTimer:null}};
    const $=(id)=>document.getElementById(id);
    const dom={status:$('sessionStatus'),search:$('search'),bottomSearchInput:$('bottomSearchInput'),searchPanel:$('searchPanel'),sortPanel:$('sortPanel'),navHomeBtn:$('navHomeBtn'),navSearchBtn:$('navSearchBtn'),navSortBtn:$('navSortBtn'),navBackBtn:$('navBackBtn'),playbackDock:$('playbackDock'),dockPlayBtn:$('dockPlayBtn'),dockPrevBtn:$('dockPrevBtn'),dockNextBtn:$('dockNextBtn'),dockMuteBtn:$('dockMuteBtn'),dockTime:$('dockTime'),dockTimeline:$('dockTimeline'),dockSpeedBtn:$('dockSpeedBtn'),dockRotateBtn:$('dockRotateBtn'),dockMinBtn:$('dockMinBtn'),volumePanel:$('volumePanel'),volumeVertical:$('volumeVertical'),back:$('backHomeBtn'),retry:$('retryBtn'),crumb:$('crumb'),hero:$('hero'),state:$('state'),grid:$('grid'),loadMoreWrap:$('loadMoreWrap'),loadMoreBtn:$('loadMoreBtn'),backFab:$('backFabBtn'),fullscreenFab:$('fullscreenFabBtn'),playerWrap:$('playerWrap'),playerMedia:$('playerMedia'),playerTitle:$('playerTitle'),playerDesc:$('playerDesc'),player:$('player'),image:$('imageViewer'),related:$('relatedGrid'),itemControls:$('itemControls'),sortSelect:$('sortSelect'),randomPickBtn:$('randomPickBtn'),prevItemBtn:$('prevItemBtn'),nextItemBtn:$('nextItemBtn'),pipToggleBtn:$('pipToggleBtn'),pipMiniPlayBtn:$('pipMiniPlayBtn'),swipeHintLeft:$('swipeHintLeft'),swipeHintRight:$('swipeHintRight'),swipeHintCenter:$('swipeHintCenter')};

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
        if(state.isPip) exitPip();
        document.body.classList.add('fullscreen-mode');
        document.body.classList.add('controls-visible');
        dom.player.removeAttribute('controls');
        dom.playerWrap.classList.add('pseudo-fullscreen'); document.body.classList.add('no-scroll'); dom.grid.classList.add('hide'); dom.loadMoreWrap.classList.add('hide');        syncFullscreenMainButton(true);
        try{ const tg=state.tg; if(tg&&tg.requestFullscreen){ tg.requestFullscreen(); } }catch(_e){}
        /* Luôn unlock để user xoay thiết bị tự do - KHÔNG lock landscape */
        try{ const tg=state.tg; if(tg&&tg.unlockOrientation) tg.unlockOrientation(); }catch(_e){}
        try{ if(screen&&screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); }catch(_e){}
        showFullscreenControls();
      }else{ dom.playerWrap.classList.remove('pseudo-fullscreen'); document.body.classList.remove('no-scroll'); if(state.currentItem){ dom.grid.classList.add('hide'); }
        document.body.classList.remove('fullscreen-mode');
        document.body.classList.remove('controls-visible');
        if(state.fullscreenControlsTimer){ clearTimeout(state.fullscreenControlsTimer); state.fullscreenControlsTimer=null; }
        dom.player.setAttribute('controls','');
        state.autoCinemaByLandscape=false;        syncFullscreenMainButton(false);
        try{ const tg=state.tg; if(tg&&tg.isFullscreen&&tg.exitFullscreen){ tg.exitFullscreen(); } }catch(_e){}
        try{ const tg=state.tg; if(tg&&tg.unlockOrientation) tg.unlockOrientation(); }catch(_e){}
        try{ if(screen&&screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); }catch(_e){}
      }
      updatePlaybackDock();
    }
    function hideState(){dom.state.classList.add('hide')}
    function clamp(n,min,max){ return Math.min(max,Math.max(min,n)); }
    function pipMinWidth(){ return Math.max(180, Math.floor(window.innerWidth*0.32)); }
    function pipMaxWidth(){ return Math.max(pipMinWidth(), Math.floor(window.innerWidth*0.72)); }
    function getSafeBounds(width,height){
      const margin=10;
      const bottomReserve=Math.max(74, Math.round(window.innerHeight*0.1));
      const maxLeft=Math.max(margin, window.innerWidth-width-margin);
      const maxTop=Math.max(margin, window.innerHeight-height-bottomReserve);
      return {minLeft:margin,minTop:margin,maxLeft,maxTop};
    }
    function applyPipRect(rect){
      if(!rect) return;
      const width=clamp(rect.width,pipMinWidth(),pipMaxWidth());
      const height=Math.round(width*9/16);
      const bounds=getSafeBounds(width,height);
      const left=clamp(rect.left,bounds.minLeft,bounds.maxLeft);
      const top=clamp(rect.top,bounds.minTop,bounds.maxTop);
      dom.playerMedia.style.width=width+'px';
      dom.playerMedia.style.height=height+'px';
      dom.playerMedia.style.left=left+'px';
      dom.playerMedia.style.top=top+'px';
      dom.playerMedia.style.right='auto';
      dom.playerMedia.style.bottom='auto';
      state.pipRect={left,top,width,height};
    }
    function snapPipToCorner(){
      if(!state.isPip || !state.pipRect) return;
      const rect=state.pipRect;
      const bounds=getSafeBounds(rect.width,rect.height);
      const corners=[
        {left:bounds.minLeft,top:bounds.minTop},
        {left:bounds.maxLeft,top:bounds.minTop},
        {left:bounds.minLeft,top:bounds.maxTop},
        {left:bounds.maxLeft,top:bounds.maxTop},
      ];
      let best=corners[0];
      let bestDist=Number.POSITIVE_INFINITY;
      for(const c of corners){
        const dx=rect.left-c.left;
        const dy=rect.top-c.top;
        const dist=Math.hypot(dx,dy);
        if(dist<bestDist){ bestDist=dist; best=c; }
      }
      applyPipRect({left:best.left,top:best.top,width:rect.width,height:rect.height});
    }
    function updatePipButtons(){
      const canPip=state.currentMediaType==='video' && !!state.currentItem;
      const hidePipToggleByOrientation=state.pseudoFullscreen||isLandscape();
      if(!canPip){
        dom.pipToggleBtn.classList.add('hide');
        dom.pipMiniPlayBtn.classList.add('hide');
        return;
      }
      if(state.isPip){
        dom.pipToggleBtn.classList.add('hide');
        dom.pipMiniPlayBtn.classList.remove('hide');
      }else{
        if(hidePipToggleByOrientation) dom.pipToggleBtn.classList.add('hide');
        else dom.pipToggleBtn.classList.remove('hide');
        dom.pipMiniPlayBtn.classList.add('hide');
      }
    }
    function updateMiniPlayIcon(){
      dom.pipMiniPlayBtn.textContent=dom.player.paused?'▶':'❚❚';
    }
    function actionPulse(){
      dom.playerMedia.classList.remove('action-flash');
      void dom.playerMedia.offsetWidth;
      dom.playerMedia.classList.add('action-flash');
    }
    function showFullscreenControls(){
      if(!state.pseudoFullscreen) return;
      document.body.classList.add('controls-visible');
      if(state.fullscreenControlsTimer) clearTimeout(state.fullscreenControlsTimer);
      state.fullscreenControlsTimer=setTimeout(()=>{
        if(state.pseudoFullscreen && !dom.player.paused){
          document.body.classList.remove('controls-visible');
        }
      },2200);
    }
    function fmtTime(sec){
      const s=Math.max(0,Math.floor(sec||0));
      const h=Math.floor(s/3600);
      const m=Math.floor((s%3600)/60);
      const r=s%60;
      return h>0?(h+':'+String(m).padStart(2,'0')+':'+String(r).padStart(2,'0')):(m+':'+String(r).padStart(2,'0'));
    }
    function updatePlaybackDock(){
      const show=!!state.currentItem && state.currentMediaType==='video' && !state.isPip;
      dom.playbackDock.classList.toggle('show',show);
      if(!show){ dom.volumePanel.classList.remove('show'); return; }
      const duration=(Number.isFinite(dom.player.duration)&&dom.player.duration>0)?dom.player.duration:0;
      const current=Math.max(0,dom.player.currentTime||0);
      const pct=duration>0?(current/duration)*100:0;
      dom.dockTimeline.value=String(Math.min(100,Math.max(0,pct)));
      dom.dockTime.textContent=fmtTime(current)+'/'+fmtTime(duration);
      const vol=String(Math.max(0,Math.min(1,dom.player.volume||0)));
      dom.volumeVertical.value=vol;
      dom.dockMuteBtn.textContent=(dom.player.muted || (dom.player.volume||0)===0)?'🔇':'🔊';
      dom.dockSpeedBtn.textContent=(state.playbackRate||dom.player.playbackRate||1)+'x';
      dom.dockMinBtn.style.display=(state.pseudoFullscreen||isLandscape())?'none':'';
    }
    function closePanels(){
      dom.searchPanel.classList.remove('show');
      dom.sortPanel.classList.remove('show');
      dom.volumePanel.classList.remove('show');
      dom.navSearchBtn.classList.remove('active');
      dom.navSortBtn.classList.remove('active');
    }
    function setPlayerMode(active){
      document.body.classList.toggle('player-mode',!!active);
      if(active){ closePanels(); }
      if(!active){ dom.playbackDock.classList.remove('show'); }
    }
    function enterPip(){
      if(state.currentMediaType!=='video' || !state.currentItem) return;
      if(state.pseudoFullscreen) togglePseudoFullscreen(false);
      state.isPip=true;
      dom.playerMedia.classList.remove('pip-exit');
      dom.playerMedia.classList.add('pip-active');
      dom.playerMedia.classList.remove('sticky-player');
      dom.player.removeAttribute('controls');
      if(!state.pipRect){
        const width=clamp(Math.floor(window.innerWidth*0.46),pipMinWidth(),pipMaxWidth());
        const height=Math.round(width*9/16);
        const bounds=getSafeBounds(width,height);
        state.pipRect={left:bounds.maxLeft,top:bounds.maxTop,width,height};
      }
      applyPipRect(state.pipRect);
      updatePipButtons();
      updatePlaybackDock();
      actionPulse();
    }
    function exitPip(){
      dom.playerMedia.classList.add('pip-exit');
      state.isPip=false;
      state.pipDrag=null;
      state.pipResize=null;
      dom.playerMedia.classList.remove('pip-active');
      setTimeout(()=>dom.playerMedia.classList.remove('pip-exit'),180);
      dom.playerMedia.classList.add('sticky-player');
      dom.player.setAttribute('controls','');
      dom.playerMedia.style.left='';
      dom.playerMedia.style.top='';
      dom.playerMedia.style.right='';
      dom.playerMedia.style.bottom='';
      dom.playerMedia.style.width='';
      dom.playerMedia.style.height='';
      updatePipButtons();
      updatePlaybackDock();
      actionPulse();
    }
    function resetPlayer(){
      exitPip();
      dom.playerWrap.classList.add('hide');
      dom.fullscreenFab.classList.add('hide');
      syncFullscreenMainButton(false);
      dom.player.pause();
      dom.player.removeAttribute('src');
      dom.player.load();
      dom.player.classList.remove('hide');
      dom.image.classList.add('hide');
      dom.image.removeAttribute('src');
      dom.playerMedia.style.transform='translateX(0px)';
      dom.playerMedia.style.filter='brightness('+state.brightness+')';
      dom.swipeHintLeft.style.opacity='0';
      dom.swipeHintRight.style.opacity='0';
      dom.swipeHintCenter.style.opacity='0';
      updatePlaybackDock();
    }
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
    function pickRandomItem(exceptId){
      const rows=state.channelRows||[];
      if(!rows.length) return null;
      const pool=exceptId?rows.filter((x)=>x.id!==exceptId):rows.slice();
      const finalPool=pool.length?pool:rows;
      return finalPool[Math.floor(Math.random()*finalPool.length)]||null;
    }
    function playNextAuto(){
      if(!state.channelRows.length) return;
      if(state.randomMode){
        const nextRandom=pickRandomItem(state.currentItem&&state.currentItem.id?state.currentItem.id:null);
        if(nextRandom){ openItem(nextRandom); }
        return;
      }
      swipeItem(1);
    }

    function navBack(){
      if(state.currentItem){ exitPip(); state.currentItem=null; dom.grid.classList.remove('hide'); dom.player.pause(); dom.playerWrap.classList.add('hide'); setPlayerMode(false); renderChannelItems(); return; }
      if(state.currentChannel){ state.currentChannel=null; dom.search.value=''; state.query=''; state.itemFilters={sort:'newest'}; dom.sortSelect.value='newest'; renderChannels(); return; }
    }

    function renderChannels(){
      try{ const tg=state.tg; if(tg&&tg.unlockOrientation){ tg.unlockOrientation(); } }catch(_e){}
      setPlayerMode(false);
      dom.itemControls.classList.add('hide');
      dom.crumb.textContent='Home'; dom.hero.classList.add('hide'); resetPlayer(); dom.back.classList.add('hide'); dom.backFab.classList.add('hide'); dom.grid.classList.remove('hide'); dom.loadMoreWrap.classList.add('hide');
      const rows=filtered(state.channels,(x)=>x.displayName);
      if(!rows.length){dom.grid.innerHTML=''; showState('Chưa có kênh phim nào hoặc không khớp từ khóa.'); return;}
      hideState();
      dom.grid.innerHTML=rows.map((x)=>cardHtml(x.displayName,x.itemCount+' phim con',x.posterUrl,'VIP Full',null)).join('');
      bindCardClicks(dom.grid,(idx)=>openChannel(rows[idx]));
    }
    function renderChannelItems(){
      const rows=state.channelRows;
      if(!rows.length){dom.grid.innerHTML=''; dom.loadMoreWrap.classList.add('hide'); showState('Kênh này chưa có phim.'); return;}
      hideState();
      const visible=rows.slice(0,state.visibleCount);
      dom.grid.innerHTML=visible.map((x)=>{
        const dateText=x.createdAt?new Date(x.createdAt).toLocaleDateString('vi-VN'):'';
        const viewsText='👁 '+Number(x.viewCount||0);
        const sub=[dateText,viewsText].filter(Boolean).join(' • ');
        return cardHtml(x.title,sub,x.posterUrl,(x.mediaType==='image'?'nh':'VIP Full'),x.previewUrl||null);
      }).join('');
      bindCardClicks(dom.grid,(idx)=>openItem(visible[idx]));
      if(state.visibleCount<rows.length){dom.loadMoreWrap.classList.remove('hide');}else{dom.loadMoreWrap.classList.add('hide');}
    }
    async function openChannel(channel){
      state.currentChannel=channel; resetPlayer(); dom.grid.classList.remove('hide'); setPlayerMode(false);
      dom.itemControls.classList.remove('hide');
      dom.crumb.textContent='Home > '+channel.displayName; dom.back.classList.remove('hide'); dom.backFab.classList.remove('hide');
      dom.hero.innerHTML='<h3 style="margin:0">'+channel.displayName+'</h3><p class="status" style="margin:8px 0 0">Tổng '+channel.itemCount+' phim</p>';
      dom.hero.classList.remove('hide');
      const q=new URLSearchParams();
      const serverSort=(state.itemFilters.sort==='newest'||state.itemFilters.sort==='oldest'||state.itemFilters.sort==='random'||state.itemFilters.sort==='most_viewed'||state.itemFilters.sort==='least_viewed'||state.itemFilters.sort==='unseen')?state.itemFilters.sort:'newest';
      if(serverSort) q.set('sort',serverSort);
      
      const query=q.toString();
      const items=await api('/api/cinema/channels/'+channel.id+'/items'+(query?('?'+query):''));
      state.itemsByChannel.set(channel.id,items);
      const rows=filtered(items,(x)=>x.title);
      state.channelRows=rows;
      state.visibleCount=state.pageSize;
      renderChannelItems();
    }

    async function openItem(item){
      state.currentItem=item;
      setPlayerMode(true);
      const detail=await api('/api/cinema/items/'+item.id);
      const links=await api('/api/cinema/items/'+item.id+'/playback');
      if(links&&links.external&&links.fullUrl){
        dom.playerDesc.textContent=(links.externalLabel||'Mở ngoài ứng dụng');
        try{ window.open(links.fullUrl,'_blank'); }catch(_e){}
        showState('Phim này là file lớn của Telegram, đã mở trong Telegram để phát.',false);
        return;
      }
      dom.crumb.textContent='Home > '+detail.channel.displayName+' > '+detail.title;
      dom.playerTitle.textContent=detail.title;
      const mediaType=(links&&links.mediaType)||detail.mediaType||item.mediaType||'video';
      state.currentMediaType=mediaType;
      if(mediaType!=='video' && state.isPip) exitPip();
      dom.playerDesc.textContent='';
      await api('/api/cinema/items/'+item.id+'/view',{method:'POST'}).catch(()=>{});
      if(mediaType==='image'){
        dom.player.pause();
        dom.player.classList.add('hide');
        dom.image.classList.remove('hide');
        dom.image.src=links.fullUrl;
      }else{
        dom.image.classList.add('hide');
        dom.image.removeAttribute('src');
        dom.player.classList.remove('hide');
        dom.player.muted=true;
        dom.player.volume=0;
        dom.player.playbackRate=state.playbackRate||1;
        dom.player.src=links.fullUrl;
      }
      dom.playerMedia.style.filter='brightness('+state.brightness+')';
      dom.grid.classList.add('hide');
      dom.loadMoreWrap.classList.add('hide');
      dom.playerWrap.classList.remove('hide');
      dom.fullscreenFab.classList.remove('hide');
      if(!state.isPip){ dom.playerWrap.scrollIntoView({behavior:'smooth',block:'start'}); }
      updatePipButtons();
      updatePlaybackDock();
      if(mediaType!=='image'){ dom.player.play().catch(()=>{}); }
      const related=detail.related||[];
      if(!related.length){dom.related.innerHTML='<div class="empty">Không có phim liên quan trong kênh.</div>'; return;}
      dom.related.innerHTML=related.map((x)=>cardHtml(x.title,'',x.posterUrl,'VIP Full',null)).join('');
      bindCardClicks(dom.related,(idx)=>openItem(related[idx]));
    }

    async function boot(){
      try{        await api('/api/cinema/session/me');
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

    function applySearchInput(val){
      state.query=val||'';
      dom.search.value=state.query;
      dom.bottomSearchInput.value=state.query;
      state.currentChannel?openChannel(state.currentChannel):renderChannels();
    }
    dom.search.addEventListener('input',()=>{ applySearchInput(dom.search.value); });
    dom.bottomSearchInput.addEventListener('input',()=>{ applySearchInput(dom.bottomSearchInput.value); });
    dom.sortSelect.addEventListener('change',()=>{ state.itemFilters.sort=dom.sortSelect.value||'newest'; if(state.currentChannel) openChannel(state.currentChannel); });
    dom.pipToggleBtn.addEventListener('click',()=>{ enterPip(); });
    dom.pipMiniPlayBtn.addEventListener('click',(e)=>{ e.stopPropagation(); if(dom.player.paused) dom.player.play().catch(()=>{}); else dom.player.pause(); updateMiniPlayIcon(); });
    dom.dockPrevBtn.addEventListener('click',()=>{ if(!swipeItem(-1)) showState('Đang ở phim đầu tiên.'); });
    dom.dockNextBtn.addEventListener('click',()=>{ if(!swipeItem(1)) showState('Đang ở phim cuối cùng.'); });
    dom.dockPlayBtn.addEventListener('click',()=>{ if(dom.player.paused) dom.player.play().catch(()=>{}); else dom.player.pause(); updateMiniPlayIcon(); actionPulse(); });
    dom.dockTimeline.addEventListener('input',()=>{
      if(state.currentMediaType!=='video' || !Number.isFinite(dom.player.duration) || dom.player.duration<=0) return;
      const pct=Number(dom.dockTimeline.value||0)/100;
      dom.player.currentTime=Math.max(0,Math.min(dom.player.duration,dom.player.duration*pct));
      updatePlaybackDock();
    });
    dom.dockMuteBtn.addEventListener('click',()=>{
      if(state.currentMediaType!=='video') return;
      const willOpen=!dom.volumePanel.classList.contains('show');
      closePanels();
      if(willOpen) dom.volumePanel.classList.add('show');
      dom.player.muted=false;
      updatePlaybackDock();
    });
    dom.volumeVertical.addEventListener('input',()=>{
      if(state.currentMediaType!=='video') return;
      dom.player.muted=false;
      dom.player.volume=Math.max(0,Math.min(1,Number(dom.volumeVertical.value||0)));
      updatePlaybackDock();
    });
    dom.dockSpeedBtn.addEventListener('click',()=>{
      if(state.currentMediaType!=='video') return;
      const speeds=[1,1.25,1.5,2];
      const cur=dom.player.playbackRate||1;
      const idx=Math.max(0,speeds.indexOf(cur));
      const next=speeds[(idx+1)%speeds.length];
      state.playbackRate=next;
      dom.player.playbackRate=next;
      updatePlaybackDock();
    });
    dom.dockRotateBtn.addEventListener('click',()=>{ togglePseudoFullscreen(true); });
    dom.dockMinBtn.addEventListener('click',()=>{ enterPip(); });
    dom.navHomeBtn.addEventListener('click',()=>{ closePanels(); state.currentItem=null; state.currentChannel=null; state.query=''; dom.sortSelect.value='newest'; state.itemFilters.sort='newest'; renderChannels(); });
    dom.navBackBtn.addEventListener('click',()=>{ closePanels(); navBack(); });
    dom.navSearchBtn.addEventListener('click',()=>{
      const willOpen=!dom.searchPanel.classList.contains('show');
      closePanels();
      if(willOpen){
        dom.searchPanel.classList.add('show');
        dom.navSearchBtn.classList.add('active');
        setTimeout(()=>dom.bottomSearchInput.focus(),30);
      }
    });
    dom.navSortBtn.addEventListener('click',()=>{
      const willOpen=!dom.sortPanel.classList.contains('show');
      closePanels();
      if(willOpen){
        dom.sortPanel.classList.add('show');
        dom.navSortBtn.classList.add('active');
      }
    });
    [...document.querySelectorAll('.sort-opt')].forEach((btn)=>{
      btn.addEventListener('click',()=>{
        const val=btn.getAttribute('data-sort')||'newest';
        state.itemFilters.sort=val;
        dom.sortSelect.value=val;
        closePanels();
        if(state.currentChannel) openChannel(state.currentChannel);
      });
    });

    if(dom.randomPickBtn){ dom.randomPickBtn.addEventListener('click',()=>{
      state.randomMode=!state.randomMode;
      dom.randomPickBtn.classList.toggle('active',state.randomMode);
      dom.randomPickBtn.textContent=state.randomMode?'Ngẫu nhiên: Bật':'Ngẫu nhiên: Tắt';
      if(state.randomMode){
        if(!state.channelRows.length){ showState('Không có phim phù hợp để chọn ngẫu nhiên.'); return; }
        const nextRandom=pickRandomItem(state.currentItem&&state.currentItem.id?state.currentItem.id:null);
        if(nextRandom){ openItem(nextRandom); }
      }
    }); }
    dom.back.addEventListener('click',()=>navBack());
    dom.backFab.addEventListener('click',()=>navBack());
    dom.loadMoreBtn.addEventListener('click',()=>{
      if(!state.currentChannel) return;
      state.visibleCount=Math.min(state.visibleCount+state.pageSize,state.channelRows.length);
      renderChannelItems();
    });
    dom.retry.addEventListener('click',()=>location.reload());
    dom.player.addEventListener('ended',()=>{ playNextAuto(); });
    dom.player.addEventListener('play',updateMiniPlayIcon);
    dom.player.addEventListener('pause',updateMiniPlayIcon);
    dom.player.addEventListener('play',()=>{ if(state.pseudoFullscreen) showFullscreenControls(); });
    dom.player.addEventListener('pause',()=>{ if(state.pseudoFullscreen) document.body.classList.add('controls-visible'); });
    dom.player.addEventListener('timeupdate',updatePlaybackDock);
    dom.player.addEventListener('loadedmetadata',updatePlaybackDock);
    dom.player.addEventListener('ratechange',updatePlaybackDock);
    dom.player.addEventListener('volumechange',updatePlaybackDock);
    dom.playerMedia.addEventListener('touchstart',()=>{ if(state.pseudoFullscreen) showFullscreenControls(); },{passive:true});
    dom.playerMedia.addEventListener('mousemove',()=>{ if(state.pseudoFullscreen) showFullscreenControls(); });
    dom.playerMedia.addEventListener('click',()=>{ if(state.pseudoFullscreen) showFullscreenControls(); });
    
    
    function swipeItem(direction){
      if(!state.currentItem || !state.channelRows.length) return false;
      const idx=state.channelRows.findIndex((x)=>x.id===state.currentItem.id);
      if(idx<0) return false;
      const nextIdx=direction>0?idx+1:idx-1;
      if(nextIdx<0||nextIdx>=state.channelRows.length) return false;
      dom.swipeHintCenter.textContent=direction>0?'Đang mở phim sau...':'Đang mở phim trước...';
      dom.swipeHintCenter.style.opacity='1';
      setTimeout(()=>{ dom.swipeHintCenter.style.opacity='0'; },450);
      actionPulse();
      openItem(state.channelRows[nextIdx]);
      return true;
    }
    function clearTouchTimers(){
      if(state.touch.longPressTimer){ clearTimeout(state.touch.longPressTimer); state.touch.longPressTimer=null; }
      if(state.touch.rightBoostTimer){ clearTimeout(state.touch.rightBoostTimer); state.touch.rightBoostTimer=null; }
    }
    function stopBoost(){
      if(state.touch.isBoosting){ state.touch.isBoosting=false; if(state.currentMediaType==='video'){ dom.player.playbackRate=state.playbackRate||1; } }
    }
    function resetGestureHints(){
      dom.swipeHintLeft.style.opacity='0';
      dom.swipeHintRight.style.opacity='0';
      dom.swipeHintCenter.style.opacity='0';
    }
    function seekByDelta(delta){
      if(state.currentMediaType!=='video' || !Number.isFinite(dom.player.duration) || dom.player.duration<=0) return;
      const next=Math.max(0,Math.min(dom.player.duration,(dom.player.currentTime||0)+delta));
      dom.player.currentTime=next;
      dom.swipeHintCenter.textContent=(delta>0?'+':'')+Math.round(delta)+'s';
      dom.swipeHintCenter.style.opacity='1';
      setTimeout(()=>{ dom.swipeHintCenter.style.opacity='0'; },450);
    }
    function applyBrightness(value){
      state.brightness=Math.max(0.3,Math.min(1.7,value));
      dom.playerMedia.style.filter='brightness('+state.brightness.toFixed(2)+')';
      dom.swipeHintLeft.textContent='Độ sáng '+Math.round(state.brightness*100)+'%';
      dom.swipeHintLeft.style.opacity='1';
    }
    function applyVolume(value){
      if(state.currentMediaType!=='video') return;
      const next=Math.max(0,Math.min(1,value));
      dom.player.muted=false;
      dom.player.volume=next;
      dom.swipeHintRight.textContent='Âm lượng '+Math.round(next*100)+'%';
      dom.swipeHintRight.style.opacity='1';
    }
    dom.playerMedia.addEventListener('pointerdown',(e)=>{
      if(!state.isPip) return;
      const target=e.target;
      const edgeEl=target&&target.closest?target.closest('[data-pip-edge]'):null;
      const edgeName=edgeEl?edgeEl.getAttribute('data-pip-edge'):'';
      const rectNow=state.pipRect||dom.playerMedia.getBoundingClientRect();
      const edge=28;
      const nearRight=e.clientX>=rectNow.right-edge && e.clientX<=rectNow.right+edge;
      const nearBottom=e.clientY>=rectNow.bottom-edge && e.clientY<=rectNow.bottom+edge;
      const nearLeft=Math.abs(e.clientX-rectNow.left)<=edge;
      const nearTop=Math.abs(e.clientY-rectNow.top)<=edge;
      const isResizeZone=!!edgeEl || (nearRight&&nearBottom)||(nearRight&&!nearTop)||(nearBottom&&!nearLeft)||nearLeft||nearTop;
      const isInside=target===dom.playerMedia||dom.playerMedia.contains(target);
      const isActionBtn=target===dom.pipToggleBtn||target===dom.pipMiniPlayBtn;
      if(!isResizeZone && !isInside) return;
      if(isActionBtn) return;
      const rect=rectNow;
      if(isResizeZone){
        state.pipResize={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startWidth:rect.width,startHeight:rect.height,edge:edgeName||'corner'};
      }else{
        state.pipDrag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startLeft:rect.left,startTop:rect.top,moved:false};
      }
      dom.playerMedia.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    });
    dom.playerMedia.addEventListener('pointermove',(e)=>{
      if(!state.isPip) return;
      if(state.pipResize && state.pipResize.pointerId===e.pointerId){
        const dx=e.clientX-state.pipResize.startX;
        const dy=e.clientY-state.pipResize.startY;
        const edgeName=state.pipResize.edge||'corner';
        let delta=Math.abs(dx)>=Math.abs(dy)?dx:(dy*16/9);
        if(edgeName==='left') delta=-dx;
        if(edgeName==='bottom') delta=dy*16/9;
        const nextWidth=clamp(state.pipResize.startWidth+delta,pipMinWidth(),pipMaxWidth());
        const nextHeight=Math.round(nextWidth*9/16);
        const base=state.pipRect||dom.playerMedia.getBoundingClientRect();
        applyPipRect({left:base.left,top:base.top,width:nextWidth,height:nextHeight});
        e.preventDefault();
        return;
      }
      if(state.pipDrag && state.pipDrag.pointerId===e.pointerId){
        const dx=e.clientX-state.pipDrag.startX;
        const dy=e.clientY-state.pipDrag.startY;
        if(Math.abs(dx)>4||Math.abs(dy)>4){ state.pipDrag.moved=true; }
        const base=state.pipRect||dom.playerMedia.getBoundingClientRect();
        applyPipRect({left:state.pipDrag.startLeft+dx,top:state.pipDrag.startTop+dy,width:base.width,height:base.height});
        e.preventDefault();
      }
    });
    function endPipPointer(e){
      let changed=false;
      let shouldRestore=false;
      if(state.pipDrag && state.pipDrag.pointerId===e.pointerId){
        shouldRestore=!state.pipDrag.moved;
        state.pipDrag=null;
        changed=true;
      }
      if(state.pipResize && state.pipResize.pointerId===e.pointerId){ state.pipResize=null; changed=true; }
      if(changed){
        try{ dom.playerMedia.releasePointerCapture(e.pointerId); }catch(_e){}
        snapPipToCorner();
        if(shouldRestore){ exitPip(); }
      }
    }
    dom.playerMedia.addEventListener('pointerup',endPipPointer);
    dom.playerMedia.addEventListener('pointercancel',endPipPointer);
    dom.playerMedia.addEventListener('touchstart',(e)=>{
      if(state.isPip) return;
      if(!state.currentItem) return;
      if(Date.now()<state.suppressTapUntil){ e.preventDefault(); return; }
      const t=e.touches&&e.touches[0]; if(!t) return;
      const rect=dom.playerMedia.getBoundingClientRect();
      const relX=t.clientX-rect.left;
      const now=Date.now();
      const side=(relX<rect.width/2)?'left':'right';
      if(state.currentMediaType==='video' && now-state.lastTapAt<=280 && state.lastTapSide===side){
        clearTouchTimers();
        stopBoost();
        state.touch.active=false;
        state.touch.mode='pending';
        seekByDelta(side==='left'?-15:15);
        state.lastTapAt=0;
        state.lastTapSide='none';
        return;
      }
      state.lastTapAt=now;
      state.lastTapSide=side;
      state.touch.active=true;
      state.touch.startX=t.clientX;
      state.touch.startY=t.clientY;
      state.touch.lastX=t.clientX;
      state.touch.lastY=t.clientY;
      state.touch.startVolume=dom.player.volume;
      state.touch.startBrightness=state.brightness;
      state.touch.startCurrentTime=dom.player.currentTime||0;
      state.touch.seekTime=state.touch.startCurrentTime;
      state.touch.isSeeking=false;
      state.touch.isBoosting=false;
      state.touch.mode=(relX<=rect.width/3)?'brightness':((relX>=rect.width*2/3)?'volume':'channel');
      resetGestureHints();
      clearTouchTimers();
      state.touch.longPressTimer=setTimeout(()=>{
        if(!state.touch.active || state.currentMediaType!=='video') return;
        state.touch.isSeeking=true;
        state.touch.mode='seek';
        // Reset seek baseline right when long-press activates to avoid big negative dx jumps.
        state.touch.startX=state.touch.lastX;
        state.touch.startCurrentTime=dom.player.currentTime||0;
        state.touch.seekTime=state.touch.startCurrentTime;
        dom.swipeHintCenter.textContent='Tua ngang';
        dom.swipeHintCenter.style.opacity='1';
      },220);
      if(state.currentMediaType==='video' && relX>=rect.width*0.75){
        state.touch.rightBoostTimer=setTimeout(()=>{
          if(!state.touch.active || state.touch.isSeeking) return;
          state.touch.isBoosting=true;
          dom.player.playbackRate=2;
          dom.swipeHintCenter.textContent='Tốc độ x2';
          dom.swipeHintCenter.style.opacity='1';
        },280);
      }
    },{passive:true});
    dom.playerMedia.addEventListener('touchmove',(e)=>{
      if(state.isPip) return;
      if(!state.touch.active || !state.currentItem) return;
      const t=e.touches&&e.touches[0]; if(!t) return;
      const rect=dom.playerMedia.getBoundingClientRect();
      const relX=t.clientX-rect.left;
      const dx=t.clientX-state.touch.startX;
      const dy=t.clientY-state.touch.startY;
      state.touch.lastX=t.clientX;
      state.touch.lastY=t.clientY;
      if(state.touch.isSeeking && state.currentMediaType==='video' && Number.isFinite(dom.player.duration) && dom.player.duration>0){
        e.preventDefault();
        const secPerPx=Math.max(0.03,dom.player.duration/rect.width);
        const dxSeek=t.clientX-state.touch.startX;
        const next=Math.max(0,Math.min(dom.player.duration,state.touch.startCurrentTime+dxSeek*secPerPx));
        dom.player.currentTime=next;
        state.touch.seekTime=next;
        dom.swipeHintCenter.textContent='Tua '+Math.round(next)+'s';
        dom.swipeHintCenter.style.opacity='1';
        return;
      }
      if(Math.abs(dx)>12 || Math.abs(dy)>12){ clearTouchTimers(); }
      if(state.touch.mode==='brightness'){
        e.preventDefault();
        if(Math.abs(dy)>=Math.abs(dx)){
          applyBrightness(state.touch.startBrightness + (-dy/rect.height)*1.2);
        }
        return;
      }
      if(state.touch.mode==='volume'){
        e.preventDefault();
        applyVolume(state.touch.startVolume + (-dy/rect.height)*1.1);
        return;
      }
      if(state.touch.mode==='channel' && Math.abs(dy)>40){
        e.preventDefault();
        dom.swipeHintCenter.textContent=(dy<0)?'Vuốt lên để phim tiếp':'Vuốt xuống để phim trước';
        dom.swipeHintCenter.style.opacity='1';
      }
    },{passive:false});
    dom.playerMedia.addEventListener('touchend',()=>{
      if(state.isPip) return;
      if(!state.touch.active) return;
      const dy=state.touch.lastY-state.touch.startY;
      const dx=state.touch.lastX-state.touch.startX;
      if(state.touch.isSeeking && state.currentMediaType==='video'){
        dom.player.currentTime=Math.max(0,Math.min(dom.player.duration||0,state.touch.seekTime||dom.player.currentTime||0));
        state.suppressTapUntil=Date.now()+280;
      }
      if(!state.touch.isSeeking && state.touch.mode==='channel' && Math.abs(dy)>=70 && Math.abs(dx)<80){
        if(dy<0){ swipeItem(1); }else{ swipeItem(-1); }
      }
      state.touch.active=false;
      clearTouchTimers();
      stopBoost();
      state.touch.mode='pending';
      resetGestureHints();
    },{passive:true});
    dom.playerMedia.addEventListener('touchcancel',()=>{
      if(state.isPip) return;
      state.touch.active=false;
      clearTouchTimers();
      stopBoost();
      state.touch.mode='pending';
      resetGestureHints();
    },{passive:true});
    dom.playerMedia.addEventListener('click',(e)=>{
      if(Date.now()<state.suppressTapUntil){
        e.preventDefault();
        e.stopPropagation();
      }
    },true);
    dom.prevItemBtn.addEventListener('click',()=>{ if(!swipeItem(-1)) showState('Đang ở phim đầu tiên.'); });
    dom.nextItemBtn.addEventListener('click',()=>{ if(!swipeItem(1)) showState('Đang ở phim cuối cùng.'); });
    function scheduleOrientationCheck(){
      if(state.orientTimer) clearTimeout(state.orientTimer);
      /* Ch 200ms  browser cp nht xong kch thc viewport sau khi xoay */
      state.orientTimer=setTimeout(()=>{
        onOrientationLikeChange();
        if(state.isPip && state.pipRect){ applyPipRect(state.pipRect); }
        updatePipButtons();
        updatePlaybackDock();
      },200);
    }
    window.addEventListener('orientationchange',scheduleOrientationCheck,{passive:true});
    if(screen&&screen.orientation){
      screen.orientation.addEventListener('change',scheduleOrientationCheck);
    }
    window.addEventListener('resize',scheduleOrientationCheck,{passive:true});
    const pressableSelector='button,.btn,.bottom-nav-btn,.dock-btn,.dock-speed,.sort-opt,.load-more,.fullscreen-fab';
    function clearPressed(){
      document.querySelectorAll('.is-pressed').forEach((el)=>el.classList.remove('is-pressed'));
    }
    document.addEventListener('pointerdown',(e)=>{
      const t=e.target&&e.target.closest?e.target.closest(pressableSelector):null;
      if(t) t.classList.add('is-pressed');
    },{passive:true});
    document.addEventListener('pointerup',clearPressed,{passive:true});
    document.addEventListener('pointercancel',clearPressed,{passive:true});
    document.addEventListener('pointerleave',clearPressed,{passive:true});
    updatePipButtons();
    initTelegramWebApp();
    boot();
  </script>
</body>
</html>`);
}



