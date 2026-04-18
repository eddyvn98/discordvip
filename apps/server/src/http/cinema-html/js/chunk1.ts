export const jsChunk1 = `

    const state={channels:[],itemsByChannel:new Map(),libraryItemsByView:new Map(),currentView:'home',currentChannel:null,currentItem:null,currentMediaType:'video',query:'',channelRows:[],visibleCount:20,pageSize:20,tg:null,pseudoFullscreen:false,mainBtnBound:false,autoCinemaByLandscape:false,orientTimer:null,fullscreenControlsTimer:null,itemFilters:{sort:'newest'},randomMode:false,viewCounts:{},brightness:1,playbackRate:1,feedMode:false,feedRows:[],feedControlsTimer:null,feedSkipCount:0,feedSkipAt:0,feedWheelAt:0,feedAnimTimer:null,feedNavLocked:false,feedPreparedItemId:'',feedPreparedUrl:'',feedPreparedMediaType:'',currentDetailChannel:null,lastTapAt:0,lastTapSide:'none',suppressTapUntil:0,isPip:false,pipRect:null,pipDrag:null,pipResize:null,touch:{active:false,startX:0,startY:0,lastX:0,lastY:0,startVolume:0,startBrightness:1,startCurrentTime:0,seekTime:0,isSeeking:false,isBoosting:false,mode:'pending',longPressTimer:null,rightBoostTimer:null,seekArmed:false,feedDirection:0,feedTargetIndex:-1}};
    const $=(id)=>document.getElementById(id);
    const dom={status:$('sessionStatus'),search:$('search'),bottomSearchInput:$('bottomSearchInput'),searchPanel:$('searchPanel'),sortPanel:$('sortPanel'),navHomeBtn:$('navHomeBtn'),navFeedBtn:$('navFeedBtn'),navSearchBtn:$('navSearchBtn'),navSortBtn:$('navSortBtn'),navBackBtn:$('navBackBtn'),playbackDock:$('playbackDock'),dockPlayBtn:$('dockPlayBtn'),dockPrevBtn:$('dockPrevBtn'),dockNextBtn:$('dockNextBtn'),dockMuteBtn:$('dockMuteBtn'),dockTime:$('dockTime'),dockTimeline:$('dockTimeline'),dockSpeedBtn:$('dockSpeedBtn'),dockRotateBtn:$('dockRotateBtn'),dockMinBtn:$('dockMinBtn'),volumePanel:$('volumePanel'),volumeVertical:$('volumeVertical'),feedHomeBtn:$('feedHomeBtn'),feedChannelBtn:$('feedChannelBtn'),feedChannelDrawer:$('feedChannelDrawer'),feedDrawerBackBtn:$('feedDrawerBackBtn'),feedDrawerTitle:$('feedDrawerTitle'),feedChannelList:$('feedChannelList'),feedPreloadVideo:$('feedPreloadVideo'),back:$('backHomeBtn'),retry:$('retryBtn'),crumb:$('crumb'),hero:$('hero'),state:$('state'),grid:$('grid'),loadMoreWrap:$('loadMoreWrap'),loadMoreBtn:$('loadMoreBtn'),backFab:$('backFabBtn'),fullscreenFab:$('fullscreenFabBtn'),playerWrap:$('playerWrap'),playerStickyHeader:$('playerStickyHeader'),playerMedia:$('playerMedia'),playerTitle:$('playerTitle'),playerDesc:$('playerDesc'),playerFavoriteBtn:$('playerFavoriteBtn'),player:$('player'),image:$('imageViewer'),related:$('relatedGrid'),relatedGrid:$('relatedGrid'),itemControls:$('itemControls'),sortSelect:$('sortSelect'),randomPickBtn:$('randomPickBtn'),prevItemBtn:$('prevItemBtn'),nextItemBtn:$('nextItemBtn'),pipToggleBtn:$('pipToggleBtn'),pipMiniPlayBtn:$('pipMiniPlayBtn'),swipeHintLeft:$('swipeHintLeft'),swipeHintRight:$('swipeHintRight'),swipeHintCenter:$('swipeHintCenter'),feedNextStage:$('feedNextStage'),feedNextVideo:$('feedNextVideo'),feedNextThumb:$('feedNextThumb'),feedNextTitle:$('feedNextTitle')};

    const LIBRARY_VIEW_META={
      latest:{crumb:'M\u1edbi nh\u1ea5t',title:'M\u1edbi nh\u1ea5t',description:'C\u00e1c phim m\u1edbi c\u1eadp nh\u1eadt g\u1ea7n \u0111\u00e2y nh\u1ea5t.',empty:'Ch\u01b0a c\u00f3 phim m\u1edbi n\u00e0o.'},
      trending:{crumb:'Th\u1ecbnh h\u00e0nh',title:'Th\u1ecbnh h\u00e0nh',description:'C\u00e1c phim \u0111\u01b0\u1ee3c xem nhi\u1ec1u nh\u1ea5t to\u00e0n h\u1ec7 th\u1ed1ng.',empty:'Ch\u01b0a c\u00f3 phim th\u1ecbnh h\u00e0nh.'},
      watched:{crumb:'\u0110\u00e3 xem',title:'\u0110\u00e3 xem',description:'Nh\u1eefng phim b\u1ea1n \u0111\u00e3 m\u1edf xem g\u1ea7n \u0111\u00e2y.',empty:'B\u1ea1n ch\u01b0a xem phim n\u00e0o.'},
      favorites:{crumb:'Y\u00eau th\u00edch',title:'Y\u00eau th\u00edch',description:'Danh s\u00e1ch phim b\u1ea1n \u0111\u00e3 l\u01b0u b\u1eb1ng n\u00fat tim.',empty:'B\u1ea1n ch\u01b0a l\u01b0u phim y\u00eau th\u00edch n\u00e0o.'}
    };
    function getSideNavButtons(){ return [...document.querySelectorAll('[data-side-view]')]; }
    function syncSideNavActive(){
      const current=state.currentChannel?'channel':state.currentView;
      getSideNavButtons().forEach((btn)=>{
        const active=(btn.getAttribute('data-side-view')||'')===current;
        btn.classList.toggle('active',active);
      });
    }
    function syncPlayerFavoriteButton(){
      if(!dom.playerFavoriteBtn) return;
      const active=!!(state.currentItem&&state.currentItem.favoritedByCurrentUser);
      dom.playerFavoriteBtn.classList.toggle('active',active);
      dom.playerFavoriteBtn.textContent=active?'\u0110\u00e3 l\u01b0u':'Y\u00eau th\u00edch';
    }
    function mergeFavoriteState(list,itemId,favorited){
      if(!Array.isArray(list)) return list;
      for(const row of list){
        if(row&&row.id===itemId){ row.favoritedByCurrentUser=favorited; }
      }
      return list;
    }
    function invalidateLibraryCache(view){
      if(state.libraryItemsByView&&state.libraryItemsByView.delete){ state.libraryItemsByView.delete(view); }
    }
    function applyFavoriteState(itemId,favorited){
      state.channelRows=mergeFavoriteState(state.channelRows,itemId,favorited)||state.channelRows;
      state.feedRows=mergeFavoriteState(state.feedRows,itemId,favorited)||state.feedRows;
      if(state.currentItem&&state.currentItem.id===itemId){ state.currentItem.favoritedByCurrentUser=favorited; }
      state.itemsByChannel.forEach((rows,key)=>{ state.itemsByChannel.set(key,mergeFavoriteState(rows,itemId,favorited)); });
      state.libraryItemsByView.forEach((rows,key)=>{
        let next=mergeFavoriteState(rows,itemId,favorited)||rows;
        if(key==='favorites' && !favorited){ next=(next||[]).filter((row)=>row&&row.id!==itemId); }
        state.libraryItemsByView.set(key,next);
      });
      syncPlayerFavoriteButton();
    }
    async function toggleFavorite(item,force){
      const target=item||state.currentItem;
      if(!target||!target.id) return;
      const next=typeof force==='boolean'?force:!target.favoritedByCurrentUser;
      await api('/api/cinema/items/'+target.id+'/favorite',{method:next?'POST':'DELETE'});
      applyFavoriteState(target.id,next);
      if(state.currentView==='favorites'){ invalidateLibraryCache('favorites'); }
    }

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
        dom.player.setAttribute('controls','');
        dom.playerWrap.classList.add('pseudo-fullscreen'); document.body.classList.add('no-scroll'); dom.grid.classList.add('hide'); dom.loadMoreWrap.classList.add('hide');        syncFullscreenMainButton(true);
        try{ const tg=state.tg; if(tg&&tg.requestFullscreen){ tg.requestFullscreen(); } }catch(_e){}
        /* Lu\u00f4n unlock \u0111\u1ec3 ng\u01b0\u1eddi d\u00f9ng xoay thi\u1ebft b\u1ecb t\u1ef1 do, kh\u00f4ng kh\u00f3a landscape */
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
      dom.pipMiniPlayBtn.textContent=dom.player.paused?'\u25b6':'\u275a\u275a';
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
    function showFeedControls(){
      if(!state.feedMode) return;
      document.body.classList.add('feed-controls-visible');
      if(state.feedControlsTimer) clearTimeout(state.feedControlsTimer);
      state.feedControlsTimer=setTimeout(()=>{
        if(state.feedMode && !dom.player.paused){
          document.body.classList.remove('feed-controls-visible');
        }
      },2200);
    }
    function setFeedTransitionPreview(nextItem){
      if(!nextItem){
        dom.feedNextStage.classList.remove('show');
        dom.feedNextStage.classList.remove('has-video');
        dom.feedNextVideo.pause();
        dom.feedNextVideo.classList.add('hide');
        dom.feedNextThumb.removeAttribute('src');
        dom.feedNextTitle.textContent='';
        return;
      }
      dom.feedNextTitle.textContent=nextItem.title||'Phim';
      dom.feedNextThumb.src=nextItem.posterUrl||notFoundCover;
      if(state.feedPreparedItemId===nextItem.id && state.feedPreparedMediaType==='video' && state.feedPreparedUrl){
        if(dom.feedNextVideo.getAttribute('src')!==state.feedPreparedUrl){
          dom.feedNextVideo.src=state.feedPreparedUrl;
          dom.feedNextVideo.load();
        }
        dom.feedNextVideo.classList.remove('hide');
        dom.feedNextStage.classList.add('has-video');
      }else{
        dom.feedNextStage.classList.remove('has-video');
        dom.feedNextVideo.pause();
        dom.feedNextVideo.classList.add('hide');
      }
      dom.feedNextStage.classList.add('show');
    }
`;

