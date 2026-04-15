export const touch_helpersJs = `
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
`;
