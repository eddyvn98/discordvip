export const coreCss = `

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
    .sticky-player{position:sticky;top:0;z-index:30;background:var(--bg);transition:padding .2s ease}
    .player-info-sticky{padding:0 0 12px}
    #playerTitle{margin:0;font-size:18px;font-weight:700;line-height:1.4}
    #playerDesc{margin:4px 0 0;font-size:13px;color:var(--muted)}
    
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
    /* === Pseudo-fullscreen: chiếm toàn bộ màn hình kể cả khi xoay ngang === */
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
    /* Ẩn các phần không cần khi fullscreen */
    .pseudo-fullscreen #playerStickyHeader #playerTitle,
    .pseudo-fullscreen #playerStickyHeader #playerDesc,
    .pseudo-fullscreen .player-info-sticky,
    .pseudo-fullscreen .related{display:none!important}
    .pseudo-fullscreen .player-nav{position:fixed!important;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));bottom:auto;z-index:10001;display:flex!important}
    /* Video/Ảnh chiếm toàn bộ không gian */
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
      /* Khi landscape + pseudo-fullscreen: video chiếm toàn màn không bị controls che */
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
    body.player-mode #playerStickyHeader.sticky-player{
      margin-left:-16px;
      margin-right:-16px;
      padding-left:16px;
      padding-right:16px;
      background:var(--bg);
      border-bottom:1px solid var(--line);
    }
    body.player-mode #playerMedia{
      margin-left:-16px;
      margin-right:-16px;
      border-radius:0;
    }
    body.player-mode #playerMedia video,
    body.player-mode #playerMedia .viewer-image{border-radius:0}
    body.player-mode .player-info-sticky,
    body.player-mode .related{padding-left:0;padding-right:0}
    body.player-mode .pseudo-fullscreen .player-nav{display:flex!important}
    body.player-mode .pseudo-fullscreen #playerMedia{
      margin-left:0;
      margin-right:0;
      border-radius:0!important;
    }
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
    .dock-timeline-row{display:flex;align-items:center;gap:8px;width:100%}
    .dock-controls-row{display:flex;align-items:center;gap:8px;width:100%;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch}
    .dock-btn,.dock-speed{border:1px solid var(--line);background:#0f1420;color:var(--text);border-radius:8px;padding:8px 10px;font-size:12px;min-width:44px}
    .dock-time{font-size:11px;color:var(--muted);min-width:78px;text-align:center}
    .dock-range{flex:1;min-width:120px}
    .dock-range input{width:100%}
    .dock-vol{display:none}
    #relatedGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
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
    .volume-panel input{writing-mode:vertical-lr;direction:rtl;width:26px;height:120px}
    .pip-resize-zone{position:absolute;z-index:10013;display:none;pointer-events:none}
    .player-media.pip-active .pip-resize-zone{display:block;pointer-events:auto;touch-action:none}
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
    /* Feed mode styles */
    body.feed-mode .top,
    body.feed-mode .toolbar-wrap,
    body.feed-mode #crumb,
    body.feed-mode #hero,
    body.feed-mode #grid,
    body.feed-mode #loadMoreWrap,
    body.feed-mode .related,
    body.feed-mode .player-nav,
    body.feed-mode #playerStickyHeader #playerTitle,
    body.feed-mode #playerStickyHeader #playerDesc,
    body.feed-mode .player-info-sticky,
    body.feed-mode .bottom-nav{display:none!important}
    body.feed-mode .wrap{padding:0!important;max-width:none}
    body.feed-mode #playerWrap{
      display:block!important;
      position:fixed!important;
      inset:0!important;
      z-index:10040!important;
      margin:0!important;
      border:none!important;
      border-radius:0!important;
      background:#000!important;
      padding:0!important;
    }
    body.feed-mode #playerStickyHeader{position:static!important;margin:0!important;padding:0!important;border:none!important}
    body.feed-mode #playerMedia{
      position:fixed!important;
      inset:0!important;
      width:100dvw!important;
      height:100dvh!important;
      border-radius:0!important;
      aspect-ratio:auto!important;
      background:#000!important;
      z-index:10041!important;
    }
    body.feed-mode #playerMedia video,body.feed-mode #playerMedia .viewer-image{
      width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;border-radius:0!important;
    }
    .feed-swipe-out{transition:transform .22s cubic-bezier(.22,.78,.18,1),opacity .22s ease!important;opacity:.92;z-index:3}
    .feed-next-stage{position:absolute;inset:0;z-index:2;display:block;pointer-events:none;transform:translateY(100%);opacity:0;overflow:hidden;transition:transform .22s cubic-bezier(.22,.78,.18,1),opacity .22s ease}
    .feed-next-stage.show{opacity:1}
    .feed-next-card{position:absolute;inset:0;border-radius:0;overflow:hidden;border:none;background:#000;box-shadow:none;transform:scale(1)}
    .feed-next-thumb{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9;filter:brightness(.82) saturate(.96)}
    .feed-next-fade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,.22) 38%,rgba(0,0,0,.82) 100%)}
    .feed-next-label{position:absolute;left:14px;right:14px;bottom:18px;z-index:1;font-size:12px;line-height:1.35;color:#eef2ff;text-shadow:0 1px 2px rgba(0,0,0,.65)}
    .feed-next-label .kicker{display:inline-block;margin-bottom:8px;padding:4px 9px;border-radius:999px;background:rgba(69,208,255,.16);border:1px solid rgba(69,208,255,.28);font-size:11px;color:#dff6ff}
    .feed-home-btn{position:fixed;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));z-index:10045;border:1px solid var(--line);background:rgba(15,20,32,.85);color:var(--text);border-radius:10px;padding:8px 10px;display:none}
    body.feed-mode .feed-home-btn{display:inline-flex}
    .feed-channel-btn{position:fixed;right:max(10px,env(safe-area-inset-right));top:42%;transform:translateY(-50%);z-index:10045;width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:rgba(15,20,32,.78);color:#fff;font-weight:700;display:none;align-items:center;justify-content:center}
    body.feed-mode .feed-channel-btn{display:flex}
    .feed-channel-drawer{position:fixed;top:0;right:0;bottom:0;width:min(86vw,360px);z-index:10060;background:#0c1220;border-left:1px solid var(--line);transform:translateX(104%);transition:transform .2s ease;display:flex;flex-direction:column}
    .feed-channel-drawer.show{transform:translateX(0)}
    .feed-drawer-head{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid var(--line)}
    .feed-drawer-list{padding:10px;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .feed-item-btn{border:1px solid var(--line);background:#0f1420;color:var(--text);border-radius:10px;padding:0;text-align:left;overflow:hidden}
    .feed-item-thumb{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:#1a2233}
    .feed-item-cap{padding:8px;font-size:12px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
`;
