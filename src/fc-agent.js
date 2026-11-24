/* Asistan Agent — bağımsız eklenti (Shadow DOM). Kaynak: ortak-cekirdek/web/js. Üreten: tools/bundle-agent.js
   Tam çekirdek (fc-core.js) zaten yüklüyse hiçbir şey yapmaz: agent orada FC.init ile gelir. */
if (typeof FC === "undefined" || !FC.topbar) {
(function(g){(g.FC=g.FC||{})._agentCss="/* OTOMATİK ÜRETİLDİ — elle düzenlemeyin. Kaynak: tools/schemes.js → node tools/build-tokens.js\nOrtak çekirdek tasarım tokenları. Varsayılan şema \"falcon\" (Falcon Ofis). Şema: <html data-scheme=\"…\">, açık mod: <html class=\"theme-light\">.\nBileşenler yalnız bu tokenları kullanır. Yazı tipleri gömülüdür (çevrimdışı). */\n.fc-root{--radius:14px;--radius-sm:8px;--radius-md:10px;--radius-lg:18px;--sidebar-w:264px;--font-scale:1;\n--font-ui:Inter,'Noto Sans Arabic',system-ui,'Segoe UI',sans-serif;--font-ar:'Noto Sans Arabic',Inter,system-ui,'Segoe UI',Tahoma,sans-serif;--font-mono:ui-monospace,Consolas,monospace}\n.fc-root,[data-scheme]{--grad-primary:linear-gradient(135deg,var(--primary-1),var(--primary-2));--grad-active:linear-gradient(90deg,var(--active-1),var(--active-2))}\n[dir=rtl],[dir=rtl] [data-scheme]{--grad-active:linear-gradient(270deg,var(--active-1),var(--active-2))}\n.fc-root,[data-scheme=\"falcon\"]{--bg:#070b14;--bg-grid:#38bdf809;--panel:#0f172ab8;--panel-solid:#0e1526;--panel-hover:#131d33;--border:#94a3b824;--border-strong:#38bdf873;--border-w:1px;--text:#e2e8f0;--muted:#8b98ad;--label:#a5b4cb;--nav-text:#b4c0d3;--nav-title:#5b6880;--accent:#22d3ee;--accent-2:#6366f1;--on-accent:#ffffff;--primary-1:#0891b2;--primary-2:#4f46e5;--active-1:#22d3ee29;--active-2:#6366f114;--active-line:#22d3ee47;--accent-soft:#22d3ee14;--accent-line:#22d3ee59;--focus:#22d3ee;--focus-w:2px;--focus-ring:#22d3ee1f;--danger:#f43f5e;--warn:#f59e0b;--ok:#34d399;--ok-text:#6ee7b7;--danger-text:#fda4af;--warn-text:#fcd34d;--ok-soft:#34d3991a;--ok-line:#34d3994d;--danger-soft:#f43f5e1a;--danger-line:#f43f5e59;--warn-soft:#f59e0b1a;--warn-line:#f59e0b4d;--sidebar-bg:#080d19d9;--topbar-bg:#070b1499;--modal-bg:#0b1222;--modal-border:#38bdf838;--backdrop:#02060fb8;--toast-bg:#0f2a26;--toast-text:#a7f3d0;--toast-line:#34d39966;--toast-err-bg:#2a0f17;--toast-err-text:#fecdd3;--toast-err-line:#f43f5e73;--badge-text:#c7d2fe;--badge-bg:#6366f124;--badge-line:#6366f159;--on-badge:#04121a;--bar-track:#94a3b833;--scroll-thumb:#94a3b833;--glow-1:#6366f12e;--glow-2:#22d3ee1f;--shadow-pop:0 14px 40px #0009;--shadow-modal:0 30px 80px #0009;--shadow-toast:0 12px 30px #00000073;color-scheme:dark}\n.fc-root.theme-light,[data-scheme=\"falcon\"].theme-light,.theme-light [data-scheme=\"falcon\"]{--bg:#eef2f7;--bg-grid:#0f172a08;--panel:#ffffffe0;--panel-solid:#ffffff;--panel-hover:#eef3f9;--border:#0f172a1c;--border-strong:#0891b266;--border-w:1px;--text:#0f172a;--muted:#5b6678;--label:#33435b;--nav-text:#2b384c;--nav-title:#616f89;--accent:#0891b2;--accent-2:#4f46e5;--on-accent:#ffffff;--primary-1:#0891b2;--primary-2:#4036e3;--active-1:#22d3ee29;--active-2:#2c30ec14;--active-line:#22d3ee47;--accent-soft:#22d3ee14;--accent-line:#22d3ee59;--focus:#0891b2;--focus-w:2px;--focus-ring:#22d3ee16;--danger:#e11d48;--warn:#b45309;--ok:#059669;--ok-text:#159462;--danger-text:#5d000b;--warn-text:#b58b00;--ok-soft:#34d3991a;--ok-line:#34d3994d;--danger-soft:#f326491f;--danger-line:#f3264959;--warn-soft:#f59e0b1a;--warn-line:#f59e0b4d;--sidebar-bg:#e6ebf7d9;--topbar-bg:#ebeff899;--modal-bg:#ffffff;--modal-border:#0891b240;--backdrop:#0f172a59;--toast-bg:#ecfdf5;--toast-text:#065f46;--toast-line:#05966966;--toast-err-bg:#fff1f2;--toast-err-text:#9f1239;--toast-err-line:#e11d4866;--badge-text:#000b39;--badge-bg:#2c30ec24;--badge-line:#2c30ec59;--on-badge:#04121a;--bar-track:#47566b33;--scroll-thumb:#47566b33;--glow-1:#2c30ec2e;--glow-2:#22d3ee1f;--shadow-pop:0 14px 40px #0f172a2e;--shadow-modal:0 24px 60px #0f172a33;--shadow-toast:0 12px 30px #0f172a26;color-scheme:light}\n[data-scheme=\"zumrut\"]{--bg:#04120f;--bg-grid:#34d39909;--panel:#0a1f1ab8;--panel-solid:#0a1f1a;--panel-hover:#0f2a23;--border:#94b8ac24;--border-strong:#34d39973;--border-w:1px;--text:#e3f4ee;--muted:#8fb3a7;--label:#a9cbbf;--nav-text:#b7d6cb;--nav-title:#7ba497;--accent:#34d399;--accent-2:#14b8a6;--on-accent:#ffffff;--primary-1:#047857;--primary-2:#0f766e;--active-1:#34d39929;--active-2:#14b8a614;--active-line:#34d39947;--accent-soft:#34d39914;--accent-line:#34d39959;--focus:#34d399;--focus-w:2px;--focus-ring:#34d3991f;--danger:#f43f5e;--warn:#f59e0b;--ok:#34d399;--ok-text:#6ee7b7;--danger-text:#fda4af;--warn-text:#fcd34d;--ok-soft:#34d3991a;--ok-line:#34d3994d;--danger-soft:#f43f5e1a;--danger-line:#f43f5e59;--warn-soft:#f59e0b1a;--warn-line:#f59e0b4d;--sidebar-bg:#05140fd9;--topbar-bg:#04120f99;--modal-bg:#081b16;--modal-border:#34d39938;--backdrop:#02060fb8;--toast-bg:#0c2a22;--toast-text:#a7f3d0;--toast-line:#34d39966;--toast-err-bg:#2a0f17;--toast-err-text:#fecdd3;--toast-err-line:#f43f5e73;--badge-text:#ccfbf1;--badge-bg:#14b8a624;--badge-line:#14b8a659;--on-badge:#022c22;--bar-track:#94b8ac33;--scroll-thumb:#94b8ac33;--glow-1:#14b8a62e;--glow-2:#34d3991f;--shadow-pop:0 14px 40px #0009;--shadow-modal:0 30px 80px #0009;--shadow-toast:0 12px 30px #00000073;color-scheme:dark}\n[data-scheme=\"zumrut\"].theme-light,.theme-light [data-scheme=\"zumrut\"]{--bg:#eef6f3;--bg-grid:#0b262008;--panel:#ffffffe0;--panel-solid:#ffffff;--panel-hover:#e6f2ed;--border:#0b26201c;--border-strong:#0f766e66;--border-w:1px;--text:#0b2620;--muted:#4a665d;--label:#2f4d44;--nav-text:#23413a;--nav-title:#557269;--accent:#0f766e;--accent-2:#047857;--on-accent:#ffffff;--primary-1:#047857;--primary-2:#0f766e;--active-1:#0f766e29;--active-2:#04785714;--active-line:#0f766e47;--accent-soft:#0f766e14;--accent-line:#0f766e59;--focus:#0f766e;--focus-w:2px;--focus-ring:#0f766e1a;--danger:#be123c;--warn:#b45309;--ok:#047857;--ok-text:#047857;--danger-text:#9f1239;--warn-text:#92400e;--ok-soft:#0478571a;--ok-line:#0478574d;--danger-soft:#be123c1a;--danger-line:#be123c59;--warn-soft:#b453091a;--warn-line:#b453094d;--sidebar-bg:#e3f0ebd9;--topbar-bg:#e9f3ef99;--modal-bg:#ffffff;--modal-border:#0f766e40;--backdrop:#0f172a59;--toast-bg:#ecfdf5;--toast-text:#065f46;--toast-line:#04785766;--toast-err-bg:#fff1f2;--toast-err-text:#9f1239;--toast-err-line:#be123c73;--badge-text:#053b33;--badge-bg:#04785724;--badge-line:#04785759;--on-badge:#ffffff;--bar-track:#0b262033;--scroll-thumb:#0b262033;--glow-1:#0478572e;--glow-2:#0f766e1f;--shadow-pop:0 14px 40px #0f172a2e;--shadow-modal:0 24px 60px #0f172a33;--shadow-toast:0 12px 30px #0f172a26;color-scheme:light}\n[data-scheme=\"gunbatimi\"]{--bg:#140b08;--bg-grid:#fbbf2409;--panel:#22130eb8;--panel-solid:#22130e;--panel-hover:#2c1a13;--border:#d6b2a324;--border-strong:#fbbf2473;--border-w:1px;--text:#f8ebe4;--muted:#c19d8f;--label:#d9b8aa;--nav-text:#e2c6b9;--nav-title:#a88072;--accent:#fbbf24;--accent-2:#f43f5e;--on-accent:#ffffff;--primary-1:#b45309;--primary-2:#be123c;--active-1:#fbbf2429;--active-2:#f43f5e14;--active-line:#fbbf2447;--accent-soft:#fbbf2414;--accent-line:#fbbf2459;--focus:#fbbf24;--focus-w:2px;--focus-ring:#fbbf241f;--danger:#fb7185;--warn:#fbbf24;--ok:#34d399;--ok-text:#6ee7b7;--danger-text:#fda4af;--warn-text:#fcd34d;--ok-soft:#34d3991a;--ok-line:#34d3994d;--danger-soft:#fb71851a;--danger-line:#fb718559;--warn-soft:#fbbf241a;--warn-line:#fbbf244d;--sidebar-bg:#170c09d9;--topbar-bg:#140b0899;--modal-bg:#1d100c;--modal-border:#fbbf2438;--backdrop:#02060fb8;--toast-bg:#2a1d0c;--toast-text:#fde68a;--toast-line:#34d39966;--toast-err-bg:#2a0f17;--toast-err-text:#fecdd3;--toast-err-line:#fb718573;--badge-text:#ffe4e6;--badge-bg:#f43f5e24;--badge-line:#f43f5e59;--on-badge:#1c0f02;--bar-track:#d6b2a333;--scroll-thumb:#d6b2a333;--glow-1:#f43f5e2e;--glow-2:#fbbf241f;--shadow-pop:0 14px 40px #0009;--shadow-modal:0 30px 80px #0009;--shadow-toast:0 12px 30px #00000073;color-scheme:dark}\n[data-scheme=\"gunbatimi\"].theme-light,.theme-light [data-scheme=\"gunbatimi\"]{--bg:#fbf3ee;--bg-grid:#2a140c08;--panel:#ffffffe0;--panel-solid:#ffffff;--panel-hover:#fbeee6;--border:#2a140c1c;--border-strong:#b4530966;--border-w:1px;--text:#2a140c;--muted:#6e4c40;--label:#553529;--nav-text:#4a2c21;--nav-title:#80594b;--accent:#b45309;--accent-2:#be123c;--on-accent:#ffffff;--primary-1:#b45309;--primary-2:#be123c;--active-1:#b4530929;--active-2:#be123c14;--active-line:#b4530947;--accent-soft:#b4530914;--accent-line:#b4530959;--focus:#b45309;--focus-w:2px;--focus-ring:#b453091a;--danger:#be123c;--warn:#b45309;--ok:#047857;--ok-text:#047857;--danger-text:#9f1239;--warn-text:#92400e;--ok-soft:#0478571a;--ok-line:#0478574d;--danger-soft:#be123c1a;--danger-line:#be123c59;--warn-soft:#b453091a;--warn-line:#b453094d;--sidebar-bg:#f6e7ded9;--topbar-bg:#f8ece599;--modal-bg:#ffffff;--modal-border:#b4530940;--backdrop:#0f172a59;--toast-bg:#fffbeb;--toast-text:#78350f;--toast-line:#04785766;--toast-err-bg:#fff1f2;--toast-err-text:#9f1239;--toast-err-line:#be123c73;--badge-text:#4c0519;--badge-bg:#be123c24;--badge-line:#be123c59;--on-badge:#ffffff;--bar-track:#2a140c33;--scroll-thumb:#2a140c33;--glow-1:#be123c2e;--glow-2:#b453091f;--shadow-pop:0 14px 40px #0f172a2e;--shadow-modal:0 24px 60px #0f172a33;--shadow-toast:0 12px 30px #0f172a26;color-scheme:light}\n[data-scheme=\"mor\"]{--bg:#0c0816;--bg-grid:#a78bfa09;--panel:#171028b8;--panel-solid:#171028;--panel-hover:#1f1636;--border:#a99fd024;--border-strong:#a78bfa73;--border-w:1px;--text:#ece7fb;--muted:#a39bc4;--label:#bdb4dc;--nav-text:#c8c0e6;--nav-title:#8a82b0;--accent:#a78bfa;--accent-2:#6366f1;--on-accent:#ffffff;--primary-1:#7c3aed;--primary-2:#4f46e5;--active-1:#a78bfa29;--active-2:#6366f114;--active-line:#a78bfa47;--accent-soft:#a78bfa14;--accent-line:#a78bfa59;--focus:#a78bfa;--focus-w:2px;--focus-ring:#a78bfa1f;--danger:#fb7185;--warn:#fbbf24;--ok:#34d399;--ok-text:#6ee7b7;--danger-text:#fda4af;--warn-text:#fcd34d;--ok-soft:#34d3991a;--ok-line:#34d3994d;--danger-soft:#fb71851a;--danger-line:#fb718559;--warn-soft:#fbbf241a;--warn-line:#fbbf244d;--sidebar-bg:#0e0a1bd9;--topbar-bg:#0c081699;--modal-bg:#130d22;--modal-border:#a78bfa38;--backdrop:#02060fb8;--toast-bg:#0f2a26;--toast-text:#a7f3d0;--toast-line:#34d39966;--toast-err-bg:#2a0f17;--toast-err-text:#fecdd3;--toast-err-line:#fb718573;--badge-text:#ddd6fe;--badge-bg:#6366f124;--badge-line:#6366f159;--on-badge:#1a0b3d;--bar-track:#a99fd033;--scroll-thumb:#a99fd033;--glow-1:#6366f12e;--glow-2:#a78bfa1f;--shadow-pop:0 14px 40px #0009;--shadow-modal:0 30px 80px #0009;--shadow-toast:0 12px 30px #00000073;color-scheme:dark}\n[data-scheme=\"mor\"].theme-light,.theme-light [data-scheme=\"mor\"]{--bg:#f3f1fb;--bg-grid:#1b143308;--panel:#ffffffe0;--panel-solid:#ffffff;--panel-hover:#eeeaf9;--border:#1b14331c;--border-strong:#6d28d966;--border-w:1px;--text:#1b1433;--muted:#5b5378;--label:#3f3760;--nav-text:#352d55;--nav-title:#6a6290;--accent:#6d28d9;--accent-2:#4f46e5;--on-accent:#ffffff;--primary-1:#6d28d9;--primary-2:#4f46e5;--active-1:#6d28d929;--active-2:#4f46e514;--active-line:#6d28d947;--accent-soft:#6d28d914;--accent-line:#6d28d959;--focus:#6d28d9;--focus-w:2px;--focus-ring:#6d28d91a;--danger:#be123c;--warn:#b45309;--ok:#047857;--ok-text:#047857;--danger-text:#9f1239;--warn-text:#92400e;--ok-soft:#0478571a;--ok-line:#0478574d;--danger-soft:#be123c1a;--danger-line:#be123c59;--warn-soft:#b453091a;--warn-line:#b453094d;--sidebar-bg:#ebe7f8d9;--topbar-bg:#efecf999;--modal-bg:#ffffff;--modal-border:#6d28d940;--backdrop:#0f172a59;--toast-bg:#ecfdf5;--toast-text:#065f46;--toast-line:#04785766;--toast-err-bg:#fff1f2;--toast-err-text:#9f1239;--toast-err-line:#be123c73;--badge-text:#2e1065;--badge-bg:#4f46e524;--badge-line:#4f46e559;--on-badge:#ffffff;--bar-track:#1b143333;--scroll-thumb:#1b143333;--glow-1:#4f46e52e;--glow-2:#6d28d91f;--shadow-pop:0 14px 40px #0f172a2e;--shadow-modal:0 24px 60px #0f172a33;--shadow-toast:0 12px 30px #0f172a26;color-scheme:light}\n[data-scheme=\"okyanus\"]{--bg:#050b1a;--bg-grid:#38bdf809;--panel:#0a1630b8;--panel-solid:#0a1630;--panel-hover:#0f1e3d;--border:#94acd024;--border-strong:#38bdf873;--border-w:1px;--text:#e2ecfb;--muted:#8fa6c8;--label:#a9bee0;--nav-text:#b6c9e8;--nav-title:#7390b8;--accent:#38bdf8;--accent-2:#3b82f6;--on-accent:#ffffff;--primary-1:#0369a1;--primary-2:#1d4ed8;--active-1:#38bdf829;--active-2:#3b82f614;--active-line:#38bdf847;--accent-soft:#38bdf814;--accent-line:#38bdf859;--focus:#38bdf8;--focus-w:2px;--focus-ring:#38bdf81f;--danger:#f43f5e;--warn:#f59e0b;--ok:#34d399;--ok-text:#6ee7b7;--danger-text:#fda4af;--warn-text:#fcd34d;--ok-soft:#34d3991a;--ok-line:#34d3994d;--danger-soft:#f43f5e1a;--danger-line:#f43f5e59;--warn-soft:#f59e0b1a;--warn-line:#f59e0b4d;--sidebar-bg:#061026d9;--topbar-bg:#050b1a99;--modal-bg:#08122a;--modal-border:#38bdf838;--backdrop:#02060fb8;--toast-bg:#0f2a26;--toast-text:#a7f3d0;--toast-line:#34d39966;--toast-err-bg:#2a0f17;--toast-err-text:#fecdd3;--toast-err-line:#f43f5e73;--badge-text:#bfdbfe;--badge-bg:#3b82f624;--badge-line:#3b82f659;--on-badge:#03111f;--bar-track:#94acd033;--scroll-thumb:#94acd033;--glow-1:#3b82f62e;--glow-2:#38bdf81f;--shadow-pop:0 14px 40px #0009;--shadow-modal:0 30px 80px #0009;--shadow-toast:0 12px 30px #00000073;color-scheme:dark}\n[data-scheme=\"okyanus\"].theme-light,.theme-light [data-scheme=\"okyanus\"]{--bg:#eef4fb;--bg-grid:#0b1a3308;--panel:#ffffffe0;--panel-solid:#ffffff;--panel-hover:#e7eff9;--border:#0b1a331c;--border-strong:#0369a166;--border-w:1px;--text:#0b1a33;--muted:#4b5d78;--label:#2f4262;--nav-text:#26385a;--nav-title:#53668a;--accent:#0369a1;--accent-2:#1d4ed8;--on-accent:#ffffff;--primary-1:#0369a1;--primary-2:#1d4ed8;--active-1:#0369a129;--active-2:#1d4ed814;--active-line:#0369a147;--accent-soft:#0369a114;--accent-line:#0369a159;--focus:#0369a1;--focus-w:2px;--focus-ring:#0369a11a;--danger:#be123c;--warn:#b45309;--ok:#047857;--ok-text:#047857;--danger-text:#9f1239;--warn-text:#92400e;--ok-soft:#0478571a;--ok-line:#0478574d;--danger-soft:#be123c1a;--danger-line:#be123c59;--warn-soft:#b453091a;--warn-line:#b453094d;--sidebar-bg:#e4edf8d9;--topbar-bg:#eaf1fa99;--modal-bg:#ffffff;--modal-border:#0369a140;--backdrop:#0f172a59;--toast-bg:#ecfdf5;--toast-text:#065f46;--toast-line:#04785766;--toast-err-bg:#fff1f2;--toast-err-text:#9f1239;--toast-err-line:#be123c73;--badge-text:#0c2a5b;--badge-bg:#1d4ed824;--badge-line:#1d4ed859;--on-badge:#ffffff;--bar-track:#0b1a3333;--scroll-thumb:#0b1a3333;--glow-1:#1d4ed82e;--glow-2:#0369a11f;--shadow-pop:0 14px 40px #0f172a2e;--shadow-modal:0 24px 60px #0f172a33;--shadow-toast:0 12px 30px #0f172a26;color-scheme:light}\n[data-scheme=\"grafit\"]{--bg:#0d0e10;--bg-grid:#ffffff05;--panel:#17191cb8;--panel-solid:#17191c;--panel-hover:#1f2226;--border:#a1a6ad24;--border-strong:#cbd5e173;--border-w:1px;--text:#e8e9eb;--muted:#9a9fa6;--label:#b5b9bf;--nav-text:#c2c6cb;--nav-title:#868b93;--accent:#cbd5e1;--accent-2:#94a3b8;--on-accent:#ffffff;--primary-1:#3f4652;--primary-2:#2b3039;--active-1:#cbd5e129;--active-2:#94a3b814;--active-line:#cbd5e147;--accent-soft:#cbd5e114;--accent-line:#cbd5e159;--focus:#cbd5e1;--focus-w:2px;--focus-ring:#cbd5e11f;--danger:#f43f5e;--warn:#f59e0b;--ok:#34d399;--ok-text:#6ee7b7;--danger-text:#fda4af;--warn-text:#fcd34d;--ok-soft:#34d3991a;--ok-line:#34d3994d;--danger-soft:#f43f5e1a;--danger-line:#f43f5e59;--warn-soft:#f59e0b1a;--warn-line:#f59e0b4d;--sidebar-bg:#0f1012d9;--topbar-bg:#0d0e1099;--modal-bg:#141619;--modal-border:#cbd5e138;--backdrop:#02060fb8;--toast-bg:#1a1d21;--toast-text:#e8e9eb;--toast-line:#34d39966;--toast-err-bg:#2a0f17;--toast-err-text:#fecdd3;--toast-err-line:#f43f5e73;--badge-text:#e5e7eb;--badge-bg:#94a3b824;--badge-line:#94a3b859;--on-badge:#111214;--bar-track:#a1a6ad33;--scroll-thumb:#a1a6ad33;--glow-1:#94a3b812;--glow-2:#cbd5e10d;--shadow-pop:0 14px 40px #0009;--shadow-modal:0 30px 80px #0009;--shadow-toast:0 12px 30px #00000073;color-scheme:dark}\n[data-scheme=\"grafit\"].theme-light,.theme-light [data-scheme=\"grafit\"]{--bg:#f2f3f5;--bg-grid:#0000;--panel:#ffffffe0;--panel-solid:#ffffff;--panel-hover:#eceef1;--border:#16181b1c;--border-strong:#3f465266;--border-w:1px;--text:#16181b;--muted:#575d66;--label:#3b4048;--nav-text:#30353c;--nav-title:#646a73;--accent:#3f4652;--accent-2:#5b636e;--on-accent:#ffffff;--primary-1:#3f4652;--primary-2:#2b3039;--active-1:#3f465229;--active-2:#5b636e14;--active-line:#3f465247;--accent-soft:#3f465214;--accent-line:#3f465259;--focus:#3f4652;--focus-w:2px;--focus-ring:#3f46521a;--danger:#be123c;--warn:#b45309;--ok:#047857;--ok-text:#047857;--danger-text:#9f1239;--warn-text:#92400e;--ok-soft:#0478571a;--ok-line:#0478574d;--danger-soft:#be123c1a;--danger-line:#be123c59;--warn-soft:#b453091a;--warn-line:#b453094d;--sidebar-bg:#e9eaedd9;--topbar-bg:#eff0f299;--modal-bg:#ffffff;--modal-border:#3f465240;--backdrop:#0f172a59;--toast-bg:#f6f7f8;--toast-text:#16181b;--toast-line:#04785766;--toast-err-bg:#fff1f2;--toast-err-text:#9f1239;--toast-err-line:#be123c73;--badge-text:#1f2328;--badge-bg:#5b636e24;--badge-line:#5b636e59;--on-badge:#ffffff;--bar-track:#16181b33;--scroll-thumb:#16181b33;--glow-1:#0000;--glow-2:#0000;--shadow-pop:0 14px 40px #0f172a2e;--shadow-modal:0 24px 60px #0f172a33;--shadow-toast:0 12px 30px #0f172a26;color-scheme:light}\n[data-scheme=\"yuksek-kontrast\"]{--bg:#000000;--bg-grid:#0000;--panel:#000000;--panel-solid:#000000;--panel-hover:#1f1f1f;--border:#ffffff;--border-strong:#ffff00;--border-w:2px;--text:#ffffff;--muted:#e6e6e6;--label:#ffffff;--nav-text:#ffffff;--nav-title:#e6e6e6;--accent:#ffff00;--accent-2:#00ffff;--on-accent:#000000;--primary-1:#ffff00;--primary-2:#ffff00;--active-1:#ffff0033;--active-2:#ffff0033;--active-line:#ffff00;--accent-soft:#ffff0026;--accent-line:#ffff00;--focus:#00ffff;--focus-w:3px;--focus-ring:#00ffff80;--danger:#ff6b6b;--warn:#ffd000;--ok:#00ff7f;--ok-text:#00ff7f;--danger-text:#ff9090;--warn-text:#ffd000;--ok-soft:#00ff7f1a;--ok-line:#00ff7f;--danger-soft:#ff6b6b1a;--danger-line:#ff6b6b;--warn-soft:#ffd0001a;--warn-line:#ffd000;--sidebar-bg:#000000;--topbar-bg:#000000;--modal-bg:#000000;--modal-border:#ffffff;--backdrop:#000000d9;--toast-bg:#000000;--toast-text:#ffffff;--toast-line:#ffffff;--toast-err-bg:#000000;--toast-err-text:#ff9090;--toast-err-line:#ff6b6b;--badge-text:#ffffff;--badge-bg:#000000;--badge-line:#ffffff;--on-badge:#000000;--bar-track:#ffffff59;--scroll-thumb:#ffffff99;--glow-1:#0000;--glow-2:#0000;--shadow-pop:0 14px 40px #0009;--shadow-modal:0 30px 80px #0009;--shadow-toast:0 12px 30px #00000073;color-scheme:dark}\n[data-scheme=\"yuksek-kontrast\"].theme-light,.theme-light [data-scheme=\"yuksek-kontrast\"]{--bg:#ffffff;--bg-grid:#0000;--panel:#ffffff;--panel-solid:#ffffff;--panel-hover:#e6e6e6;--border:#000000;--border-strong:#0000cc;--border-w:2px;--text:#000000;--muted:#1f1f1f;--label:#000000;--nav-text:#000000;--nav-title:#1f1f1f;--accent:#0000cc;--accent-2:#000000;--on-accent:#ffffff;--primary-1:#0000cc;--primary-2:#0000cc;--active-1:#0000cc1f;--active-2:#0000cc1f;--active-line:#0000cc;--accent-soft:#0000cc14;--accent-line:#0000cc;--focus:#0000cc;--focus-w:3px;--focus-ring:#0000cc66;--danger:#b00020;--warn:#7a4b00;--ok:#006400;--ok-text:#006400;--danger-text:#b00020;--warn-text:#7a4b00;--ok-soft:#0064001a;--ok-line:#006400;--danger-soft:#b000201a;--danger-line:#b00020;--warn-soft:#7a4b001a;--warn-line:#7a4b00;--sidebar-bg:#ffffff;--topbar-bg:#ffffff;--modal-bg:#ffffff;--modal-border:#000000;--backdrop:#000000a6;--toast-bg:#ffffff;--toast-text:#000000;--toast-line:#000000;--toast-err-bg:#ffffff;--toast-err-text:#b00020;--toast-err-line:#b00020;--badge-text:#000000;--badge-bg:#ffffff;--badge-line:#000000;--on-badge:#ffffff;--bar-track:#00000040;--scroll-thumb:#00000080;--glow-1:#0000;--glow-2:#0000;--shadow-pop:0 14px 40px #0f172a2e;--shadow-modal:0 24px 60px #0f172a33;--shadow-toast:0 12px 30px #0f172a26;color-scheme:light}\n/* Ortak çekirdek — kabuk ve bileşenler (Falcon Ofis görünümü).\nÖnce tokens.css yüklenmeli. Yönler mantıksal özelliklerle yazılır (inline-start/end), RTL kendiliğinden çalışır.\nSınıflar Falcon ile aynı adlardadır; React uygulaması kendi CSS'ini koruyup yalnız tokens.css'i alabilir. */\n*{box-sizing:border-box}.fc-root{font-size:calc(14px * var(--font-scale))}.fc-root{height:100%;margin:0}.fc-root{\nbackground:radial-gradient(1200px 600px at 85% -10%,var(--glow-1),transparent 60%),radial-gradient(900px 500px at -10% 110%,var(--glow-2),transparent 60%),\nlinear-gradient(var(--bg-grid) 1px,transparent 1px) 0 0/40px 40px,linear-gradient(90deg,var(--bg-grid) 1px,transparent 1px) 0 0/40px 40px,var(--bg);\ncolor:var(--text);-webkit-font-smoothing:antialiased;font-family:var(--font-ui);font-size:1rem;line-height:1.45\n}\n.fc-root[lang=ar]{font-family:var(--font-ar);line-height:1.6}\n.fc-root[lang=ar] :is(input,textarea,select,button){font-family:var(--font-ar)}\nbutton{font:inherit;color:inherit;cursor:pointer}\na{color:var(--accent);text-decoration:none}\na:hover{text-decoration:underline}\ncode,kbd,.mono{font-family:var(--font-mono);font-size:.86em}\n.muted{color:var(--muted)}\n.accent{color:var(--accent)}\n.ltr{direction:ltr;unicode-bidi:isolate}\n.fc-hidden,[hidden]{display:none!important}\nsvg.fc-spin{animation:fc-spin 1.1s linear infinite}\nsvg.fc-pulse{animation:fc-pulse 1.2s ease-in-out infinite}\nsvg.fc-i{width:1.15em;height:1.15em;flex:none;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}\n:focus-visible{outline:var(--focus-w) solid var(--focus);outline-offset:2px}\n/* ---- kabuk ---- */\n.shell{height:100%;display:flex}\n.sidebar{width:var(--sidebar-w);flex:none;display:flex;flex-direction:column;border-inline-end:var(--border-w) solid var(--border);background:var(--sidebar-bg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}\n.brand{display:flex;align-items:center;gap:12px;padding:22px 20px 18px;border-bottom:var(--border-w) solid var(--border)}\n.brand-logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--grad-primary);color:var(--on-accent);flex:none}\n.brand-name{font-size:1.21rem;font-weight:700;letter-spacing:.2px}\n.brand-tag{color:var(--muted);margin-top:2px;font-size:.82rem}\n.version-badge{color:var(--accent);direction:ltr;background:var(--accent-soft);border:1px solid var(--accent-line);border-radius:999px;align-self:flex-start;margin-inline-start:auto;padding:2px 7px;font-size:11px;font-weight:600}\n.nav{flex:1;padding:12px 12px 20px;overflow-y:auto}\n.nav-group{margin-top:10px}\n.nav-group-title{text-transform:uppercase;letter-spacing:1.2px;color:var(--nav-title);padding:10px 12px 6px;font-size:11px}\n.fc-root[lang=ar] .nav-group-title{letter-spacing:0;text-transform:none;font-size:12px}\n.nav-item{display:flex;align-items:center;gap:12px;margin:2px 0;padding:10px 12px;border:1px solid transparent;border-radius:10px;color:var(--nav-text);background:none;width:100%;text-align:start;transition:background .15s,color .15s,border-color .15s}\n.nav-item:hover{background:var(--panel-hover);color:var(--text);text-decoration:none}\n.nav-item.active{color:var(--text);background:var(--grad-active);border-color:var(--active-line);box-shadow:inset 3px 0 0 var(--accent)}\n.fc-root[dir=rtl] .nav-item.active{box-shadow:inset -3px 0 0 var(--accent)}\n.nav-item.active svg{color:var(--accent)}\n.main{flex:1;min-width:0;display:flex;flex-direction:column}\n.content{flex:1;padding:28px 32px 40px;overflow-y:auto}\n/* ---- üst çubuk ---- */\n.topbar{position:relative;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 24px 16px 32px;border-bottom:var(--border-w) solid var(--border);background:var(--topbar-bg);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}\n.fc-root[dir=rtl] .topbar{padding:16px 32px 16px 24px}\n.topbar-title{min-width:0}\n.page-title{margin:0;font-size:1.57rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.page-sub{color:var(--muted);margin:4px 0 0;font-size:.93rem}\n.topbar-actions{display:flex;align-items:center;gap:8px;flex-wrap:nowrap}\n.topbar-sep{width:1px;height:22px;background:var(--border);margin-inline:4px}\n.win-controls{display:flex;gap:6px}\n.icon-btn.menu-btn{display:none}\n.icon-btn{display:grid;place-items:center;width:34px;height:34px;padding:0;border:var(--border-w) solid var(--border);border-radius:9px;color:var(--muted);background:none;position:relative}\n.icon-btn:hover{background:var(--panel-hover);color:var(--text)}\n.icon-btn:disabled{opacity:.3;cursor:not-allowed}\n.icon-btn.danger:hover{color:var(--danger-text);background:var(--danger-soft);border-color:var(--danger-line)}\n.icon-btn.tiny{width:28px;height:28px;border-radius:7px}\n.top-act-wrap{position:relative;display:inline-flex}\n.top-act{position:relative;gap:6px;padding:7px 12px;font-size:13px;line-height:1}\n.top-act:disabled{opacity:.75;cursor:default}\n.top-act .top-act-label{white-space:nowrap}\n.top-act.compact .top-act-label{display:none}\n.top-act.compact.avail .top-act-label,.top-act.compact.busy .top-act-label{display:inline}\n.sync-act.idle svg{color:var(--ok-text)}\n.sync-act.syncing svg{color:var(--accent)}\n.sync-act.syncing svg{animation:fc-spin 1.1s linear infinite}\n.sync-act.error{color:var(--danger-text);border-color:var(--danger-line)}\n.sync-act.off,.sync-act.offline{color:var(--muted)}\n.lan-act.on svg{color:var(--ok-text)}\n.lan-act.off{color:var(--muted)}\n.sync-badge{position:absolute;top:-7px;inset-inline-end:-7px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;display:grid;place-items:center;background:var(--accent);color:var(--on-badge);font-size:10.5px;font-weight:700}\n.update-act.avail{color:var(--accent);border-color:var(--border-strong)}\n.update-dot{position:absolute;top:-3px;inset-inline-end:-3px;width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 2px var(--bg)}\n.update-float{position:absolute;top:calc(100% + 8px);inset-inline-end:0;z-index:70;width:300px;max-width:calc(100vw - 24px);display:grid;gap:8px;padding:12px 14px;font-size:13px;background:var(--panel-solid);border:var(--border-w) solid var(--border-strong);border-radius:12px;box-shadow:var(--shadow-pop)}\n.update-float strong{line-height:1.35}\n.update-float .fc-row{justify-content:flex-end;margin:0}\n.update-bar{height:8px;border-radius:999px;overflow:hidden;background:var(--bar-track)}\n.update-bar>span{display:block;height:100%;width:0;background:var(--accent);transition:width .2s}\n.update-bar.indet>span{width:35%!important;animation:fc-indet 1.2s ease-in-out infinite}\n.fc-root[dir=rtl] .update-bar>span{margin-inline-start:0}\n.update-detail{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}\n.update-mode{color:var(--accent);font-size:11.5px;font-weight:600}\n.lang-switch{display:flex;align-items:center;gap:2px;padding:3px;border:var(--border-w) solid var(--border);border-radius:10px}\n.lang-btn{color:var(--muted);background:none;border:0;border-radius:7px;padding:4px 8px;font-size:12px;font-weight:600}\n.lang-btn.active{color:var(--accent);background:var(--active-1)}\n.lang-options{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}\n.lang-option{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border:var(--border-w) solid var(--border);border-radius:10px;background:var(--panel-solid)}\n.lang-option.active{border-color:var(--border-strong);color:var(--accent)}\n.fc-root.fc-host-android .fc-desk-only,.fc-root.fc-host-browser .fc-desk-only{display:none!important}\n/* ---- düğmeler ---- */\n.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;padding:9px 16px;font-weight:500;color:var(--text);background:var(--panel-solid);border:var(--border-w) solid var(--border);border-radius:10px;transition:background .15s,border-color .15s,filter .15s}\n.btn:hover:not(:disabled){background:var(--panel-hover);border-color:var(--border-strong);text-decoration:none}\n.btn:disabled{opacity:.5;cursor:not-allowed}\n.btn.primary{color:var(--on-accent);background:var(--grad-primary);border-color:transparent}\n.btn.primary:hover:not(:disabled){filter:brightness(1.12);background:var(--grad-primary);border-color:transparent}\n.btn.success{color:var(--ok-text);background:var(--ok-soft);border-color:var(--ok-line)}\n.btn.danger-soft{color:var(--danger-text);background:var(--danger-soft);border-color:var(--danger-line)}\n.btn.danger{color:var(--on-accent);background:var(--danger);border-color:var(--danger)}\n.btn.ghost{background:none}\n.btn.small{padding:6px 11px;gap:6px;font-size:12.5px;border-radius:8px}\n.btn-row,.fc-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}\n.fc-spacer{flex:1}\n.segmented{display:flex;gap:4px;padding:4px;background:var(--panel-solid);border:var(--border-w) solid var(--border);border-radius:10px}\n.segmented button{flex:1;padding:8px 10px;border:0;border-radius:7px;background:none;color:var(--muted);font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px}\n.segmented button.active{color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,transparent)}\n/* ---- girişler ---- */\ninput,select,textarea{font:inherit;color:var(--text);background:var(--panel-solid);border:var(--border-w) solid var(--border);border-radius:9px;outline:none;min-width:0;padding:9px 12px;transition:border-color .15s,box-shadow .15s}\ninput:focus,select:focus,textarea:focus{border-color:var(--border-strong);box-shadow:0 0 0 3px var(--focus-ring)}\ninput:disabled,select:disabled,textarea:disabled{opacity:.55}\ninput.invalid,textarea.invalid{border-color:var(--danger)}\ntextarea{resize:vertical;width:100%}\n.field{display:flex;flex-direction:column;gap:7px;min-width:0;margin-top:12px}\n.field>input,.field>textarea,.field>select{width:100%}\n.field-label{color:var(--label);font-size:12.5px;font-weight:500}\n.field-hint{color:var(--muted);font-size:11.5px}\n.check{display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer}\n.check input{width:16px;height:16px;padding:0;accent-color:var(--accent)}\n/* ---- kartlar ---- */\n.card{background:var(--panel);border:var(--border-w) solid var(--border);border-radius:var(--radius);padding:20px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}\n.card-title{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:1.07rem;font-weight:600}\n.card-title svg{color:var(--accent)}\n.card-desc{color:var(--muted);margin:0 0 6px;font-size:.93rem}\n.section-title{color:var(--label);text-transform:uppercase;letter-spacing:1px;margin:0 0 14px;font-size:13px;font-weight:600}\n.fc-root[lang=ar] .section-title{text-transform:none;letter-spacing:0;font-size:14px}\n.badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;font-size:12px;color:var(--badge-text);background:var(--badge-bg);border:1px solid var(--badge-line);border-radius:999px}\n.notice{display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px 16px;font-size:13px;color:var(--warn-text);background:var(--warn-soft);border:var(--border-w) solid var(--warn-line);border-radius:10px}\n.notice.info{color:var(--accent);background:var(--accent-soft);border-color:var(--accent-line)}\n.notice.error{color:var(--danger-text);background:var(--danger-soft);border-color:var(--danger-line)}\n.notice.ok{color:var(--ok-text);background:var(--ok-soft);border-color:var(--ok-line)}\n.settings-grid{columns:3 320px;column-gap:18px}\n.settings-grid>*{break-inside:avoid;margin-bottom:18px;display:block;width:100%}\n/* ---- kullanım sayaçları ---- */\n.fc-meter{margin-top:12px}\n.fc-meter-head{display:flex;justify-content:space-between;gap:8px;font-size:12.5px}\n.fc-meter-head b{font-variant-numeric:tabular-nums;font-weight:600}\n.fc-meter .update-bar{margin-top:5px;height:6px}\n.fc-meter.warn .update-bar>span{background:var(--warn)}\n.fc-meter.full .update-bar>span{background:var(--danger)}\n.fc-sub{margin:16px 0 4px;font-size:12px;font-weight:600;color:var(--label);text-transform:uppercase;letter-spacing:.8px}\n.fc-root[lang=ar] .fc-sub{text-transform:none;letter-spacing:0;font-size:13px}\n.fc-list{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}\n.fc-list li{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border:var(--border-w) solid var(--border);border-radius:9px;background:var(--panel-solid);font-size:13px}\n.fc-small{font-size:12px}\n/* ---- modal ---- */\n.modal-backdrop{position:fixed;inset:0;z-index:50;display:grid;place-items:center;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);padding:30px;background:var(--backdrop);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);animation:fc-fade .15s}\n.modal{display:flex;flex-direction:column;width:min(640px,100%);min-height:0;max-height:min(100%,100vh - 60px);background:var(--modal-bg);border:var(--border-w) solid var(--modal-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-modal);animation:fc-pop .16s ease-out}\n.modal.small{width:min(460px,100%)}\n.modal.wide{width:min(880px,100%)}\n.modal-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 22px;border-bottom:var(--border-w) solid var(--border);flex:none}\n.modal-header h2{margin:0;font-size:1.21rem;display:flex;align-items:center;gap:8px}\n.modal-body{flex:auto;min-height:0;padding:20px 22px;overflow-y:auto;line-height:1.6}\n.modal-body p{margin:0 0 10px}\n.modal-footer{display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:16px 22px;border-top:var(--border-w) solid var(--border);flex:none}\n.fc-steps{display:flex;gap:6px;margin-bottom:16px}\n.fc-steps i{flex:1;height:4px;border-radius:4px;background:var(--bar-track)}\n.fc-steps i.on{background:var(--accent)}\n.fc-notes{margin:0;padding-inline-start:20px;white-space:pre-wrap}\n.fc-ann{border-bottom:var(--border-w) solid var(--border);padding:12px 0}\n.fc-ann:last-child{border-bottom:0}\n.fc-ann h3{margin:0 0 2px;font-size:1rem;display:flex;gap:8px;align-items:center}\n.fc-ann .fc-date{color:var(--muted);font-size:12px;margin-bottom:6px}\n.fc-ann .fc-text{white-space:pre-wrap}\n.fc-tag{display:inline-block;padding:1px 8px;border-radius:6px;font-size:11px;color:var(--on-accent);background:var(--danger)}\n/* ---- bildirim ---- */\n.toasts{position:fixed;bottom:24px;inset-inline-end:24px;z-index:100;display:flex;flex-direction:column;gap:10px}\n.toast{max-width:460px;padding:12px 18px;font-size:13.5px;color:var(--toast-text);background:var(--toast-bg);border:1px solid var(--toast-line);border-radius:11px;box-shadow:var(--shadow-toast);animation:fc-pop .18s ease-out}\n.toast.error{color:var(--toast-err-text);background:var(--toast-err-bg);border-color:var(--toast-err-line)}\n.toast.info{color:var(--text);background:var(--panel-solid);border-color:var(--border-strong)}\n@keyframes fc-fade{from{opacity:0}}\n@keyframes fc-pop{from{opacity:0;transform:translateY(6px) scale(.98)}}\n@keyframes fc-spin{to{transform:rotate(360deg)}}\n@keyframes fc-pulse{50%{opacity:.4}}\n@keyframes fc-indet{0%{margin-inline-start:-35%}100%{margin-inline-start:100%}}\n.fc-root[dir=rtl] .fc-flip svg,.fc-root[dir=rtl] svg.fc-flip{transform:scaleX(-1)}\n::-webkit-scrollbar{width:10px;height:10px}\n::-webkit-scrollbar-thumb{background:var(--scroll-thumb);border:3px solid transparent;border-radius:10px;background-clip:padding-box}\n@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}\n/* ---- dar ekran / Android ---- */\n@media (max-width:900px){\n.shell{position:relative}\n.sidebar{position:fixed;inset-block:0;inset-inline-start:0;z-index:60;transform:translateX(-100%);transition:transform .2s}\n.fc-root[dir=rtl] .sidebar{transform:translateX(100%)}\n.drawer-open .sidebar,.fc-root[dir=rtl] .drawer-open .sidebar{transform:none}\n.drawer-open .drawer-backdrop{display:block;position:fixed;inset:0;z-index:59;background:var(--backdrop)}\n.icon-btn.menu-btn{display:grid}\n.topbar,.fc-root[dir=rtl] .topbar{gap:10px;padding:10px 12px}\n.topbar-title{flex:1 1 auto;min-width:96px}\n.page-title{font-size:1.29rem}\n.page-sub{display:none}\n.topbar-actions{gap:4px;overflow-x:auto;scrollbar-width:none;min-width:0;flex:0 1 auto;padding:8px 4px 4px;margin:-8px 0 -4px}\n.topbar-actions>*{flex-shrink:0}\n.top-act{padding:7px 9px}\n.top-act .top-act-label{display:none}\n.top-act.avail .top-act-label,.top-act.busy .top-act-label{display:inline}\n.update-float{position:fixed;top:62px;inset-inline:10px;width:auto;max-width:none}\n.content{padding:14px 12px 32px}\n.card{padding:14px}\ninput,select,textarea{font-size:16px}\n.lang-options{grid-template-columns:1fr}\n.modal-backdrop{place-items:end stretch;padding:0}\n.modal,.modal.small,.modal.wide{width:100%;max-height:94vh;border-radius:18px 18px 0 0}\n.modal-footer{flex-wrap:wrap}\n.modal-footer .btn{flex:1}\n.toasts{inset-inline:12px;bottom:16px;align-items:center}\n}\n/* ---- renk şeması seçici ---- */\n.drawer-backdrop{display:none}\n.fc-schemes{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px}\n.fc-scheme{display:flex;flex-direction:column;align-items:stretch;gap:7px;padding:8px;text-align:start;font-size:12.5px;color:var(--text);background:var(--panel-solid);border:var(--border-w) solid var(--border);border-radius:var(--radius-md)}\n.fc-scheme:hover{border-color:var(--border-strong)}\n.fc-scheme.active{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}\n.fc-scheme>.fc-name{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:18px}\n.fc-scheme>.fc-name svg{color:var(--accent)}\n.fc-swatch{display:flex;height:30px;border-radius:7px;overflow:hidden;border:1px solid var(--border);background:var(--bg)}\n.fc-swatch i{flex:1}\n.fc-swatch i:nth-child(1){background:var(--bg)}\n.fc-swatch i:nth-child(2){background:var(--panel-solid);border-inline:1px solid var(--border)}\n.fc-swatch i:nth-child(3){flex:.8;background:var(--grad-primary)}\n.fc-swatch b{flex:.6;background:var(--accent)}\n/* Asistan Agent */\n.fc-agent-stats{margin-bottom:6px}\n.fc-agent-bar{display:grid;grid-template-columns:minmax(80px,34%) 1fr auto;align-items:center;gap:10px;margin:6px 0;font-size:.9rem}\n.fc-agent-bar-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.fc-agent-bar-t{height:8px;border-radius:99px;background:var(--border);overflow:hidden}\n.fc-agent-bar-f{display:block;height:100%;border-radius:99px;background:var(--accent)}\n.fc-agent-bar-v{color:var(--muted);font-variant-numeric:tabular-nums}\n.fc-agent-note.unread .fc-text{font-weight:600}\n.fc-agent-chip{display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:500;color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent);border:var(--border-w) solid color-mix(in srgb,var(--accent) 35%,transparent)}\n.fc-agent-chip.ai{color:var(--text);background:color-mix(in srgb,var(--accent) 30%,transparent)}\n.fc-agent-note .fc-agent-chip{margin-inline-end:6px}\n.check input{flex-shrink:0}\n/* Çerçevesiz pencerede (frame:false) üst çubuktan sürükleme */\n.fc-root.fc-host-electron .topbar{-webkit-app-region:drag}\n.fc-root.fc-host-electron .topbar button,.fc-root.fc-host-electron .topbar a,.fc-root.fc-host-electron .topbar input,.fc-root.fc-host-electron .topbar select,.fc-root.fc-host-electron .topbar-actions,.fc-root.fc-host-electron .update-float,.fc-root.fc-host-electron .lang-switch{-webkit-app-region:no-drag}\n";})(typeof globalThis!=="undefined"?globalThis:this);
/* ---- storage.js ---- */
/* FC.storage — güvenli localStorage sarmalayıcı. localStorage yoksa ya da hata verirse (gizli kip, kota dolu,
   WebView ayarı) bellekte tutar; program asla bu yüzden çökmez. Değerler JSON olarak saklanır, anahtarlar "fc." önekli. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var mem = {};
  var PFX = 'fc.';
  function ls() { try { var s = g.localStorage; if (!s) return null; var k = '__fc_t'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (e) { return null; } }
  var store = ls();
  function raw(k) {
    if (store) { try { var v = store.getItem(PFX + k); if (v !== null) return v; } catch (e) {} }
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
  }
  var api = {
    get: function (k, def) {
      var v = raw(k); if (v === null || v === undefined) return def;
      try { return JSON.parse(v); } catch (e) { return def; }
    },
    set: function (k, v) {
      var s; try { s = JSON.stringify(v); } catch (e) { return false; }
      mem[k] = s;
      if (store) { try { store.setItem(PFX + k, s); return true; } catch (e) { return false; } }
      return false;
    },
    remove: function (k) { delete mem[k]; if (store) { try { store.removeItem(PFX + k); } catch (e) {} } },
    /** Bellek kipinde mi? (kalıcı saklama yok) */
    volatile: function () { return !store; },
    /** Testler için: belleği ve depoyu değiştir. */
    _use: function (s) { store = s; mem = {}; }
  };
  FC.storage = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- i18n.js ---- */
/* FC.i18n — tr / en / ar sözlük birleştirme, dil seçimi ve dil düğmesi.
   FC.i18n.add({tr:{...}, en:{...}, ar:{...}})  ·  FC.i18n.t('anahtar', {n: 3})  ·  FC.i18n.set('ar')
   Seçim kalıcıdır; <html lang/dir> ayarlanır (ar → rtl). Eksik anahtarda en → tr → anahtarın kendisi döner. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var LANGS = ['tr', 'en', 'ar'];
  var NAMES = { tr: 'Türkçe', en: 'English', ar: 'العربية' };
  var SHORT = { tr: 'TR', en: 'EN', ar: 'ع' };
  var D = { tr: {}, en: {}, ar: {} };
  var cur = null, subs = [];

  function st() { return FC.storage; }
  function norm(l) { l = String(l || '').slice(0, 2).toLowerCase(); return LANGS.indexOf(l) >= 0 ? l : null; }
  function detect() {
    var s = st() && st().get('lang');
    if (norm(s)) return norm(s);
    var nav = g.navigator && (g.navigator.language || (g.navigator.languages || [])[0]);
    return norm(nav) || 'tr';
  }
  function add(dict) {
    if (!dict) return api;
    LANGS.forEach(function (l) { var src = dict[l]; if (src) for (var k in src) D[l][k] = src[k]; });
    return api;
  }
  function t(key, vars, lang) {
    var l = norm(lang) || lang_();
    var s = D[l][key];
    if (s === undefined) s = D.en[key];
    if (s === undefined) s = D.tr[key];
    if (s === undefined) return key;
    if (vars) s = String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
    return s;
  }
  function lang_() { if (!cur) cur = detect(); return cur; }
  function apply() {
    if (api.noDoc) return;   // bağımsız eklenti: uygulamanın <html lang/dir> ayarına dokunma
    var d = g.document && g.document.documentElement; if (!d) return;
    d.setAttribute('lang', lang_());
    d.setAttribute('dir', lang_() === 'ar' ? 'rtl' : 'ltr');
  }
  function set(l) {
    l = norm(l); if (!l) return;
    var changed = l !== cur;
    cur = l;
    if (st()) st().set('lang', l);
    apply();
    if (changed) subs.slice().forEach(function (f) { try { f(l); } catch (e) { if (g.console) console.error(e); } });
  }
  /** Sayı biçimi. Arapçada teknik sayılar Batı rakamlarıyla (latn) yazılır: MB, yüzde, kota okunaklı kalsın. */
  function locale(l) { l = norm(l) || lang_(); return l === 'ar' ? 'ar-u-nu-latn' : l === 'en' ? 'en-US' : 'tr-TR'; }
  function num(n, digits, l) {
    digits = digits || 0;
    try { return Number(n).toLocaleString(locale(l), { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
    catch (e) { return Number(n).toFixed(digits); }
  }
  /** Dil düğmesi (Falcon .lang-switch). Dil değişince kendini günceller. */
  function switcher() {
    var doc = g.document, box = doc.createElement('div');
    box.className = 'lang-switch'; box.setAttribute('role', 'group');
    LANGS.forEach(function (l) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'lang-btn'; b.textContent = SHORT[l]; b.title = NAMES[l];
      b.setAttribute('lang', l); b.dataset.lang = l;
      b.addEventListener('click', function () { set(l); });
      box.appendChild(b);
    });
    function sync() { box.setAttribute('aria-label', t('fc.lang')); Array.prototype.forEach.call(box.children, function (b) { var on = b.dataset.lang === lang_(); b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); }); }
    sync(); onChange(sync);
    return box;
  }
  function onChange(f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; }
  function pick(obj, l) { if (!obj) return ''; if (typeof obj === 'string') return obj; l = norm(l) || lang_(); return obj[l] || obj.en || obj.tr || obj.ar || ''; }

  var api = { add: add, t: t, set: set, lang: lang_, langs: LANGS.slice(), names: NAMES, apply: apply, num: num, locale: locale, onChange: onChange, switcher: switcher, pick: pick, isRtl: function () { return lang_() === 'ar'; }, _reset: function () { cur = null; subs = []; } };

  /* ---- çekirdek modüllerinin metinleri ---- */
  add({
    tr: {
      'fc.ok': 'Tamam', 'fc.cancel': 'Vazgeç', 'fc.close': 'Kapat', 'fc.save': 'Kaydet', 'fc.next': 'İleri', 'fc.back': 'Geri', 'fc.skip': 'Atla', 'fc.done': 'Bitti', 'fc.retry': 'Yeniden dene', 'fc.error': 'Hata', 'fc.open': 'Aç', 'fc.lang': 'Dil',
      'fc.h': 'sa', 'fc.min': 'dk',
      'fc.sync': 'Eşitle', 'fc.sync.idle': 'Eşitlendi', 'fc.sync.syncing': 'Eşitleniyor…', 'fc.sync.error': 'Eşitleme hatası — yeniden denemek için basın', 'fc.sync.off': 'Bulut eşitleme kapalı', 'fc.sync.offline': 'İnternet yok — değişiklikler bu cihazda saklanıyor', 'fc.sync.pending': '{n} değişiklik gönderilmeyi bekliyor',
      'fc.lan': 'Wi-Fi', 'fc.lan.on': 'Wi-Fi eşitleme açık (aynı ağdaki cihazlar)', 'fc.lan.off': 'Wi-Fi eşitleme kapalı', 'fc.lan.busy': 'Wi-Fi ile eşitleniyor…',
      'fc.update': 'Güncelle', 'fc.update.check': 'Güncellemeleri denetle', 'fc.update.checking': 'Denetleniyor…', 'fc.update.none': 'Program güncel (v{v})', 'fc.update.avail': 'Yeni sürüm hazır: v{v}', 'fc.update.press': 'Tek tuşla güncellemek için basın. Kayıtlarınız korunur.',
      'fc.update.downloading': 'İndiriliyor…', 'fc.update.verifying': 'Doğrulanıyor…', 'fc.update.installing': 'Kuruluyor…', 'fc.update.restarting': 'Program yeniden başlatılıyor…', 'fc.update.done': 'Güncelleme kuruldu', 'fc.update.failed': 'Güncelleme yapılamadı: {e}', 'fc.update.fallback': 'Yama uygulanamadı, tam sürüm indiriliyor…', 'fc.update.browser': 'Yeni sürüm yayınlandı; indirme sayfası açılıyor.', 'fc.update.patchMode': 'yalnızca değişen kısımlar', 'fc.update.fullMode': 'tam paket', 'fc.update.offline': 'İnternet yok; bağlantı gelince yeniden denenecek.', 'fc.update.bad': 'İndirilen dosya doğrulanamadı (SHA-256 uyuşmuyor).',
      'fc.p.left': 'kalan {x}', 'fc.p.speed': 'MB/sn', 'fc.p.calc': 'hız hesaplanıyor…', 'fc.p.done': 'İndirildi',
      'fc.theme': 'Tema', 'fc.theme.dark': 'Koyu', 'fc.theme.light': 'Açık', 'fc.theme.auto': 'Otomatik', 'fc.theme.toggle': 'Koyu / açık tema', 'fc.font': 'Yazı boyutu', 'fc.font.smaller': 'Yazıyı küçült', 'fc.font.larger': 'Yazıyı büyüt', 'fc.font.reset': 'Varsayılan', 'fc.look': 'Görünüm', 'fc.look.desc': 'Tema, yazı boyutu ve dil bu cihazda saklanır.',
      'fc.win.minimize': 'Küçült', 'fc.win.half': 'Orta boyut', 'fc.win.restore': 'Tam ekrana dön', 'fc.win.fullscreen': 'Tam ekran', 'fc.win.close': 'Kapat',
      'fc.contact.title': 'Admin ile iletişim', 'fc.contact.desc': 'Öneri, istek ve hata bildirimlerinizi yazın; mesajınız doğrudan yöneticiye ulaşır.', 'fc.contact.type': 'Konu', 'fc.contact.oneri': 'Öneri / istek', 'fc.contact.hata': 'Hata bildirimi', 'fc.contact.reach': 'E-posta ya da telefon (yanıt için, isteğe bağlı)', 'fc.contact.msg': 'Mesajınız', 'fc.contact.send': 'Gönder', 'fc.contact.empty': 'Lütfen mesajınızı yazın.', 'fc.contact.sending': 'Gönderiliyor…', 'fc.contact.ok': 'Mesajınız yöneticiye iletildi. Teşekkürler!', 'fc.contact.queued': 'İnternet yok; mesajınız saklandı, bağlantı gelince kendiliğinden gönderilecek.', 'fc.contact.waiting': 'Gönderilmeyi bekleyen mesaj: {n}', 'fc.contact.privacy': 'Mesajınızla birlikte yalnızca program adı, sürüm, platform ve dil gönderilir. Kayıtlarınız gönderilmez.',
      'fc.crash.title': 'Otomatik hata raporu', 'fc.crash.desc': 'Program beklenmedik bir hata verirse yalnızca hata metni, sürüm ve platform yöneticiye gönderilir. Kayıtlarınızın içeriği hiçbir zaman gönderilmez. Günde en çok 5 rapor.', 'fc.crash.on': 'Hata olunca yöneticiye kendiliğinden bildir', 'fc.crash.sent': 'Bu cihazdan bugün gönderilen rapor: {n}',
      'fc.usage.title': 'Kullanım Limitleri', 'fc.usage.desc': 'Bu sayaçlar sizin KENDİ Firebase ve yapay zeka hesabınızdaki kullanımı gösterir. Yöneticinin kotası kullanılmaz; ücret ya da sınır sizin hesabınıza aittir.', 'fc.usage.firebase': 'Firebase — bugün / günlük ücretsiz sınır', 'fc.usage.read': 'Okuma', 'fc.usage.write': 'Yazma', 'fc.usage.delete': 'Silme', 'fc.usage.full': 'Bugünkü ücretsiz sınır doldu; eşitleme sıfırlamadan sonra kendiliğinden sürer.', 'fc.usage.reset': 'Sınırlar {t} sonra sıfırlanır (Pasifik saatiyle gece yarısı).', 'fc.usage.device': 'Yalnızca bu cihazın bugünkü sayımıdır; aynı hesaba bağlı diğer cihazlar aynı sınırı paylaşır.', 'fc.usage.ai': 'Yapay zeka çağrıları — bugün', 'fc.usage.calls': '{n} çağrı', 'fc.usage.noAi': 'Bugün yapay zeka çağrısı yapılmadı.', 'fc.usage.limits': 'Hesabımdaki sınırlar', 'fc.usage.project': 'Proje: {p}', 'fc.usage.noFirebase': 'Bağlı Firebase hesabı yok.', 'fc.usage.none': 'Bu program bulut eşitleme ya da yapay zeka kullanmaz; sınırlı bir hizmet yoktur. Verileriniz yalnızca bu cihazda tutulur.',
      'fc.ai.gemini.note': 'Ücretsiz katmanı var; günlük istek sınırı modele göre değişir.', 'fc.ai.openai.note': 'Ücretsiz katmanı yok; kullanım hesabınızdaki krediden düşer.', 'fc.ai.anthropic.note': 'Ücretsiz katmanı yok; kullanım hesabınızdaki krediden düşer.', 'fc.ai.groq.note': 'Ücretsiz katmanı var; dakikalık ve günlük sınırlar modele göre değişir.',
      'fc.ob.title': 'Kurulum', 'fc.ob.step': 'Adım {i} / {n}', 'fc.ob.welcome': 'Hoş geldiniz', 'fc.ob.langDesc': 'Programın dilini seçin. İstediğiniz zaman üst çubuktan değiştirebilirsiniz.', 'fc.ob.lookTitle': 'Görünüm', 'fc.ob.lookDesc': 'Tema ve yazı boyutunu gözünüze göre ayarlayın.',
      'fc.ob.fbTitle': 'Kendi Firebase hesabınız', 'fc.ob.fbDesc': 'Bulut eşitleme için ücretsiz kendi Firebase projenizi bağlayın. Firebase konsolunda Proje ayarları → Web uygulaması → yapılandırmayı kopyalayıp buraya yapıştırın.', 'fc.ob.fbPaste': 'firebaseConfig (JSON ya da kod)', 'fc.ob.fbGuide': 'Adım adım rehber', 'fc.ob.fbConsole': 'Firebase konsolu', 'fc.ob.test': 'Bağlantıyı dene', 'fc.ob.testing': 'Deneniyor…', 'fc.ob.fbOk': 'Bağlantı başarılı: {p}', 'fc.ob.fbRules': 'Proje bulundu ({p}); güvenlik kuralları erişimi kısıtlıyor. Rehberdeki kuralları ekleyin.', 'fc.ob.fbNoDb': 'Projede Firestore veritabanı yok. Konsolda Firestore Database → Oluştur deyin.', 'fc.ob.fbBadKey': 'API anahtarı geçersiz ya da bu proje için kapalı.', 'fc.ob.fbBad': 'Yapılandırma okunamadı. apiKey ve projectId alanları gerekli.', 'fc.ob.fbNet': 'Sunucuya ulaşılamadı; internet bağlantınızı denetleyin.', 'fc.ob.fbLater': 'İsterseniz bu adımı atlayıp sonra Ayarlar\'dan bağlayabilirsiniz; program bu cihazda tam çalışır.',
      'fc.ob.aiTitle': 'Yapay zeka anahtarı (isteğe bağlı)', 'fc.ob.aiDesc': 'Yapay zeka özellikleri için kendi anahtarınızı ekleyin. Anahtar yalnızca bu cihazda saklanır ve yalnızca seçtiğiniz sağlayıcıya gönderilir.', 'fc.ob.aiProvider': 'Sağlayıcı', 'fc.ob.aiKey': 'API anahtarı', 'fc.ob.aiGet': 'Anahtarı buradan alın', 'fc.ob.aiOk': 'Anahtar çalışıyor.', 'fc.ob.aiBad': 'Anahtar reddedildi; doğru kopyaladığınızdan emin olun.', 'fc.ob.aiUnk': 'Anahtar denetlenemedi; yine de kaydedildi.',
      'fc.ob.doneTitle': 'Hazırsınız', 'fc.ob.doneDesc': 'Ayarlar\'dan bu sihirbazı istediğiniz zaman yeniden açabilirsiniz.', 'fc.ob.start': 'Başla', 'fc.ob.reopen': 'Kurulum sihirbazını aç', 'fc.ob.saved': 'Kaydedildi',
      'fc.wn.title': 'Bu sürümde neler yeni', 'fc.wn.ver': 'Sürüm {v}', 'fc.wn.none': 'Bu sürüm iyileştirmeler ve hata düzeltmeleri içeriyor.', 'fc.wn.safe': 'Kayıtlarınız olduğu gibi korundu.', 'fc.wn.show': 'Sürüm notlarını göster',
      'fc.ann.title': 'Duyurular', 'fc.ann.none': 'Henüz duyuru yok.', 'fc.ann.link': 'Bağlantıyı aç', 'fc.ann.important': 'Önemli', 'fc.ann.update': 'Şimdi güncelle',
      'fc.settings.about': 'Hakkında', 'fc.settings.version': 'Sürüm'
    },
    en: {
      'fc.ok': 'OK', 'fc.cancel': 'Cancel', 'fc.close': 'Close', 'fc.save': 'Save', 'fc.next': 'Next', 'fc.back': 'Back', 'fc.skip': 'Skip', 'fc.done': 'Done', 'fc.retry': 'Try again', 'fc.error': 'Error', 'fc.open': 'Open', 'fc.lang': 'Language',
      'fc.h': 'h', 'fc.min': 'min',
      'fc.sync': 'Sync', 'fc.sync.idle': 'Synced', 'fc.sync.syncing': 'Syncing…', 'fc.sync.error': 'Sync error — press to try again', 'fc.sync.off': 'Cloud sync is off', 'fc.sync.offline': 'No internet — changes are kept on this device', 'fc.sync.pending': '{n} changes waiting to be sent',
      'fc.lan': 'Wi-Fi', 'fc.lan.on': 'Wi-Fi sync is on (devices on the same network)', 'fc.lan.off': 'Wi-Fi sync is off', 'fc.lan.busy': 'Syncing over Wi-Fi…',
      'fc.update': 'Update', 'fc.update.check': 'Check for updates', 'fc.update.checking': 'Checking…', 'fc.update.none': 'Up to date (v{v})', 'fc.update.avail': 'New version ready: v{v}', 'fc.update.press': 'Press once to update. Your records are kept.',
      'fc.update.downloading': 'Downloading…', 'fc.update.verifying': 'Verifying…', 'fc.update.installing': 'Installing…', 'fc.update.restarting': 'Restarting the program…', 'fc.update.done': 'Update installed', 'fc.update.failed': 'Update failed: {e}', 'fc.update.fallback': 'The patch could not be applied; downloading the full version…', 'fc.update.browser': 'A new version is out; opening the download page.', 'fc.update.patchMode': 'changed parts only', 'fc.update.fullMode': 'full package', 'fc.update.offline': 'No internet; will try again when online.', 'fc.update.bad': 'The downloaded file could not be verified (SHA-256 mismatch).',
      'fc.p.left': '{x} left', 'fc.p.speed': 'MB/s', 'fc.p.calc': 'measuring speed…', 'fc.p.done': 'Downloaded',
      'fc.theme': 'Theme', 'fc.theme.dark': 'Dark', 'fc.theme.light': 'Light', 'fc.theme.auto': 'Auto', 'fc.theme.toggle': 'Dark / light theme', 'fc.font': 'Text size', 'fc.font.smaller': 'Smaller text', 'fc.font.larger': 'Larger text', 'fc.font.reset': 'Default', 'fc.look': 'Appearance', 'fc.look.desc': 'Theme, text size and language are stored on this device.',
      'fc.win.minimize': 'Minimize', 'fc.win.half': 'Half size', 'fc.win.restore': 'Back to full screen', 'fc.win.fullscreen': 'Full screen', 'fc.win.close': 'Close',
      'fc.contact.title': 'Contact the admin', 'fc.contact.desc': 'Send suggestions, requests and bug reports; your message goes straight to the administrator.', 'fc.contact.type': 'Topic', 'fc.contact.oneri': 'Suggestion / request', 'fc.contact.hata': 'Bug report', 'fc.contact.reach': 'Email or phone (for a reply, optional)', 'fc.contact.msg': 'Your message', 'fc.contact.send': 'Send', 'fc.contact.empty': 'Please write your message.', 'fc.contact.sending': 'Sending…', 'fc.contact.ok': 'Your message was delivered to the administrator. Thank you!', 'fc.contact.queued': 'No internet; your message was saved and will be sent automatically once you are online.', 'fc.contact.waiting': 'Messages waiting to be sent: {n}', 'fc.contact.privacy': 'Only the program name, version, platform and language are sent with your message. Your records are never sent.',
      'fc.crash.title': 'Automatic error reports', 'fc.crash.desc': 'If the program hits an unexpected error, only the error text, version and platform are sent to the administrator. The contents of your records are never sent. At most 5 reports a day.', 'fc.crash.on': 'Notify the administrator automatically when an error happens', 'fc.crash.sent': 'Reports sent from this device today: {n}',
      'fc.usage.title': 'Usage limits', 'fc.usage.desc': 'These counters show usage on YOUR OWN Firebase and AI accounts. The administrator\'s quota is not used; any cost or limit belongs to your account.', 'fc.usage.firebase': 'Firebase — today / daily free limit', 'fc.usage.read': 'Reads', 'fc.usage.write': 'Writes', 'fc.usage.delete': 'Deletes', 'fc.usage.full': 'Today\'s free limit is used up; sync resumes automatically after the reset.', 'fc.usage.reset': 'Limits reset in {t} (midnight Pacific time).', 'fc.usage.device': 'This is this device\'s count for today only; other devices on the same account share the same limit.', 'fc.usage.ai': 'AI calls — today', 'fc.usage.calls': '{n} calls', 'fc.usage.noAi': 'No AI calls today.', 'fc.usage.limits': 'Limits on my account', 'fc.usage.project': 'Project: {p}', 'fc.usage.noFirebase': 'No Firebase account connected.', 'fc.usage.none': 'This program uses no cloud sync or AI, so there are no limited services. Your data stays on this device only.',
      'fc.ai.gemini.note': 'Has a free tier; the daily request limit depends on the model.', 'fc.ai.openai.note': 'No free tier; usage is charged to the credit on your account.', 'fc.ai.anthropic.note': 'No free tier; usage is charged to the credit on your account.', 'fc.ai.groq.note': 'Has a free tier; per-minute and daily limits depend on the model.',
      'fc.ob.title': 'Setup', 'fc.ob.step': 'Step {i} of {n}', 'fc.ob.welcome': 'Welcome', 'fc.ob.langDesc': 'Choose the program language. You can change it any time from the top bar.', 'fc.ob.lookTitle': 'Appearance', 'fc.ob.lookDesc': 'Adjust the theme and text size to suit your eyes.',
      'fc.ob.fbTitle': 'Your own Firebase account', 'fc.ob.fbDesc': 'Connect your own free Firebase project for cloud sync. In the Firebase console open Project settings → Web app, copy the configuration and paste it here.', 'fc.ob.fbPaste': 'firebaseConfig (JSON or code)', 'fc.ob.fbGuide': 'Step-by-step guide', 'fc.ob.fbConsole': 'Firebase console', 'fc.ob.test': 'Test connection', 'fc.ob.testing': 'Testing…', 'fc.ob.fbOk': 'Connected: {p}', 'fc.ob.fbRules': 'Project found ({p}); security rules are restricting access. Add the rules from the guide.', 'fc.ob.fbNoDb': 'The project has no Firestore database. In the console choose Firestore Database → Create.', 'fc.ob.fbBadKey': 'The API key is invalid or disabled for this project.', 'fc.ob.fbBad': 'Could not read the configuration. apiKey and projectId are required.', 'fc.ob.fbNet': 'Could not reach the server; check your internet connection.', 'fc.ob.fbLater': 'You can skip this step and connect later in Settings; the program works fully on this device.',
      'fc.ob.aiTitle': 'AI key (optional)', 'fc.ob.aiDesc': 'Add your own key for the AI features. The key is stored only on this device and sent only to the provider you choose.', 'fc.ob.aiProvider': 'Provider', 'fc.ob.aiKey': 'API key', 'fc.ob.aiGet': 'Get a key here', 'fc.ob.aiOk': 'The key works.', 'fc.ob.aiBad': 'The key was rejected; make sure you copied it correctly.', 'fc.ob.aiUnk': 'The key could not be checked; it was saved anyway.',
      'fc.ob.doneTitle': 'You are all set', 'fc.ob.doneDesc': 'You can reopen this wizard from Settings at any time.', 'fc.ob.start': 'Start', 'fc.ob.reopen': 'Open the setup wizard', 'fc.ob.saved': 'Saved',
      'fc.wn.title': 'What\'s new in this version', 'fc.wn.ver': 'Version {v}', 'fc.wn.none': 'This version brings improvements and bug fixes.', 'fc.wn.safe': 'Your records were kept as they are.', 'fc.wn.show': 'Show release notes',
      'fc.ann.title': 'Announcements', 'fc.ann.none': 'No announcements yet.', 'fc.ann.link': 'Open link', 'fc.ann.important': 'Important', 'fc.ann.update': 'Update now',
      'fc.settings.about': 'About', 'fc.settings.version': 'Version'
    },
    ar: {
      'fc.ok': 'حسناً', 'fc.cancel': 'إلغاء', 'fc.close': 'إغلاق', 'fc.save': 'حفظ', 'fc.next': 'التالي', 'fc.back': 'السابق', 'fc.skip': 'تخطٍّ', 'fc.done': 'تم', 'fc.retry': 'أعد المحاولة', 'fc.error': 'خطأ', 'fc.open': 'فتح', 'fc.lang': 'اللغة',
      'fc.h': 'س', 'fc.min': 'د',
      'fc.sync': 'مزامنة', 'fc.sync.idle': 'تمت المزامنة', 'fc.sync.syncing': 'جارٍ المزامنة…', 'fc.sync.error': 'خطأ في المزامنة — اضغط لإعادة المحاولة', 'fc.sync.off': 'المزامنة السحابية متوقفة', 'fc.sync.offline': 'لا يوجد اتصال بالإنترنت — التغييرات محفوظة على هذا الجهاز', 'fc.sync.pending': '{n} تغييرات بانتظار الإرسال',
      'fc.lan': 'Wi-Fi', 'fc.lan.on': 'مزامنة Wi-Fi مفعّلة (الأجهزة على الشبكة نفسها)', 'fc.lan.off': 'مزامنة Wi-Fi متوقفة', 'fc.lan.busy': 'جارٍ المزامنة عبر Wi-Fi…',
      'fc.update': 'تحديث', 'fc.update.check': 'التحقق من التحديثات', 'fc.update.checking': 'جارٍ التحقق…', 'fc.update.none': 'البرنامج محدَّث (v{v})', 'fc.update.avail': 'إصدار جديد جاهز: v{v}', 'fc.update.press': 'اضغط مرة واحدة للتحديث. تبقى سجلاتك محفوظة.',
      'fc.update.downloading': 'جارٍ التنزيل…', 'fc.update.verifying': 'جارٍ التحقق من الملف…', 'fc.update.installing': 'جارٍ التثبيت…', 'fc.update.restarting': 'جارٍ إعادة تشغيل البرنامج…', 'fc.update.done': 'تم تثبيت التحديث', 'fc.update.failed': 'تعذّر التحديث: {e}', 'fc.update.fallback': 'تعذّر تطبيق التصحيح؛ جارٍ تنزيل الإصدار الكامل…', 'fc.update.browser': 'صدر إصدار جديد؛ جارٍ فتح صفحة التنزيل.', 'fc.update.patchMode': 'الأجزاء المتغيرة فقط', 'fc.update.fullMode': 'الحزمة الكاملة', 'fc.update.offline': 'لا يوجد اتصال؛ ستُعاد المحاولة عند عودة الإنترنت.', 'fc.update.bad': 'تعذّر التحقق من الملف المنزَّل (بصمة SHA-256 غير مطابقة).',
      'fc.p.left': 'متبقٍّ {x}', 'fc.p.speed': 'م.ب/ث', 'fc.p.calc': 'جارٍ قياس السرعة…', 'fc.p.done': 'اكتمل التنزيل',
      'fc.theme': 'السمة', 'fc.theme.dark': 'داكنة', 'fc.theme.light': 'فاتحة', 'fc.theme.auto': 'تلقائية', 'fc.theme.toggle': 'سمة داكنة / فاتحة', 'fc.font': 'حجم الخط', 'fc.font.smaller': 'تصغير الخط', 'fc.font.larger': 'تكبير الخط', 'fc.font.reset': 'الافتراضي', 'fc.look': 'المظهر', 'fc.look.desc': 'تُحفظ السمة وحجم الخط واللغة على هذا الجهاز.',
      'fc.win.minimize': 'تصغير', 'fc.win.half': 'نصف الحجم', 'fc.win.restore': 'العودة إلى ملء الشاشة', 'fc.win.fullscreen': 'ملء الشاشة', 'fc.win.close': 'إغلاق',
      'fc.contact.title': 'التواصل مع المسؤول', 'fc.contact.desc': 'اكتب اقتراحاتك وطلباتك وبلاغات الأخطاء؛ تصل رسالتك مباشرة إلى المسؤول.', 'fc.contact.type': 'الموضوع', 'fc.contact.oneri': 'اقتراح / طلب', 'fc.contact.hata': 'الإبلاغ عن خطأ', 'fc.contact.reach': 'البريد الإلكتروني أو الهاتف (للرد، اختياري)', 'fc.contact.msg': 'رسالتك', 'fc.contact.send': 'إرسال', 'fc.contact.empty': 'يرجى كتابة رسالتك.', 'fc.contact.sending': 'جارٍ الإرسال…', 'fc.contact.ok': 'وصلت رسالتك إلى المسؤول. شكراً لك!', 'fc.contact.queued': 'لا يوجد اتصال بالإنترنت؛ حُفظت رسالتك وستُرسل تلقائياً عند عودة الاتصال.', 'fc.contact.waiting': 'رسائل بانتظار الإرسال: {n}', 'fc.contact.privacy': 'لا يُرسل مع رسالتك سوى اسم البرنامج وإصداره والمنصة واللغة. لا تُرسل سجلاتك أبداً.',
      'fc.crash.title': 'تقارير الأخطاء التلقائية', 'fc.crash.desc': 'إذا واجه البرنامج خطأً غير متوقع يُرسل إلى المسؤول نص الخطأ والإصدار والمنصة فقط. لا يُرسل محتوى سجلاتك أبداً. خمسة تقارير يومياً على الأكثر.', 'fc.crash.on': 'إبلاغ المسؤول تلقائياً عند حدوث خطأ', 'fc.crash.sent': 'التقارير المرسلة من هذا الجهاز اليوم: {n}',
      'fc.usage.title': 'حدود الاستخدام', 'fc.usage.desc': 'تعرض هذه العدادات الاستخدام على حساباتك الخاصة في Firebase والذكاء الاصطناعي. لا تُستهلك حصة المسؤول؛ أي تكلفة أو حد يخص حسابك أنت.', 'fc.usage.firebase': 'Firebase — اليوم / الحد المجاني اليومي', 'fc.usage.read': 'قراءة', 'fc.usage.write': 'كتابة', 'fc.usage.delete': 'حذف', 'fc.usage.full': 'انتهى الحد المجاني لهذا اليوم؛ تُستأنف المزامنة تلقائياً بعد إعادة التعيين.', 'fc.usage.reset': 'تُعاد الحدود بعد {t} (منتصف الليل بتوقيت المحيط الهادئ).', 'fc.usage.device': 'هذا عدّاد هذا الجهاز لليوم فقط؛ تتشارك الأجهزة الأخرى على الحساب نفسه الحدَّ ذاته.', 'fc.usage.ai': 'طلبات الذكاء الاصطناعي — اليوم', 'fc.usage.calls': '{n} طلب', 'fc.usage.noAi': 'لا توجد طلبات ذكاء اصطناعي اليوم.', 'fc.usage.limits': 'الحدود في حسابي', 'fc.usage.project': 'المشروع: {p}', 'fc.usage.noFirebase': 'لا يوجد حساب Firebase مرتبط.', 'fc.usage.none': 'لا يستخدم هذا البرنامج المزامنة السحابية ولا الذكاء الاصطناعي، فلا توجد خدمات محدودة. تبقى بياناتك على هذا الجهاز فقط.',
      'fc.ai.gemini.note': 'تتوفر طبقة مجانية؛ يختلف الحد اليومي للطلبات حسب النموذج.', 'fc.ai.openai.note': 'لا توجد طبقة مجانية؛ يُخصم الاستخدام من رصيد حسابك.', 'fc.ai.anthropic.note': 'لا توجد طبقة مجانية؛ يُخصم الاستخدام من رصيد حسابك.', 'fc.ai.groq.note': 'تتوفر طبقة مجانية؛ تختلف الحدود في الدقيقة واليوم حسب النموذج.',
      'fc.ob.title': 'الإعداد', 'fc.ob.step': 'الخطوة {i} من {n}', 'fc.ob.welcome': 'أهلاً بك', 'fc.ob.langDesc': 'اختر لغة البرنامج. يمكنك تغييرها في أي وقت من الشريط العلوي.', 'fc.ob.lookTitle': 'المظهر', 'fc.ob.lookDesc': 'اضبط السمة وحجم الخط بما يريح عينيك.',
      'fc.ob.fbTitle': 'حسابك الخاص في Firebase', 'fc.ob.fbDesc': 'اربط مشروع Firebase المجاني الخاص بك للمزامنة السحابية. في وحدة تحكم Firebase افتح إعدادات المشروع ← تطبيق الويب، وانسخ الإعدادات والصقها هنا.', 'fc.ob.fbPaste': 'firebaseConfig (بصيغة JSON أو كود)', 'fc.ob.fbGuide': 'دليل خطوة بخطوة', 'fc.ob.fbConsole': 'وحدة تحكم Firebase', 'fc.ob.test': 'اختبار الاتصال', 'fc.ob.testing': 'جارٍ الاختبار…', 'fc.ob.fbOk': 'تم الاتصال: {p}', 'fc.ob.fbRules': 'عُثر على المشروع ({p})، لكن قواعد الأمان تقيّد الوصول. أضف القواعد الواردة في الدليل.', 'fc.ob.fbNoDb': 'لا توجد قاعدة بيانات Firestore في المشروع. اختر في وحدة التحكم Firestore Database ← إنشاء.', 'fc.ob.fbBadKey': 'مفتاح API غير صالح أو معطَّل لهذا المشروع.', 'fc.ob.fbBad': 'تعذّرت قراءة الإعدادات. الحقلان apiKey وprojectId مطلوبان.', 'fc.ob.fbNet': 'تعذّر الوصول إلى الخادم؛ تحقّق من اتصالك بالإنترنت.', 'fc.ob.fbLater': 'يمكنك تخطي هذه الخطوة والربط لاحقاً من الإعدادات؛ يعمل البرنامج بالكامل على هذا الجهاز.',
      'fc.ob.aiTitle': 'مفتاح الذكاء الاصطناعي (اختياري)', 'fc.ob.aiDesc': 'أضف مفتاحك الخاص لميزات الذكاء الاصطناعي. يُحفظ المفتاح على هذا الجهاز فقط ولا يُرسل إلا إلى المزوّد الذي تختاره.', 'fc.ob.aiProvider': 'المزوّد', 'fc.ob.aiKey': 'مفتاح API', 'fc.ob.aiGet': 'احصل على مفتاح من هنا', 'fc.ob.aiOk': 'المفتاح يعمل.', 'fc.ob.aiBad': 'رُفض المفتاح؛ تأكّد من نسخه بشكل صحيح.', 'fc.ob.aiUnk': 'تعذّر التحقق من المفتاح؛ حُفظ على أي حال.',
      'fc.ob.doneTitle': 'كل شيء جاهز', 'fc.ob.doneDesc': 'يمكنك إعادة فتح هذا المعالج من الإعدادات في أي وقت.', 'fc.ob.start': 'ابدأ', 'fc.ob.reopen': 'فتح معالج الإعداد', 'fc.ob.saved': 'تم الحفظ',
      'fc.wn.title': 'ما الجديد في هذا الإصدار', 'fc.wn.ver': 'الإصدار {v}', 'fc.wn.none': 'يتضمن هذا الإصدار تحسينات وإصلاحات للأخطاء.', 'fc.wn.safe': 'بقيت سجلاتك محفوظة كما هي.', 'fc.wn.show': 'عرض ملاحظات الإصدار',
      'fc.ann.title': 'الإعلانات', 'fc.ann.none': 'لا توجد إعلانات بعد.', 'fc.ann.link': 'فتح الرابط', 'fc.ann.important': 'مهم', 'fc.ann.update': 'حدّث الآن',
      'fc.settings.about': 'حول البرنامج', 'fc.settings.version': 'الإصدار'
    }
  });

  FC.i18n = api;
  FC.t = t;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- ui.js ---- */
/* FC.ui — küçük DOM yardımcıları: el(), icon(), modal(), toast(). Çerçevesizdir; React içinde de güvenle çağrılır. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var P = {
    sync: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    cloudOff: '<path d="m2 2 20 20"/><path d="M5.8 5.8A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.3-.2"/><path d="M21.5 15.5A4.5 4.5 0 0 0 17.5 10h-1.8A7 7 0 0 0 10 5.1"/>',
    wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/>',
    wifiOff: '<path d="m2 2 20 20"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M5 12.55a11 11 0 0 1 5.17-2.39"/><path d="M1.42 9a16 16 0 0 1 4.7-2.88"/><path d="M12 20h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    minus: '<path d="M5 12h14"/>',
    half: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
    full: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    bug: '<path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6 13H2M22 13h-4"/>',
    sparkles: '<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2Z"/><path d="M19 17v4M17 19h4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
  };
  function icon(name, cls) {
    return '<svg class="fc-i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /** el('button.btn.primary', {type:'button', onclick: f}, ['metin', childEl]) — html: için attrs.html */
  function el(spec, attrs, kids) {
    var m = String(spec).split('.'), e = g.document.createElement(m[0] || 'div');
    if (m.length > 1) e.className = m.slice(1).join(' ');
    attrs = attrs || {};
    for (var k in attrs) {
      var v = attrs[k]; if (v === undefined || v === null || v === false) continue;
      if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'class') e.className += (e.className ? ' ' : '') + v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? g.document.createTextNode(String(c)) : c);
    });
    return e;
  }
  /** Modal ve bildirimlerin bağlandığı kök (bağımsız eklentide Shadow DOM; normalde body). */
  function root() { return (FC.ui && FC.ui.root) || g.document.body; }
  var stack = [];
  /** modal({title, icon, body: Node|string(html), buttons:[{label, cls, onClick(close) → false ile açık kalır}], cls, onClose, dismiss:true}) */
  function modal(o) {
    o = o || {};
    var back = el('div.modal-backdrop'), box = el('div.modal' + (o.cls ? '.' + o.cls : ''), { role: 'dialog', 'aria-modal': 'true' });
    var head = el('div.modal-header'), h = el('h2', { html: (o.icon ? icon(o.icon) + ' ' : '') + esc(o.title || '') });
    var x = el('button.icon-btn', { type: 'button', 'aria-label': FC.t ? FC.t('fc.close') : 'Close', html: icon('x') });
    head.appendChild(h); if (o.dismiss !== false) head.appendChild(x);
    var body = el('div.modal-body');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    var foot = el('div.modal-footer');
    box.appendChild(head); box.appendChild(body);
    var closed = false;
    function close() {
      if (closed) return; closed = true;
      if (back.parentNode) back.parentNode.removeChild(back);
      stack = stack.filter(function (s) { return s !== api; });
      g.document.removeEventListener('keydown', onKey);
      if (o.onClose) try { o.onClose(); } catch (e) {}
    }
    function setButtons(list) {
      foot.innerHTML = '';
      (list || []).forEach(function (b) {
        if (b === 'spacer') { foot.appendChild(el('span.fc-spacer')); return; }
        var btn = el('button.btn' + (b.cls ? '.' + b.cls.split(' ').join('.') : ''), { type: 'button', html: (b.icon ? icon(b.icon) : '') + esc(b.label) });
        if (b.disabled) btn.disabled = true;
        btn.addEventListener('click', function () { var r = b.onClick ? b.onClick(close, btn) : undefined; if (r !== false) close(); });
        foot.appendChild(btn);
      });
      if (list && list.length) { if (!foot.parentNode) box.appendChild(foot); } else if (foot.parentNode) box.removeChild(foot);
    }
    function onKey(e) { if (e.key === 'Escape' && o.dismiss !== false && stack[stack.length - 1] === api) close(); }
    x.addEventListener('click', close);
    if (o.dismiss !== false) back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
    g.document.addEventListener('keydown', onKey);
    setButtons(o.buttons || [{ label: FC.t ? FC.t('fc.ok') : 'OK', cls: 'primary' }]);
    back.appendChild(box); root().appendChild(back);
    var api = { el: box, body: body, title: h, close: close, setButtons: setButtons, setTitle: function (s, ic) { h.innerHTML = (ic ? icon(ic) + ' ' : '') + esc(s); } };
    stack.push(api);
    return api;
  }
  function toast(msg, kind, ms) {
    var r = root(), host = r.querySelector('.toasts');
    if (!host) { host = el('div.toasts', { 'aria-live': 'polite' }); r.appendChild(host); }
    var t = el('div.toast' + (kind ? '.' + kind : ''), { role: 'status', text: msg });
    host.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 4200);
    return t;
  }
  /** Ayarlar kartı iskeleti: {id, title, icon, desc} → <section class="card"> */
  function card(o) {
    var c = el('section.card', { id: o.id, 'data-fc-card': o.key || o.id });
    c.appendChild(el('h3.card-title', { html: (o.icon ? icon(o.icon) : '') + '<span>' + esc(o.title) + '</span>' }));
    if (o.desc) c.appendChild(el('p.card-desc', { text: o.desc }));
    return c;
  }
  function openUrl(u) {
    try { if (FC.host && FC.host.openExternal) return FC.host.openExternal(u); } catch (e) {}
    g.open(u, '_blank', 'noopener');
  }
  var api = { el: el, icon: icon, esc: esc, modal: modal, toast: toast, card: card, openUrl: openUrl, icons: P };
  FC.ui = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- agent.js ---- */
/* FC.agent — Asistan Agent: kullanıcının TÜM uygulamalardaki çalışmasını izler, durumu geliştirmek için yorum yapar.
     FC.agent.start({app:'kitaplik', version:'2.5.0'})      // FC.init bunu kendisi çağırır (o.agent:false → kapalı)
     FC.agent.track('kitap.ekle')                          // isteğe bağlı: uygulamaya özgü eylem
     FC.agent.task('fatura-42', 'start'|'done', 'Fatura')  // isteğe bağlı: yarım kalan iş takibi
     topbar: FC.agent.button()  (FC.topbar kendisi ekler)  ·  ayarlar: FC.agent.card()  (FC.settings kendisi ekler)
   Gizlilik: yalnızca SAYILAR tutulur (etkin dakika, oturum, düğme adları, saat dağılımı, hata sayısı). Yazılan metin,
   kayıt içeriği, dosya adı TUTULMAZ. Veriler cihazda kalır; paylaşım yalnız kullanıcının kendi kanallarıyla olur:
     1) aynı bilgisayardaki diğer uygulamalar: Electron ana süreci %APPDATA%/FalconCekirdek/agent/*.json (fcHost.agent)
     2) kullanıcının KENDİ Firebase'i (fc.firebase.config varsa): fc_agent koleksiyonu, REST, sayaçlı
     3) Wi-Fi/LAN eşitlemesi: FC.agent.exportShare() / FC.agent.importShare(obj)
   Kendi anahtar deposu olan uygulama: start({ai: () => ({provider:'gemini', key}), firebase: () => ({projectId, apiKey})}).
   Yorumlar: önce çevrim dışı kurallar; açıksa ve kullanıcının KENDİ AI anahtarı varsa (fc.ai) çevrim içi yapay zeka
   (günde en çok cfg.aiPerDay çağrı, FC.usage ile sayılır). Teslim: bildirim + uygulama içi panel; ikisi de ayarlardan kapanır. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var KEEP_DAYS = 60, MAX_NOTES = 60, TICK_MS = 60000, IDLE_MS = 120000, CHECK_MS = 30 * 60000, SHARE_MS = 30 * 60000;
  var FREQ = ['instant', 'daily', 'weekly', 'manual'];
  var DEF = { on: true, notify: true, panel: true, freq: 'daily', ai: true, apps: null };
  var run = { app: '', version: '', started: false, lastInput: 0, streak: 0, timers: [], subs: [], btns: [], now: null, fetch: null, aiPerDay: 4, busy: null };

  function S() { return FC.storage; }
  function T(k, v) { return FC.t ? FC.t(k, v) : k; }
  function now() { return run.now ? run.now() : new Date(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { d = d || now(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function daysAgo(n) { var d = now(); return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n, 12)); }
  function cfg() { var c = S().get('agent.cfg', null) || {}; var o = {}; for (var k in DEF) o[k] = c[k] === undefined ? DEF[k] : c[k]; if (FREQ.indexOf(o.freq) < 0) o.freq = 'daily'; return o; }
  function setCfg(p) { var c = cfg(); for (var k in p) c[k] = p[k]; S().set('agent.cfg', c); emit(); return c; }
  function device() {
    var id = S().get('device');
    if (!id) { id = ''; for (var i = 0; i < 18; i++) id += Math.floor(Math.random() * 16).toString(16); S().set('device', id); }
    return id;
  }
  function safe(f) { try { return typeof f === 'function' ? f() : f; } catch (e) { return null; } }
  function srcKey() { return (run.app || 'app') + '@' + device(); }

  /* ---------- kayıt ---------- */
  function emptyDay() { return { act: 0, ses: 0, mx: 0, a: {}, h: [], err: 0 }; }
  function mine() {
    var m = S().get('agent.mine', null);
    if (!m || m.app !== run.app) m = { app: run.app, dev: device(), v: run.version, u: 0, days: {}, tasks: {} };
    return m;
  }
  function prune(days) { var lim = daysAgo(KEEP_DAYS); for (var k in days) if (k < lim) delete days[k]; return days; }
  function save(m) { m.u = now().getTime(); m.v = run.version; prune(m.days); S().set('agent.mine', m); }
  function today(m) { var k = dayKey(); return m.days[k] || (m.days[k] = emptyDay()); }
  /** Eylem adını temizler: e-posta, sayı, uzun metin maskelenir (kayıt içeriği sızmasın). */
  function clean(name) {
    var s = String(name == null ? '' : name).replace(/\s+/g, ' ').trim();
    s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '@').replace(/\d+([.,:/-]\d+)*/g, '#');
    if (s.length > 40) s = s.slice(0, 40);
    return s;
  }
  function track(name, n) {
    if (!cfg().on || !run.app) return;
    var k = clean(name); if (!k) return;
    var m = mine(), d = today(m); n = n == null ? 1 : +n || 0;
    d.a[k] = (d.a[k] || 0) + n;
    var keys = Object.keys(d.a); if (keys.length > 120) { keys.sort(function (x, y) { return d.a[x] - d.a[y]; }); delete d.a[keys[0]]; }
    save(m); if (cfg().freq === 'instant') schedule();
  }
  function task(id, state, label) {
    if (!cfg().on || !run.app) return;
    var m = mine(), k = String(id == null ? '' : id).slice(0, 60) || 'task';
    if (state === 'done') { if (m.tasks[k]) { delete m.tasks[k]; today(m).done = (today(m).done || 0) + 1; } }
    else if (!m.tasks[k]) m.tasks[k] = { since: now().getTime(), label: clean(label || id) };
    save(m);
  }
  function tick() {
    if (!cfg().on || !run.app) return;
    var d = g.document, visible = !d || d.visibilityState !== 'hidden';
    var active = visible && (now().getTime() - run.lastInput) < IDLE_MS;
    if (!active) { run.streak = 0; return; }
    var m = mine(), day = today(m), h = now().getHours();
    day.act += 1; day.h[h] = (day.h[h] || 0) + 1;
    run.streak += 1; if (run.streak > day.mx) day.mx = run.streak;
    save(m);
  }
  function input() { run.lastInput = now().getTime(); }
  function onClick(e) {
    input();
    var t = e && e.target; if (!t || !t.closest) return;
    var b = t.closest('[data-fc-track],button,[role=button],a[href],.nav-item,.tab');
    if (!b || b.closest('[data-fc-agent]')) return;
    var name = b.getAttribute('data-fc-track') || b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent;
    if (!name) return;
    if (/^\W{0,3}\s*(e[sş]itle|sync|مزامن)/i.test(String(name).trim())) name = /wi.?fi|lan|qr/i.test(name) ? 'fc.sync.lan' : 'fc.sync';
    track(name);
  }

  /* ---------- paylaşım (diğer uygulamalar / cihazlar) ---------- */
  function peers() { var p = S().get('agent.peers', null); return p && typeof p === 'object' ? p : {}; }
  /** Kaynak başına yeni olan kalır (u). Kendi kaydımız asla dışarıdan ezilmez. */
  function importShare(obj) {
    if (!obj) return 0;
    var list = Array.isArray(obj) ? obj : obj.sources ? obj.sources : [obj], p = peers(), me = srcKey(), n = 0;
    list.forEach(function (s) {
      if (!s || !s.app || !s.dev || !s.days) return;
      var k = s.app + '@' + s.dev; if (k === me) return;
      if (!p[k] || (+s.u || 0) > (+p[k].u || 0)) { p[k] = { app: String(s.app), dev: String(s.dev), v: s.v || '', u: +s.u || 0, days: prune(s.days), tasks: s.tasks || {} }; n++; }
    });
    if (n) { S().set('agent.peers', p); emit(); }
    return n;
  }
  function exportShare() { var p = peers(), out = [mine()]; for (var k in p) out.push(p[k]); return { schema: 1, sources: out }; }
  function hostAgent() { var h = g.fcHost, a = (h && h.agent) || g.fcAgentHost; return a && typeof a.read === 'function' ? a : null; }
  function fbCfg() { var c = run.firebase ? safe(run.firebase) : S().get('firebase.config', null); return c && c.projectId && c.apiKey ? c : null; }
  function fsBase(c) { return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(c.projectId) + '/databases/(default)/documents/fc_agent'; }
  function share(force) {
    var t = now().getTime(), last = S().get('agent.shareAt', 0) || 0;
    if (!force && t - last < SHARE_MS) return Promise.resolve();
    S().set('agent.shareAt', t);
    var jobs = [], m = mine(), ha = hostAgent();
    if (ha) jobs.push(Promise.resolve().then(function () { return ha.write(srcKey(), JSON.stringify(m)); })
      .then(function () { return ha.read(); }).then(function (all) { var arr = []; for (var k in (all || {})) { try { arr.push(JSON.parse(all[k])); } catch (e) {} } importShare(arr); }).catch(function () {}));
    var c = fbCfg(), f = run.fetch || g.fetch;
    if (c && f) {
      var id = encodeURIComponent((run.app + '_' + m.dev).replace(/[^\w-]/g, '_'));
      jobs.push(f(fsBase(c) + '/' + id + '?key=' + encodeURIComponent(c.apiKey), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { veri: { stringValue: JSON.stringify(m) }, zaman: { stringValue: new Date(t).toISOString() } } }) })
        .then(function (r) { if (FC.usage) FC.usage.count('firebase.write'); if (!r.ok) throw new Error('HTTP_' + r.status); return f(fsBase(c) + '?pageSize=50&key=' + encodeURIComponent(c.apiKey)); })
        .then(function (r) { if (!r.ok) throw new Error('HTTP_' + r.status); return r.json(); })
        .then(function (j) {
          var docs = (j && j.documents) || [], arr = [];
          if (FC.usage) FC.usage.count('firebase.read', Math.max(1, docs.length));
          docs.forEach(function (d) { try { arr.push(JSON.parse(d.fields.veri.stringValue)); } catch (e) {} });
          importShare(arr);
        }).catch(function () {}));
    }
    return Promise.all(jobs).then(function () {});
  }

  /* ---------- analiz ---------- */
  function sources() {
    var c = cfg(), all = [mine()], p = peers();
    for (var k in p) all.push(p[k]);
    return all.filter(function (s) { return !c.apps || c.apps.indexOf(s.app) >= 0 || s.app === run.app && c.apps.indexOf(run.app) >= 0; });
  }
  function knownApps() { var a = [run.app], p = peers(); for (var k in p) if (a.indexOf(p[k].app) < 0) a.push(p[k].app); return a.filter(Boolean); }
  function appName(id) { return T('fc.agent.app.' + id) !== 'fc.agent.app.' + id ? T('fc.agent.app.' + id) : String(id || '').replace(/[-_]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  /** Haftalık özet: son 7 gün (w) ve önceki 7 gün (pw), uygulama başına. */
  function summary() {
    var w0 = daysAgo(6), p0 = daysAgo(13), apps = {}, tot = { w: 0, pw: 0, days: {}, h: [], ses: 0, err: 0, mx: 0, a: {}, tasks: [] };
    sources().forEach(function (s) {
      var A = apps[s.app] || (apps[s.app] = { w: 0, pw: 0, ses: 0, err: 0, a: {}, sync: 0, early: 0 });
      for (var k in s.days) {
        var d = s.days[k];
        if (k >= w0) {
          A.w += d.act || 0; A.ses += d.ses || 0; A.err += d.err || 0; tot.w += d.act || 0; tot.ses += d.ses || 0; tot.err += d.err || 0;
          if ((d.act || 0) > 0) tot.days[k] = 1;
          if ((d.mx || 0) > tot.mx) tot.mx = d.mx;
          (d.h || []).forEach(function (v, i) { if (v) tot.h[i] = (tot.h[i] || 0) + v; });
          for (var a in d.a) { A.a[a] = (A.a[a] || 0) + d.a[a]; if (/^fc\.sync/.test(a)) A.sync += d.a[a]; }
        } else if (k >= p0) { A.pw += d.act || 0; tot.pw += d.act || 0; }
        else A.early += d.act || 0;
      }
      for (var t in (s.tasks || {})) tot.tasks.push({ app: s.app, id: t, label: s.tasks[t].label, since: s.tasks[t].since });
    });
    return { apps: apps, tot: tot };
  }
  function hm(min) { min = Math.round(min); var h = Math.floor(min / 60), m = min % 60; return h ? T('fc.agent.hm', { h: h, m: m }) : T('fc.agent.m', { m: m }); }
  /** Çevrim dışı kurallar → [{id, key, text, prio}] (metin anahtar + değişkenlerle; dil değişince yeniden çizilir). */
  function rules(sm) {
    sm = sm || summary();
    var out = [], tot = sm.tot, apps = sm.apps, names = Object.keys(apps);
    function add(id, prio, key, vars) { out.push({ id: id, prio: prio, key: key, vars: vars || {} }); }
    if (tot.w < 5 && tot.pw < 5) { add('start', 1, 'fc.agent.r.start'); return out; }
    if (tot.pw >= 30) {
      var ch = Math.round((tot.w - tot.pw) / tot.pw * 100);
      if (ch >= 25) add('up', 2, 'fc.agent.r.up', { p: ch, t: hm(tot.w) });
      else if (ch <= -25) add('down', 3, 'fc.agent.r.down', { p: -ch, t: hm(tot.w) });
    }
    var used = names.filter(function (n) { return apps[n].w > 0; }).sort(function (a, b) { return apps[b].w - apps[a].w; });
    if (used.length > 1 && tot.w > 0) add('top', 2, 'fc.agent.r.top', { a: appName(used[0]), p: Math.round(apps[used[0]].w / tot.w * 100), n: used.length });
    var night = 0; [23, 0, 1, 2, 3, 4].forEach(function (i) { night += tot.h[i] || 0; });
    if (tot.w >= 60 && night / tot.w >= 0.2) add('night', 4, 'fc.agent.r.night', { p: Math.round(night / tot.w * 100) });
    if (tot.mx >= 90) add('break', 4, 'fc.agent.r.break', { t: hm(tot.mx) });
    var peak = -1, pv = 0; tot.h.forEach(function (v, i) { if (v > pv) { pv = v; peak = i; } });
    if (peak >= 0 && tot.w >= 120) add('peak', 1, 'fc.agent.r.peak', { h: pad(peak) + ':00', h2: pad((peak + 1) % 24) + ':00' });
    var rep = null;
    names.forEach(function (n) {
      var A = apps[n], best = null, bv = 0;
      for (var a in A.a) if (!/^fc\./.test(a) && A.a[a] > bv) { bv = A.a[a]; best = a; }
      if (best && bv >= 30 && (!rep || bv > rep.n)) rep = { a: n, x: best, n: bv };
      if (A.w >= 60 && A.sync === 0 && n === run.app && run.syncSeen) add('sync:' + n, 4, 'fc.agent.r.sync', { a: appName(n) });
      if (A.err >= 3) add('err:' + n, 5, 'fc.agent.r.err', { a: appName(n), n: A.err });
      if (A.w === 0 && A.pw + A.early >= 60) add('idle:' + n, 1, 'fc.agent.r.idle', { a: appName(n) });
      if (A.ses >= 40 && A.w / A.ses < 3) add('frag:' + n, 2, 'fc.agent.r.frag', { a: appName(n), n: A.ses });
    });
    if (rep) add('rep:' + rep.a, 3, 'fc.agent.r.repeat', { a: appName(rep.a), x: rep.x, n: rep.n });
    var old = tot.tasks.filter(function (t) { return now().getTime() - t.since > 3 * 86400000; });
    if (old.length) add('tasks', 5, 'fc.agent.r.tasks', { n: old.length, x: old.slice(0, 3).map(function (t) { return t.label + ' (' + appName(t.app) + ')'; }).join(', ') });
    var dn = Object.keys(tot.days).length;
    if (dn >= 5) add('streak', 1, 'fc.agent.r.streak', { n: dn });
    try { if (FC.updater && FC.updater.state().plan) add('update', 3, 'fc.agent.r.update'); } catch (e) {}
    return out.sort(function (a, b) { return b.prio - a.prio; });
  }
  function notes() { var n = S().get('agent.notes', []); return Array.isArray(n) ? n : []; }
  function noteText(n) { return n.text != null ? (typeof n.text === 'string' ? n.text : FC.i18n.pick(n.text)) : T(n.key, n.vars); }
  function unread() { return notes().filter(function (n) { return !n.read; }).length; }
  /** Aynı kural 3 gün içinde aynı değerle tekrar yazılmaz. */
  function addNotes(list, src) {
    var all = notes(), t = now().getTime(), fresh = [];
    list.forEach(function (r) {
      var sig = (r.id || '') + '|' + JSON.stringify(r.vars || r.text || '');
      var dup = all.some(function (n) { return n.sig === sig && t - n.t < 3 * 86400000; });
      if (dup) return;
      var n = { id: t.toString(36) + Math.random().toString(36).slice(2, 6), t: t, sig: sig, src: src, rid: r.id, key: r.key, vars: r.vars, text: r.text, prio: r.prio || 2, read: false };
      all.unshift(n); fresh.push(n);
    });
    S().set('agent.notes', all.slice(0, MAX_NOTES));
    return fresh;
  }
  function aiCfg() { var a = run.ai ? safe(run.ai) : S().get('ai', null); return a && a.key && a.provider ? a : null; }
  function aiCallsToday() { var d = S().get('agent.ai', null); return d && d.d === dayKey() ? d.n : 0; }
  function digest(sm) {
    var apps = {};
    for (var n in sm.apps) { var A = sm.apps[n], top = Object.keys(A.a).sort(function (x, y) { return A.a[y] - A.a[x]; }).slice(0, 8); apps[appName(n)] = { weekMin: A.w, prevWeekMin: A.pw, sessions: A.ses, errors: A.err, topActions: top.map(function (k) { return k + ' ×' + A.a[k]; }) }; }
    return { weekMin: sm.tot.w, prevWeekMin: sm.tot.pw, activeDays: Object.keys(sm.tot.days).length, longestStretchMin: sm.tot.mx, minutesByHour: sm.tot.h, openTasks: sm.tot.tasks.length, apps: apps };
  }
  function prompt(sm) {
    var L = { tr: 'Türkçe', en: 'English', ar: 'العربية' }[FC.i18n.lang()] || 'Türkçe';
    return 'You are a friendly productivity coach inside a set of free desktop/mobile apps. Below are anonymous usage COUNTS (no content) of one person across their apps over the last 7 days compared to the 7 days before. ' +
      'Write 3 to 5 short, concrete, encouraging suggestions to improve how they work (focus, breaks, routines, using features better, finishing open tasks, syncing/backups). ' +
      'Each suggestion max 2 sentences, in ' + L + '. Answer ONLY with a JSON array of strings.\n\n' + JSON.stringify(digest(sm));
  }
  function askAi(sm) {
    var a = aiCfg(), f = run.fetch || g.fetch, k = a && a.key, u, h = { 'Content-Type': 'application/json' }, body, pick;
    if (!a || !f) return Promise.reject(new Error('NO_AI'));
    var p = prompt(sm), M = run.models || {};
    if (a.provider === 'gemini') { u = 'https://generativelanguage.googleapis.com/v1beta/models/' + (M.gemini || 'gemini-2.5-flash') + ':generateContent?key=' + encodeURIComponent(k); body = { contents: [{ parts: [{ text: p }] }] }; pick = function (j) { return j.candidates[0].content.parts[0].text; }; }
    else if (a.provider === 'anthropic') { u = 'https://api.anthropic.com/v1/messages'; h['x-api-key'] = k; h['anthropic-version'] = '2023-06-01'; h['anthropic-dangerous-direct-browser-access'] = 'true'; body = { model: M.anthropic || 'claude-haiku-5-5', max_tokens: 700, messages: [{ role: 'user', content: p }] }; pick = function (j) { return j.content[0].text; }; }
    else { u = a.provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'; h.Authorization = 'Bearer ' + k; body = { model: a.provider === 'groq' ? (M.groq || 'llama-3.3-70b-versatile') : (M.openai || 'gpt-4o-mini'), messages: [{ role: 'user', content: p }] }; pick = function (j) { return j.choices[0].message.content; }; }
    S().set('agent.ai', { d: dayKey(), n: aiCallsToday() + 1 });
    if (FC.usage) FC.usage.count('ai.' + a.provider);
    return f(u, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) { if (r.status === 429 && FC.usage) FC.usage.count('ai.' + a.provider + '.full'); throw new Error('HTTP_' + r.status); }
      return r.json();
    }).then(function (j) {
      var s = String(pick(j) || ''), m = s.match(/\[[\s\S]*\]/), arr = [];
      try { arr = JSON.parse(m ? m[0] : s); } catch (e) { arr = s.split(/\n+/).map(function (x) { return x.replace(/^[\s\-*\d.)]+/, ''); }); }
      arr = (Array.isArray(arr) ? arr : []).map(function (x) { return String(x).trim(); }).filter(Boolean).slice(0, 5);
      if (!arr.length) throw new Error('EMPTY');
      var l = FC.i18n.lang();
      return arr.map(function (x, i) { var t = {}; t[l] = x.slice(0, 400); return { id: 'ai' + i, prio: 3, text: t }; });
    });
  }
  function due(c) {
    var last = S().get('agent.lastRun', 0) || 0, t = now().getTime();
    if (c.freq === 'manual') return false;
    if (c.freq === 'instant') return t - last >= CHECK_MS;
    if (c.freq === 'weekly') return t - last >= 7 * 86400000;
    return dayKey(new Date(last)) !== dayKey() && t - last >= 12 * 3600000;
  }
  /** Analiz: çevrim dışı kurallar her zaman; çevrim içi AI uygunsa eklenir. → yeni notlar */
  function analyze(manual) {
    var c = cfg();
    if (!c.on) return Promise.resolve([]);
    if (run.busy) return run.busy;
    S().set('agent.lastRun', now().getTime());
    var sm, online = (g.navigator && g.navigator.onLine === false) ? false : true;
    run.busy = share(true).then(function () {
      sm = summary();
      var fresh = addNotes(rules(sm).slice(0, manual ? 6 : 4), 'offline');
      var useAi = c.ai && online && aiCfg() && aiCallsToday() < run.aiPerDay && (manual || c.freq !== 'instant' || aiCallsToday() === 0);
      if (!useAi) return fresh;
      return askAi(sm).then(function (list) { return fresh.concat(addNotes(list, 'ai')); }, function () { return fresh; });
    }).then(function (fresh) { run.busy = null; deliver(fresh); emit(); return fresh; }, function () { run.busy = null; return []; });
    return run.busy;
  }
  function schedule() { var c = cfg(); if (c.on && due(c)) analyze(false); }

  /* ---------- teslim: bildirim + panel ---------- */
  function deliver(fresh) {
    var c = cfg(); if (!fresh || !fresh.length) return;
    var top = fresh.slice().sort(function (a, b) { return b.prio - a.prio; })[0];
    var title = T('fc.agent.title') + (fresh.length > 1 ? ' (' + fresh.length + ')' : ''), body = noteText(top);
    if (c.notify) notify(title, body);
    else if (c.panel && FC.ui && g.document && g.document.body) FC.ui.toast(T('fc.agent.newNotes', { n: fresh.length }), 'info');
  }
  function notify(title, body) {
    try {
      if (run.notifyFn) { try { if (run.notifyFn(String(title), String(body)) !== false) return true; } catch (e) {} }
      var A = g.AndroidBridge;
      if (A && typeof A.notify === 'function') { A.notify(String(title), String(body)); return true; }
      var N = g.Notification;
      if (N && N.permission === 'granted') { var n = new N(title, { body: body, tag: 'fc-agent' }); n.onclick = function () { try { g.focus(); } catch (e) {} if (cfg().panel) show(); }; return true; }
      if (N && N.permission === 'default' && N.requestPermission) N.requestPermission().then(function (p) { if (p === 'granted') notify(title, body); });
      else if (FC.ui && g.document && g.document.body) FC.ui.toast(title + ': ' + body, 'info', 7000);
    } catch (e) {}
    return false;
  }
  function draw() {
    var c = cfg(), n = unread();
    run.btns.forEach(function (b) {
      b.style.display = c.on && c.panel ? '' : 'none';
      b.innerHTML = FC.ui.icon('sparkles') + (n ? '<span class="sync-badge">' + (n > 99 ? '99+' : n) + '</span>' : '');
      b.title = T('fc.agent.title'); b.setAttribute('aria-label', T('fc.agent.title') + (n ? ' (' + n + ')' : ''));
    });
  }
  function emit() { if (g.document) draw(); run.subs.slice().forEach(function (f) { try { f(); } catch (e) {} }); }
  function button() { var b = FC.ui.el('button.icon-btn.agent-btn', { type: 'button', 'data-fc-agent': '' }); b.addEventListener('click', function () { show(); }); run.btns.push(b); draw(); FC.i18n.onChange(draw); return b; }
  function fmtTime(t) { try { return new Date(t).toLocaleString(FC.i18n.locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function statsBox(sm) {
    var ui = FC.ui, el = ui.el, box = el('div.fc-agent-stats');
    box.appendChild(el('div.fc-row', { style: 'margin:0 0 8px' }, [
      el('span.fc-agent-chip', { text: T('fc.agent.week', { t: hm(sm.tot.w) }) }),
      el('span.fc-agent-chip', { text: T('fc.agent.days', { n: Object.keys(sm.tot.days).length }) }),
      el('span.fc-agent-chip', { text: T('fc.agent.open', { n: sm.tot.tasks.length }) })]));
    var names = Object.keys(sm.apps).filter(function (n) { return sm.apps[n].w > 0; }).sort(function (a, b) { return sm.apps[b].w - sm.apps[a].w; });
    var max = names.length ? sm.apps[names[0]].w : 1;
    names.slice(0, 8).forEach(function (n) {
      var w = sm.apps[n].w;
      box.appendChild(el('div.fc-agent-bar', null, [el('span.fc-agent-bar-l', { text: appName(n) }), el('span.fc-agent-bar-t', null, [el('span.fc-agent-bar-f', { style: 'width:' + Math.max(4, Math.round(w / max * 100)) + '%' })]), el('span.fc-agent-bar-v', { text: hm(w) })]));
    });
    return box;
  }
  function show() {
    var ui = FC.ui, el = ui.el, body = el('div', { 'data-fc-agent': '' }), m;
    function render() {
      body.innerHTML = '';
      var sm = summary();
      body.appendChild(statsBox(sm));
      body.appendChild(el('div.fc-sub', { text: T('fc.agent.notes') }));
      var list = notes();
      if (!list.length) body.appendChild(el('p.muted', { text: T('fc.agent.none') }));
      list.slice(0, 30).forEach(function (n) {
        body.appendChild(el('div.fc-ann.fc-agent-note' + (n.read ? '' : '.unread'), null, [
          el('div.fc-date', null, [el('span.fc-agent-chip' + (n.src === 'ai' ? '.ai' : ''), { text: T(n.src === 'ai' ? 'fc.agent.srcAi' : 'fc.agent.srcOff') }), ' ' + fmtTime(n.t)]),
          el('div.fc-text', { text: noteText(n), dir: 'auto' })]));
      });
    }
    render();
    m = ui.modal({ title: T('fc.agent.title'), icon: 'sparkles', body: body, onClose: markRead, buttons: [
      { label: T('fc.agent.analyze'), icon: 'zap', onClick: function (close, btn) { btn.disabled = true; analyze(true).then(function () { btn.disabled = false; render(); }); return false; } },
      'spacer', { label: T('fc.close'), cls: 'primary' }] });
    return m;
  }
  function markRead() { var all = notes(); all.forEach(function (n) { n.read = true; }); S().set('agent.notes', all); emit(); }

  /* ---------- ayarlar kartı ---------- */
  function card() {
    var ui = FC.ui, el = ui.el, c = ui.card({ key: 'agent', title: '', icon: 'sparkles' });
    c.setAttribute('data-fc-agent', '');
    function chk(key, label, hint) {
      var cb = el('input', { type: 'checkbox' }); cb.checked = !!cfg()[key];
      cb.addEventListener('change', function () { var p = {}; p[key] = cb.checked; setCfg(p); if (key === 'notify' && cb.checked) { try { if (g.Notification && g.Notification.permission === 'default') g.Notification.requestPermission(); } catch (e) {} } draw2(); });
      return el('label.check', { title: hint || '' }, [cb, el('span', { text: label })]);
    }
    function draw2() {
      var o = cfg(); c.innerHTML = '';
      c.appendChild(el('h3.card-title', { html: ui.icon('sparkles') + '<span>' + ui.esc(T('fc.agent.title')) + '</span>' }));
      c.appendChild(el('p.card-desc', { text: T('fc.agent.desc') }));
      c.appendChild(chk('on', T('fc.agent.on')));
      if (o.on) {
        c.appendChild(chk('notify', T('fc.agent.notify')));
        c.appendChild(chk('panel', T('fc.agent.panel')));
        c.appendChild(chk('ai', T('fc.agent.ai')));
        if (o.ai && !aiCfg()) c.appendChild(el('p.field-hint', { text: T('fc.agent.noKey'), style: 'margin:4px 0 0' }));
        var sel = el('select', { 'aria-label': T('fc.agent.freq') });
        FREQ.forEach(function (f) { sel.appendChild(el('option', { value: f, text: T('fc.agent.freq.' + f) })); });
        sel.value = o.freq; sel.addEventListener('change', function () { setCfg({ freq: sel.value }); });
        c.appendChild(el('label.field', null, [el('span.field-label', { text: T('fc.agent.freq') }), sel]));
        var apps = knownApps();
        c.appendChild(el('div.fc-sub', { text: T('fc.agent.apps') }));
        apps.forEach(function (a) {
          var cb = el('input', { type: 'checkbox' }); cb.checked = !o.apps || o.apps.indexOf(a) >= 0;
          cb.addEventListener('change', function () { var cur = cfg().apps || apps.slice(); cur = cur.filter(function (x) { return x !== a; }); if (cb.checked) cur.push(a); setCfg({ apps: cur.length >= knownApps().length ? null : cur }); });
          c.appendChild(el('label.check', null, [cb, el('span', { text: appName(a) })]));
        });
        c.appendChild(el('p.field-hint', { text: T('fc.agent.appsHint'), style: 'margin:6px 0 0' }));
        var sm = summary();
        c.appendChild(el('p.field-hint', { text: T('fc.agent.status', { t: hm(sm.tot.w), n: notes().length, a: aiCallsToday(), m: run.aiPerDay }), style: 'margin:10px 0 0' }));
        c.appendChild(el('div.fc-row', null, [
          el('button.btn.small.primary', { type: 'button', html: ui.icon('zap') + ui.esc(T('fc.agent.analyze')), onclick: function (e) { var b = e.currentTarget; b.disabled = true; analyze(true).then(function (f) { b.disabled = false; FC.ui.toast(f.length ? T('fc.agent.newNotes', { n: f.length }) : T('fc.agent.nothing'), 'info'); draw2(); }); } }),
          el('button.btn.small', { type: 'button', html: ui.icon('sparkles') + ui.esc(T('fc.agent.showNotes')), onclick: function () { show(); } }),
          el('button.btn.small', { type: 'button', text: T('fc.agent.clear'), onclick: function () { FC.ui.modal({ title: T('fc.agent.clear'), cls: 'small', body: ui.el('p', { text: T('fc.agent.clearQ') }), buttons: [{ label: T('fc.cancel') }, { label: T('fc.agent.clear'), cls: 'primary', onClick: function () { clearAll(); draw2(); } }] }); } })]));
      }
      c.appendChild(el('p.field-hint', { text: T('fc.agent.privacy'), style: 'margin:10px 0 0' }));
    }
    draw2(); FC.i18n.onChange(draw2); run.subs.push(function () { if (c.isConnected && !c.contains(g.document.activeElement)) draw2(); });
    return c;
  }
  function clearAll() { ['agent.mine', 'agent.peers', 'agent.notes', 'agent.lastRun', 'agent.shareAt'].forEach(function (k) { S().remove(k); }); var ha = hostAgent(); if (ha && ha.remove) try { ha.remove(srcKey()); } catch (e) {} emit(); }

  /* ---------- başlat ---------- */
  function start(o) {
    o = o || {};
    if (o.now) run.now = o.now; if (o.fetch) run.fetch = o.fetch; if (o.aiPerDay != null) run.aiPerDay = +o.aiPerDay; if (o.models) run.models = o.models; if (o.ai) run.ai = o.ai; if (o.notify) run.notifyFn = o.notify; if (o.firebase) run.firebase = o.firebase;
    run.app = String(o.app || run.app || 'app'); run.version = String(o.version || ''); if (o.sync) run.syncSeen = true;
    if (run.started) return api; run.started = true;
    if (!cfg().on) return api;
    var m = mine(); today(m).ses += 1; save(m); input();
    if (FC.crash && FC.crash.report && !FC.crash.report._agent) {
      var orig = FC.crash.report;
      FC.crash.report = function () { try { var mm = mine(); today(mm).err += 1; save(mm); } catch (e) {} return orig.apply(this, arguments); };
      FC.crash.report._agent = true;
    }
    var d = g.document;
    if (d && d.addEventListener) {
      d.addEventListener('click', onClick, true);
      ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(function (ev) { d.addEventListener(ev, input, { capture: true, passive: true }); });
      if (g.addEventListener) g.addEventListener('hashchange', function () { track('sayfa ' + String(g.location.hash || '').split(/[?&]/)[0].slice(0, 30)); });
    }
    if (o.timers !== false) {
      run.timers.push(setInterval(tick, TICK_MS));
      run.timers.push(setInterval(function () { share(false); schedule(); }, CHECK_MS));
      run.timers.push(setTimeout(function () { share(true).then(schedule); }, o.firstDelayMs == null ? 20000 : o.firstDelayMs));
    }
    return api;
  }
  function stop() { run.timers.forEach(function (t) { clearInterval(t); clearTimeout(t); }); run.timers = []; }

  if (FC.i18n) FC.i18n.add({
    tr: {
      'fc.agent.app.kitaplik': 'Kitaplık', 'fc.agent.app.falcon-ofis': 'Falcon Ofis', 'fc.agent.app.mahzen': 'Mahzen', 'fc.agent.app.bereket-defter': 'Bereket Defter', 'fc.agent.app.organizer': 'Düzenli Evim', 'fc.agent.app.aile-ajandasi': 'Aile Ajandası', 'fc.agent.app.ajandam': 'Ajandam', 'fc.agent.app.cv-maker': 'CV Maker', 'fc.agent.app.sinav-hazirlama': 'Sınav Hazırlama', 'fc.agent.app.baski-hesabi': 'Baskı Hesabı', 'fc.agent.app.comm-calc': 'Comm Calc', 'fc.agent.app.merkezi-servis': 'Merkezi Servis', 'fc.agent.app.ofis-gunlugu': 'Ofis Günlüğü', 'fc.agent.app.pixhawk-log-analiz': 'Pixhawk Log Analiz', 'fc.agent.app.kalori-hesaplayici': 'Kalori Hesaplayıcı', 'fc.agent.app.ing-mufredat': 'İngilizce Müfredat', 'fc.agent.app.iha-mufredat': 'İHA Müfredat', 'fc.agent.app.tv-bakim': 'TV Bakım', 'fc.agent.app.desktop-duzen': 'Masaüstü Düzen',
      'fc.agent.title': 'Asistan Agent', 'fc.agent.desc': 'Tüm uygulamalarınızdaki çalışmanızı izler ve daha verimli çalışmanız için yorum yapar.',
      'fc.agent.on': 'Agent açık', 'fc.agent.notify': 'Önerileri bildirim olarak göster', 'fc.agent.panel': 'Uygulama içi panel (✦ düğmesi)',
      'fc.agent.ai': 'Çevrim içi yapay zeka yorumları (kendi anahtarınızla; internet yoksa çevrim dışı kurallar)', 'fc.agent.noKey': 'Yapay zeka anahtarı bağlı değil; şimdilik yalnız çevrim dışı yorumlar yapılır. Anahtarı programın yapay zeka / kurulum ayarından ekleyebilirsiniz.',
      'fc.agent.freq': 'Yorum sıklığı', 'fc.agent.freq.instant': 'Anlık (yarım saatte bir)', 'fc.agent.freq.daily': 'Günlük', 'fc.agent.freq.weekly': 'Haftalık', 'fc.agent.freq.manual': 'Yalnızca istediğimde',
      'fc.agent.apps': 'İzlenen uygulamalar', 'fc.agent.appsHint': 'Diğer uygulamalar; aynı bilgisayarda, kendi Firebase hesabınızla ya da Wi-Fi eşitlemesiyle göründükçe listeye eklenir.',
      'fc.agent.status': 'Bu hafta: {t} · {n} yorum · bugün yapay zeka: {a}/{m}', 'fc.agent.analyze': 'Şimdi analiz et', 'fc.agent.showNotes': 'Yorumları göster', 'fc.agent.clear': 'Kayıtları sil',
      'fc.agent.clearQ': 'Agent\'ın bu cihazdaki tüm sayaçları ve yorumları silinsin mi? Uygulama verileriniz etkilenmez.',
      'fc.agent.privacy': 'Gizlilik: yalnızca sayılar tutulur (süre, düğme adları, saatler). Yazdıklarınız ve kayıt içerikleri asla okunmaz; veriler cihazınızda ve kendi hesaplarınızda kalır.',
      'fc.agent.notes': 'Yorumlar', 'fc.agent.none': 'Henüz yorum yok. Biraz çalıştıktan sonra ya da “Şimdi analiz et” ile yorumlar burada görünür.',
      'fc.agent.srcAi': 'Yapay zeka', 'fc.agent.srcOff': 'Çevrim dışı', 'fc.agent.newNotes': 'Asistan Agent {n} yeni yorum yaptı', 'fc.agent.nothing': 'Yeni bir yorum yok; her şey yolunda görünüyor.',
      'fc.agent.week': 'Bu hafta {t}', 'fc.agent.days': '{n}/7 gün etkin', 'fc.agent.open': '{n} açık iş', 'fc.agent.hm': '{h} sa {m} dk', 'fc.agent.m': '{m} dk',
      'fc.agent.r.start': 'Merhaba! Çalışmanızı izlemeye başladım. Birkaç gün sonra size özel öneriler yapacağım.',
      'fc.agent.r.up': 'Bu hafta geçen haftaya göre %{p} daha fazla çalıştınız ({t}). Harika bir tempo; düzenli molaları unutmayın.',
      'fc.agent.r.down': 'Bu hafta çalışma süreniz geçen haftaya göre %{p} azaldı ({t}). Günün belli bir saatini düzenli işlere ayırmak ritmi geri getirir.',
      'fc.agent.r.top': 'Bu hafta zamanınızın %{p}\'ini {a} uygulamasında geçirdiniz ({n} uygulama kullanıldı). Diğer işlerin geride kalmadığından emin olun.',
      'fc.agent.r.night': 'Çalışmanızın %{p}\'i gece 23:00–05:00 arasında. Önemli işleri gündüze almak hem hatayı hem yorgunluğu azaltır.',
      'fc.agent.r.break': 'Bir oturumda {t} ara vermeden çalıştınız. Her 50–60 dakikada 5 dakikalık mola odağı korur.',
      'fc.agent.r.peak': 'En verimli saatiniz {h}–{h2}. Zor ve önemli işleri bu saate planlayın.',
      'fc.agent.r.repeat': '{a} içinde “{x}” işlemini bu hafta {n} kez yaptınız. Bunun için bir şablon, kısayol ya da toplu işlem kullanmak zaman kazandırır.',
      'fc.agent.r.sync': '{a} içinde bu hafta hiç eşitleme yapılmadı. Verilerinizin yedeği için Eşitle düğmesini kullanın.',
      'fc.agent.r.err': '{a} bu hafta {n} kez hata verdi. Güncellemeyi kontrol edin; sürerse Ayarlar → Admin ile iletişim\'den bildirin.',
      'fc.agent.r.idle': '{a} bu hafta hiç açılmadı. Bekleyen işiniz varsa kısa bir göz atmak iyi olabilir.',
      'fc.agent.r.frag': '{a} bu hafta {n} kez kısa süreli açıldı. İşleri gruplayıp tek seferde yapmak bölünmeyi azaltır.',
      'fc.agent.r.tasks': '3 günden uzun süredir açık {n} işiniz var: {x}. Bugün birini bitirmeyi deneyin.',
      'fc.agent.r.streak': 'Bu hafta {n} gün düzenli çalıştınız. Süreklilik en büyük güç; böyle devam!',
      'fc.agent.r.update': 'Yeni bir güncelleme hazır. Tek tıkla güncelleyerek son iyileştirmelerden yararlanın.'
    },
    en: {
      'fc.agent.app.kitaplik': 'Library', 'fc.agent.app.mahzen': 'Cellar', 'fc.agent.app.bereket-defter': 'Bereket Ledger', 'fc.agent.app.organizer': 'Tidy Home', 'fc.agent.app.aile-ajandasi': 'Family Planner', 'fc.agent.app.ajandam': 'My Planner', 'fc.agent.app.sinav-hazirlama': 'Exam Builder', 'fc.agent.app.baski-hesabi': 'Print Cost', 'fc.agent.app.merkezi-servis': 'Central Shuttle', 'fc.agent.app.ofis-gunlugu': 'Office Log', 'fc.agent.app.kalori-hesaplayici': 'Calorie Calculator', 'fc.agent.app.ing-mufredat': 'English Curriculum', 'fc.agent.app.iha-mufredat': 'UAV Curriculum', 'fc.agent.app.tv-bakim': 'TV Care',
      'fc.agent.title': 'Assistant Agent', 'fc.agent.desc': 'Follows your work across all your apps and comments on how to work more effectively.',
      'fc.agent.on': 'Agent on', 'fc.agent.notify': 'Show suggestions as notifications', 'fc.agent.panel': 'In-app panel (✦ button)',
      'fc.agent.ai': 'Online AI comments (with your own key; offline rules when there is no internet)', 'fc.agent.noKey': 'No AI key connected; only offline comments for now. You can add a key in the program\'s AI / setup settings.',
      'fc.agent.freq': 'Comment frequency', 'fc.agent.freq.instant': 'Instant (every half hour)', 'fc.agent.freq.daily': 'Daily', 'fc.agent.freq.weekly': 'Weekly', 'fc.agent.freq.manual': 'Only when I ask',
      'fc.agent.apps': 'Watched apps', 'fc.agent.appsHint': 'Other apps are added as they appear on the same computer, on your own Firebase account or via Wi-Fi sync.',
      'fc.agent.status': 'This week: {t} · {n} comments · AI today: {a}/{m}', 'fc.agent.analyze': 'Analyse now', 'fc.agent.showNotes': 'Show comments', 'fc.agent.clear': 'Clear records',
      'fc.agent.clearQ': 'Delete all of the agent\'s counters and comments on this device? Your app data is not affected.',
      'fc.agent.privacy': 'Privacy: only numbers are kept (time, button names, hours). What you type and your records are never read; data stays on your device and your own accounts.',
      'fc.agent.notes': 'Comments', 'fc.agent.none': 'No comments yet. They will appear here after some work or with “Analyse now”.',
      'fc.agent.srcAi': 'AI', 'fc.agent.srcOff': 'Offline', 'fc.agent.newNotes': 'Assistant Agent made {n} new comments', 'fc.agent.nothing': 'No new comments; everything looks fine.',
      'fc.agent.week': 'This week {t}', 'fc.agent.days': '{n}/7 days active', 'fc.agent.open': '{n} open tasks', 'fc.agent.hm': '{h} h {m} min', 'fc.agent.m': '{m} min',
      'fc.agent.r.start': 'Hello! I have started following your work. In a few days I will make suggestions just for you.',
      'fc.agent.r.up': 'You worked {p}% more this week than last week ({t}). Great pace — don\'t forget regular breaks.',
      'fc.agent.r.down': 'Your working time dropped {p}% compared with last week ({t}). Setting a fixed hour for routine work brings the rhythm back.',
      'fc.agent.r.top': 'You spent {p}% of your time this week in {a} ({n} apps used). Make sure other work isn\'t falling behind.',
      'fc.agent.r.night': '{p}% of your work is between 23:00 and 05:00. Moving important tasks to daytime reduces mistakes and fatigue.',
      'fc.agent.r.break': 'You worked {t} without a break in one session. A 5-minute break every 50–60 minutes keeps you focused.',
      'fc.agent.r.peak': 'Your most productive hour is {h}–{h2}. Plan hard and important work for that time.',
      'fc.agent.r.repeat': 'You did “{x}” {n} times this week in {a}. A template, shortcut or bulk action would save time.',
      'fc.agent.r.sync': 'No sync was done in {a} this week. Use the Sync button to keep a backup of your data.',
      'fc.agent.r.err': '{a} had {n} errors this week. Check for updates; if it continues, report it via Settings → Contact admin.',
      'fc.agent.r.idle': '{a} was not opened this week. If something is pending there, a quick look may help.',
      'fc.agent.r.frag': '{a} was opened {n} times for short periods this week. Grouping tasks and doing them at once reduces interruptions.',
      'fc.agent.r.tasks': 'You have {n} tasks open for more than 3 days: {x}. Try to finish one today.',
      'fc.agent.r.streak': 'You worked steadily on {n} days this week. Consistency is the biggest strength — keep going!',
      'fc.agent.r.update': 'A new update is ready. Update with one click to get the latest improvements.'
    },
    ar: {
      'fc.agent.app.kitaplik': 'المكتبة', 'fc.agent.app.mahzen': 'المخزن', 'fc.agent.app.bereket-defter': 'دفتر البركة', 'fc.agent.app.organizer': 'بيتي المنظّم', 'fc.agent.app.aile-ajandasi': 'أجندة العائلة', 'fc.agent.app.ajandam': 'أجندتي', 'fc.agent.app.sinav-hazirlama': 'إعداد الاختبارات', 'fc.agent.app.baski-hesabi': 'حساب الطباعة', 'fc.agent.app.merkezi-servis': 'الخدمة المركزية', 'fc.agent.app.ofis-gunlugu': 'يوميات المكتب', 'fc.agent.app.kalori-hesaplayici': 'حاسبة السعرات', 'fc.agent.app.ing-mufredat': 'منهج الإنجليزية', 'fc.agent.app.iha-mufredat': 'منهج الطائرات المسيّرة', 'fc.agent.app.tv-bakim': 'صيانة التلفاز',
      'fc.agent.title': 'الوكيل المساعد', 'fc.agent.desc': 'يتابع عملك في جميع تطبيقاتك ويقدّم ملاحظات لتعمل بكفاءة أكبر.',
      'fc.agent.on': 'تشغيل الوكيل', 'fc.agent.notify': 'عرض الاقتراحات كإشعارات', 'fc.agent.panel': 'لوحة داخل التطبيق (زر ✦)',
      'fc.agent.ai': 'ملاحظات الذكاء الاصطناعي عبر الإنترنت (بمفتاحك الخاص؛ قواعد دون اتصال عند انقطاع الإنترنت)', 'fc.agent.noKey': 'لا يوجد مفتاح ذكاء اصطناعي مرتبط؛ الملاحظات الآن دون اتصال فقط. يمكنك إضافة المفتاح من إعدادات الذكاء الاصطناعي / الإعداد في البرنامج.',
      'fc.agent.freq': 'تكرار الملاحظات', 'fc.agent.freq.instant': 'فوري (كل نصف ساعة)', 'fc.agent.freq.daily': 'يومي', 'fc.agent.freq.weekly': 'أسبوعي', 'fc.agent.freq.manual': 'فقط عندما أطلب',
      'fc.agent.apps': 'التطبيقات المتابَعة', 'fc.agent.appsHint': 'تُضاف التطبيقات الأخرى عند ظهورها على الحاسوب نفسه أو في حساب Firebase الخاص بك أو عبر مزامنة Wi-Fi.',
      'fc.agent.status': 'هذا الأسبوع: {t} · {n} ملاحظة · الذكاء الاصطناعي اليوم: {a}/{m}', 'fc.agent.analyze': 'حلّل الآن', 'fc.agent.showNotes': 'عرض الملاحظات', 'fc.agent.clear': 'حذف السجلات',
      'fc.agent.clearQ': 'هل تريد حذف جميع عدّادات الوكيل وملاحظاته على هذا الجهاز؟ لا تتأثر بيانات تطبيقاتك.',
      'fc.agent.privacy': 'الخصوصية: تُحفظ الأرقام فقط (المدة، أسماء الأزرار، الساعات). لا تُقرأ كتاباتك ولا محتوى سجلاتك أبداً؛ تبقى البيانات على جهازك وفي حساباتك الخاصة.',
      'fc.agent.notes': 'الملاحظات', 'fc.agent.none': 'لا توجد ملاحظات بعد. ستظهر هنا بعد قليل من العمل أو عند الضغط على «حلّل الآن».',
      'fc.agent.srcAi': 'ذكاء اصطناعي', 'fc.agent.srcOff': 'دون اتصال', 'fc.agent.newNotes': 'قدّم الوكيل المساعد {n} ملاحظة جديدة', 'fc.agent.nothing': 'لا توجد ملاحظات جديدة؛ كل شيء يبدو جيداً.',
      'fc.agent.week': 'هذا الأسبوع {t}', 'fc.agent.days': '{n}/7 أيام نشطة', 'fc.agent.open': '{n} مهام مفتوحة', 'fc.agent.hm': '{h} س {m} د', 'fc.agent.m': '{m} د',
      'fc.agent.r.start': 'مرحباً! بدأت متابعة عملك. بعد بضعة أيام سأقدّم لك اقتراحات خاصة بك.',
      'fc.agent.r.up': 'عملت هذا الأسبوع أكثر بنسبة {p}% من الأسبوع الماضي ({t}). وتيرة رائعة؛ لا تنسَ الاستراحات المنتظمة.',
      'fc.agent.r.down': 'انخفض وقت عملك بنسبة {p}% مقارنة بالأسبوع الماضي ({t}). تخصيص ساعة ثابتة للأعمال المعتادة يعيد الإيقاع.',
      'fc.agent.r.top': 'قضيت {p}% من وقتك هذا الأسبوع في {a} (استُخدم {n} تطبيقات). تأكد من ألّا تتأخر الأعمال الأخرى.',
      'fc.agent.r.night': '{p}% من عملك بين 23:00 و05:00. نقل المهام المهمة إلى النهار يقلّل الأخطاء والتعب.',
      'fc.agent.r.break': 'عملت {t} دون استراحة في جلسة واحدة. استراحة 5 دقائق كل 50–60 دقيقة تحافظ على التركيز.',
      'fc.agent.r.peak': 'أكثر ساعاتك إنتاجية {h}–{h2}. خطّط للأعمال الصعبة والمهمة في هذا الوقت.',
      'fc.agent.r.repeat': 'نفّذت «{x}» {n} مرة هذا الأسبوع في {a}. استخدام قالب أو اختصار أو إجراء جماعي يوفّر الوقت.',
      'fc.agent.r.sync': 'لم تتم أي مزامنة في {a} هذا الأسبوع. استخدم زر المزامنة للاحتفاظ بنسخة احتياطية من بياناتك.',
      'fc.agent.r.err': 'ظهرت في {a} {n} أخطاء هذا الأسبوع. تحقّق من التحديثات؛ وإن استمرت فأبلغ عنها من الإعدادات ← التواصل مع المسؤول.',
      'fc.agent.r.idle': 'لم يُفتح {a} هذا الأسبوع. إن كان لديك عمل معلّق فيه فنظرة سريعة قد تفيد.',
      'fc.agent.r.frag': 'فُتح {a} {n} مرة لفترات قصيرة هذا الأسبوع. تجميع المهام وإنجازها دفعة واحدة يقلّل الانقطاع.',
      'fc.agent.r.tasks': 'لديك {n} مهام مفتوحة منذ أكثر من 3 أيام: {x}. حاول إنهاء واحدة اليوم.',
      'fc.agent.r.streak': 'عملت بانتظام {n} أيام هذا الأسبوع. الاستمرارية أكبر قوة؛ واصل!',
      'fc.agent.r.update': 'تحديث جديد جاهز. حدّث بنقرة واحدة للاستفادة من آخر التحسينات.'
    }
  });

  var api = { start: start, stop: stop, track: track, task: task, analyze: analyze, rules: rules, summary: summary, notes: notes, noteText: noteText, unread: unread,
    button: button, show: show, card: card, config: cfg, configure: setCfg, exportShare: exportShare, importShare: importShare, share: share, clear: clearAll,
    knownApps: knownApps, hasSync: function () { run.syncSeen = true; }, onChange: function (f) { run.subs.push(f); }, _tick: tick, _input: input, _clean: clean, _due: due,
    _reset: function () { stop(); run.started = false; run.subs = []; run.btns = []; run.busy = null; run.streak = 0; } };
  FC.agent = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/* ---- agent-standalone.js ---- */
/* FCAgent — Asistan Agent'ın BAĞIMSIZ eklentisi: ortak çekirdeğe henüz geçmemiş uygulamalar için tek dosya (dist/fc-agent.js).
   Arayüz Shadow DOM içinde çizilir; uygulamanın kendi CSS'iyle çakışmaz, uygulamanın <html lang/dir>'ine dokunmaz.
     <script src="fc-agent.js"></script>
     FCAgent.mount({
       app: 'kitaplik', version: '2.13.0',
       lang: () => localStorage.getItem('kitaplik.dil') || 'tr',      // ya da 'tr'; değişince kendisi izler
       theme: 'auto',                                                  // 'dark' | 'light' | 'auto' | () => …
       settings: document.getElementById('ayarlarSonu'),               // kartın ekleneceği yer (Admin ile iletişim'den ÖNCE)
       settingsBefore: ['✉️ Yönetici ile İletişim', 'Contact the administrator', 'التواصل مع المسؤول'],   // ya da: bu kartın önüne
       button: 'float',                                                // ya da üst çubuktaki bir kapsayıcı öğe
       ai: () => ({provider: 'gemini', key: localStorage.getItem('kitaplik.geminiKey')}),   // kullanıcının KENDİ anahtarı
       firebase: () => ({projectId, apiKey}),                          // kullanıcının KENDİ projesi (isteğe bağlı)
       notify: (baslik, metin) => { AndroidKopru.notifyNow(baslik, metin); },   // isteğe bağlı: yerel bildirim
       sync: true                                                      // uygulamada Eşitle düğmesi var
     });
   Tam çekirdeği (FC.init) kullanan uygulamada bu dosya GEREKMEZ. */
(function (g) {
  'use strict';
  var FC = g.FC = g.FC || {};
  var CSS = FC._agentCss || '';
  var EXTRA = '.fc-root{all:initial;display:contents;font-family:Inter,"Noto Sans Arabic","Segoe UI",system-ui,sans-serif;font-size:14px;line-height:1.5;color:var(--text)}' +
    '.fc-root *{font-family:inherit}' +
    '.fc-agent-fab{position:fixed;bottom:18px;inset-inline-end:18px;width:46px;height:46px;border-radius:50%;z-index:5;box-shadow:0 6px 20px rgba(0,0,0,.35);background:var(--panel-solid,#111827);border:1px solid var(--border);color:var(--accent);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}' +
    '.fc-agent-fab .sync-badge{position:absolute;top:-4px;inset-inline-end:-4px}' +
    '.fc-agent-inline{display:inline-flex}';
  var st = { o: null, roots: [], lang: null, theme: null, timer: null };
  function val(x) { try { return typeof x === 'function' ? x() : x; } catch (e) { return null; } }
  function isLight() {
    var t = val(st.o.theme) || 'auto';
    if (t === 'light') return true; if (t === 'dark') return false;
    try { var c = g.getComputedStyle(g.document.body).backgroundColor.match(/\d+/g); if (c && c.length >= 3 && !(c.length === 4 && +c[3] === 0)) return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) > 150; } catch (e) {}
    return !!(g.matchMedia && g.matchMedia('(prefers-color-scheme: light)').matches);
  }
  function shadowHost(parent, fixed) {
    var host = g.document.createElement('div');
    host.setAttribute('data-fc-agent', '');
    if (fixed) host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483000';
    parent.appendChild(host);
    var sr = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var style = g.document.createElement('style'); style.textContent = CSS + EXTRA; sr.appendChild(style);
    var root = g.document.createElement('div'); root.className = 'fc-root'; root.setAttribute('data-scheme', 'falcon');
    sr.appendChild(root); st.roots.push(root);
    return root;
  }
  function sync() {
    var l = String(val(st.o.lang) || 'tr').slice(0, 2).toLowerCase(), light = isLight();
    if (l !== st.lang) { st.lang = l; FC.i18n.set(l); }
    st.roots.forEach(function (r) { r.setAttribute('lang', l); r.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr'); r.classList.toggle('theme-light', light); });
  }
  function mount(o) {
    if (st.o) return api;
    st.o = o = o || {};
    if (!g.document || !g.document.body) { g.addEventListener('DOMContentLoaded', function () { st.o = null; mount(o); }); return api; }
    FC.i18n.noDoc = true;
    var main = shadowHost(g.document.body, true);
    FC.ui.root = main;
    sync();
    FC.agent.start({ app: o.app, version: o.version, notify: o.notify, ai: o.ai, firebase: o.firebase, sync: o.sync, models: o.models, aiPerDay: o.aiPerDay });
    if (o.button !== false) {
      var b = FC.agent.button();
      if (o.button && o.button.nodeType) { shadowHost(o.button, false).appendChild(b); b.classList.add('fc-agent-inline'); }
      else { b.classList.add('fc-agent-fab'); main.appendChild(b); }
    }
    if (o.settings) settings(o.settings);
    if (o.settingsBefore) watchSettings(o.settingsBefore, o.cardSelector);
    sync();
    st.timer = setInterval(sync, 1500);
    return api;
  }
  /** Ayarlar kartını verilen kapsayıcıya ekler (Admin ile iletişim kartından önce koyun). */
  function settings(parent) { var r = shadowHost(parent, false); r.appendChild(FC.agent.card()); sync(); return r; }
  /** Ayarlar sayfası dinamikse: metni verilen kartın (ör. "Yönetici ile İletişim") hemen ÖNÜNE kartı koyar; sayfa yeniden
      çizildikçe tekrar yerleştirir. texts: ['✉️ Yönetici ile İletişim', 'Contact the administrator', 'التواصل مع المسؤول'] */
  function watchSettings(texts, sel) {
    sel = sel || '.card,details,section,fieldset,.settings-card,.panel';
    var list = (Array.isArray(texts) ? texts : [texts]).map(function (t) { return String(t).trim(); }).filter(Boolean), host = null, pend = 0;
    function find() {
      var w = g.document.createTreeWalker(g.document.body, 4, null), n;
      while ((n = w.nextNode())) {
        var t = (n.nodeValue || '').trim(); if (!t || t.length > 80) continue;
        for (var i = 0; i < list.length; i++) { var at = t.indexOf(list[i]); if (at < 0 || at > 4 || t.length > list[i].length + 6) continue;
          var e = n.parentNode; if (!e || !e.closest || e.closest('[data-fc-agent]')) break;
          var c = e.closest(sel);   // kart yalnızca başlık kartın EN ÜSTÜNDEYSE seçilir (yoksa başlığın önüne konur)
          if (c && (c === g.document.body || c.textContent.trim().indexOf(list[i]) > 6)) c = null;
          return c || e;
        }
      }
      return null;
    }
    function place() {
      pend = 0;
      var target = find(); if (!target || !target.parentNode) return;
      if (host && host.isConnected) { var sib = target, k = 0; while ((sib = sib.previousElementSibling) && k++ < 3) if (sib === host) return; }   // diğer eklentilerle yer kavgası yapma
      if (!host || !host.isConnected) { var wrap = g.document.createElement('div'); wrap.setAttribute('data-fc-agent', ''); wrap.className = (target.className || '').split(' ').filter(function (c) { return /^(col|grid|span)/.test(c); }).join(' '); try { var cs = g.getComputedStyle(target); ['maxWidth', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'width'].forEach(function (k) { if (k !== 'width' || /%$/.test(target.style.width || '')) wrap.style[k] = cs[k]; }); } catch (e) {}
        target.parentNode.insertBefore(wrap, target); settings(wrap); host = wrap; }
      else target.parentNode.insertBefore(host, target);
    }
    var mo = new g.MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) { var t = recs[i].target; if (t && t.closest && t.closest('[data-fc-agent]')) continue; if (!pend) pend = setTimeout(place, 250); return; }
    });
    mo.observe(g.document.body, { childList: true, subtree: true });
    place();
  }
  var api = { mount: mount, watchSettings: watchSettings, settings: settings, refresh: sync, agent: function () { return FC.agent; }, track: function (n, k) { FC.agent.track(n, k); }, task: function (a, b, c) { FC.agent.task(a, b, c); }, show: function () { return FC.agent.show(); },
    exportShare: function () { return FC.agent.exportShare(); }, importShare: function (x) { return FC.agent.importShare(x); } };
  g.FCAgent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

} else if (typeof window !== "undefined" && !window.FCAgent) { window.FCAgent = { mount: function () { return window.FCAgent; }, settings: function () {}, watchSettings: function () {}, refresh: function () {}, agent: function () { return FC.agent; }, track: function (n, k) { FC.agent && FC.agent.track(n, k); }, task: function (a, b, c) { FC.agent && FC.agent.task(a, b, c); }, show: function () { return FC.agent && FC.agent.show(); }, exportShare: function () { return FC.agent.exportShare(); }, importShare: function (x) { return FC.agent.importShare(x); } }; }
