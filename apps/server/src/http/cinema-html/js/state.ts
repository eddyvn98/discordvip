export const stateJs = `

    const state={channels:[],itemsByChannel:new Map(),currentChannel:null,currentItem:null,currentMediaType:'video',query:'',channelRows:[],visibleCount:20,pageSize:20,tg:null,pseudoFullscreen:false,mainBtnBound:false,autoCinemaByLandscape:false,orientTimer:null,fullscreenControlsTimer:null,itemFilters:{sort:'newest'},randomMode:false,viewCounts:{},brightness:1,playbackRate:1,feedMode:false,feedRows:[],feedControlsTimer:null,feedSkipCount:0,feedSkipAt:0,feedWheelAt:0,feedAnimTimer:null,currentDetailChannel:null,lastTapAt:0,lastTapSide:'none',suppressTapUntil:0,isPip:false,pipRect:null,pipDrag:null,pipResize:null,touch:{active:false,startX:0,startY:0,lastX:0,lastY:0,startVolume:0,startBrightness:1,startCurrentTime:0,seekTime:0,isSeeking:false,isBoosting:false,mode:'pending',longPressTimer:null,rightBoostTimer:null,seekArmed:false,feedDirection:0,feedTargetIndex:-1}};
    const \$=(id)=>document.getElementById(id);
    const dom={status:\$('sessionStatus'),search:\$('search'),bottomSearchInput:\$('bottomSearchInput'),searchPanel:\$('searchPanel'),sortPanel:\$('sortPanel'),navHomeBtn:\$('navHomeBtn'),navFeedBtn:\$('navFeedBtn'),navSearchBtn:\$('navSearchBtn'),navSortBtn:\$('navSortBtn'),navBackBtn:\$('navBackBtn'),playbackDock:\$('playbackDock'),dockPlayBtn:\$('dockPlayBtn'),dockPrevBtn:\$('dockPrevBtn'),dockNextBtn:\$('dockNextBtn'),dockMuteBtn:\$('dockMuteBtn'),dockTime:\$('dockTime'),dockTimeline:\$('dockTimeline'),dockSpeedBtn:\$('dockSpeedBtn'),dockRotateBtn:\$('dockRotateBtn'),dockMinBtn:\$('dockMinBtn'),volumePanel:\$('volumePanel'),volumeVertical:\$('volumeVertical'),feedHomeBtn:\$('feedHomeBtn'),feedChannelBtn:\$('feedChannelBtn'),feedChannelDrawer:\$('feedChannelDrawer'),feedDrawerBackBtn:\$('feedDrawerBackBtn'),feedDrawerTitle:\$('feedDrawerTitle'),feedChannelList:\$('feedChannelList'),feedPreloadVideo:\$('feedPreloadVideo'),back:\$('backHomeBtn'),retry:\$('retryBtn'),crumb:\$('crumb'),hero:\$('hero'),state:\$('state'),grid:\$('grid'),loadMoreWrap:\$('loadMoreWrap'),loadMoreBtn:\$('loadMoreBtn'),backFab:\$('backFabBtn'),fullscreenFab:\$('fullscreenFabBtn'),playerWrap:\$('playerWrap'),playerMedia:\$('playerMedia'),playerTitle:\$('playerTitle'),playerDesc:\$('playerDesc'),player:\$('player'),image:\$('imageViewer'),related:\$('relatedGrid'),itemControls:\$('itemControls'),sortSelect:\$('sortSelect'),randomPickBtn:\$('randomPickBtn'),prevItemBtn:\$('prevItemBtn'),nextItemBtn:\$('nextItemBtn'),pipToggleBtn:\$('pipToggleBtn'),pipMiniPlayBtn:\$('pipMiniPlayBtn'),swipeHintLeft:\$('swipeHintLeft'),swipeHintRight:\$('swipeHintRight'),swipeHintCenter:\$('swipeHintCenter'),feedNextStage:\$('feedNextStage'),feedNextThumb:\$('feedNextThumb'),feedNextTitle:\$('feedNextTitle')};

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
        dom.feedNextThumb.removeAttribute('src');
        dom.feedNextTitle.textContent='';
        return;
      }
      dom.feedNextTitle.textContent=nextItem.title||'Phim';
      dom.feedNextThumb.src=nextItem.posterUrl||notFoundCover;
      dom.feedNextStage.classList.add('show');
    }
    function clearFeedSwipeTransition(){
      if(state.feedAnimTimer){ clearTimeout(state.feedAnimTimer); state.feedAnimTimer=null; }
      dom.playerMedia.classList.remove('feed-swipe-out');
      dom.playerMedia.style.transition='';
      dom.playerMedia.style.transform='translateY(0)';
      dom.feedNextStage.style.transition='';
      dom.feedNextStage.style.transform='';
      document.body.classList.remove('swipe-up','swipe-down');
      setFeedTransitionPreview(null);
    }
    function getFeedAdjacentIndex(direction){
      if(!state.currentItem || !state.channelRows.length || !direction) return -1;
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
        const finalOffset=direction>0?'-100%':'100%';
        dom.playerMedia.style.transform='translateY('+finalOffset+')';
        dom.feedNextStage.classList.add('show');
        dom.feedNextStage.style.transform='translateY(0)';
        state.feedAnimTimer=setTimeout(()=>{
          const target=state.channelRows[targetIndex];
          clearFeedSwipeTransition();
          state.touch.feedDirection=0;
          state.touch.feedTargetIndex=-1;
          if(target) openItem(target);
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
      const parts=s.split(/\\s+/).filter(Boolean);
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
      const start=idx>=0?idx:0;
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
      try{
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
      state.currentDetailChannel=detail.channel||null;
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
          if(state.feedMode){ state.feedSkipCount=0; }
        }).catch(()=>{
          if(state.feedMode){ scheduleFeedSkip('Không tự phát được phim này, chuyển phim khác...'); }
        });
      }
      if(state.feedMode){ preloadNextFeedItem(); }
      if(state.feedMode){ showFeedControls(); }
      if(!state.feedMode){
        const related=detail.related||[];
        if(!related.length){dom.related.innerHTML='<div class="empty">Không có phim liên quan trong kênh.</div>'; return;}
        dom.related.innerHTML=related.map((x)=>cardHtml(x.title,'',x.posterUrl,'VIP Full',null)).join('');
        bindCardClicks(dom.related,(idx)=>openItem(related[idx]));
      }
      }catch(e){
        if(state.feedMode){ scheduleFeedSkip('Nguồn phim lỗi, tự chuyển phim tiếp theo...'); return; }
        throw e;
      }
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
    dom.playerMedia.addEventListener('click',()=>{ if(state.pseudoFullscreen) showFullscreenControls(); if(state.feedMode) showFeedControls(); });
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
      const idx=state.channelRows.findIndex((x)=>x.id===state.currentItem.id);
      if(idx<0) return false;
      let nextIdx=direction>0?idx+1:idx-1;
      if(nextIdx<0||nextIdx>=state.channelRows.length){
        if(state.feedMode){ nextIdx=(nextIdx<0)?(state.channelRows.length-1):0; }
        else return false;
      }
      dom.swipeHintCenter.textContent=direction>0?'Đang mở phim sau...':'Đang mở phim trước...';
      dom.swipeHintCenter.style.opacity='1';
      setTimeout(()=>{ dom.swipeHintCenter.style.opacity='0'; },450);
      actionPulse();
      if(state.feedMode){
        clearFeedSwipeTransition();
        const nextItem=state.channelRows[nextIdx];
        setFeedTransitionPreview(nextItem);
        document.body.classList.toggle('swipe-up',direction>0);
        document.body.classList.toggle('swipe-down',direction<0);
        dom.playerMedia.classList.add('feed-swipe-out');
        dom.playerMedia.style.transform='translateY('+(direction>0?'-14%':'14%')+') scale(.985)';
        state.feedAnimTimer=setTimeout(()=>{ clearFeedSwipeTransition(); },220);
      }
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
    async function preloadNextFeedItem(){
      if(!state.feedMode || !state.currentItem || !state.channelRows.length) return;
      const idx=state.channelRows.findIndex((x)=>x.id===state.currentItem.id);
      if(idx<0) return;
      const next=state.channelRows[(idx+1)%state.channelRows.length];
      if(!next || !next.id) return;
      try{
        const links=await api('/api/cinema/items/'+next.id+'/playback');
        if(!links || links.mediaType!=='video' || !links.fullUrl) return;
        if(dom.feedPreloadVideo.getAttribute('data-src')===links.fullUrl) return;
        dom.feedPreloadVideo.setAttribute('data-src',links.fullUrl);
        dom.feedPreloadVideo.src=links.fullUrl;
        dom.feedPreloadVideo.load();
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
        dom.swipeHintCenter.textContent='Giữ và vuốt để tua';
        dom.swipeHintCenter.style.opacity='1';
      },220);
      if(state.currentMediaType==='video' && (relX>=rect.width*0.75 || relX<=rect.width*0.25)){
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
      if(state.touch.mode==='channel' && Math.abs(dy)>20){
        e.preventDefault();
        dom.swipeHintCenter.textContent=(dy<0)?'Vuốt lên để phim tiếp':'Vuốt xuống để phim trước';
        dom.swipeHintCenter.style.opacity='1';
        if(state.feedMode){
          updateFeedDragPreview(dy);
        }
      }
    },{passive:false});
    dom.playerMedia.addEventListener('touchend',()=>{
      if(state.isPip) return;
      if(!state.touch.active) return;
      const dy=state.touch.lastY-state.touch.startY;
      const dx=state.touch.lastX-state.touch.startX;
      const rect=dom.playerMedia.getBoundingClientRect();
      const feedCommitThreshold=Math.max(60,(rect.height||window.innerHeight||0)*0.16);
      if(state.touch.isSeeking && state.currentMediaType==='video'){
        dom.player.currentTime=Math.max(0,Math.min(dom.player.duration||0,state.touch.seekTime||dom.player.currentTime||0));
        state.suppressTapUntil=Date.now()+280;
      }
      if(!state.touch.isSeeking && state.touch.mode==='channel' && Math.abs(dx)<100){
        if(state.feedMode && state.touch.feedDirection){
          settleFeedDrag(Math.abs(dy)>=feedCommitThreshold);
        }else if(Math.abs(dy)>=30){
          if(dy<0){ swipeItem(1); }else{ swipeItem(-1); }
        }
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
`;
