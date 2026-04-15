

    const state={channels:[],itemsByChannel:new Map(),currentChannel:null,currentItem:null,currentMediaType:'video',query:'',channelRows:[],visibleCount:20,pageSize:20,tg:null,pseudoFullscreen:false,mainBtnBound:false,autoCinemaByLandscape:false,orientTimer:null,fullscreenControlsTimer:null,itemFilters:{sort:'newest'},randomMode:false,viewCounts:{},brightness:1,playbackRate:1,feedMode:false,feedRows:[],feedControlsTimer:null,feedSkipCount:0,feedSkipAt:0,feedWheelAt:0,feedAnimTimer:null,feedNavLocked:false,feedPreparedItemId:'',feedPreparedUrl:'',feedPreparedMediaType:'',currentDetailChannel:null,lastTapAt:0,lastTapSide:'none',suppressTapUntil:0,isPip:false,pipRect:null,pipDrag:null,pipResize:null,session:{isVip:false,dailyLimit:3,dailyUsed:0,dailyRemaining:3},touch:{active:false,startAt:0,startX:0,startY:0,lastX:0,lastY:0,startVolume:0,startBrightness:1,startCurrentTime:0,seekTime:0,isSeeking:false,isBoosting:false,mode:'pending',longPressTimer:null,rightBoostTimer:null,seekArmed:false,feedDirection:0,feedTargetIndex:-1}};
    const $=(id)=>document.getElementById(id);
    const dom={status:$('sessionStatus'),search:$('search'),bottomSearchInput:$('bottomSearchInput'),searchPanel:$('searchPanel'),sortPanel:$('sortPanel'),headerSearchBtn:$('headerSearchBtn'),headerSearchInput:$('headerSearchInput'),userAvatarBtn:$('userAvatarBtn'),accountMenu:$('accountMenu'),homeLogoBtn:$('homeLogoBtn'),sidebarToggleBtn:$('sidebarToggleBtn'),sideCollapseBtn:$('sideCollapseBtn'),sidebarBackdrop:$('sidebarBackdrop'),navHomeBtn:$('navHomeBtn'),navFeedBtn:$('navFeedBtn'),navSearchBtn:$('navSearchBtn'),navSortBtn:$('navSortBtn'),navBackBtn:$('navBackBtn'),playbackDock:$('playbackDock'),dockPlayBtn:$('dockPlayBtn'),dockPrevBtn:$('dockPrevBtn'),dockNextBtn:$('dockNextBtn'),dockMuteBtn:$('dockMuteBtn'),dockTime:$('dockTime'),dockTimeline:$('dockTimeline'),dockSpeedBtn:$('dockSpeedBtn'),dockRotateBtn:$('dockRotateBtn'),dockMinBtn:$('dockMinBtn'),volumePanel:$('volumePanel'),volumeVertical:$('volumeVertical'),feedHomeBtn:$('feedHomeBtn'),feedChannelBtn:$('feedChannelBtn'),feedChannelDrawer:$('feedChannelDrawer'),feedDrawerBackBtn:$('feedDrawerBackBtn'),feedDrawerTitle:$('feedDrawerTitle'),feedChannelList:$('feedChannelList'),feedPreloadVideo:$('feedPreloadVideo'),back:$('backHomeBtn'),retry:$('retryBtn'),crumb:$('crumb'),hero:$('hero'),state:$('state'),grid:$('grid'),loadMoreWrap:$('loadMoreWrap'),loadMoreBtn:$('loadMoreBtn'),backFab:$('backFabBtn'),fullscreenFab:$('fullscreenFabBtn'),playerWrap:$('playerWrap'),playerMedia:$('playerMedia'),playerTitle:$('playerTitle'),playerDesc:$('playerDesc'),player:$('player'),image:$('imageViewer'),related:$('relatedGrid'),relatedGrid:$('relatedGrid'),itemControls:$('itemControls'),sortSelect:$('sortSelect'),randomPickBtn:$('randomPickBtn'),prevItemBtn:$('prevItemBtn'),nextItemBtn:$('nextItemBtn'),pipToggleBtn:$('pipToggleBtn'),pipMiniPlayBtn:$('pipMiniPlayBtn'),swipeHintLeft:$('swipeHintLeft'),swipeHintRight:$('swipeHintRight'),swipeHintCenter:$('swipeHintCenter'),feedNextStage:$('feedNextStage'),feedNextVideo:$('feedNextVideo'),feedNextThumb:$('feedNextThumb'),feedNextTitle:$('feedNextTitle')};

    function showState(msg,isError=false){
      dom.state.textContent=msg; dom.state.className=isError?'error':'empty';
      dom.state.classList.remove('hide');
    }
        function applySessionMeta(me){
      if(!me) return;
      state.session.isVip=!!me.isVip;
      state.session.dailyLimit=Number(me.dailyLimit||3);
      state.session.dailyUsed=Number(me.dailyUsed||0);
      state.session.dailyRemaining=Number(me.dailyRemaining||0);
      if(dom.accountPlanInfo){
        dom.accountPlanInfo.textContent=state.session.isVip
          ? 'Gói hiện tại: VIP (Không giới hạn)'
          : ('Gói hiện tại: Free ('+state.session.dailyUsed+'/'+state.session.dailyLimit+' phim hôm nay)');
      }
      if(dom.accountExpireInfo){
        if(state.session.isVip && me.expiresAt){
          const d=new Date(me.expiresAt);
          dom.accountExpireInfo.textContent='Hạn sử dụng: '+d.toLocaleString('vi-VN');
        }else{
          dom.accountExpireInfo.textContent='Hạn sử dụng: Free';
        }
      }
      if(dom.sideTierTitle) dom.sideTierTitle.textContent=state.session.isVip?'VIP':'Free';
      if(dom.sideTierSub){
        dom.sideTierSub.textContent=state.session.isVip
          ? 'Unlimited movies'
          : ('Daily limit: '+state.session.dailyUsed+'/'+state.session.dailyLimit+' videos');
      }
      if(dom.playerSideCount){
        dom.playerSideCount.innerHTML=state.session.isVip
          ? '<strong>Unlimited</strong><span>/ VIP</span>'
          : ('<strong>'+state.session.dailyUsed+'</strong><span>/ '+state.session.dailyLimit+'</span>');
      }
      if(dom.playerSideReset){
        dom.playerSideReset.textContent=state.session.isVip
          ? 'VIP active'
          : ('Còn lại '+Math.max(0,state.session.dailyRemaining)+' phim hôm nay');
      }
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
        /* LuÃ´n unlock Ä‘á»ƒ user xoay thiáº¿t bá»‹ tá»± do - KHÃ”NG lock landscape */
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
      dom.pipMiniPlayBtn.textContent=dom.player.paused?'â–¶':'âšâš';
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

    function clearFeedSwipeTransition(){
      if(state.feedAnimTimer){ clearTimeout(state.feedAnimTimer); state.feedAnimTimer=null; }
      dom.playerMedia.classList.remove('feed-swipe-out');
      dom.playerMedia.style.transition='';
      dom.playerMedia.style.transform='translateY(0)';
      dom.playerMedia.style.opacity='1';
      dom.feedNextStage.style.transition='';
      dom.feedNextStage.style.transform='';
      dom.feedNextStage.classList.remove('has-video');
      dom.feedNextVideo.pause();
      dom.feedNextVideo.classList.add('hide');
      document.body.classList.remove('swipe-up','swipe-down');
      setFeedTransitionPreview(null);
    }
    function runFeedSwipeTransition(direction,nextItem){
      clearFeedSwipeTransition();
      setFeedTransitionPreview(nextItem);
      if(dom.feedNextStage.classList.contains('has-video')){
        try{ dom.feedNextVideo.currentTime=0; }catch(_e){}
        dom.feedNextVideo.play().catch(()=>{});
      }
      document.body.classList.toggle('swipe-up',direction>0);
      document.body.classList.toggle('swipe-down',direction<0);
      dom.playerMedia.classList.add('feed-swipe-out');
      dom.playerMedia.style.transition='transform .22s cubic-bezier(.22,.78,.18,1), opacity .22s ease';
      dom.feedNextStage.style.transition='transform .22s cubic-bezier(.22,.78,.18,1), opacity .22s ease';
      dom.feedNextStage.classList.add('show');
      dom.feedNextStage.style.transform='translateY('+(direction>0?'100%':'-100%')+')';
      void dom.feedNextStage.offsetHeight;
      dom.playerMedia.style.transform='translateY('+(direction>0?'-100%':'100%')+')';
      dom.feedNextStage.style.transform='translateY(0)';
    }
    function getFeedAdjacentIndex(direction){
      if(!state.currentItem || !state.channelRows.length || !direction) return -1;
      if(state.randomMode){
        if(state.touch.feedDirection===direction && state.touch.feedTargetIndex>=0){
          return state.touch.feedTargetIndex;
        }
        const randomTarget=pickRandomItem(state.currentItem.id||null);
        if(!randomTarget) return -1;
        return state.channelRows.findIndex((x)=>x.id===randomTarget.id);
      }
      const idx=state.channelRows.findIndex((x)=>x.id===state.currentItem.id);
      if(idx<0) return -1;
      let nextIdx=direction>0?idx+1:idx-1;
      if(nextIdx<0||nextIdx>=state.channelRows.length){
        nextIdx=(nextIdx<0)?(state.channelRows.length-1):0;
      }
      return nextIdx;
    }
    function updateFeedDragPreview(dy){
      if(!state.feedMode) return;
      const direction=dy<0?1:-1;
      const targetIndex=getFeedAdjacentIndex(direction);
      if(targetIndex<0) return;
      if(state.touch.feedDirection!==direction || state.touch.feedTargetIndex!==targetIndex){
        state.touch.feedDirection=direction;
        state.touch.feedTargetIndex=targetIndex;
        setFeedTransitionPreview(state.channelRows[targetIndex]);
      }
      const rect=dom.playerMedia.getBoundingClientRect();
      const height=Math.max(1,rect.height||window.innerHeight||1);
      const clamped=Math.max(-height,Math.min(height,dy));
      dom.playerMedia.style.transition='none';
      dom.feedNextStage.style.transition='none';
      dom.playerMedia.style.transform='translateY('+clamped+'px)';
      dom.feedNextStage.classList.add('show');
      dom.feedNextStage.style.transform='translateY('+(direction>0?(height+clamped):(-height+clamped))+'px)';
    }
    function settleFeedDrag(commit){
      if(!state.feedMode || !state.touch.feedDirection || state.touch.feedTargetIndex<0){
        clearFeedSwipeTransition();
        state.touch.feedDirection=0;
        state.touch.feedTargetIndex=-1;
        return;
      }
      const direction=state.touch.feedDirection;
      const targetIndex=state.touch.feedTargetIndex;
      dom.playerMedia.style.transition='transform .2s cubic-bezier(.22,.78,.18,1), opacity .2s ease';
      dom.feedNextStage.style.transition='transform .2s cubic-bezier(.22,.78,.18,1), opacity .2s ease';
      if(commit){
        const target=state.channelRows[targetIndex];
        state.feedNavLocked=true;
        runFeedSwipeTransition(direction,target);
        state.feedAnimTimer=setTimeout(()=>{
          state.touch.feedDirection=0;
          state.touch.feedTargetIndex=-1;
          if(!target){
            state.feedNavLocked=false;
            clearFeedSwipeTransition();
            return;
          }
          openItem(target,{ feedTransition:true, skipScroll:true }).catch(()=>{
            state.feedNavLocked=false;
            clearFeedSwipeTransition();
          });
        },210);
        return;
      }
      dom.playerMedia.style.transform='translateY(0)';
      dom.feedNextStage.style.transform='translateY('+(direction>0?'100%':'-100%')+')';
      state.feedAnimTimer=setTimeout(()=>{
        clearFeedSwipeTransition();
        state.touch.feedDirection=0;
        state.touch.feedTargetIndex=-1;
      },210);
    }
    function scheduleFeedSkip(msg){
      if(!state.feedMode) return;
      state.feedNavLocked=false;
      const now=Date.now();
      if(now-state.feedSkipAt<900) return;
      state.feedSkipAt=now;
      state.feedSkipCount=(state.feedSkipCount||0)+1;
      if(msg) showState(msg);
      if(state.feedSkipCount>8){
        showState('Feed gặp nhiều phim lỗi liên tiếp, hãy thử lại sau.');
        return;
      }
      setTimeout(()=>{ swipeItem(1); },420);
    }
    function feedInitials(name){
      const s=String(name||'K').trim();
      if(!s) return 'K';
      const parts=s.split(/\s+/).filter(Boolean);
      return (parts[0][0] + (parts[1]?parts[1][0]:'')).toUpperCase();
    }
    async function ensureFeedRows(){
      if(state.feedRows.length) return;
      const rows=await api('/api/cinema/feed/items?limit=260');
      state.feedRows=Array.isArray(rows)?rows:[];
    }
    async function enterFeedMode(){
      await ensureFeedRows();
      if(!state.feedRows.length){ showState('Không có phim để phát feed.'); return; }
      closePanels();
      state.feedMode=true;
      state.feedSkipCount=0;
      state.feedSkipAt=0;
      document.body.classList.add('feed-mode','feed-controls-visible');
      dom.player.setAttribute('controls','');
      dom.navFeedBtn.classList.add('active');
      const idx=state.currentItem?state.feedRows.findIndex((x)=>x.id===state.currentItem.id):-1;
      state.channelRows=state.feedRows;
      const startItem=state.randomMode?pickRandomItem(state.currentItem&&state.currentItem.id?state.currentItem.id:null):null;
      const start=startItem?state.feedRows.findIndex((x)=>x.id===startItem.id):(idx>=0?idx:0);
      let opened=false;
      for(let i=0;i<state.feedRows.length;i++){
        const target=state.feedRows[(start+i)%state.feedRows.length];
        try{
          await openItem(target);
          opened=true;
          break;
        }catch(_e){}
      }
      if(!opened){
        showState('Feed chưa tìm được phim phát được, đang thử lại nguồn khác...');
      }
      showFeedControls();
    }
    function closeFeedDrawer(){ dom.feedChannelDrawer.classList.remove('show'); }
    function exitFeedMode(){
      state.feedMode=false;
      state.feedSkipCount=0;
      state.feedSkipAt=0;
      clearFeedSwipeTransition();
      document.body.classList.remove('feed-mode','feed-controls-visible');
      dom.player.setAttribute('controls','');
      dom.navFeedBtn.classList.remove('active');
      closeFeedDrawer();
      if(state.feedControlsTimer){ clearTimeout(state.feedControlsTimer); state.feedControlsTimer=null; }
      renderChannels();
    }
    async function openFeedChannelDrawer(){
      if(!state.feedMode || !state.currentDetailChannel) return;
      const ch=state.currentDetailChannel;
      dom.feedDrawerTitle.textContent=ch.displayName||'Phim trong kênh';
      const rows=await api('/api/cinema/channels/'+ch.id+'/items?sort=newest').catch(()=>[]);
      dom.feedChannelList.innerHTML=(Array.isArray(rows)?rows:[]).slice(0,80).map((x)=>{
        const poster=x.posterUrl||notFoundCover;
        const title=x.title||'Phim';
        return '<button class="feed-item-btn" data-item-id="'+x.id+'"><img class="feed-item-thumb" src="'+poster+'" loading="lazy" /><div class="feed-item-cap">'+title+'</div></button>';
      }).join('');
      [...dom.feedChannelList.querySelectorAll('.feed-item-btn')].forEach((el)=>{
        el.addEventListener('click',()=>{
          const id=el.getAttribute('data-item-id')||'';
          const item=(rows||[]).find((x)=>x.id===id);
          if(item){ closeFeedDrawer(); openItem(item); }
        });
      });
      dom.feedChannelDrawer.classList.add('show');
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
      state.feedNavLocked=false;
      state.feedPreparedItemId='';
      state.feedPreparedUrl='';
      state.feedPreparedMediaType='';
      dom.playerWrap.classList.add('hide');
      dom.fullscreenFab.classList.add('hide');
      syncFullscreenMainButton(false);
      dom.player.pause();
      dom.player.removeAttribute('src');
      dom.player.load();
      dom.player.classList.remove('hide');
      dom.image.classList.add('hide');
      dom.image.removeAttribute('src');
      dom.feedNextVideo.pause();
      dom.feedNextVideo.removeAttribute('src');
      dom.feedNextVideo.classList.add('hide');
      dom.playerMedia.style.transform='translateX(0px)';
      dom.playerMedia.style.filter='brightness('+state.brightness+')';
      dom.swipeHintLeft.style.opacity='0';
      dom.swipeHintRight.style.opacity='0';
      dom.swipeHintCenter.style.opacity='0';
      clearFeedSwipeTransition();
      updatePlaybackDock();
    }
    async function api(path,opts){
      const r=await fetch(path,{credentials:'include',...opts}); const j=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.error||('HTTP '+r.status)); return j;
    }
    const notFoundCover='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="#1a2233"/><text x="50%" y="50%" fill="#8798bb" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20">No Poster</text></svg>');
    function escAttr(v){return String(v||'').replace(/"/g,'&quot;')}
    function cardHtml(name,sub,poster,badge,preview){return '<article class="card"><div class="media"><img class="cover" src="'+(poster||notFoundCover)+'" loading="lazy"/>'+(preview?'<video class="preview" muted loop playsinline preload="none" data-preview="'+escAttr(preview)+'"></video>':'')+'</div><div class="meta"><div class="name">'+name+'</div><div class="sub">'+sub+'</div>'+(badge?'<span class="badge">'+badge+'</span>':'')+'</div></article>'}
    function upNextCardHtml(item){
      const title=escAttr(item.title||'Untitled');
      const poster=escAttr(item.posterUrl||notFoundCover);
      const duration=Number(item.durationSec||item.duration||0);
      const mm=Math.floor(duration/60);
      const ss=Math.floor(duration%60);
      const time=(duration>0)?((mm<10?'0'+mm:mm)+':'+(ss<10?'0'+ss:ss)):'--:--';
      const meta=(item.mediaType==='image')?'IMAGE':'VIP ONLY';
      return '<article class="card"><div class="media"><img class="cover" src="'+poster+'" loading="lazy"/><span class="upnext-time">'+time+'</span></div><div class="meta"><div class="name">'+title+'</div><div class="sub">'+meta+'</div></div></article>';
    }

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
      const unseenPool=finalPool.filter((x)=>!x.viewedByCurrentUser);
      const preferredPool=unseenPool.length?unseenPool:finalPool;
      return preferredPool[Math.floor(Math.random()*preferredPool.length)]||null;
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
      if(state.feedMode){ exitFeedMode(); return; }
      if(state.currentItem){ exitPip(); state.currentItem=null; dom.grid.classList.remove('hide'); dom.player.pause(); dom.playerWrap.classList.add('hide'); setPlayerMode(false); renderChannelItems(); return; }
      if(state.currentChannel){ state.currentChannel=null; dom.search.value=''; state.query=''; state.itemFilters={sort:'newest'}; dom.sortSelect.value='newest'; renderChannels(); return; }
    }

    function renderChannels(){
      state.feedMode=false;
      document.body.classList.remove('feed-mode','feed-controls-visible');
      dom.navFeedBtn.classList.remove('active');
      closeFeedDrawer();
      try{ const tg=state.tg; if(tg&&tg.unlockOrientation){ tg.unlockOrientation(); } }catch(_e){}
      setPlayerMode(false);
      dom.itemControls.classList.add('hide');
      dom.crumb.textContent='Home'; dom.hero.innerHTML='<span class="badge">Exclusive Premiere</span><h3>Shadows Of The Archive</h3><p class="status">Enter the world of decoded memories. A Noir Curator original series exploring the intersection of digital ghosts.</p>'; dom.hero.classList.remove('hide'); resetPlayer(); dom.back.classList.add('hide'); dom.backFab.classList.add('hide'); dom.grid.classList.remove('hide'); dom.loadMoreWrap.classList.add('hide');
      dom.grid.classList.add('home-layout');
      const rows=filtered(state.channels,(x)=>x.displayName);
      if(!rows.length){dom.grid.innerHTML=''; showState('ChÆ°a cÃ³ kÃªnh phim nÃ o hoáº·c khÃ´ng khá»›p tá»« khÃ³a.'); return;}
      hideState();
      const sectionA=rows.slice(0,5);
      const sectionB=(rows.length>5?rows.slice(5):rows.slice(0,5)).slice(0,5);
      const ordered=sectionA.concat(sectionB);
      const chips=['#CYBERPUNK','#EDITORIAL','#SLOWCINEMA','#MONOCHROME','#EXPERIMENTAL'];
      dom.grid.innerHTML='<section class="home-block"><div class="home-head"><div><div class="home-kicker">Phim má»›i</div><h3 class="home-title">The Vertical Series</h3></div><button class="home-link" type="button">View Gallery</button></div><div class="home-cards">'+sectionA.map((x)=>cardHtml(x.displayName,x.itemCount+' videos',x.posterUrl,'VIP Full',null)).join('')+'</div></section><section class="home-block home-trending"><div class="home-head"><div><h3 class="home-title solo">Trending Now</h3></div></div><div class="home-chips">'+chips.map((x,i)=>'<span class="home-chip'+(i===0?' active':'')+'">'+x+'</span>').join('')+'</div><div class="home-cards">'+sectionB.map((x)=>cardHtml(x.displayName,x.itemCount+' videos',x.posterUrl,'VIP Full',null)).join('')+'</div></section>';
      bindCardClicks(dom.grid,(idx)=>openChannel(ordered[idx]));
    }
    function renderChannelItems(){
      dom.grid.classList.remove('home-layout');
      const rows=state.channelRows;
      if(!rows.length){dom.grid.innerHTML=''; dom.loadMoreWrap.classList.add('hide'); showState('KÃªnh nÃ y chÆ°a cÃ³ phim.'); return;}
      hideState();
      const visible=rows.slice(0,state.visibleCount);
      dom.grid.innerHTML=visible.map((x)=>{
        const dateText=x.createdAt?new Date(x.createdAt).toLocaleDateString('vi-VN'):'';
        const viewsText='ðŸ‘ '+Number(x.viewCount||0);
        const sub=[dateText,viewsText].filter(Boolean).join(' â€¢ ');
        return cardHtml(x.title,sub,x.posterUrl,(x.mediaType==='image'?'nh':'VIP Full'),x.previewUrl||null);
      }).join('');
      bindCardClicks(dom.grid,(idx)=>openItem(visible[idx]));
      if(state.visibleCount<rows.length){dom.loadMoreWrap.classList.remove('hide');}else{dom.loadMoreWrap.classList.add('hide');}
    }
    async function openChannel(channel){
      state.currentChannel=channel; resetPlayer(); dom.grid.classList.remove('hide'); setPlayerMode(false);
      dom.grid.classList.remove('home-layout');
      dom.itemControls.classList.remove('hide');
      dom.crumb.textContent='Home > '+channel.displayName; dom.back.classList.remove('hide'); dom.backFab.classList.remove('hide');
      dom.hero.innerHTML='<h3 style="margin:0">'+channel.displayName+'</h3><p class="status" style="margin:8px 0 0">Tá»•ng '+channel.itemCount+' phim</p>';
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

    async function waitForMediaReady(mediaEl, timeoutMs){
      return await new Promise((resolve)=>{
        let settled=false;
        const finish=()=>{ if(settled) return; settled=true; cleanup(); resolve(); };
        const cleanup=()=>{
          clearTimeout(timer);
          mediaEl.removeEventListener('loadeddata',finish);
          mediaEl.removeEventListener('canplay',finish);
          mediaEl.removeEventListener('error',finish);
        };
        const timer=setTimeout(finish,timeoutMs);
        mediaEl.addEventListener('loadeddata',finish,{once:true});
        mediaEl.addEventListener('canplay',finish,{once:true});
        mediaEl.addEventListener('error',finish,{once:true});
        if(mediaEl.readyState>=2) finish();
      });
    }

    async function openItem(item,opts){
      try{
      opts=opts||{};
      const feedTransition=!!opts.feedTransition;
      state.currentItem=item;
      setPlayerMode(true);
      const detail=await api('/api/cinema/items/'+item.id);
      const links=await api('/api/cinema/items/'+item.id+'/playback');
      if(links&&links.external&&links.fullUrl){
        dom.playerDesc.textContent=(links.externalLabel||'Má»Ÿ ngoÃ i á»©ng dá»¥ng');
        try{ window.open(links.fullUrl,'_blank'); }catch(_e){}
        showState('Phim nÃ y lÃ  file lá»›n cá»§a Telegram, Ä‘Ã£ má»Ÿ trong Telegram Ä‘á»ƒ phÃ¡t.',false);
        return;
      }
      dom.crumb.textContent='Home > '+detail.channel.displayName+' > '+detail.title;
      state.currentDetailChannel=detail.channel||null;
      dom.playerTitle.textContent=detail.title;
      const mediaType=(links&&links.mediaType)||detail.mediaType||item.mediaType||'video';
      state.currentMediaType=mediaType;
      if(mediaType!=='video' && state.isPip) exitPip();
      dom.playerDesc.textContent='';
      await api('/api/cinema/items/'+item.id+'/view',{method:'POST'}).catch(()=>{});
      if(feedTransition){
        dom.playerMedia.style.opacity='0';
      }
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
        dom.player.load();
        if(feedTransition){
          await waitForMediaReady(dom.player,900);
        }
      }
      dom.playerMedia.style.filter='brightness('+state.brightness+')';
      dom.grid.classList.add('hide');
      dom.loadMoreWrap.classList.add('hide');
      dom.playerWrap.classList.remove('hide');
      dom.fullscreenFab.classList.remove('hide');
      if(!state.isPip && !opts.skipScroll){ dom.playerWrap.scrollIntoView({behavior:'smooth',block:'start'}); }
      if(state.feedMode && state.currentDetailChannel){
        dom.feedChannelBtn.classList.remove('hide');
        dom.feedChannelBtn.textContent=feedInitials(state.currentDetailChannel.displayName);
      }else{
        dom.feedChannelBtn.classList.add('hide');
      }
      updatePipButtons();
      updatePlaybackDock();
      if(mediaType!=='image'){
        dom.player.play().then(()=>{
          if(feedTransition){
            requestAnimationFrame(()=>setTimeout(()=>{ clearFeedSwipeTransition(); state.feedNavLocked=false; },40));
          }
          if(state.feedMode){ state.feedSkipCount=0; }
        }).catch(()=>{
          if(feedTransition){
            state.feedNavLocked=false;
            clearFeedSwipeTransition();
          }
          if(state.feedMode){ scheduleFeedSkip('KhÃ´ng tá»± phÃ¡t Ä‘Æ°á»£c phim nÃ y, chuyá»ƒn phim khÃ¡c...'); }
        });
      }else if(feedTransition){
        requestAnimationFrame(()=>setTimeout(()=>{ clearFeedSwipeTransition(); state.feedNavLocked=false; },40));
      }
      if(state.feedMode){ preloadNextFeedItem(); }
      if(state.feedMode){ showFeedControls(); }
      if(!state.feedMode){
        let related=Array.isArray(detail.related)?detail.related:[];
        if(!related.length){
          const fallback=(state.channelRows||[]).filter((x)=>x&&x.id!==item.id);
          related=fallback.slice(0,12);
        }
        if(!related.length){
          dom.relatedGrid.innerHTML='<div class="empty">KhÃ´ng cÃ³ phim liÃªn quan trong kÃªnh.</div>';
          return;
        }
        dom.relatedGrid.innerHTML=related.map((x)=>upNextCardHtml(x)).join('');
        bindCardClicks(dom.relatedGrid,(idx)=>openItem(related[idx]));
      }
      }catch(e){
        state.feedNavLocked=false;
        if(opts&&opts.feedTransition){ clearFeedSwipeTransition(); }
        const msg=(e&&e.message)?String(e.message):'';
        if(msg.includes('FREE_DAILY_LIMIT_REACHED')){
          showState(msg,true);
          if(window.VipFlow&&window.VipFlow.showPaywall){ window.VipFlow.showPaywall(); }
          return;
        }
        if(state.feedMode){ scheduleFeedSkip('Nguồn phim lỗi, tự chuyển phim tiếp theo...'); return; }
        throw e;
      }
    }

    async function boot(){
      try{
        const me=await api('/api/cinema/session/me');
        applySessionMeta(me);
        dom.status.textContent=me&&me.isVip?'Phiên VIP hợp lệ':'Phiên Free hợp lệ';
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
            const me=await api('/api/cinema/session/me');
            applySessionMeta(me);
            dom.status.textContent=me&&me.isVip?'Phiên VIP hợp lệ':'Phiên Free hợp lệ';
            state.channels=await api('/api/cinema/channels');
            renderChannels();
            return;
          }
        }catch(_e){}
        dom.status.textContent='KhÃ´ng thá»ƒ xÃ¡c thá»±c phiÃªn VIP';
        dom.grid.innerHTML='';
        showState((e&&e.message)?e.message:'KhÃ´ng tÃ¬m tháº¥y phiÃªn Cinema. HÃ£y má»Ÿ láº¡i tá»« bot Telegram.',true);
        dom.retry.classList.remove('hide');
      }
    }


    function resetToHome(){
      closePanels();
      state.currentItem=null;
      state.currentChannel=null;
      state.query='';
      dom.sortSelect.value='newest';
      state.itemFilters.sort='newest';
      document.querySelector('.desktop-side-card')?.classList.remove('open');
      dom.sidebarBackdrop?.classList.remove('show');
      renderChannels();
    }
    function toggleSidebar(open){
      const side=document.querySelector('.desktop-side-card');
      if(!side) return;
      const next=(typeof open==='boolean')?open:!side.classList.contains('open');
      side.classList.toggle('open',next);
      dom.sidebarBackdrop?.classList.toggle('show',next);
    }
    function toggleSidebarCollapsed(force){
      const side=document.querySelector('.desktop-side-card');
      if(!side || window.innerWidth<1180) return;
      const next=(typeof force==='boolean')?force:!side.classList.contains('collapsed');
      side.classList.toggle('collapsed',next);
      document.body.classList.toggle('sidebar-collapsed',next);
    }
    function toggleAccountMenu(force){
      if(!dom.accountMenu) return;
      const next=(typeof force==='boolean')?force:dom.accountMenu.classList.contains('hide');
      dom.accountMenu.classList.toggle('hide',!next);
    }
    function toggleHeaderSearch(force){
      const top=document.querySelector('.top');
      if(!top || !dom.headerSearchInput) return;
      const next=(typeof force==='boolean')?force:!top.classList.contains('search-open');
      top.classList.toggle('search-open',next);
      if(next){
        dom.headerSearchInput.value=state.query||'';
        setTimeout(()=>dom.headerSearchInput.focus(),20);
      }else{
        dom.headerSearchInput.blur();
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
    if(dom.headerSearchInput){
      dom.headerSearchInput.addEventListener('input',()=>{ applySearchInput(dom.headerSearchInput.value); });
      dom.headerSearchInput.addEventListener('keydown',(e)=>{
        if(e.key==='Escape') toggleHeaderSearch(false);
      });
    }
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
    dom.navHomeBtn.addEventListener('click',()=>{ resetToHome(); });
    dom.navFeedBtn.addEventListener('click',()=>{ if(state.feedMode){ exitFeedMode(); }else{ enterFeedMode(); } });
    dom.navBackBtn.addEventListener('click',()=>{ closePanels(); navBack(); });
    dom.feedHomeBtn.addEventListener('click',()=>{ exitFeedMode(); });
    dom.feedChannelBtn.addEventListener('click',()=>{ openFeedChannelDrawer(); });
    dom.feedDrawerBackBtn.addEventListener('click',()=>{ closeFeedDrawer(); });
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
    if(dom.headerSearchBtn){
      dom.headerSearchBtn.addEventListener('click',()=>{
        toggleHeaderSearch();
      });
    }
    if(dom.userAvatarBtn){
      dom.userAvatarBtn.addEventListener('click',(e)=>{ e.stopPropagation(); toggleAccountMenu(); });
    }
    if(dom.sideCollapseBtn){
      dom.sideCollapseBtn.addEventListener('click',(e)=>{
        e.stopPropagation();
        if(window.innerWidth<1180){
          toggleSidebar(false);
          return;
        }
        toggleSidebarCollapsed();
      });
    }
    if(dom.homeLogoBtn){
      dom.homeLogoBtn.addEventListener('click',()=>{ resetToHome(); });
    }
    if(dom.sidebarToggleBtn){
      dom.sidebarToggleBtn.addEventListener('click',()=>{ toggleSidebar(); });
    }
    if(dom.sidebarBackdrop){
      dom.sidebarBackdrop.addEventListener('click',()=>{ toggleSidebar(false); toggleHeaderSearch(false); toggleAccountMenu(false); });
    }
    [...document.querySelectorAll('.side-nav-link')].forEach((el)=>{
      el.addEventListener('click',()=>{ toggleSidebar(false); });
    });
    document.addEventListener('click',(e)=>{
      const target=e.target;
      if(!target || !target.closest) return;
      if(!target.closest('.header-search-wrap') && !target.closest('#sidebarToggleBtn') && !target.closest('.desktop-side-card')){
        toggleHeaderSearch(false);
      }
      if(!target.closest('#userAvatarBtn') && !target.closest('#accountMenu')){
        toggleAccountMenu(false);
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
    dom.player.addEventListener('play',()=>{ if(state.pseudoFullscreen) showFullscreenControls(); if(state.feedMode) showFeedControls(); });
    dom.player.addEventListener('pause',()=>{ if(state.pseudoFullscreen) document.body.classList.add('controls-visible'); });
    dom.player.addEventListener('error',()=>{
      if(state.feedMode){
        scheduleFeedSkip('Phim hiện tại không phát được, chuyển phim khác...');
      }
    });
    dom.player.addEventListener('timeupdate',updatePlaybackDock);
    dom.player.addEventListener('loadedmetadata',updatePlaybackDock);
    dom.player.addEventListener('ratechange',updatePlaybackDock);
    dom.player.addEventListener('volumechange',updatePlaybackDock);
    dom.playerMedia.addEventListener('touchstart',()=>{ if(state.pseudoFullscreen) showFullscreenControls(); if(state.feedMode) showFeedControls(); },{passive:true});
    dom.playerMedia.addEventListener('mousemove',()=>{ if(state.pseudoFullscreen) showFullscreenControls(); if(state.feedMode) showFeedControls(); });
    dom.playerMedia.addEventListener('click',(e)=>{
      if(state.pseudoFullscreen) showFullscreenControls();
      if(state.feedMode){ showFeedControls(); return; }
      if(!state.currentItem || state.currentMediaType!=='video') return;
      const target=e.target;
      if(target&&target.closest&&target.closest('button,input,a,[data-pip-edge]')) return;
      if(dom.player.paused) dom.player.play().catch(()=>{});
      else dom.player.pause();
      updateMiniPlayIcon();
    });
    dom.playerMedia.addEventListener('wheel',(e)=>{
      if(state.pseudoFullscreen) showFullscreenControls();
      if(!state.feedMode) return;
      showFeedControls();
      const absY=Math.abs(e.deltaY||0);
      const absX=Math.abs(e.deltaX||0);
      const primary=absY>=absX?e.deltaY:e.deltaX;
      if(!primary || Math.abs(primary)<10) return;
      const now=Date.now();
      if(now-(state.feedWheelAt||0)<320){
        e.preventDefault();
        return;
      }
      state.feedWheelAt=now;
      e.preventDefault();
      swipeItem(primary>0?1:-1);
    },{passive:false});
    
    
    function swipeItem(direction){
      if(!state.currentItem || !state.channelRows.length) return false;
      if(state.feedMode && state.feedNavLocked) return false;
      let nextItem=null;
      if(state.feedMode && state.randomMode){
        nextItem=pickRandomItem(state.currentItem&&state.currentItem.id?state.currentItem.id:null);
        if(!nextItem) return false;
      }else{
        const idx=state.channelRows.findIndex((x)=>x.id===state.currentItem.id);
        if(idx<0) return false;
        let nextIdx=direction>0?idx+1:idx-1;
        if(nextIdx<0||nextIdx>=state.channelRows.length){
          if(state.feedMode){ nextIdx=(nextIdx<0)?(state.channelRows.length-1):0; }
          else return false;
        }
        nextItem=state.channelRows[nextIdx];
      }
      dom.swipeHintCenter.textContent=direction>0?'Đang mở phim sau...':'Đang mở phim trước...';
      dom.swipeHintCenter.style.opacity='1';
      setTimeout(()=>{ dom.swipeHintCenter.style.opacity='0'; },450);
      actionPulse();
      if(state.feedMode){
        state.feedNavLocked=true;
        runFeedSwipeTransition(direction,nextItem);
        state.feedAnimTimer=setTimeout(()=>{
          openItem(nextItem,{ feedTransition:true, skipScroll:true }).catch(()=>{
            state.feedNavLocked=false;
            clearFeedSwipeTransition();
          });
        },210);
        return true;
      }
      openItem(nextItem);
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
    async function preloadNextFeedItem(){
      if(!state.feedMode || !state.currentItem || !state.channelRows.length) return;
      const next=state.randomMode
        ? pickRandomItem(state.currentItem&&state.currentItem.id?state.currentItem.id:null)
        : (()=>{ const idx=state.channelRows.findIndex((x)=>x.id===state.currentItem.id); if(idx<0) return null; return state.channelRows[(idx+1)%state.channelRows.length]; })();
      if(!next || !next.id) return;
      try{
        const links=await api('/api/cinema/items/'+next.id+'/playback');
        if(!links || !links.fullUrl) return;
        state.feedPreparedItemId=next.id;
        state.feedPreparedUrl=links.fullUrl;
        state.feedPreparedMediaType=links.mediaType||'video';
        if(links.mediaType!=='video'){
          dom.feedPreloadVideo.removeAttribute('data-src');
          dom.feedPreloadVideo.removeAttribute('src');
          dom.feedNextVideo.pause();
          dom.feedNextVideo.removeAttribute('src');
          dom.feedNextVideo.classList.add('hide');
          return;
        }
        if(dom.feedPreloadVideo.getAttribute('data-src')!==links.fullUrl){
          dom.feedPreloadVideo.setAttribute('data-src',links.fullUrl);
          dom.feedPreloadVideo.src=links.fullUrl;
          dom.feedPreloadVideo.load();
        }
        if(dom.feedNextVideo.getAttribute('src')!==links.fullUrl){
          dom.feedNextVideo.src=links.fullUrl;
          dom.feedNextVideo.load();
        }
        dom.feedNextVideo.muted=true;
        dom.feedNextVideo.volume=0;
      }catch(_e){}
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
      dom.swipeHintLeft.textContent='Äá»™ sÃ¡ng '+Math.round(state.brightness*100)+'%';
      dom.swipeHintLeft.style.opacity='1';
    }
    function applyVolume(value){
      if(state.currentMediaType!=='video') return;
      const next=Math.max(0,Math.min(1,value));
      dom.player.muted=false;
      dom.player.volume=next;
      dom.swipeHintRight.textContent='Ã‚m lÆ°á»£ng '+Math.round(next*100)+'%';
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
      const target=e.target;
      if(target&&target.closest&&target.closest('button,input,a,[data-pip-edge]')) return;
      if(Date.now()<state.suppressTapUntil){ e.preventDefault(); return; }
      const t=e.touches&&e.touches[0]; if(!t) return;
      const rect=dom.playerMedia.getBoundingClientRect();
      const relX=t.clientX-rect.left;
      state.touch.startAt=Date.now();
      const now=Date.now();
      const side=(relX<rect.width/2)?'left':'right';
      if(!state.feedMode && state.currentMediaType==='video' && now-state.lastTapAt<=280 && state.lastTapSide===side){
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
      state.touch.seekArmed=false;
      state.touch.isBoosting=false;
      state.touch.mode=(relX<=rect.width/3)?'brightness':((relX>=rect.width*2/3)?'volume':'channel');
      resetGestureHints();
      clearTouchTimers();
      state.touch.longPressTimer=setTimeout(()=>{
        if(!state.touch.active || state.currentMediaType!=='video') return;
        state.touch.seekArmed=true;
        dom.swipeHintCenter.textContent='Giá»¯ vÃ  vuá»‘t Ä‘á»ƒ tua';
        dom.swipeHintCenter.style.opacity='1';
      },220);
      if(state.currentMediaType==='video' && (relX>=rect.width*0.75 || relX<=rect.width*0.25)){
        state.touch.rightBoostTimer=setTimeout(()=>{
          if(!state.touch.active || state.touch.isSeeking) return;
          state.touch.isBoosting=true;
          dom.player.playbackRate=2;
          dom.swipeHintCenter.textContent='Tá»‘c Ä‘á»™ x2';
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
      if(state.touch.seekArmed && !state.touch.isSeeking && Math.abs(dx)>=14){
        state.touch.isSeeking=true;
        state.touch.mode='seek';
        state.touch.startX=t.clientX;
        state.touch.startCurrentTime=dom.player.currentTime||0;
        state.touch.seekTime=state.touch.startCurrentTime;
      }
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
      if(state.touch.mode==='brightness' || state.touch.mode==='volume' || state.touch.mode==='channel'){
        return;
      }
    },{passive:false});
    dom.playerMedia.addEventListener('touchend',()=>{
      if(state.isPip) return;
      if(!state.touch.active) return;
      const dy=state.touch.lastY-state.touch.startY;
      const dx=state.touch.lastX-state.touch.startX;
      const pressMs=Date.now()-(state.touch.startAt||Date.now());
      const rect=dom.playerMedia.getBoundingClientRect();
      const feedCommitThreshold=Math.max(60,(rect.height||window.innerHeight||0)*0.16);
      if(state.touch.isSeeking && state.currentMediaType==='video'){
        dom.player.currentTime=Math.max(0,Math.min(dom.player.duration||0,state.touch.seekTime||dom.player.currentTime||0));
        state.suppressTapUntil=Date.now()+280;
      }
      const isTap=Math.abs(dx)<10 && Math.abs(dy)<10 && pressMs<240;
      if(isTap && !state.touch.isSeeking && !state.feedMode && state.currentMediaType==='video'){
        if(dom.player.paused) dom.player.play().catch(()=>{});
        else dom.player.pause();
        updateMiniPlayIcon();
      }
      state.touch.active=false;
      clearTouchTimers();
      stopBoost();
      state.touch.mode='pending';
      resetGestureHints();
    },{passive:true});
    dom.playerMedia.addEventListener('touchcancel',()=>{
      if(state.isPip) return;
      if(state.feedMode && state.touch.feedDirection){ settleFeedDrag(false); }
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
    dom.prevItemBtn.addEventListener('click',()=>{ if(!swipeItem(-1)) showState('Äang á»Ÿ phim Ä‘áº§u tiÃªn.'); });
    dom.nextItemBtn.addEventListener('click',()=>{ if(!swipeItem(1)) showState('Äang á»Ÿ phim cuá»‘i cÃ¹ng.'); });

    const VipFlow = {
        get dom() {
            return {
                buyVipBtn: document.getElementById('buyVipBtn'),
                sideUpgradeBtn: document.getElementById('sideUpgradeBtn'),
                playerSideUpgradeBtn: document.getElementById('playerSideUpgradeBtn'),
                modalContainer: document.getElementById('modalContainer'),
            };
        },
        init() {
            const { buyVipBtn, sideUpgradeBtn, playerSideUpgradeBtn } = this.dom;
            if (buyVipBtn) buyVipBtn.onclick = () => this.showPaywall();
            if (sideUpgradeBtn) sideUpgradeBtn.onclick = () => this.showPaywall();
            if (playerSideUpgradeBtn) playerSideUpgradeBtn.onclick = () => this.showPaywall();

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.close();
            });

            const avatar = document.getElementById('userAvatarBtn');
            if (avatar) {
                const old = avatar.onclick;
                avatar.onclick = (e) => {
                    if (old) old(e);
                    setTimeout(() => {
                        const btn = document.getElementById('buyVipBtn');
                        if (btn) btn.onclick = () => this.showPaywall();
                    }, 50);
                };
            }
        },
        showPaywall() {
            const { modalContainer } = this.dom;
            if (!modalContainer) return;
            modalContainer.innerHTML = `
                <div id="vipPaywallOverlay" class="fixed inset-0 z-[200] glass-overlay overflow-y-auto p-4" onclick="VipFlow.onBackdropClick(event)">
                    <div class="relative w-full max-w-5xl mx-auto my-4 md:my-8 bg-[#0e0e0e] rounded-md overflow-hidden shadow-[0px_20px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row animate-scale-in max-h-[92vh] overflow-y-auto">
                        <button onclick="VipFlow.close()" class="absolute top-3 right-3 z-10 text-zinc-400 hover:text-cyan-400 transition-colors text-4xl leading-none">×</button>
                        <div class="w-full md:w-5/12 p-6 md:p-10 bg-[#1c1b1b] flex flex-col justify-center">
                            <div class="mb-2">
                                <span class="text-[#e9c349] text-xs uppercase tracking-[0.2em] font-black">Elite Access</span>
                            </div>
                            <h2 class="text-3xl md:text-4xl font-extrabold tracking-tighter text-[#e5e2e1] mb-6 leading-tight">
                                Unlock Premium Experience
                            </h2>
                            <ul class="space-y-4">
                                <li class="flex items-center gap-3">
                                    <span class="w-6 h-6 rounded-full border border-[#7be8ff] text-[#c3f5ff] inline-flex items-center justify-center text-sm font-bold">✓</span>
                                    <span class="text-sm font-medium text-[#e5e2e1]">Unlimited Watch Time</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span class="w-6 h-6 rounded-full border border-[#7be8ff] text-[#c3f5ff] inline-flex items-center justify-center text-sm font-bold">✓</span>
                                    <span class="text-sm font-medium text-[#e5e2e1]">High-Bitrate 4K Stream</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span class="w-6 h-6 rounded-full border border-[#7be8ff] text-[#c3f5ff] inline-flex items-center justify-center text-sm font-bold">✓</span>
                                    <span class="text-sm font-medium text-[#e5e2e1]">Exclusive Content</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span class="w-6 h-6 rounded-full border border-[#7be8ff] text-[#c3f5ff] inline-flex items-center justify-center text-sm font-bold">✓</span>
                                    <span class="text-sm font-medium text-[#e5e2e1]">Special Discord Role</span>
                                </li>
                            </ul>
                        </div>
                        <div class="w-full md:w-7/12 p-6 md:p-10 flex flex-col gap-6 bg-[#0e0e0e]">
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div onclick="VipFlow.createOrder('VIP_30_DAYS')" class="group relative p-6 rounded-md bg-[#131313] border border-zinc-800 hover:border-[#c3f5ff]/50 transition-all cursor-pointer flex flex-col items-center text-center">
                                    <span class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">30 ngày</span>
                                    <div class="text-3xl font-black text-[#e5e2e1] mb-1">39k</div>
                                    <span class="text-xs text-zinc-500 line-through">Giá gốc 39k</span>
                                    <div class="mt-6 w-full">
                                        <button class="w-full py-2.5 rounded-full border border-[#c3f5ff] text-[#c3f5ff] text-xs font-bold uppercase tracking-widest hover:bg-[#c3f5ff]/10 transition-all">Select Plan</button>
                                    </div>
                                </div>
                                <div onclick="VipFlow.createOrder('VIP_90_DAYS')" class="group relative p-6 rounded-md bg-[#131313] border border-zinc-800 hover:border-[#c3f5ff]/50 transition-all cursor-pointer flex flex-col items-center text-center">
                                    <span class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">90 ngày</span>
                                    <div class="text-3xl font-black text-[#e5e2e1] mb-1">99k</div>
                                    <span class="text-xs text-zinc-500 line-through">Giá gốc 117k</span>
                                    <div class="mt-6 w-full">
                                        <button class="w-full py-2.5 rounded-full border border-[#c3f5ff] text-[#c3f5ff] text-xs font-bold uppercase tracking-widest hover:bg-[#c3f5ff]/10 transition-all">Select Plan</button>
                                    </div>
                                </div>
                                <div onclick="VipFlow.createOrder('VIP_365_DAYS')" class="group relative p-6 rounded-md bg-[#2a2a2a] border border-[#e9c349]/30 hover:border-[#e9c349] transition-all cursor-pointer flex flex-col items-center text-center overflow-hidden">
                                    <div class="absolute -top-1 -right-8 bg-[#e9c349] text-[#241a00] text-[10px] font-black py-1 px-10 rotate-45 uppercase tracking-widest shadow-lg">Best Value</div>
                                    <span class="text-xs font-bold text-[#e9c349] uppercase tracking-widest mb-4">365 ngày</span>
                                    <div class="text-3xl font-black text-[#e5e2e1] mb-1">199k</div>
                                    <span class="text-xs text-zinc-500 line-through">Giá gốc 468k</span>
                                    <div class="mt-6 w-full">
                                        <button class="w-full py-2.5 rounded-full bg-[#e9c349] text-[#241a00] text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all">Select Plan</button>
                                    </div>
                                </div>
                            </div>
                            <p class="text-center text-[10px] text-zinc-600 uppercase tracking-widest mt-2">
                                Secure encryption enabled. Cancel any subscription at any time.
                            </p>
                        </div>
                    </div>
                </div>
            `;
            modalContainer.classList.remove('hide');
        },
        onBackdropClick(e) {
            if (e && e.target && e.target.id === 'vipPaywallOverlay') {
                this.close();
            }
        },
        async createOrder(planCode) {
            try {
                const res = await fetch('/api/cinema/orders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planCode })
                });
                const order = await res.json();
                if (order.error) throw new Error(order.error);
                this.showPayment(order);
            } catch (e) {
                const msg = (e && e.message) ? e.message : 'Không thể tạo đơn hàng';
                alert('Lỗi tạo đơn hàng: ' + msg);
            }
        },
        showPayment(order) {
            const { modalContainer } = this.dom;
            if (!modalContainer) return;
            const qrUrl = 'https://img.vietqr.io/image/vpb-883921002-compact2.jpg?amount=' + order.amount + '&addInfo=DONATE%20' + order.orderCode + '&accountName=THE%20NOIR%20CURATOR';
            modalContainer.innerHTML = `
                <div id="vipPayOverlay" class="fixed inset-0 z-[200] glass-overlay overflow-y-auto p-4" onclick="VipFlow.onPayBackdropClick(event)">
                    <div class="relative w-full max-w-5xl mx-auto my-4 md:my-8 bg-[#0e0e0e] rounded-md overflow-hidden shadow-2xl flex flex-col lg:row animate-scale-in max-h-[92vh] overflow-y-auto">
                        <button onclick="VipFlow.close()" class="absolute top-3 right-3 z-10 text-zinc-400 hover:text-cyan-400 transition-colors text-4xl leading-none">×</button>
                        <div class="flex flex-col lg:flex-row w-full">
                            <div class="lg:w-5/12 p-8 bg-[#1c1b1b] border-r border-zinc-800">
                                <div class="flex items-center gap-3 mb-8">
                                    <div class="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xl">✓</div>
                                    <div>
                                        <h2 class="text-xs uppercase tracking-[0.2em] text-emerald-400 font-bold">Secure Payment</h2>
                                        <p class="text-zinc-500 text-sm">Powered by VietQR</p>
                                    </div>
                                </div>
                                <h1 class="text-3xl font-black tracking-tighter mb-4 text-[#e5e2e1]">VIP Access</h1>
                                <p class="text-zinc-400 mb-8 text-sm leading-relaxed">${order.plan.name}</p>
                                <div class="space-y-4 pt-6 border-t border-zinc-800">
                                    <div class="flex justify-between items-end">
                                        <span class="text-zinc-400 text-sm">Total Amount</span>
                                        <div class="text-right">
                                            <span class="block text-2xl font-black text-[#c3f5ff]">${order.amount.toLocaleString()} ₫</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-8 p-4 rounded-lg bg-[#131313] border border-zinc-800">
                                    <p class="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                                        Vui lòng không thay đổi nội dung chuyển khoản. VIP sẽ được kích hoạt tự động sau khi hệ thống nhận được thanh toán.
                                    </p>
                                </div>
                            </div>
                            <div class="lg:w-7/12 p-8 md:p-12 flex flex-col items-center bg-[#0e0e0e]">
                                <div class="relative group mb-8">
                                    <div class="absolute -inset-4 bg-[#c3f5ff]/10 blur-xl opacity-100 rounded-full"></div>
                                    <div class="relative bg-white p-4 rounded-xl">
                                        <img src="${qrUrl}" class="w-64 h-64" alt="VietQR">
                                    </div>
                                </div>
                                <div class="flex flex-col items-center gap-4 w-full">
                                    <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800">
                                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span class="text-sm font-medium text-zinc-300">Đang chờ thanh toán...</span>
                                    </div>
                                    <div class="w-full space-y-4 mt-4">
                                        <div>
                                            <label class="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Nội dung chuyển khoản</label>
                                            <div onclick="VipFlow.copy('${order.orderCode}')" class="flex items-center justify-between bg-zinc-900 p-3 rounded border border-zinc-800 cursor-pointer hover:border-[#c3f5ff]/50">
                                                <span class="font-mono text-[#e9c349] font-bold">DONATE ${order.orderCode}</span>
                                                <span class="text-zinc-600">Copy</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            this.startPolling(order.orderCode);
        },
        onPayBackdropClick(e) {
            if (e && e.target && e.target.id === 'vipPayOverlay') {
                this.close();
            }
        },
        copy(txt) {
            navigator.clipboard.writeText('DONATE ' + txt);
            alert('Đã copy nội dung chuyển khoản');
        },
        close() {
            const { modalContainer } = this.dom;
            if (modalContainer) {
                modalContainer.classList.add('hide');
                modalContainer.innerHTML = '';
            }
            if (this.pollTimer) clearInterval(this.pollTimer);
        },
        startPolling(orderCode) {
            if (this.pollTimer) clearInterval(this.pollTimer);
            this.pollTimer = setInterval(async () => {
                try {
                    const res = await fetch('/api/cinema/orders/' + orderCode + '/status');
                    const data = await res.json();
                    if (data.status === 'PAID') {
                        clearInterval(this.pollTimer);
                        this.showSuccess();
                    }
                } catch (_e) {}
            }, 5000);
        },
        showSuccess() {
            const { modalContainer } = this.dom;
            if (!modalContainer) return;
            modalContainer.innerHTML = `
                <div id="vipSuccessOverlay" class="fixed inset-0 z-[200] glass-overlay overflow-y-auto p-4" onclick="VipFlow.onSuccessBackdropClick(event)">
                    <div class="relative w-full max-w-md mx-auto my-8 bg-[#0e0e0e] rounded-md p-12 text-center shadow-2xl animate-scale-in">
                        <div class="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
                        <h2 class="text-3xl font-black text-[#e5e2e1] mb-2">Thanh toán thành công!</h2>
                        <p class="text-zinc-400 mb-8">Tài khoản của bạn đã được nâng cấp lên VIP. Chúc bạn xem phim vui vẻ!</p>
                        <button onclick="location.reload()" class="w-full py-4 bg-[#c3f5ff] text-[#00363d] rounded-full font-bold uppercase tracking-widest hover:opacity-90">Bắt đầu ngay</button>
                    </div>
                </div>
            `;
        },
        onSuccessBackdropClick(e) {
            if (e && e.target && e.target.id === 'vipSuccessOverlay') {
                this.close();
            }
        }
    };
    VipFlow.init();
    window.VipFlow = VipFlow;

