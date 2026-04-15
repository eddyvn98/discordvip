export const events_coreJs = `
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
    
    
`;
