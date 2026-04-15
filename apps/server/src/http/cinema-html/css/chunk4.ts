export const cssChunk4 = `
    .feed-next-label .kicker{
      display:inline-block;
      margin-bottom:8px;
      padding:4px 9px;
      border-radius:999px;
      background:rgba(69,208,255,.16);
      border:1px solid rgba(69,208,255,.28);
      font-size:11px;
      color:#dff6ff;
    }
    body.feed-mode.swipe-up .feed-next-stage.show{transform:translateY(0)}
    body.feed-mode.swipe-up .feed-swipe-out{transform:translateY(-100%)!important}
    body.feed-mode.swipe-down .feed-next-stage{transform:translateY(-100%)}
    body.feed-mode.swipe-down .feed-next-stage.show{transform:translateY(0)}
    body.feed-mode.swipe-down .feed-swipe-out{transform:translateY(100%)!important}
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
      grid-template-columns:repeat(5,1fr);
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
    body.feed-mode .top,
    body.feed-mode .toolbar-wrap,
    body.feed-mode #crumb,
    body.feed-mode #hero,
    body.feed-mode #grid,
    body.feed-mode #loadMoreWrap,
    body.feed-mode .related,
    body.feed-mode .player-nav,
    body.feed-mode #playerTitle,
    body.feed-mode #playerDesc,
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
      width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:cover!important;border-radius:0!important;
    }
    body.feed-mode .playback-dock{display:none!important}
    .feed-home-btn{
      position:fixed;
      top:max(12px,env(safe-area-inset-top));
      left:max(12px,env(safe-area-inset-left));
      z-index:10045;
      border:1px solid var(--line);
      background:rgba(15,20,32,.85);
      color:var(--text);
      border-radius:10px;
      padding:8px 10px;
      display:none;
    }
    body.feed-mode .feed-home-btn{display:inline-flex}
    .feed-channel-btn{
      position:fixed;
      right:max(10px,env(safe-area-inset-right));
      top:42%;
      transform:translateY(-50%);
      z-index:10045;
      width:44px;height:44px;border-radius:999px;
      border:1px solid rgba(255,255,255,.4);
      background:rgba(15,20,32,.78);
      color:#fff;font-weight:700;
      display:none;align-items:center;justify-content:center;
    }
`;
