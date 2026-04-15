export const jsChunk6 = `
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
