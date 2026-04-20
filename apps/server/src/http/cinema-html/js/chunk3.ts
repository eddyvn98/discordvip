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
      dom.playerStickyHeader.classList.remove('sticky-player');
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
      dom.playerStickyHeader.classList.add('sticky-player');
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
      syncPlayerFavoriteButton();
    }
    async function api(path,opts){
      const r=await fetch(path,{credentials:'include',...opts}); const j=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.error||('HTTP '+r.status)); return j;
    }
    const notFoundCover='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="#1a2233"/><text x="50%" y="50%" fill="#8798bb" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20">No Poster</text></svg>');
    function escAttr(v){return String(v||'').replace(/"/g,'&quot;')}
    function escHtml(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
    function favoriteBtnHtml(item){
      if(!item||!item.id) return '';
      const active=!!item.favoritedByCurrentUser;
      return '<button class="favorite-btn'+(active?' active':'')+'" type="button" data-favorite-id="'+escAttr(item.id)+'" aria-label="'+(active?'Bỏ yêu thích':'Lưu yêu thích')+'">'+(active?'&#9829;':'&#9825;')+'</button>';
    }
    function cardHtml(name,sub,poster,badge,preview,item){
      return '<article class="card"><div class="media"><img class="cover" src="'+(poster||notFoundCover)+'" loading="lazy"/>'+favoriteBtnHtml(item)+(preview?'<video class="preview" muted loop playsinline preload="none" data-preview="'+escAttr(preview)+'"></video>':'')+'</div><div class="meta"><div class="name">'+escHtml(name)+'</div><div class="sub">'+escHtml(sub)+'</div>'+(badge?'<span class="badge">'+escHtml(badge)+'</span>':'')+'</div></article>';
    }
    function upNextCardHtml(item){
      const title=escAttr(item.title||'Untitled');
      const poster=escAttr(item.posterUrl||notFoundCover);
      const duration=Number(item.durationSec||item.duration||0);
      const mm=Math.floor(duration/60);
      const ss=Math.floor(duration%60);
      const time=(duration>0)?((mm<10?'0'+mm:mm)+':'+(ss<10?'0'+ss:ss)):'--:--';
      const meta=(item.mediaType==='image')?'IMAGE':'VIP ONLY';
      return '<article class="card"><div class="media"><img class="cover" src="'+poster+'" loading="lazy"/>'+favoriteBtnHtml(item)+'<span class="upnext-time">'+time+'</span></div><div class="meta"><div class="name">'+title+'</div><div class="sub">'+meta+'</div></div></article>';
    }
    function findKnownItemById(itemId){
      if(state.currentItem&&state.currentItem.id===itemId) return state.currentItem;
      if(Array.isArray(state.channelRows)){
        const row=state.channelRows.find((entry)=>entry&&entry.id===itemId);
        if(row) return row;
      }
      for(const rows of state.itemsByChannel.values()){
        if(Array.isArray(rows)){
          const row=rows.find((entry)=>entry&&entry.id===itemId);
          if(row) return row;
        }
      }
      for(const rows of state.libraryItemsByView.values()){
        if(Array.isArray(rows)){
          const row=rows.find((entry)=>entry&&entry.id===itemId);
          if(row) return row;
        }
      }
      return null;
    }
    function bindCardClicks(root,onClick){
      [...root.querySelectorAll('.card')].forEach((el,i)=>el.addEventListener('click',(event)=>{
        if(event.target&&event.target.closest&&event.target.closest('.favorite-btn')) return;
        onClick(i);
      }));
      [...root.querySelectorAll('.favorite-btn')].forEach((btn)=>{
        btn.addEventListener('click',async (event)=>{
          event.preventDefault();
          event.stopPropagation();
          const itemId=btn.getAttribute('data-favorite-id')||'';
          const source=findKnownItemById(itemId);
          if(!source) return;
          try{
            await toggleFavorite(source);
            const active=!!source.favoritedByCurrentUser;
            btn.classList.toggle('active',active);
            btn.innerHTML=active?'&#9829;':'&#9825;';
            btn.setAttribute('aria-label',active?'B\u1ecf y\u00eau th\u00edch':'L\u01b0u y\u00eau th\u00edch');
            if(state.currentView==='favorites' && !active){ renderCurrentCollection(); }
          }catch(e){
            showState((e&&e.message)?e.message:'Không thể lưu yêu thích.',true);
          }
        });
      });
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
    function currentCollectionLabel(){
      if(state.currentChannel) return 'Home > '+state.currentChannel.displayName;
      if(state.currentView!=='home' && LIBRARY_VIEW_META[state.currentView]) return 'Home > '+LIBRARY_VIEW_META[state.currentView].crumb;
      return 'Home';
    }
    function renderRowsGrid(rows,emptyMessage){
      dom.grid.classList.remove('home-layout');
      if(!rows.length){
        dom.grid.innerHTML='';
        dom.loadMoreWrap.classList.add('hide');
        showState(emptyMessage);
        return;
      }
      hideState();
      const visible=rows.slice(0,state.visibleCount);
      dom.grid.innerHTML=visible.map((x)=>{
        const dateText=x.createdAt?new Date(x.createdAt).toLocaleDateString('vi-VN'):'';
        const viewsText='Lượt xem '+Number(x.viewCount||0);
        const likedText=x.favoritedByCurrentUser?'Đã lưu':'';
        const sub=[dateText,viewsText,likedText].filter(Boolean).join(' • ');
        return cardHtml(x.title,sub,x.posterUrl,(x.mediaType==='image'?'Ảnh':'VIP Full'),x.previewUrl||null,x);
      }).join('');
      bindCardClicks(dom.grid,(idx)=>openItem(visible[idx]));
      dom.loadMoreWrap.classList.toggle('hide',state.visibleCount>=rows.length);
    }
    function renderCurrentCollection(){
      if(state.currentChannel){
        renderRowsGrid(state.channelRows,'K\u00eanh n\u00e0y ch\u01b0a c\u00f3 phim.');
        return;
      }
      if(state.currentView==='home'){
        renderChannels();
        return;
      }
      const meta=LIBRARY_VIEW_META[state.currentView]||LIBRARY_VIEW_META.latest;
      const rows=filtered(state.libraryItemsByView.get(state.currentView)||[],(x)=>x.title);
      state.channelRows=rows;
      state.visibleCount=Math.max(state.visibleCount,state.pageSize);
      renderRowsGrid(rows,meta.empty);
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
      if(state.currentItem){
        exitPip();
        state.currentItem=null;
        dom.grid.classList.remove('hide');
        dom.player.pause();
        dom.playerWrap.classList.add('hide');
        setPlayerMode(false);
        syncPlayerFavoriteButton();
        renderCurrentCollection();
        updateAppUrl();
        return;
      }
      if(state.currentChannel){
        state.currentChannel=null;
        state.query='';
        dom.search.value='';
        dom.bottomSearchInput.value='';
        state.itemFilters={sort:'newest'};
        dom.sortSelect.value='newest';
        renderChannels();
        return;
      }
      if(state.currentView!=='home'){
        state.query='';
        dom.search.value='';
        dom.bottomSearchInput.value='';
        renderChannels();
      }
    }
    function updateAppUrl(replace){
      try{
        const p=new URLSearchParams();
        if(state.feedMode){ p.set('view','feed'); }
        else if(state.currentItem){ p.set('item',state.currentItem.id); }
        else if(state.currentChannel){ p.set('ch',state.currentChannel.id); }
        else if(state.currentView!=='home' && state.currentView){ p.set('view',state.currentView); }
        const qs=p.toString(); const target=window.location.pathname+(qs?('?'+qs):'');
        if(window.location.search!==(qs?('?'+qs):'')){
          if(replace) history.replaceState(null,'',target);
          else history.pushState(null,'',target);
        }
      }catch(_e){}
    }
    async function parseCurrentUrl(){
      try{
        const p=new URLSearchParams(window.location.search);
        const item=p.get('item'); const ch=p.get('ch'); const view=p.get('view');
        if(view==='feed'){ await enterFeedMode(); return; }
        if(item){
          const row=await api('/api/cinema/items/'+item).catch(()=>null);
          if(row) await openItem(row,{skipScroll:false}); else renderChannels();
          return;
        }
        if(ch){
          if(!state.channels.length) state.channels=await api('/api/cinema/channels');
          const found=state.channels.find(x=>x.id==ch);
          if(found) await openChannel(found); else renderChannels();
          return;
        }
        if(view && LIBRARY_VIEW_META[view]){ await openLibraryView(view); return; }
        renderChannels();
      }catch(_e){ renderChannels(); }
    }
    window.addEventListener('popstate',()=>parseCurrentUrl());

    function renderChannels(){
      state.currentView='home';
      state.currentChannel=null;
      state.feedMode=false;
      updateAppUrl();
      document.body.classList.remove('feed-mode','feed-controls-visible');
      dom.navFeedBtn.classList.remove('active');
      closeFeedDrawer();
      try{ const tg=state.tg; if(tg&&tg.unlockOrientation){ tg.unlockOrientation(); } }catch(_e){}
      setPlayerMode(false);
      dom.itemControls.classList.add('hide');
      dom.crumb.textContent='Home';
      dom.hero.innerHTML='<span class="badge">VIP Cinema</span><h3>Trang ch\u1ee7</h3><p class="status">Kh\u00e1m ph\u00e1 k\u00eanh phim, phim m\u1edbi nh\u1ea5t, n\u1ed9i dung th\u1ecbnh h\u00e0nh, l\u1ecbch s\u1eed \u0111\u00e3 xem v\u00e0 danh s\u00e1ch y\u00eau th\u00edch c\u1ee7a b\u1ea1n.</p>';
      dom.hero.classList.remove('hide');
      resetPlayer();
      dom.back.classList.add('hide');
      dom.backFab.classList.add('hide');
      dom.grid.classList.remove('hide');
      dom.loadMoreWrap.classList.add('hide');
      dom.grid.classList.add('home-layout');
      syncSideNavActive();
      const rows=filtered(state.channels,(x)=>x.displayName);
      if(!rows.length){dom.grid.innerHTML=''; showState('Ch\u01b0a c\u00f3 k\u00eanh phim n\u00e0o ho\u1eb7c kh\u00f4ng kh\u1edbp t\u1eeb kh\u00f3a.'); return;}
      hideState();
      const sectionA=rows.slice(0,5);
      const sectionB=(rows.length>5?rows.slice(5):rows.slice(0,5)).slice(0,5);
      const ordered=sectionA.concat(sectionB);
      const chips=[{t:'M\u1edbi nh\u1ea5t',v:'latest'},{t:'Th\u1ecbnh h\u00e0nh',v:'trending'},{t:'\u0110\u00e3 xem',v:'watched'},{t:'Y\u00eau th\u00edch',v:'favorites'}];
      dom.grid.innerHTML='<section class="home-block"><div class="home-head"><div><div class="home-kicker">K\u00eanh phim</div><h3 class="home-title">Kh\u00e1m ph\u00e1 k\u00eanh</h3></div><button class="home-link" type="button" data-side-view-trigger="channels">m\u1edf ra c\u00e1c k\u00eanh</button></div><div class="home-cards">'+sectionA.map((x)=>cardHtml(x.displayName,x.itemCount+' phim',x.posterUrl,'VIP Full',null,null)).join('')+'</div></section><section class="home-block home-trending"><div class="home-head"><div><h3 class="home-title solo">L\u1ed1i t\u1eaft k\u00eanh</h3></div><button class="home-link" type="button" data-side-view-trigger="channels">m\u1edf r\u1ed9ng</button></div><div class="home-chips">'+chips.map((x)=>'<button class="home-chip" data-view="'+x.v+'">'+x.t+'</button>').join('')+'</div><div class="home-cards">'+sectionB.map((x)=>cardHtml(x.displayName,x.itemCount+' phim',x.posterUrl,'VIP Full',null,null)).join('')+'</div></section>';
      bindCardClicks(dom.grid,(idx)=>openChannel(ordered[idx]));
      [...dom.grid.querySelectorAll('[data-side-view-trigger]')].forEach((btn)=>btn.addEventListener('click',()=>{
        const view=btn.getAttribute('data-side-view-trigger')||'latest';
        if(view==='channels') renderAllChannels(); else openLibraryView(view);
      }));
      [...dom.grid.querySelectorAll('.home-chip')].forEach((btn)=>btn.addEventListener('click',()=>{
        const view=btn.getAttribute('data-view');
        if(view) openLibraryView(view);
      }));
    }
    function renderAllChannels(){
      state.currentView='channels'; state.currentChannel=null; state.feedMode=false;
      updateAppUrl();
      document.body.classList.remove('feed-mode','feed-controls-visible');
      dom.navFeedBtn.classList.remove('active');
      closeFeedDrawer();
      setPlayerMode(false);
      dom.itemControls.classList.add('hide');
      dom.crumb.textContent='Home > T\u1ea5t c\u1ea3 k\u00eanh';
      dom.hero.innerHTML='<h3 style="margin:0">T\u1ea5t c\u1ea3 k\u00eanh</h3><p class="status" style="margin:8px 0 0">Kh\u00e1m ph\u00e1 to\u00e0n b\u1ed9 k\u00eanh phim c\u1ee7a ch\u00fang t\u00f4i.</p>';
      dom.hero.classList.remove('hide');
      resetPlayer();
      dom.back.classList.remove('hide');
      dom.backFab.classList.remove('hide');
      dom.grid.classList.remove('hide','home-layout');
      dom.loadMoreWrap.classList.add('hide');
      syncSideNavActive();
      const rows=filtered(state.channels,(x)=>x.displayName);
      if(!rows.length){dom.grid.innerHTML=''; showState('Ch\u01b0a c\u00f3 k\u00eanh phim n\u00e0o.',false); return;}
      hideState();
      dom.grid.innerHTML=rows.map((x)=>cardHtml(x.displayName,x.itemCount+' phim',x.posterUrl,'VIP Full',null,null)).join('');
      bindCardClicks(dom.grid,(idx)=>openChannel(rows[idx]));
    }
    function renderChannelItems(){
      renderRowsGrid(state.channelRows,'K\u00eanh n\u00e0y ch\u01b0a c\u00f3 phim.');
    }
    async function openChannel(channel){
      state.currentView='channel';
      state.currentChannel=channel;
      updateAppUrl();
      resetPlayer();
      dom.grid.classList.remove('hide');
      setPlayerMode(false);
      dom.grid.classList.remove('home-layout');
      dom.itemControls.classList.remove('hide');
      dom.crumb.textContent='Home > '+channel.displayName;
      dom.back.classList.remove('hide');
      dom.backFab.classList.remove('hide');
      dom.hero.innerHTML='<h3 style="margin:0">'+channel.displayName+'</h3><p class="status" style="margin:8px 0 0">Tổng '+channel.itemCount+' phim</p>';
      dom.hero.classList.remove('hide');
      syncSideNavActive();
      const q=new URLSearchParams();
      const serverSort=(state.itemFilters.sort==='newest'||state.itemFilters.sort==='oldest'||state.itemFilters.sort==='random'||state.itemFilters.sort==='most_viewed'||state.itemFilters.sort==='least_viewed'||state.itemFilters.sort==='unseen')?state.itemFilters.sort:'newest';
      if(serverSort) q.set('sort',serverSort);
      const query=q.toString();
      const items=await api('/api/cinema/channels/'+channel.id+'/items'+(query?('?'+query):''));
      state.itemsByChannel.set(channel.id,items);
      state.channelRows=filtered(items,(x)=>x.title);
      state.visibleCount=state.pageSize;
      renderChannelItems();
    }
    async function openLibraryView(view,opts){
      opts=opts||{};
      if(!LIBRARY_VIEW_META[view]) return;
      state.currentView=view;
      state.currentChannel=null;
      state.currentItem=null;
      state.currentDetailChannel=null;
      updateAppUrl();
      resetPlayer();
      setPlayerMode(false);
      dom.itemControls.classList.add('hide');
      dom.grid.classList.remove('hide');
      dom.grid.classList.remove('home-layout');
      dom.back.classList.remove('hide');
      dom.backFab.classList.remove('hide');
      dom.loadMoreWrap.classList.add('hide');
      const meta=LIBRARY_VIEW_META[view];
      dom.crumb.textContent='Home > '+meta.crumb;
      dom.hero.innerHTML='<h3 style="margin:0">'+meta.title+'</h3><p class="status" style="margin:8px 0 0">'+meta.description+'</p>';
      dom.hero.classList.remove('hide');
      syncSideNavActive();
      let rows=state.libraryItemsByView.get(view);
      if(!rows||opts.forceReload){
        rows=await api('/api/cinema/library/items?view='+encodeURIComponent(view)+'&limit=260');
        state.libraryItemsByView.set(view,rows);
      }
      state.channelRows=filtered(rows,(x)=>x.title);
      state.visibleCount=state.pageSize;
      renderRowsGrid(state.channelRows,meta.empty);
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
        updateAppUrl();
        setPlayerMode(true);
        const detail=await api('/api/cinema/items/'+item.id);
        state.currentItem={...item,favoritedByCurrentUser:!!detail.favoritedByCurrentUser,viewedByCurrentUser:true,viewCount:Number(detail.viewCount||item.viewCount||0)};
        syncPlayerFavoriteButton();
        const links=await api('/api/cinema/items/'+item.id+'/playback');
        if(links&&links.external&&links.fullUrl){
          dom.playerDesc.textContent=(links.externalLabel||'Mở ngoài ứng dụng');
          try{ window.open(links.fullUrl,'_blank'); }catch(_e){}
          showState('Phim này là file lớn của Telegram, đã mở trong Telegram để phát.',false);
          return;
        }
        const resolvedTitle=((detail&&detail.title)||item.title||'Phim').toString().trim()||'Phim';
        dom.crumb.textContent=currentCollectionLabel()+' > '+resolvedTitle;
        state.currentDetailChannel=detail.channel||null;
        dom.playerTitle.textContent=resolvedTitle;
        const mediaType=(links&&links.mediaType)||detail.mediaType||item.mediaType||'video';
        state.currentMediaType=mediaType;
        if(mediaType!=='video' && state.isPip) exitPip();
        dom.playerDesc.textContent='';
        await api('/api/cinema/items/'+item.id+'/view',{method:'POST'}).catch(()=>{});
        state.currentItem.viewedByCurrentUser=true;
        invalidateLibraryCache('watched');
        invalidateLibraryCache('trending');
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
        syncPlayerFavoriteButton();
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
      try{
        await api('/api/cinema/session/me');
        dom.status.textContent='Phi\u00ean VIP h\u1ee3p l\u1ec7';
        state.channels=await api('/api/cinema/channels');
        await parseCurrentUrl();
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
            dom.status.textContent='Phi\u00ean VIP h\u1ee3p l\u1ec7';
            state.channels=await api('/api/cinema/channels');
            await parseCurrentUrl();
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
