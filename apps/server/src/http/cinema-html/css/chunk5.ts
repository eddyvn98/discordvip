export const cssChunk5 = `
    .feed-channel-btn.hide{display:none!important}
    body.feed-mode .feed-channel-btn{display:flex}
    .feed-channel-drawer{
      position:fixed;
      top:0;right:0;bottom:0;
      width:min(86vw,360px);
      z-index:10060;
      background:#0c1220;
      border-left:1px solid var(--line);
      transform:translateX(104%);
      transition:transform .2s ease;
      display:flex;
      flex-direction:column;
    }
    .feed-channel-drawer.show{transform:translateX(0)}
    .feed-drawer-head{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid var(--line)}
    .feed-drawer-list{padding:10px;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .feed-item-btn{
      border:1px solid var(--line);
      background:#0f1420;
      color:var(--text);
      border-radius:10px;
      padding:0;
      text-align:left;
      overflow:hidden;
    }
    .feed-item-thumb{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:#1a2233}
    .feed-item-cap{padding:8px;font-size:12px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  
`;
