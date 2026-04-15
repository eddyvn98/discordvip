export const jsChunk2 = `
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
    function updatePlaybackDock(){
      if(dom.playbackDock){ dom.playbackDock.classList.remove('show'); }
      if(dom.volumePanel){ dom.volumePanel.classList.remove('show'); }
    }
    function closePanels(){
      dom.searchPanel.classList.remove('show');
      dom.sortPanel.classList.remove('show');
      if(dom.volumePanel){ dom.volumePanel.classList.remove('show'); }
      dom.navSearchBtn.classList.remove('active');
      dom.navSortBtn.classList.remove('active');
    }
`;
