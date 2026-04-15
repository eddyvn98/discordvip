export const jsChunk5 = `
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
      if(state.touch.mode==='channel'){
        if(state.feedMode && Math.abs(dy)>20){
          e.preventDefault();
          dom.swipeHintCenter.textContent=(dy<0)?'Vuot len de phim tiep':'Vuot xuong de phim truoc';
          dom.swipeHintCenter.style.opacity='1';
          updateFeedDragPreview(dy);
          return;
        }
        if(!state.feedMode && Math.abs(dx)>20 && Math.abs(dx)>=Math.abs(dy)){
          e.preventDefault();
          dom.swipeHintCenter.textContent=(dx<0)?'Vuot trai de phim tiep':'Vuot phai de phim truoc';
          dom.swipeHintCenter.style.opacity='1';
          return;
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
      if(!state.touch.isSeeking && state.touch.mode==='channel'){
        if(state.feedMode){
          if(state.feedMode && state.touch.feedDirection){
            settleFeedDrag(Math.abs(dy)>=feedCommitThreshold);
          }else if(Math.abs(dy)>=30){
            if(dy<0){ swipeItem(1); }else{ swipeItem(-1); }
          }
        }else if(Math.abs(dx)>=44 && Math.abs(dx)>=Math.abs(dy)){
          if(dx<0){ swipeItem(1); }else{ swipeItem(-1); }
        }else if(Math.abs(dy)>=48 && Math.abs(dy)>Math.abs(dx)){
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
    dom.prevItemBtn.addEventListener('click',()=>{ if(!swipeItem(-1)) showState('Äang á»Ÿ phim Ä‘áº§u tiÃªn.'); });
    dom.nextItemBtn.addEventListener('click',()=>{ if(!swipeItem(1)) showState('Äang á»Ÿ phim cuá»‘i cÃ¹ng.'); });
`;

