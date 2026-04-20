export const cssChunk1 = `

    :root{
      --bg:#0f0f11;
      --panel:#1b1b1e;
      --line:#2d2f35;
      --text:#f2f2f2;
      --muted:#a7adb9;
      --accent:#7deaff;
      --accent-strong:#28d7ff;
      --radius:14px;
    }
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    html,body{margin:0;width:100%;height:100%;min-height:var(--app-vh,100dvh)}
    html{
      background:#0f0f11;
      overscroll-behavior-y:none;
    }
    body{
      background:
        radial-gradient(1200px 600px at 50% -10%,rgba(41,51,66,.52) 0%,rgba(15,15,17,.96) 48%),
        linear-gradient(180deg,#121317 0%,#0f0f11 100%);
      color:var(--text);
      font-family:Inter,"Segoe UI",Arial,sans-serif;
      -webkit-text-size-adjust:100%;
      text-size-adjust:100%;
      min-height:100vh;
      overscroll-behavior-y:none;
    }
    .wrap{max-width:1120px;margin:0 auto;padding:78px 14px 98px;min-height:var(--app-vh,100dvh)}
    .top{
      position:fixed;
      top:0;
      left:0;
      right:0;
      z-index:70;
      display:flex;
      gap:10px;
      align-items:center;
      justify-content:space-between;
      padding:12px 14px;
      background:rgba(9,10,13,.78);
      backdrop-filter:blur(18px);
      border-bottom:1px solid rgba(126,147,178,.18);
    }
    .top-brand{display:flex;align-items:center;gap:4px;min-width:0;flex:1;justify-content:flex-start}
    .title{font-size:27px;font-weight:800;letter-spacing:-.02em;line-height:1;white-space:nowrap;display:flex;align-items:flex-start;gap:6px}
    .status-note{color:#8790a2;font-size:10px;letter-spacing:.06em;text-transform:uppercase}
    .top-links{display:none;align-items:center;gap:18px}
    .top-link{color:#94a2bb;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.01em;padding-bottom:4px;border-bottom:2px solid transparent}
    .top-link.active{color:#87ecff;border-bottom-color:#48deff}
    .top-actions{display:none;align-items:center;gap:10px}
    .header-search-wrap{
      display:flex;
      align-items:center;
      justify-content:flex-end;
      gap:6px;
      min-width:38px;
      flex-shrink:0;
      overflow:hidden;
    }
    .header-search-btn{
      border:1px solid rgba(122,139,168,.42);
      background:rgba(15,20,31,.72);
      color:#dff6ff;
      border-radius:999px;
      padding:7px 12px;
      font-size:11px;
      font-weight:700;
      letter-spacing:.05em;
      text-transform:uppercase;
    }
    .header-search-input{
      width:0;
      min-width:0;
      opacity:0;
      pointer-events:none;
      border:1px solid rgba(122,139,168,.42);
      background:rgba(15,20,31,.72);
      color:#eaf8ff;
      border-radius:999px;
      padding:0;
      height:34px;
      font-size:13px;
      transition:width .2s ease,opacity .14s ease,padding .2s ease,margin .2s ease;
    }
    .top.search-open .header-search-wrap{
      min-width:168px;
    }
    .top.search-open .header-search-input{
      width:126px;
      opacity:1;
      pointer-events:auto;
      padding:0 12px;
      margin-left:2px;
    }
    .user-avatar-btn{
      width:34px;
      height:34px;
      border-radius:999px;
      border:1px solid rgba(122,139,168,.45);
      background:linear-gradient(145deg,#2f3848,#171d28);
      color:#c8d7f2;
      font-size:12px;
      font-weight:800;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      flex-shrink:0;
    }
    .account-menu{
      position:absolute;
      right:12px;
      top:54px;
      width:min(320px,calc(100vw - 20px));
      border:1px solid rgba(82,95,119,.45);
      border-radius:14px;
      background:rgba(20,24,32,.97);
      box-shadow:0 22px 42px rgba(0,0,0,.44);
      padding:10px 0;
      z-index:120;
    }
    .account-head{
      display:flex;
      align-items:center;
      gap:10px;
      padding:4px 14px 12px;
      border-bottom:1px solid rgba(71,81,100,.34);
      margin-bottom:6px;
    }
    .account-avatar{
      width:36px;
      height:36px;
      border-radius:999px;
      border:1px solid rgba(122,139,168,.45);
      background:linear-gradient(145deg,#2f3848,#171d28);
      color:#d5def2;
      font-weight:800;
      display:flex;
      align-items:center;
      justify-content:center;
      flex-shrink:0;
    }
    .account-meta{display:flex;flex-direction:column;gap:2px;min-width:0}
    .account-meta strong{font-size:14px;line-height:1.2;color:#f0f5ff}
    .account-meta span{font-size:12px;line-height:1.2;color:#98a5be}
    .account-item{
      width:100%;
      border:none;
      background:transparent;
      color:#e5ebf8;
      text-align:left;
      padding:12px 14px;
      font-size:14px;
      line-height:1.3;
      cursor:pointer;
    }
    .account-item:hover{
      background:rgba(69,83,108,.24);
    }
    .sidebar-toggle-btn{
      border:1px solid rgba(122,139,168,.42);
      background:rgba(15,20,31,.72);
      color:#dff6ff;
      border-radius:999px;
      width:34px;
      height:34px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      font-size:16px;
      line-height:1;
    }
    .logo-btn{
      border:none;
      background:none;
      color:inherit;
      padding:0;
      cursor:pointer;
      min-width:0;
      flex:1;
      justify-content:flex-start;
    }
    .top-btn{border-radius:999px;padding:8px 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;border:1px solid transparent}
    .top-btn-outline{background:transparent;color:#f3cb5a;border-color:#7d671e}
    .top-btn-solid{background:linear-gradient(135deg,#84f0ff,#2fd6ff);color:#032028}
    .status{
      color:#d3f6ff;
      font-size:11px;
      font-weight:700;
      letter-spacing:.06em;
      text-transform:uppercase;
      padding:7px 10px;
      border-radius:999px;
      border:1px solid rgba(64,227,255,.32);
      background:rgba(26,53,60,.45);
      max-width:52%;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .desktop-side-card{display:none}
    .sidebar-backdrop{display:none}
    .toolbar{display:flex;gap:8px;margin-top:8px}
    .toolbar-wrap{display:none;flex-direction:column;gap:8px}
    #itemControls,
    #sortPanel,
    #navSortBtn{
      display:none!important;
    }
    .toolbar-secondary{display:flex;gap:8px;flex-wrap:wrap}
    .input,.btn{border:1px solid var(--line);background:#14151a;color:var(--text);border-radius:10px}
    .input{padding:10px 12px;min-width:210px}
    .btn,.bottom-nav-btn,.dock-btn,.dock-speed,.sort-opt,.load-more,.fullscreen-fab{
      transition:transform .08s ease,background-color .15s ease,border-color .15s ease,box-shadow .15s ease,opacity .15s ease;
      will-change:transform;
    }
    .btn:active,.bottom-nav-btn:active,.dock-btn:active,.dock-speed:active,.sort-opt:active,.load-more:active,.fullscreen-fab:active,
    .btn.is-pressed,.bottom-nav-btn.is-pressed,.dock-btn.is-pressed,.dock-speed.is-pressed,.sort-opt.is-pressed,.load-more.is-pressed,.fullscreen-fab.is-pressed{
      transform:scale(.96);
      background:#20232c;
      border-color:#566886;
      box-shadow:0 0 0 1px rgba(86,104,134,.24) inset;
    }
    .btn:focus-visible,.bottom-nav-btn:focus-visible,.dock-btn:focus-visible,.dock-speed:focus-visible,.sort-opt:focus-visible,.load-more:focus-visible,.fullscreen-fab:focus-visible{
      outline:none;
      border-color:#83dfff;
      box-shadow:0 0 0 2px rgba(125,234,255,.35);
    }
    select.input{min-width:160px;padding-right:34px;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:linear-gradient(45deg,transparent 50%,#a4adba 50%),linear-gradient(135deg,#a4adba 50%,transparent 50%);background-position:calc(100% - 17px) calc(50% - 2px),calc(100% - 11px) calc(50% - 2px);background-size:6px 6px,6px 6px;background-repeat:no-repeat;line-height:1.2}
    .btn{padding:10px 12px;cursor:pointer}
    .btn:hover{border-color:#465067}
    .btn.active{background:#192733;border-color:#7deaff;color:#ddf8ff}
    .crumb{margin:6px 0 14px;color:#8f96a3;font-size:12px;letter-spacing:.07em;text-transform:uppercase}
    .hero{border:1px solid rgba(130,147,179,.26);background:linear-gradient(120deg,#1a1f2a,#16181e);border-radius:var(--radius);padding:14px;margin-bottom:14px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .grid.home-layout{display:block}
    .home-block{margin-bottom:32px}
    .home-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:14px}
    .home-kicker{font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#f4cb67;font-weight:800}
    .home-title{margin:6px 0 0;font-size:30px;line-height:.98;letter-spacing:-.03em;text-transform:uppercase}
    .home-title.solo{text-transform:none;font-size:34px;letter-spacing:-.02em}
    .home-link{border:none;background:none;color:#9adfff;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800}
    .home-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .home-chips{display:flex;gap:8px;overflow:auto;padding-bottom:8px;margin-bottom:12px}
    .home-chip{padding:7px 12px;border-radius:999px;background:#2a2d33;color:#939cad;font-size:10px;font-weight:700;white-space:nowrap;letter-spacing:.03em}
    .home-chip.active{background:#173543;color:#9feeff}
    .load-more-wrap{display:flex;justify-content:center;margin-top:16px}
    .load-more{padding:10px 14px;border:1px solid var(--line);background:#14151a;color:var(--text);border-radius:999px;cursor:pointer}
    .load-more:hover{border-color:#465067}
    .card{
      border:1px solid rgba(142,155,180,.2);
      background:#111216;
      border-radius:14px;
      overflow:hidden;
      cursor:pointer;
      display:block;
      position:relative;
      aspect-ratio:9/16;
      min-height:0;
      box-shadow:0 10px 30px rgba(0,0,0,.25);
    }
    .media{position:absolute;inset:0}
    .cover{width:100%;height:100%;object-fit:cover;display:block;background:#1a2233}
    .preview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;opacity:0;transition:opacity .24s ease}
    .card:hover .preview{opacity:1}
    .card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.05) 38%,rgba(0,0,0,.86) 100%);pointer-events:none}
    .favorite-btn{
      position:absolute;
      top:10px;
      right:10px;
      z-index:3;
      width:34px;
      height:34px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(9,12,18,.72);
      color:#f7fbff;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:18px;
      font-weight:700;
      cursor:pointer;
      transition:transform .18s ease, background .18s ease, border-color .18s ease, color .18s ease;
    }
    .favorite-btn:hover{transform:scale(1.06);border-color:rgba(255,122,154,.45)}
    .favorite-btn.active{
      background:rgba(255,84,122,.18);
      border-color:rgba(255,112,146,.56);
      color:#ff7a9a;
    }
    .meta{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:10px;display:flex;flex-direction:column;gap:5px;min-height:0}
    .name{font-size:12px;font-weight:700;line-height:1.24;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-transform:uppercase;letter-spacing:.02em}
    .sub{color:#c5cada;font-size:10px;min-height:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .badge{display:inline-flex;align-self:flex-start;font-size:9px;font-weight:800;letter-spacing:.08em;padding:4px 7px;border-radius:999px;background:rgba(40,215,255,.16);border:1px solid rgba(125,234,255,.34);text-transform:uppercase}
    .upnext-time{
      position:absolute;
      right:8px;
      bottom:8px;
      z-index:3;
      border-radius:6px;
      padding:2px 5px;
      background:rgba(0,0,0,.78);
      color:#fff;
      font-size:9px;
      font-weight:700;
      letter-spacing:.04em;
    }
    .player{border:1px solid var(--line);background:var(--panel);border-radius:var(--radius);padding:10px}
    .player-media{position:relative;overflow:hidden;border-radius:12px;user-select:none;-webkit-user-select:none;background:#000;aspect-ratio:16/9;transition:transform .2s ease,opacity .2s ease}
    .player-media.sticky-player, .sticky-player{position:sticky;top:66px;z-index:50}
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
    .player-media.pip-inline{
      position:relative!important;
      width:min(360px,100%)!important;
      max-width:100%;
      margin:10px auto 0!important;
      border:1px solid var(--line);
      box-shadow:0 12px 26px rgba(0,0,0,.35);
    }
    .player-media.pip-exit{animation:pip-slide-out .18s ease}
    @keyframes pip-slide-in{from{transform:translateY(14px) scale(.95);opacity:.86}to{transform:translateY(0) scale(1);opacity:1}}
    @keyframes pip-slide-out{from{transform:translateY(0) scale(1);opacity:1}to{transform:translateY(14px) scale(.95);opacity:.84}}
    video{width:100%!important;height:100%!important;max-height:100%!important;background:#000;border-radius:12px;display:block;object-fit:contain!important}
    .viewer-image{width:100%;height:100%;max-height:none;object-fit:contain!important;background:#000;border-radius:12px;display:block}
    .swipe-hint{position:absolute;top:50%;transform:translateY(-50%);padding:7px 10px;border-radius:999px;background:rgba(12,13,16,0.8);border:1px solid rgba(131,142,161,.3);font-size:12px;color:var(--text);opacity:0;transition:opacity .16s;pointer-events:none}
    .swipe-hint.left{left:10px}
    .swipe-hint.right{right:10px}
    .swipe-hint.center{left:50%;transform:translate(-50%,-50%)}
    .player-nav{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
    .player-favorite-btn.active{
      border-color:rgba(255,112,146,.56);
      background:rgba(255,84,122,.16);
      color:#ff8cab;
    }
    .player-overlay-actions{position:absolute;top:10px;right:10px;z-index:10011;display:flex;gap:8px;pointer-events:auto}
    .player-overlay-actions .btn{padding:7px 10px;font-size:12px;background:rgba(15,20,32,.82);backdrop-filter:blur(2px)}
    .fullscreen-fab{border:1px solid var(--line);background:#14151a;color:var(--text);border-radius:10px;padding:10px 12px;font-size:12px;line-height:1;pointer-events:auto}
    .fullscreen-fab:hover{border-color:#465067}
    .related{margin-top:14px}
    .related-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:10px;
    }
    .related h4{
      margin:0;
      font-size:11px;
      letter-spacing:.2em;
      text-transform:uppercase;
      color:#9ea8bc;
    }
    .related-pill{
      display:inline-flex;
      align-items:center;
      border-radius:999px;
      padding:4px 9px;
      font-size:10px;
      font-weight:700;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:#8cefff;
      background:rgba(45,201,233,.12);
      border:1px solid rgba(90,225,255,.24);
    }
    .player-side-limit{
      margin-bottom:16px;
      border:1px solid rgba(103,112,128,.2);
      border-radius:22px;
      background:rgba(28,31,39,.58);
      padding:16px 16px 14px;
    }
    .player-side-kicker{
      margin:0;
      color:#98a1b3;
      font-size:10px;
      letter-spacing:.2em;
      text-transform:uppercase;
      font-weight:800;
    }
    .player-side-count{
      display:flex;
      align-items:flex-end;
      gap:6px;
      margin-top:8px;
    }
    .player-side-count strong{
      font-size:42px;
      line-height:1;
      font-weight:900;
      letter-spacing:-.03em;
    }
    .player-side-count span{
      color:#7f889a;
      font-size:24px;
      line-height:1;
      font-weight:800;
    }
    .player-side-reset{
      margin:8px 0 0;
      color:#868fa2;
      font-size:10px;
      letter-spacing:.14em;
      text-transform:uppercase;
      font-weight:700;
    }
    .player-side-reset em{
      color:#f0c85d;
      font-style:normal;
    }
    .player-side-upgrade{
      width:100%;
      margin-top:12px;
      border-radius:16px;
      border:1px solid rgba(111,119,136,.26);
      background:rgba(255,255,255,.04);
      color:#f3f6ff;
      padding:11px 12px;
      font-size:11px;
      font-weight:800;
      letter-spacing:.18em;
      text-transform:uppercase;
    }
    .pip-mini-play{position:absolute;left:10px;bottom:10px;width:38px;height:38px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(15,20,32,.9);color:#fff;z-index:10011;display:none;align-items:center;justify-content:center;font-size:11px;font-weight:700;letter-spacing:.04em;touch-action:none}

    @media (min-width:860px){
      .wrap{padding-left:20px;padding-right:20px}
      .grid{grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:14px}
      .card{aspect-ratio:2/3}
      .player-media{aspect-ratio:16/9}
    }
    @media (min-width:1180px){
      .wrap{
        max-width:none;
        margin:0;
        padding:88px 28px 120px 208px;
      }
      .top{
        height:66px;
        padding:10px 18px 10px 16px;
        border-bottom:1px solid rgba(81,101,125,.2);
        background:rgba(9,11,15,.86);
        justify-content:flex-start;
        gap:18px;
      }
      .top-brand{
        min-width:176px;
        flex:0 0 auto;
      }
      .header-search-wrap{margin-left:auto}
      .title{font-size:26px;letter-spacing:.005em}
      .status-note{display:none}
      .top-links{display:flex;gap:16px}
      .top-link{font-size:14px}
      .top-actions{display:flex}
      .header-search-btn{display:none}
      .sidebar-toggle-btn{display:inline-flex!important}
      .status{
        max-width:230px;
        font-size:13px;
        text-transform:none;
        letter-spacing:.01em;
        border:none;
        background:transparent;
        color:#9fb6d8;
        text-align:right;
        padding:0;
      }
      .desktop-side-card{
        display:flex;
        position:fixed;
        left:0;
        top:0;
        bottom:0;
        width:192px;
        border-right:1px solid rgba(63,70,84,.35);
        background:#0f0f11;
        padding:82px 10px 14px;
        flex-direction:column;
        gap:12px;
      }
      .side-head{
        display:none!important;
      }
      .side-collapse-btn{
        width:32px;
        height:32px;
        border-radius:999px;
        border:1px solid rgba(122,139,168,.4);
        background:rgba(15,20,31,.72);
        color:#dff6ff;
        font-size:15px;
        line-height:1;
        display:none;
        align-items:center;
        justify-content:center;
      }
      .sidebar-backdrop{display:none!important}
      .side-tier-box{
        border:1px solid rgba(76,86,103,.3);
        background:rgba(10,17,31,.45);
        border-radius:8px;
        padding:10px 10px 12px;
      }
      .side-tier-title{
        font-size:10px;
        font-weight:800;
        letter-spacing:.12em;
        text-transform:uppercase;
        color:#50e8ff;
      }
      .side-tier-sub{
        font-size:10px;
        color:#7f8ba2;
        text-transform:uppercase;
        letter-spacing:.08em;
        margin-top:6px;
      }
      .side-tier-track{
        height:7px;
        border-radius:999px;
        background:#1c2435;
        overflow:hidden;
        margin-top:10px;
      }
      .side-tier-track span{
        display:block;
        width:34%;
        height:100%;
        background:linear-gradient(90deg,#3fdaff,#8df1ff);
      }
      .side-tier-btn{
        margin-top:10px;
        border-radius:10px;
        border:1px solid rgba(245,191,63,.4);
        background:rgba(255,202,92,.12);
        color:#f8cf66;
        padding:9px 10px;
        width:100%;
        font-size:10px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.08em;
      }
      .side-nav-links{
        display:flex;
        flex-direction:column;
        gap:4px;
        margin-top:6px;
      }
      .side-nav-link{
        display:block;
        width:100%;
        border:none;
        background:none;
        text-align:left;
        cursor:pointer;
        text-decoration:none;
        color:#79869f;
        font-size:13px;
        font-weight:600;
        padding:10px 10px;
        border-radius:6px;
      }
      .side-nav-link.active{
        color:#8cf2ff;
        background:rgba(48,197,225,.12);
        border-left:2px solid #48deff;
        padding-left:8px;
      }
      .side-footer{
        margin-top:auto;
        display:flex;
        flex-direction:column;
        gap:8px;
        border-top:1px solid rgba(74,78,88,.35);
        padding-top:12px;
      }
      .side-footer a{
        color:#717b90;
        text-decoration:none;
        font-size:11px;
        letter-spacing:.08em;
        text-transform:uppercase;
      }
      .desktop-side-card.collapsed{
        width:72px;
        padding-left:8px;
        padding-right:8px;
      }
      .desktop-side-card.collapsed + .sidebar-backdrop{display:none!important}
      .desktop-side-card.collapsed .side-head-label,
      .desktop-side-card.collapsed .side-tier-sub,
      .desktop-side-card.collapsed .side-footer a,
      .desktop-side-card.collapsed .status.side-status{
        display:none;
      }
      .desktop-side-card.collapsed .side-tier-box{
        padding:8px 6px 10px;
      }
      .desktop-side-card.collapsed .side-tier-title{
        font-size:9px;
        text-align:center;
      }
      .desktop-side-card.collapsed .side-tier-btn{
        font-size:0;
        padding:8px 0;
      }
      .desktop-side-card.collapsed .side-tier-btn::before{
        content:'VIP';
        font-size:10px;
        letter-spacing:.08em;
      }
      .desktop-side-card.collapsed .side-nav-link{
        text-align:center;
        font-size:11px;
        padding:10px 4px;
      }
      .desktop-side-card.collapsed .side-nav-link.active{
        padding-left:4px;
        border-left:none;
      }
      body.sidebar-collapsed .wrap{
        padding-left:28px;
      }
      body.sidebar-collapsed .desktop-side-card{
        transform:translateX(-104%);
      }
      .crumb{
        margin-top:0;
        margin-bottom:12px;
        font-size:12px;
      }
      .hero{
        min-height:320px;
        border-radius:10px;
        border-color:rgba(82,95,116,.3);
        background:
          linear-gradient(180deg,rgba(11,17,29,.02) 0%,rgba(11,17,29,.9) 100%),
          url('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=70') center/cover no-repeat;
        display:flex;
        flex-direction:column;
        justify-content:flex-end;
        padding:22px;
      }
      .hero h3{
        margin:0;
        font-size:58px;
        line-height:.98;
        max-width:760px;
        text-transform:uppercase;
        letter-spacing:-.02em;
      }
      .hero .status{
        background:none;
        border:none;
        padding:0;
        max-width:760px;
        color:#becbe0;
        text-align:left;
        font-size:16px;
      }
      .grid{
        grid-template-columns:repeat(5,minmax(0,1fr));
        gap:12px;
      }
      .grid.home-layout{display:block}
      .home-block{margin-bottom:44px}
      .home-head{margin-bottom:18px}
      .home-kicker{font-size:10px;letter-spacing:.34em}
      .home-title{font-size:48px}
      .home-title.solo{font-size:36px}
      .home-cards{grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
      .home-chips{margin-bottom:14px}
      .home-chip{padding:8px 14px;font-size:10px}
      .home-layout .card .meta{
        min-height:52px;
        padding:8px 9px 8px;
        gap:2px;
        background:linear-gradient(180deg,rgba(12,12,14,0) 0%,rgba(16,16,18,.72) 38%,rgba(16,16,18,.92) 100%);
      }
      .home-layout .card .name{
        font-size:11px;
        line-height:1.15;
        -webkit-line-clamp:2;
      }
      .home-layout .card .sub{
        font-size:8px;
        opacity:.92;
      }
      .card{
        aspect-ratio:9/16;
        border-radius:8px;
      }
      .name{
        font-size:12px;
        text-transform:none;
      }
      .sub{
        font-size:10px;
      }
      body.player-mode .wrap{
        padding:84px 28px 120px 208px;
      }
      body.player-mode.sidebar-collapsed .wrap{
        padding-left:28px;
      }
      body.player-mode .desktop-side-card{
        transform:translateX(0);
        transition:transform .2s ease;
      }
      body.player-mode.sidebar-collapsed .desktop-side-card {
        transform:translateX(-104%);
      }
      body.player-mode #playerWrap{
        display:grid!important;
        grid-template-columns:minmax(0,1fr) 360px;
        column-gap:32px;
        row-gap:0;
        align-items:start;
      }
      body.player-mode #playerStickyHeader,
      body.player-mode .player-nav {
        grid-column:1;
      }
      body.player-mode #playerMedia{
        aspect-ratio:16/9;
        border-radius:22px;
        border:1px solid rgba(147,158,182,.18);
        box-shadow:0 22px 48px rgba(0,0,0,0.4);
        position:relative;
        top:0;
        max-height:calc(100dvh - 160px);
      }
      body.player-mode #playerMedia video,
      body.player-mode #playerMedia .viewer-image{
        border-radius:28px;
        object-fit:contain;
      }
      body.player-mode #playerTitle{
        margin:22px 0 6px;
        font-size:24px;
        line-height:1.2;
        letter-spacing:-.015em;
        text-transform:none;
        font-weight:700;
        color:var(--text);
      }
      body.player-mode #playerDesc{
        margin-top:2px;
        margin-bottom:12px;
        padding:0;
        border:none;
        border-radius:0;
        background:none;
        color:#a4acba;
        text-transform:none;
        letter-spacing:.01em;
        font-size:14px;
      }
      body.player-mode .player-nav {
        margin-top:0;
        padding-top:16px;
        border-top:1px solid rgba(255,255,255,0.08);
      }
      body.player-mode .related{
        grid-column:2;
        grid-row:1 / span 4;
        margin-top:0;
        position:sticky;
        top:86px;
        padding:18px;
        border:1px solid rgba(103,112,128,.2);
        border-radius:24px;
        background:rgba(17,19,25,.74);
        backdrop-filter:blur(8px);
      }
      body.player-mode #relatedGrid{
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
      }
      body.player-mode #relatedGrid .card{
        border-radius:16px;
        border-color:rgba(130,144,168,.26);
      }
      body.player-mode #relatedGrid .meta{
        padding:10px 8px 8px;
        gap:3px;
      }
      body.player-mode #relatedGrid .name{
        font-size:10px;
        text-transform:uppercase;
        line-height:1.15;
      }
      body.player-mode #relatedGrid .sub{
        font-size:9px;
        color:#99a5bb;
      }
      body.player-mode #relatedGrid .badge{
        font-size:8px;
        padding:3px 6px;
      }
      .bottom-nav,
      .bottom-panel{
        display:none!important;
      }
    }
    @media (max-width:1179px){
      .top{
        gap:8px;
      }
      .top-links,
      .top-actions{
        display:none!important;
      }
      .status{
        display:none;
      }
      .account-menu{
        top:52px;
        right:10px;
      }
      .status.side-status{
        max-width:100%;
        text-align:left;
        padding:0;
        border:none;
        border-radius:0;
        background:transparent;
        font-size:12px;
        text-transform:none;
        letter-spacing:.01em;
      }
      .desktop-side-card{
        display:flex;
        position:fixed;
        left:0;
        top:0;
        bottom:0;
        width:192px;
        z-index:140;
        transform:translateX(-104%);
        transition:transform .2s ease;
        border-right:1px solid rgba(63,70,84,.35);
        background:rgba(7,10,16,.96);
        padding:12px 14px 14px;
        flex-direction:column;
        gap:12px;
      }
      .side-head-label{display:none}
      .desktop-side-card .side-collapse-btn{
        display:flex;
        width:34px;
        height:34px;
      }
      .side-tier-box{
        border:1px solid rgba(76,86,103,.3);
        background:rgba(10,17,31,.45);
        border-radius:8px;
        padding:10px 10px 12px;
      }
      .side-tier-title{
        font-size:10px;
        font-weight:800;
        letter-spacing:.12em;
        text-transform:uppercase;
        color:#50e8ff;
      }
      .side-tier-sub{
        font-size:10px;
        color:#7f8ba2;
        text-transform:uppercase;
        letter-spacing:.08em;
        margin-top:6px;
      }
      .side-tier-track{
        height:7px;
        border-radius:999px;
        background:#1c2435;
        overflow:hidden;
        margin-top:10px;
      }
      .side-tier-track span{
        display:block;
        width:34%;
        height:100%;
        background:linear-gradient(90deg,#3fdaff,#8df1ff);
      }
      .side-tier-btn{
        margin-top:10px;
        border-radius:10px;
        border:1px solid rgba(245,191,63,.4);
        background:rgba(255,202,92,.12);
        color:#f8cf66;
        padding:9px 10px;
        width:100%;
        font-size:10px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.08em;
      }
      .side-nav-links{
        display:flex;
        flex-direction:column;
        gap:4px;
        margin-top:6px;
      }
      .side-nav-link{
        display:block;
        width:100%;
        border:none;
        background:none;
        text-align:left;
        cursor:pointer;
        text-decoration:none;
        color:#79869f;
        font-size:13px;
        font-weight:600;
        padding:10px 10px;
        border-radius:6px;
      }
      .side-nav-link.active{
        color:#8cf2ff;
        background:rgba(48,197,225,.12);
        border-left:2px solid #48deff;
        padding-left:8px;
      }
      .side-footer{
        margin-top:auto;
        display:flex;
        flex-direction:column;
        gap:8px;
        border-top:1px solid rgba(74,78,88,.35);
        padding-top:12px;
      }
      .side-footer a{
        color:#717b90;
        text-decoration:none;
        font-size:11px;
        letter-spacing:.08em;
        text-transform:uppercase;
      }
      .desktop-side-card.open{
        transform:translateX(0);
      }
      .sidebar-backdrop{
        position:fixed;
        inset:0;
        z-index:130;
        background:rgba(3,6,10,.56);
        display:none;
      }
      .sidebar-backdrop.show{
        display:block;
      }
    }
`;
