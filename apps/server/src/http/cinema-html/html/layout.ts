export const getCinemaHtmlBody = () => `

  <div class="wrap">
    <header class="top">
      <div class="top-brand">
        <div class="title">VIP Cinema</div>
        <div class="status-note">Kho phim dọc cao cấp</div>
      </div>
      <nav class="top-links">
        <a href="#" class="top-link active">Discover</a>
        <a href="#" class="top-link">Originals</a>
        <a href="#" class="top-link">VIP</a>
      </nav>
      <div class="top-actions">
        <button class="top-btn top-btn-outline">Join Club</button>
        <button class="top-btn top-btn-solid">Discord Login</button>
      </div>
      <div id="sessionStatus" class="status">Đang xác thực...</div>
    </header>

    <aside class="desktop-side-card">
      <div class="side-tier-box">
        <div class="side-tier-title">Free Tier</div>
        <div class="side-tier-sub">Daily limit: 1/3 videos</div>
        <div class="side-tier-track"><span></span></div>
        <button class="side-tier-btn">Upgrade to VIP</button>
      </div>
      <nav class="side-nav-links">
        <a href="#" class="side-nav-link active">Home</a>
        <a href="#" class="side-nav-link">Trending</a>
        <a href="#" class="side-nav-link">Library</a>
        <a href="#" class="side-nav-link">Watch Later</a>
      </nav>
      <div class="side-footer">
        <a href="#">Settings</a>
        <a href="#">Support</a>
      </div>
    </aside>

    <div class="toolbar-wrap">
      <div class="toolbar">
        <input id="search" class="input" placeholder="Tìm kênh hoặc phim..." />
        <button id="backHomeBtn" class="btn hide">Quay về</button>
        <button id="retryBtn" class="btn hide">Thử lại</button>
      </div>
      <div id="itemControls" class="toolbar-secondary hide">
        <select id="sortSelect" class="input">
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="most_viewed">Xem nhiều nhất</option>
          <option value="least_viewed">Xem ít nhất</option>
          <option value="unseen">Chưa xem</option>
          <option value="random">Ngẫu nhiên</option>
        </select>
        <button id="randomPickBtn" class="btn">Ngẫu nhiên: Tắt</button>
      </div>
    </div>

    <div id="crumb" class="crumb">Home</div>
    <section id="hero" class="hero hide"></section>
    <section id="state" class="empty hide"></section>
    <section id="grid" class="grid"></section>
    <div id="loadMoreWrap" class="load-more-wrap hide">
      <button id="loadMoreBtn" class="load-more">Tải thêm</button>
    </div>

    <section id="playerWrap" class="player hide">
      <div id="playerMedia" class="player-media sticky-player">
        <video id="player" controls playsinline webkit-playsinline x5-playsinline x5-video-player-type="h5" x5-video-orientation="landscape"></video>
        <img id="imageViewer" class="viewer-image hide" alt="Cinema media" />
        <div class="player-overlay-actions">
          <button id="pipToggleBtn" class="btn">Thu nhỏ</button>
        </div>
        <div id="feedNextStage" class="feed-next-stage">
          <div class="feed-next-card">
            <video id="feedNextVideo" class="feed-next-video hide" muted playsinline preload="auto"></video>
            <img id="feedNextThumb" class="feed-next-thumb" alt="" />
            <div class="feed-next-fade"></div>
            <div class="feed-next-label">
              <div class="kicker">Phim tiếp theo</div>
              <div id="feedNextTitle"></div>
            </div>
          </div>
        </div>
        <div class="pip-resize-zone left" data-pip-edge="left"></div>
        <div class="pip-resize-zone right" data-pip-edge="right"></div>
        <div class="pip-resize-zone bottom" data-pip-edge="bottom"></div>
        <div class="pip-resize-zone corner" data-pip-edge="corner"></div>
        <button id="pipMiniPlayBtn" class="pip-mini-play" aria-label="Phát hoặc tạm dừng">Phát</button>
        <button id="feedHomeBtn" class="feed-home-btn hide">Home</button>
        <button id="feedChannelBtn" class="feed-channel-btn hide" aria-label="Phim trong kênh">K</button>
        <div id="swipeHintLeft" class="swipe-hint left">Độ sáng</div>
        <div id="swipeHintRight" class="swipe-hint right">Âm lượng</div>
        <div id="swipeHintCenter" class="swipe-hint center">Vuốt lên/xuống để chuyển phim</div>
      </div>
      <h3 id="playerTitle"></h3>
      <p id="playerDesc" class="status"></p>
      <div class="player-nav">
        <button id="prevItemBtn" class="btn">Trước</button>
        <button id="nextItemBtn" class="btn">Sau</button>
        <span id="fullscreenFabBtn" class="fullscreen-fab hide" aria-label="Toàn màn hình">FS</span>
      </div>
      <div class="related">
        <section class="player-side-limit">
          <p class="player-side-kicker">Daily Limit Status</p>
          <div class="player-side-count"><strong>2</strong><span>/ 3</span></div>
          <p class="player-side-reset">Resets in <em>4h 12m</em></p>
          <button class="player-side-upgrade" type="button">Go Unlimited</button>
        </section>
        <div class="related-head">
          <h4>Phát tiếp theo</h4>
          <span class="related-pill">Autoplay ON</span>
        </div>
        <div id="relatedGrid" class="grid"></div>
      </div>
    </section>
  </div>
  <div id="searchPanel" class="bottom-panel">
    <input id="bottomSearchInput" placeholder="Tìm kênh hoặc phim..." />
  </div>
  <div id="sortPanel" class="bottom-panel">
    <div class="sort-grid">
      <button class="sort-opt" data-sort="newest">Mới nhất</button>
      <button class="sort-opt" data-sort="oldest">Cũ nhất</button>
      <button class="sort-opt" data-sort="most_viewed">Xem nhiều</button>
      <button class="sort-opt" data-sort="least_viewed">Xem ít</button>
      <button class="sort-opt" data-sort="unseen">Chưa xem</button>
      <button class="sort-opt" data-sort="random">Ngẫu nhiên</button>
    </div>
  </div>
  <div id="playbackDock" class="playback-dock">
    <div class="dock-timeline-row">
      <div id="dockTime" class="dock-time">0:00/0:00</div>
      <div class="dock-range"><input id="dockTimeline" type="range" min="0" max="100" value="0" step="0.1" /></div>
    </div>
    <div class="dock-controls-row">
      <button id="dockPlayBtn" class="dock-btn">Play</button>
      <button id="dockPrevBtn" class="dock-btn">Prev</button>
      <button id="dockNextBtn" class="dock-btn">Next</button>
      <button id="dockMuteBtn" class="dock-btn">Vol</button>
      <button id="dockSpeedBtn" class="dock-speed">1x</button>
      <button id="dockRotateBtn" class="dock-btn">FS</button>
      <button id="dockMinBtn" class="dock-btn">PiP</button>
    </div>
  </div>
  <div id="volumePanel" class="volume-panel">
    <input id="volumeVertical" type="range" min="0" max="1" value="0" step="0.01" />
  </div>
  <nav class="bottom-nav">
    <button id="navHomeBtn" class="bottom-nav-btn"><span class="ico">Home</span><span class="lbl">Trang chủ</span></button>
    <button id="navFeedBtn" class="bottom-nav-btn hide"><span class="ico">Feed</span><span class="lbl">Phát nhanh</span></button>
    <button id="navSearchBtn" class="bottom-nav-btn"><span class="ico">Search</span><span class="lbl">Tìm kiếm</span></button>
    <button id="navSortBtn" class="bottom-nav-btn"><span class="ico">Sort</span><span class="lbl">Sắp xếp</span></button>
    <button id="navBackBtn" class="bottom-nav-btn"><span class="ico">Back</span><span class="lbl">Quay lại</span></button>
  </nav>
  <aside id="feedChannelDrawer" class="feed-channel-drawer">
    <div class="feed-drawer-head">
      <strong id="feedDrawerTitle">Phim trong kênh</strong>
      <button id="feedDrawerBackBtn" class="btn">Back</button>
    </div>
    <div id="feedChannelList" class="feed-drawer-list"></div>
  </aside>
  <video id="feedPreloadVideo" class="hide" muted playsinline preload="metadata"></video>
  <button id="backFabBtn" class="fab-back hide">Quay về</button>

`;
