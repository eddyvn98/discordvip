export const cssChunk2 = `
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
    body.player-mode .toolbar-wrap,
    body.player-mode #crumb,
    body.player-mode #hero{display:none!important}
    body.player-mode #grid,
    body.player-mode #loadMoreWrap{display:none!important}
    body.player-mode .wrap{padding-top:0}
    body.player-mode .player{border:none;background:transparent;border-radius:0;padding:0}
    body.player-mode .player-nav{display:flex!important}
    body.player-mode #playerTitle,
    body.player-mode #playerDesc{padding-left:12px;padding-right:12px}
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
    @media (min-width:1180px){
      body.player-mode .top{display:flex!important}
      body.player-mode .desktop-side-card{display:flex!important}
      body.player-mode .player-nav{display:flex!important}
    }
    @media (max-width:1179px){
      body.player-mode .top{display:flex!important}
      body.player-mode .related{padding-left:12px;padding-right:12px}
      body.player-mode #playerMedia.sticky-player{
        margin-left:-14px;
        margin-right:-14px;
        border-radius:0;
        border-left:none;
        border-right:none;
      }
      body.player-mode #playerMedia.sticky-player video,
      body.player-mode #playerMedia.sticky-player .viewer-image{border-radius:0}
    }
    @media (max-width:760px){
      body.player-mode .wrap{
        padding:74px 10px 18px;
      }
      body.player-mode .player{
        padding:0;
      }
      body.player-mode #playerMedia.sticky-player{
        margin:0;
        border-radius:14px;
        border:1px solid rgba(126,138,158,.28);
        width:100%;
        max-width:430px;
        margin-left:auto;
        margin-right:auto;
        aspect-ratio:9/16;
        max-height:62vh;
        position:relative;
        top:auto;
      }
      body.player-mode #playerMedia.sticky-player video,
      body.player-mode #playerMedia.sticky-player .viewer-image{
        border-radius:14px;
        object-fit:contain;
        background:#000;
      }
      body.player-mode #playerTitle,
      body.player-mode #playerDesc{
        padding-left:2px;
        padding-right:2px;
      }
      body.player-mode #playerTitle{
        margin-top:12px;
        font-size:34px;
        line-height:.95;
        letter-spacing:-.03em;
      }
      body.player-mode #playerDesc{
        margin-top:4px;
        font-size:11px;
      }
      body.player-mode .related{
        margin-top:14px;
        padding-left:0;
        padding-right:0;
      }
      body.player-mode .bottom-nav{display:none!important}
      body.player-mode .related .player-side-limit{
        margin-bottom:14px;
      }
      body.player-mode #relatedGrid{
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
      }
      body.player-mode #relatedGrid .card{
        border-radius:12px;
      }
      body.player-mode #relatedGrid .meta{
        padding:8px 8px 7px;
      }
      body.player-mode #relatedGrid .name{
        font-size:9px;
      }
      body.player-mode #relatedGrid .sub{
        font-size:8px;
      }
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
      display:none!important;
      flex-direction:column;
      gap:8px;
    }
    .playback-dock.show{display:none!important}
    .dock-timeline-row{
      display:flex;
      align-items:center;
      gap:8px;
      width:100%;
    }
`;
