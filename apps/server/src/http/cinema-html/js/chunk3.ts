export const jsChunk3 = `
    function setPlayerMode(active){
      document.body.classList.toggle('player-mode',!!active);
      if(active){ closePanels(); }
      if(!active && dom.playbackDock){ dom.playbackDock.classList.remove('show'); }
    }
    function enterPip(){
      if(state.currentMediaType!=='video' || !state.currentItem) return;
      if(state.pseudoFullscreen) togglePseudoFullscreen(false);
      state.isPip=true;
      dom.playerMedia.classList.remove('pip-exit');
      dom.playerMedia.classList.add('pip-active');
      dom.playerMedia.classList.remove('sticky-player');
      dom.player.setAttribute('controls','');
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
      if(!rows.length){dom.grid.innerHTML=''; showState('Chưa có kênh phim nào hoặc không khớp từ khóa.'); return;}
      hideState();
      const sectionA=rows.slice(0,5);
      const sectionB=(rows.length>5?rows.slice(5):rows.slice(0,5)).slice(0,5);
      const ordered=sectionA.concat(sectionB);
      const chips=['#CYBERPUNK','#EDITORIAL','#SLOWCINEMA','#MONOCHROME','#EXPERIMENTAL'];
      dom.grid.innerHTML='<section class="home-block"><div class="home-head"><div><div class="home-kicker">Phim mới</div><h3 class="home-title">The Vertical Series</h3></div><button class="home-link" type="button">View Gallery</button></div><div class="home-cards">'+sectionA.map((x)=>cardHtml(x.displayName,x.itemCount+' videos',x.posterUrl,'VIP Full',null)).join('')+'</div></section><section class="home-block home-trending"><div class="home-head"><div><h3 class="home-title solo">Trending Now</h3></div></div><div class="home-chips">'+chips.map((x,i)=>'<span class="home-chip'+(i===0?' active':'')+'">'+x+'</span>').join('')+'</div><div class="home-cards">'+sectionB.map((x)=>cardHtml(x.displayName,x.itemCount+' videos',x.posterUrl,'VIP Full',null)).join('')+'</div></section>';
      bindCardClicks(dom.grid,(idx)=>openChannel(ordered[idx]));
    }
    function renderChannelItems(){
      dom.grid.classList.remove('home-layout');
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
      dom.grid.classList.remove('home-layout');
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
          if(state.feedMode){ scheduleFeedSkip('Không tự phát được phim này, chuyển phim khác...'); }
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
          dom.relatedGrid.innerHTML='<div class="empty">Không có phim liên quan trong kênh.</div>';
          return;
        }
        dom.relatedGrid.innerHTML=related.map((x)=>upNextCardHtml(x)).join('');
        bindCardClicks(dom.relatedGrid,(idx)=>openItem(related[idx]));
      }
      }catch(e){
        state.feedNavLocked=false;
        if(opts&&opts.feedTransition){ clearFeedSwipeTransition(); }
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

`;
