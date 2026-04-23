export const cssChunk3 = `
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
      bottom:calc(82px + env(safe-area-inset-bottom));
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
    .volume-panel.show{display:none!important}
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
    .feed-swipe-out{
      transition:transform .22s cubic-bezier(.22,.78,.18,1),opacity .22s ease!important;
      opacity:.92;
      z-index:3;
    }
    .feed-next-stage{
      position:absolute;
      inset:0;
      z-index:2;
      display:block;
      pointer-events:none;
      transform:translateY(100%);
      opacity:0;
      overflow:hidden;
      transition:transform .22s cubic-bezier(.22,.78,.18,1),opacity .22s ease;
    }
    .feed-next-stage.show{
      opacity:1;
    }
    .feed-next-card{
      position:absolute;
      inset:0;
      border-radius:0;
      overflow:hidden;
      border:none;
      background:#000;
      box-shadow:none;
      transform:scale(1);
    }
    .feed-next-thumb{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      object-fit:cover;
      opacity:.9;
      filter:brightness(.82) saturate(.96);
    }
    .feed-next-video{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      object-fit:cover;
      background:#000;
      z-index:0;
      display:block;
    }
    .feed-next-stage.has-video .feed-next-thumb{
      opacity:0;
    }
    .feed-next-fade{
      position:absolute;
      inset:0;
      background:linear-gradient(180deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,.22) 38%,rgba(0,0,0,.82) 100%);
    }
    .feed-next-label{
      position:absolute;
      left:14px;
      right:14px;
      bottom:18px;
      z-index:1;
      font-size:12px;
      line-height:1.35;
      color:#eef2ff;
      text-shadow:0 1px 2px rgba(0,0,0,.65);
    }
`;
