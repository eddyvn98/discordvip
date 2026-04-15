export const jsChunk6 = `
    const VipFlow = {
        get dom() {
            return {
                buyVipBtn: document.getElementById('buyVipBtn'),
                sideUpgradeBtn: document.getElementById('sideUpgradeBtn'),
                playerSideUpgradeBtn: document.getElementById('playerSideUpgradeBtn'),
                modalContainer: document.getElementById('modalContainer'),
            };
        },
        init() {
            const { buyVipBtn, sideUpgradeBtn, playerSideUpgradeBtn } = this.dom;
            if (buyVipBtn) buyVipBtn.onclick = () => this.showPaywall();
            if (sideUpgradeBtn) sideUpgradeBtn.onclick = () => this.showPaywall();
            if (playerSideUpgradeBtn) playerSideUpgradeBtn.onclick = () => this.showPaywall();

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.close();
            });

            const avatar = document.getElementById('userAvatarBtn');
            if (avatar) {
                const old = avatar.onclick;
                avatar.onclick = (e) => {
                    if (old) old(e);
                    setTimeout(() => {
                        const btn = document.getElementById('buyVipBtn');
                        if (btn) btn.onclick = () => this.showPaywall();
                    }, 50);
                };
            }
        },
        showPaywall() {
            const { modalContainer } = this.dom;
            if (!modalContainer) return;
            modalContainer.innerHTML = \`
                <div id="vipPaywallOverlay" class="fixed inset-0 z-[200] glass-overlay overflow-y-auto p-4" onclick="VipFlow.onBackdropClick(event)">
                    <div class="relative w-full max-w-5xl mx-auto my-4 md:my-8 bg-[#0e0e0e] rounded-md overflow-hidden shadow-[0px_20px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row animate-scale-in max-h-[92vh] overflow-y-auto">
                        <button onclick="VipFlow.close()" class="absolute top-3 right-3 z-10 text-zinc-400 hover:text-cyan-400 transition-colors text-4xl leading-none">×</button>
                        <div class="w-full md:w-5/12 p-6 md:p-10 bg-[#1c1b1b] flex flex-col justify-center">
                            <div class="mb-2">
                                <span class="text-[#e9c349] text-xs uppercase tracking-[0.2em] font-black">Elite Access</span>
                            </div>
                            <h2 class="text-3xl md:text-4xl font-extrabold tracking-tighter text-[#e5e2e1] mb-6 leading-tight">
                                Unlock Premium Experience
                            </h2>
                            <ul class="space-y-4">
                                <li class="flex items-center gap-3">
                                    <span class="w-6 h-6 rounded-full border border-[#7be8ff] text-[#c3f5ff] inline-flex items-center justify-center text-sm font-bold">✓</span>
                                    <span class="text-sm font-medium text-[#e5e2e1]">Unlimited Watch Time</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span class="w-6 h-6 rounded-full border border-[#7be8ff] text-[#c3f5ff] inline-flex items-center justify-center text-sm font-bold">✓</span>
                                    <span class="text-sm font-medium text-[#e5e2e1]">High-Bitrate 4K Stream</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span class="w-6 h-6 rounded-full border border-[#7be8ff] text-[#c3f5ff] inline-flex items-center justify-center text-sm font-bold">✓</span>
                                    <span class="text-sm font-medium text-[#e5e2e1]">Exclusive Content</span>
                                </li>
                                <li class="flex items-center gap-3">
                                    <span class="w-6 h-6 rounded-full border border-[#7be8ff] text-[#c3f5ff] inline-flex items-center justify-center text-sm font-bold">✓</span>
                                    <span class="text-sm font-medium text-[#e5e2e1]">Special Discord Role</span>
                                </li>
                            </ul>
                        </div>
                        <div class="w-full md:w-7/12 p-6 md:p-10 flex flex-col gap-6 bg-[#0e0e0e]">
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div onclick="VipFlow.createOrder('VIP_30_DAYS')" class="group relative p-6 rounded-md bg-[#131313] border border-zinc-800 hover:border-[#c3f5ff]/50 transition-all cursor-pointer flex flex-col items-center text-center">
                                    <span class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">30 ngày</span>
                                    <div class="text-3xl font-black text-[#e5e2e1] mb-1">39k</div>
                                    <span class="text-xs text-zinc-500 line-through">Giá gốc 39k</span>
                                    <div class="mt-6 w-full">
                                        <button class="w-full py-2.5 rounded-full border border-[#c3f5ff] text-[#c3f5ff] text-xs font-bold uppercase tracking-widest hover:bg-[#c3f5ff]/10 transition-all">Select Plan</button>
                                    </div>
                                </div>
                                <div onclick="VipFlow.createOrder('VIP_90_DAYS')" class="group relative p-6 rounded-md bg-[#131313] border border-zinc-800 hover:border-[#c3f5ff]/50 transition-all cursor-pointer flex flex-col items-center text-center">
                                    <span class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">90 ngày</span>
                                    <div class="text-3xl font-black text-[#e5e2e1] mb-1">99k</div>
                                    <span class="text-xs text-zinc-500 line-through">Giá gốc 117k</span>
                                    <div class="mt-6 w-full">
                                        <button class="w-full py-2.5 rounded-full border border-[#c3f5ff] text-[#c3f5ff] text-xs font-bold uppercase tracking-widest hover:bg-[#c3f5ff]/10 transition-all">Select Plan</button>
                                    </div>
                                </div>
                                <div onclick="VipFlow.createOrder('VIP_365_DAYS')" class="group relative p-6 rounded-md bg-[#2a2a2a] border border-[#e9c349]/30 hover:border-[#e9c349] transition-all cursor-pointer flex flex-col items-center text-center overflow-hidden">
                                    <div class="absolute -top-1 -right-8 bg-[#e9c349] text-[#241a00] text-[10px] font-black py-1 px-10 rotate-45 uppercase tracking-widest shadow-lg">Best Value</div>
                                    <span class="text-xs font-bold text-[#e9c349] uppercase tracking-widest mb-4">365 ngày</span>
                                    <div class="text-3xl font-black text-[#e5e2e1] mb-1">199k</div>
                                    <span class="text-xs text-zinc-500 line-through">Giá gốc 468k</span>
                                    <div class="mt-6 w-full">
                                        <button class="w-full py-2.5 rounded-full bg-[#e9c349] text-[#241a00] text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all">Select Plan</button>
                                    </div>
                                </div>
                            </div>
                            <p class="text-center text-[10px] text-zinc-600 uppercase tracking-widest mt-2">
                                Secure encryption enabled. Cancel any subscription at any time.
                            </p>
                        </div>
                    </div>
                </div>
            \`;
            modalContainer.classList.remove('hide');
        },
        onBackdropClick(e) {
            if (e && e.target && e.target.id === 'vipPaywallOverlay') {
                this.close();
            }
        },
        async createOrder(planCode) {
            try {
                const res = await fetch('/api/cinema/orders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planCode })
                });
                const order = await res.json();
                if (order.error) throw new Error(order.error);
                this.showPayment(order);
            } catch (e) {
                const msg = (e && e.message) ? e.message : 'Không thể tạo đơn hàng';
                alert('Lỗi tạo đơn hàng: ' + msg);
            }
        },
        showPayment(order) {
            const { modalContainer } = this.dom;
            if (!modalContainer) return;
            const qrUrl = 'https://img.vietqr.io/image/vpb-883921002-compact2.jpg?amount=' + order.amount + '&addInfo=DONATE%20' + order.orderCode + '&accountName=THE%20NOIR%20CURATOR';
            modalContainer.innerHTML = \`
                <div id="vipPayOverlay" class="fixed inset-0 z-[200] glass-overlay overflow-y-auto p-4" onclick="VipFlow.onPayBackdropClick(event)">
                    <div class="relative w-full max-w-5xl mx-auto my-4 md:my-8 bg-[#0e0e0e] rounded-md overflow-hidden shadow-2xl flex flex-col lg:row animate-scale-in max-h-[92vh] overflow-y-auto">
                        <button onclick="VipFlow.close()" class="absolute top-3 right-3 z-10 text-zinc-400 hover:text-cyan-400 transition-colors text-4xl leading-none">×</button>
                        <div class="flex flex-col lg:flex-row w-full">
                            <div class="lg:w-5/12 p-8 bg-[#1c1b1b] border-r border-zinc-800">
                                <div class="flex items-center gap-3 mb-8">
                                    <div class="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xl">✓</div>
                                    <div>
                                        <h2 class="text-xs uppercase tracking-[0.2em] text-emerald-400 font-bold">Secure Payment</h2>
                                        <p class="text-zinc-500 text-sm">Powered by VietQR</p>
                                    </div>
                                </div>
                                <h1 class="text-3xl font-black tracking-tighter mb-4 text-[#e5e2e1]">VIP Access</h1>
                                <p class="text-zinc-400 mb-8 text-sm leading-relaxed">\${order.plan.name}</p>
                                <div class="space-y-4 pt-6 border-t border-zinc-800">
                                    <div class="flex justify-between items-end">
                                        <span class="text-zinc-400 text-sm">Total Amount</span>
                                        <div class="text-right">
                                            <span class="block text-2xl font-black text-[#c3f5ff]">\${order.amount.toLocaleString()} ₫</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-8 p-4 rounded-lg bg-[#131313] border border-zinc-800">
                                    <p class="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                                        Vui lòng không thay đổi nội dung chuyển khoản. VIP sẽ được kích hoạt tự động sau khi hệ thống nhận được thanh toán.
                                    </p>
                                </div>
                            </div>
                            <div class="lg:w-7/12 p-8 md:p-12 flex flex-col items-center bg-[#0e0e0e]">
                                <div class="relative group mb-8">
                                    <div class="absolute -inset-4 bg-[#c3f5ff]/10 blur-xl opacity-100 rounded-full"></div>
                                    <div class="relative bg-white p-4 rounded-xl">
                                        <img src="\${qrUrl}" class="w-64 h-64" alt="VietQR">
                                    </div>
                                </div>
                                <div class="flex flex-col items-center gap-4 w-full">
                                    <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800">
                                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span class="text-sm font-medium text-zinc-300">Đang chờ thanh toán...</span>
                                    </div>
                                    <div class="w-full space-y-4 mt-4">
                                        <div>
                                            <label class="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Nội dung chuyển khoản</label>
                                            <div onclick="VipFlow.copy('\${order.orderCode}')" class="flex items-center justify-between bg-zinc-900 p-3 rounded border border-zinc-800 cursor-pointer hover:border-[#c3f5ff]/50">
                                                <span class="font-mono text-[#e9c349] font-bold">DONATE \${order.orderCode}</span>
                                                <span class="text-zinc-600">Copy</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
            this.startPolling(order.orderCode);
        },
        onPayBackdropClick(e) {
            if (e && e.target && e.target.id === 'vipPayOverlay') {
                this.close();
            }
        },
        copy(txt) {
            navigator.clipboard.writeText('DONATE ' + txt);
            alert('Đã copy nội dung chuyển khoản');
        },
        close() {
            const { modalContainer } = this.dom;
            if (modalContainer) {
                modalContainer.classList.add('hide');
                modalContainer.innerHTML = '';
            }
            if (this.pollTimer) clearInterval(this.pollTimer);
        },
        startPolling(orderCode) {
            if (this.pollTimer) clearInterval(this.pollTimer);
            this.pollTimer = setInterval(async () => {
                try {
                    const res = await fetch('/api/cinema/orders/' + orderCode + '/status');
                    const data = await res.json();
                    if (data.status === 'PAID') {
                        clearInterval(this.pollTimer);
                        this.showSuccess();
                    }
                } catch (_e) {}
            }, 5000);
        },
        showSuccess() {
            const { modalContainer } = this.dom;
            if (!modalContainer) return;
            modalContainer.innerHTML = \`
                <div id="vipSuccessOverlay" class="fixed inset-0 z-[200] glass-overlay overflow-y-auto p-4" onclick="VipFlow.onSuccessBackdropClick(event)">
                    <div class="relative w-full max-w-md mx-auto my-8 bg-[#0e0e0e] rounded-md p-12 text-center shadow-2xl animate-scale-in">
                        <div class="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
                        <h2 class="text-3xl font-black text-[#e5e2e1] mb-2">Thanh toán thành công!</h2>
                        <p class="text-zinc-400 mb-8">Tài khoản của bạn đã được nâng cấp lên VIP. Chúc bạn xem phim vui vẻ!</p>
                        <button onclick="location.reload()" class="w-full py-4 bg-[#c3f5ff] text-[#00363d] rounded-full font-bold uppercase tracking-widest hover:opacity-90">Bắt đầu ngay</button>
                    </div>
                </div>
            \`;
        },
        onSuccessBackdropClick(e) {
            if (e && e.target && e.target.id === 'vipSuccessOverlay') {
                this.close();
            }
        }
    };
    VipFlow.init();
    window.VipFlow = VipFlow;
    updatePipButtons();
    initTelegramWebApp();
    boot();
`;
