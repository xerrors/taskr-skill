export const boardStyles = `    :root {
      color-scheme: dark;
      --ink: #dbe7f3;
      --ink-strong: #f7fbff;
      --muted: #93a4b7;
      --faint: #617083;
      --background: #090d12;
      --surface: #0f151c;
      --panel: #121922;
      --panel-raised: #17202b;
      --card: #141c25;
      --card-hover: #182331;
      --line: rgba(148, 163, 184, 0.16);
      --line-strong: rgba(148, 163, 184, 0.28);
      --accent: #38bdf8;
      --accent-soft: rgba(56, 189, 248, 0.12);
      --accent-2: #22c55e;
      --focus: 0 0 0 3px rgba(56, 189, 248, 0.26);
      --planned: #f59e0b;
      --blocked: #fb7185;
      --pending: #a78bfa;
      --implemented: #22c55e;
      --shadow-sm: 0 10px 28px rgba(0, 0, 0, 0.24);
      --shadow-md: 0 18px 56px rgba(0, 0, 0, 0.34);
      --space-1: 4px;
      --space-2: 8px;
      --space-3: 12px;
      --space-4: 16px;
      --space-5: 20px;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100dvh;
      color: var(--ink);
      line-height: 1.5;
      background:
        linear-gradient(180deg, rgba(56, 189, 248, 0.065), transparent 320px),
        linear-gradient(90deg, rgba(34, 197, 94, 0.035), transparent 42%),
        var(--background);
      overflow-x: hidden;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.035;
      background-image:
        linear-gradient(rgba(226, 232, 240, 0.18) 1px, transparent 1px),
        linear-gradient(90deg, rgba(226, 232, 240, 0.14) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: linear-gradient(to bottom, black, transparent 58%);
    }

    button, input {
      font: inherit;
      touch-action: manipulation;
    }

    .shell {
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      padding: 16px clamp(16px, 3vw, 64px) 28px;
    }

    .masthead {
      position: sticky;
      top: 12px;
      z-index: 20;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      align-items: center;
      padding: 22px 0 18px;
      border-bottom: 1px solid transparent;
      background: transparent;
      isolation: isolate;
      transition: padding 180ms ease, border-color 180ms ease;
    }

    .masthead::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 100vw;
      transform: translateX(-50%);
      z-index: -1;
      opacity: 0;
      background: rgba(9, 13, 18, 0.9);
      border-bottom: 1px solid var(--line);
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.18);
      backdrop-filter: blur(16px);
      transition: opacity 180ms ease;
    }

    .masthead.is-compact {
      padding: 10px 0 10px;
    }

    .masthead.is-compact::before {
      opacity: 1;
    }

    .eyebrow {
      margin: 0;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .masthead-topline {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin: 0 0 6px;
    }

    h1 {
      margin: 0;
      color: var(--ink-strong);
      font-size: 2.65rem;
      line-height: 1.05;
      letter-spacing: 0;
      font-weight: 720;
      transition: font-size 180ms ease;
    }

    .masthead.is-compact h1 {
      font-size: 1.55rem;
    }

    .repo {
      max-width: 62rem;
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 0.86rem;
      word-break: break-all;
      transition: margin 180ms ease, font-size 180ms ease;
    }

    .masthead.is-compact .repo {
      margin-top: 4px;
      font-size: 0.78rem;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(92px, 1fr));
      gap: 8px;
      min-width: 300px;
    }

    .stat {
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(18, 25, 34, 0.74);
      border: 1px solid var(--line);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      transition: padding 180ms ease;
    }

    .masthead.is-compact .stat {
      padding: 8px 10px;
    }

    .stat strong {
      display: block;
      font-size: 1.35rem;
      line-height: 1;
      color: var(--ink-strong);
      font-weight: 720;
      transition: font-size 180ms ease;
    }

    .masthead.is-compact .stat strong {
      font-size: 1.2rem;
    }

    .stat span {
      display: block;
      margin-top: 5px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.66rem;
      font-weight: 600;
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-4);
      align-items: start;
      margin: var(--space-5) 0 var(--space-4);
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }

    .toolbar-primary {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    .toolbar-secondary {
      display: grid;
      justify-items: end;
      gap: var(--space-2);
      min-width: 0;
      align-self: start;
    }

    .search-wrap {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-2);
      align-items: center;
      min-width: 0;
    }

    .toolbar-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      min-height: 22px;
      padding: 0 2px;
    }

    .view-toggle {
      display: inline-flex;
      gap: var(--space-1);
      padding: var(--space-1);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(9, 13, 18, 0.58);
    }

    .sort-control {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 40px;
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 700;
    }

    .sort-control span {
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .sort-control select {
      min-height: 40px;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(9, 13, 18, 0.58);
      padding: 0 34px 0 11px;
      outline: none;
      cursor: pointer;
    }

    .sort-control select:focus-visible {
      border-color: var(--accent-2);
      box-shadow: var(--focus);
    }

    .icon-button.language-button {
      min-width: 50px;
      min-height: 30px;
      padding: 0 9px;
      color: var(--accent);
      border-color: rgba(56, 189, 248, 0.22);
      background: rgba(9, 13, 18, 0.28);
      font-size: 0.76rem;
      line-height: 1;
    }

    .masthead.is-compact .icon-button.language-button {
      min-height: 26px;
      padding: 0 7px;
      font-size: 0.72rem;
    }

    .search {
      width: 100%;
      color: var(--ink);
      border: 1px solid rgba(148, 163, 184, 0.2);
      outline: none;
      border-radius: 8px;
      background:
        linear-gradient(180deg, rgba(18, 25, 34, 0.92), rgba(9, 13, 18, 0.78));
      min-height: 48px;
      padding: var(--space-3) var(--space-4);
      transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }

    .search::placeholder { color: var(--faint); }

    .search:focus-visible {
      border-color: var(--accent-2);
      box-shadow: var(--focus);
      background: var(--panel-raised);
    }

    .icon-button, .section-action {
      display: inline-grid;
      place-items: center;
      min-width: 48px;
      min-height: 48px;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(20, 28, 37, 0.88);
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, color 160ms ease;
    }

    .icon-button {
      width: auto;
      padding: 0 var(--space-4);
      white-space: nowrap;
      font-weight: 700;
    }

    .view-tab {
      min-height: 40px;
      min-width: 72px;
      padding: 0 var(--space-3);
      color: var(--muted);
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 700;
      transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
    }

    .view-tab:hover {
      color: var(--ink);
      background: rgba(148, 163, 184, 0.08);
    }

    .view-tab:focus-visible {
      outline: none;
      box-shadow: var(--focus);
    }

    .view-tab[aria-pressed="true"] {
      color: var(--ink-strong);
      border-color: var(--line-strong);
      background: rgba(20, 28, 37, 0.92);
    }

    .icon-button:hover, .section-action:hover {
      border-color: var(--line-strong);
      background: var(--panel-raised);
    }

    .section-action:hover {
      transform: translateY(-1px);
    }

    .refresh-button {
      min-width: 96px;
      color: var(--ink);
      background: rgba(20, 28, 37, 0.88);
      border-color: var(--line);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .refresh-button:hover {
      color: var(--ink-strong);
      background: var(--panel-raised);
      border-color: var(--line-strong);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .refresh-button[disabled] {
      color: var(--faint);
      background: rgba(20, 28, 37, 0.62);
      border-color: var(--line);
      box-shadow: none;
    }

    .icon-button:focus-visible, .section-action:focus-visible {
      outline: none;
      box-shadow: var(--focus);
    }

    .icon-button[disabled], .section-action[disabled] {
      cursor: wait;
      color: var(--faint);
      transform: none;
    }

    .toolbar-status {
      min-width: 0;
      color: var(--muted);
      font-size: 0.82rem;
      text-align: right;
    }

    .hint {
      color: var(--muted);
      font-size: 0.84rem;
      text-align: left;
    }

    .is-hidden {
      display: none !important;
    }

    .table-view {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(15, 21, 28, 0.78);
      overflow: hidden;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .table-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .task-table {
      width: 100%;
      min-width: 860px;
      border-collapse: collapse;
    }

    .task-table th {
      padding: 11px 14px;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      background: rgba(9, 13, 18, 0.46);
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.68rem;
      font-weight: 750;
    }

    .task-table td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      color: var(--ink);
      vertical-align: middle;
      font-size: 0.86rem;
    }

    .task-table tr:last-child td {
      border-bottom: 0;
    }

    .task-row {
      cursor: pointer;
      transition: background 140ms ease, box-shadow 140ms ease;
    }

    .task-row:hover,
    .task-row:focus-visible {
      background: rgba(24, 35, 49, 0.78);
      outline: none;
    }

    .task-row.is-active {
      background: rgba(56, 189, 248, 0.08);
      box-shadow: inset 3px 0 0 var(--accent);
    }

    .task-title-cell {
      min-width: 280px;
    }

    .task-title-main {
      display: block;
      color: var(--ink-strong);
      font-weight: 700;
      line-height: 1.35;
    }

    .task-title-sub {
      display: block;
      max-width: 520px;
      margin-top: 4px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.78rem;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-width: 112px;
      color: var(--ink);
      font-weight: 650;
    }

    .status-chip .dot {
      flex: 0 0 auto;
    }

    .status-chip[data-status="blocked"] .dot { background: var(--blocked); box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.12); }
    .status-chip[data-status="implemented"] .dot { background: var(--implemented); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12); }
    .status-chip[data-status="pending_confirmation"] .dot { background: var(--pending); box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.12); }
    .status-chip[data-status="in_progress"] .dot { background: var(--accent); box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12); }

    .table-empty {
      margin: 10px;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(4, minmax(250px, 1fr));
      gap: 10px;
      align-items: start;
      overflow-x: auto;
      padding-bottom: 16px;
      -webkit-overflow-scrolling: touch;
    }

    .column {
      min-height: 560px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(15, 21, 28, 0.78);
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03);
      padding: 10px;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      padding: 5px 3px 10px;
      border-bottom: 1px solid var(--line);
    }

    .column-title {
      display: flex;
      gap: 9px;
      align-items: center;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0;
      color: var(--ink);
      font-size: 0.74rem;
      font-weight: 700;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--planned);
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
    }

    .column[data-status="blocked"] .dot { background: var(--blocked); box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.12); }
    .column[data-status="implemented"] .dot { background: var(--implemented); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12); }
    .column[data-status="in_progress"] .dot { background: var(--accent); box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12); }

    .count {
      color: var(--muted);
      border: 1px solid var(--line);
      border-radius: 7px;
      min-width: 26px;
      padding: 2px 7px;
      text-align: center;
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
    }

    .cards {
      display: grid;
      gap: 8px;
    }

    .card {
      width: 100%;
      display: block;
      text-align: left;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: var(--card);
      box-shadow: none;
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }

    .card:hover, .card:focus-visible {
      border-color: var(--line-strong);
      background: var(--card-hover);
      box-shadow: var(--shadow-sm);
      outline: none;
    }

    .card:focus-visible { box-shadow: var(--focus), var(--shadow-sm); }

    .card.is-active {
      border-color: rgba(56, 189, 248, 0.72);
      box-shadow: inset 3px 0 0 var(--accent), var(--shadow-sm);
    }

    .card.card-compact {
      min-height: 0;
      display: grid;
      gap: 7px;
      padding: 10px 11px;
      border-radius: 8px;
      background:
        linear-gradient(180deg, rgba(20, 28, 37, 0.86), rgba(15, 21, 28, 0.72));
      border-color: rgba(148, 163, 184, 0.13);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
    }

    .card.card-compact:hover,
    .card.card-compact:focus-visible {
      background:
        linear-gradient(180deg, rgba(24, 35, 49, 0.92), rgba(18, 25, 34, 0.82));
      border-color: rgba(148, 163, 184, 0.26);
    }

    .card.card-compact .card-title {
      margin: 0;
      font-size: 0.88rem;
      line-height: 1.34;
      font-weight: 680;
    }

    .compact-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
      color: var(--muted);
    }

    .compact-id {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.7rem;
      font-weight: 620;
    }

    .card.card-compact .mini-progress {
      flex: 0 0 auto;
      min-width: 62px;
      padding: 2px 0;
      border: 0;
      background: transparent;
    }

    .card-id {
      color: var(--muted);
      letter-spacing: 0;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .card-title {
      margin: 6px 0 8px;
      color: var(--ink-strong);
      font-size: 0.96rem;
      line-height: 1.35;
      letter-spacing: 0;
      font-weight: 680;
    }

    .card-request {
      color: var(--muted);
      line-height: 1.45;
      font-size: 0.84rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    html[lang="zh-CN"] .card.card-compact .card-title {
      font-size: 0.94rem;
      line-height: 1.42;
    }

    html[lang="zh-CN"] .card-title {
      font-size: 1.02rem;
      line-height: 1.42;
    }

    html[lang="zh-CN"] .card-request {
      font-size: 0.9rem;
      line-height: 1.55;
    }

    .card-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 11px;
    }

    .pill {
      border-radius: 7px;
      padding: 3px 7px;
      background: rgba(148, 163, 184, 0.08);
      color: var(--muted);
      border: 1px solid rgba(148, 163, 184, 0.1);
      font-size: 0.72rem;
      letter-spacing: 0;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--ink);
      font-weight: 650;
    }

    .status-pill[data-status="pending_confirmation"] {
      color: #ddd6fe;
      background: rgba(167, 139, 250, 0.1);
      border-color: rgba(167, 139, 250, 0.18);
    }

    .mini-progress {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 68px;
    }

    .mini-progress-bar {
      width: 34px;
      height: 5px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.14);
      overflow: hidden;
    }

    .mini-progress-bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--implemented);
    }

    .empty {
      min-height: 96px;
      display: grid;
      place-items: center;
      color: var(--faint);
      border: 1px dashed var(--line);
      border-radius: 8px;
      font-size: 0.84rem;
    }

    .detail {
      position: fixed;
      top: 14px;
      right: 14px;
      bottom: 14px;
      width: min(660px, calc(100vw - 28px));
      display: grid;
      grid-template-rows: auto 1fr;
      border: 1px solid var(--line-strong);
      border-radius: 12px;
      background: rgba(12, 17, 24, 0.98);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.58);
      transform: translateX(calc(100% + 28px));
      transition: transform 220ms ease;
      z-index: 40;
      overflow: hidden;
    }

    .detail.is-open { transform: translateX(0); }

    .detail-header {
      padding: 20px 22px 18px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    .detail-kicker {
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .detail-title {
      margin: 8px 56px 0 0;
      color: var(--ink-strong);
      font-size: 1.35rem;
      line-height: 1.25;
      letter-spacing: 0;
      font-weight: 720;
    }

    .close {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 44px;
      height: 44px;
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--ink);
      background: rgba(148, 163, 184, 0.08);
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }

    .close:hover {
      border-color: var(--line-strong);
      background: rgba(148, 163, 184, 0.13);
      transform: translateY(-1px);
    }

    .close:focus-visible {
      outline: none;
      box-shadow: var(--focus);
    }

    .detail-body {
      overflow: auto;
      padding: 16px 22px 24px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 16px;
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(20, 28, 37, 0.56);
    }

    .meta {
      color: var(--ink);
      word-break: break-word;
    }

    .meta span {
      display: block;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.66rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .commit-panel {
      margin-bottom: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(20, 28, 37, 0.56);
      overflow: hidden;
    }

    .commit-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 11px 13px;
      border-bottom: 1px solid var(--line);
    }

    .commit-panel-title {
      margin: 0;
      color: #7dd3fc;
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.72rem;
      font-weight: 750;
    }

    .commit-panel-summary {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
    }

    .commit-list {
      display: grid;
      padding: 0 13px 12px;
    }

    .commit-row {
      display: grid;
      gap: 8px;
      padding: 12px 0 0;
    }

    .commit-row + .commit-row {
      margin-top: 12px;
      border-top: 1px solid var(--line);
    }

    .commit-row-main {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }

    .commit-id {
      color: var(--ink-strong);
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.86rem;
      font-weight: 700;
      word-break: break-all;
    }

    .commit-subject {
      color: var(--muted);
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .commit-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .commit-files {
      display: grid;
      margin-top: 4px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }

    .commit-file {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      padding: 8px 0;
    }

    .commit-file + .commit-file {
      border-top: 1px solid rgba(148, 163, 184, 0.08);
    }

    .file-status {
      display: inline-grid;
      place-items: center;
      min-width: 24px;
      height: 24px;
      border-radius: 7px;
      color: var(--ink-strong);
      border: 1px solid rgba(148, 163, 184, 0.16);
      background: rgba(148, 163, 184, 0.08);
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.72rem;
      font-weight: 800;
    }

    .file-status[data-status="U"] {
      color: #86efac;
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.2);
    }

    .file-status[data-status="D"] {
      color: #fda4af;
      background: rgba(251, 113, 133, 0.1);
      border-color: rgba(251, 113, 133, 0.22);
    }

    .file-path {
      min-width: 0;
      color: var(--ink);
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.8rem;
      line-height: 1.45;
      word-break: break-word;
    }

    .file-lines {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 5px;
      min-width: 128px;
    }

    .diff-add {
      color: #86efac;
    }

    .diff-delete {
      color: #fda4af;
    }

    .progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .progress-label {
      min-width: 44px;
      color: var(--ink);
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }

    .progress-percent {
      min-width: 36px;
      color: var(--muted);
      font-size: 0.82rem;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .progress-track {
      flex: 1;
      min-width: 72px;
      height: 9px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.12);
      overflow: hidden;
    }

    .progress-fill {
      display: block;
      height: 100%;
      width: 0%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent), var(--implemented));
      transition: width 180ms ease;
    }

    .section {
      margin-top: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(20, 28, 37, 0.54);
      overflow: hidden;
    }

    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 11px 13px;
      border-bottom: 1px solid var(--line);
    }

    .section h3 {
      margin: 0;
      color: #7dd3fc;
      text-transform: uppercase;
      letter-spacing: 0;
      font-size: 0.72rem;
      font-weight: 750;
    }

    .section-tools {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .section-status {
      color: var(--muted);
      font-size: 0.76rem;
    }

    .section-action {
      min-width: 34px;
      min-height: 30px;
      padding: 4px 9px;
      border-radius: 7px;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .section pre {
      margin: 0;
      padding: 13px;
      color: #dbe7f3;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.86rem;
      line-height: 1.52;
    }

    .markdown-content {
      padding: 13px;
      color: #dbe7f3;
      word-break: break-word;
      font-size: 0.9rem;
      line-height: 1.56;
    }

    .markdown-content > :first-child { margin-top: 0; }
    .markdown-content > :last-child { margin-bottom: 0; }

    .markdown-content p {
      margin: 0 0 10px;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin: 0 0 10px;
      padding-left: 1.35rem;
    }

    .markdown-content li + li {
      margin-top: 4px;
    }

    .markdown-content code {
      padding: 1px 5px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 5px;
      background: rgba(9, 13, 18, 0.66);
      color: #e0f2fe;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.86em;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .markdown-content strong {
      color: var(--ink-strong);
      font-weight: 750;
    }

    .markdown-content .task-list {
      padding-left: 0;
      list-style: none;
    }

    .markdown-content .task-list-item {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 8px;
      align-items: flex-start;
    }

    .markdown-content .task-list-item input {
      flex: 0 0 auto;
      margin-top: 0.3em;
      accent-color: var(--implemented);
    }

    .markdown-content .task-list-item-content {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .danger-zone {
      margin-top: 14px;
      border: 1px solid rgba(251, 113, 133, 0.28);
      border-radius: 8px;
      background: rgba(127, 29, 29, 0.12);
      overflow: hidden;
    }

    .danger-zone-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px;
    }

    .danger-zone h3,
    .danger-zone h4 {
      margin: 0;
      color: #fecdd3;
      letter-spacing: 0;
      font-size: 0.84rem;
      font-weight: 750;
    }

    .danger-zone p {
      margin: 5px 0 0;
      color: var(--muted);
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .danger-button {
      min-height: 36px;
      border: 1px solid rgba(251, 113, 133, 0.34);
      border-radius: 8px;
      color: #fecdd3;
      background: rgba(127, 29, 29, 0.22);
      padding: 0 12px;
      cursor: pointer;
      font-weight: 750;
    }

    .danger-button:hover,
    .danger-button:focus-visible {
      border-color: rgba(251, 113, 133, 0.58);
      background: rgba(127, 29, 29, 0.34);
      outline: none;
    }

    .danger-button:focus-visible {
      box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.2);
    }

    .danger-button-solid {
      color: #fff1f2;
      background: rgba(225, 29, 72, 0.72);
      border-color: rgba(251, 113, 133, 0.74);
    }

    .danger-button[disabled] {
      cursor: wait;
      color: var(--faint);
      background: rgba(127, 29, 29, 0.12);
    }

    .danger-confirm {
      display: grid;
      gap: 10px;
      padding: 13px;
      border-top: 1px solid rgba(251, 113, 133, 0.2);
      background: rgba(9, 13, 18, 0.38);
    }

    .danger-confirm[hidden] {
      display: none;
    }

    .danger-facts {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 6px 10px;
      margin: 0;
      padding: 10px;
      border: 1px solid rgba(251, 113, 133, 0.14);
      border-radius: 8px;
      background: rgba(15, 21, 28, 0.64);
    }

    .danger-facts dt {
      color: var(--muted);
      text-transform: uppercase;
      font-size: 0.66rem;
      font-weight: 750;
    }

    .danger-facts dd {
      min-width: 0;
      margin: 0;
      color: var(--ink);
      overflow-wrap: anywhere;
      font-size: 0.8rem;
    }

    .danger-status {
      min-height: 18px;
      color: #fecdd3;
      font-size: 0.78rem;
    }

    .danger-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .section textarea {
      width: 100%;
      min-height: 180px;
      margin: 0;
      display: block;
      resize: vertical;
      color: #dbe7f3;
      background: rgba(9, 13, 18, 0.78);
      border: 0;
      border-top: 1px solid rgba(148, 163, 184, 0.08);
      outline: none;
      padding: 13px;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 0.86rem;
      line-height: 1.52;
    }

    .section textarea:focus {
      box-shadow: inset 0 0 0 2px rgba(56, 189, 248, 0.32);
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity 180ms ease;
      z-index: 30;
    }

    .backdrop.is-open {
      opacity: 1;
      pointer-events: auto;
    }

    @media (max-width: 980px) {
      .masthead { grid-template-columns: 1fr; }
      .stats { min-width: 0; }
      .toolbar {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .board { grid-template-columns: repeat(4, 280px); }
    }

    @media (max-width: 640px) {
      .shell { padding: 8px 8px 28px; }
      .masthead {
        padding: 16px 0;
        border: 0;
        border-radius: 0;
        background: transparent;
      }
      h1 { font-size: 2rem; }
      .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .stat { padding: 10px; }
      .stat strong { font-size: 1.35rem; }
      .toolbar { grid-template-columns: 1fr; }
      .search-wrap { width: 100%; }
      .toolbar-secondary {
        justify-items: stretch;
        order: -1;
      }
      .sort-control {
        justify-content: space-between;
        width: 100%;
      }
      .sort-control select {
        min-width: 150px;
      }
      .view-toggle { width: 100%; }
      .view-tab { flex: 1; }
      .toolbar-meta {
        display: grid;
        gap: 4px;
      }
      .hint, .toolbar-status {
        grid-column: auto;
        text-align: left;
      }
      .hint { margin-top: 2px; }
      .commit-file {
        grid-template-columns: auto minmax(0, 1fr);
      }
      .file-lines {
        grid-column: 2;
        justify-content: flex-start;
      }
      .board {
        grid-template-columns: 1fr;
        overflow: visible;
      }
      .table-view {
        overflow: hidden;
      }
      .column { min-height: 0; }
      .meta-grid { grid-template-columns: 1fr; }
      .commit-panel-header,
      .commit-row-main {
        display: grid;
        justify-content: stretch;
      }
      .commit-panel-summary {
        justify-content: flex-start;
      }
      .detail {
        top: 8px;
        right: 8px;
        bottom: 8px;
        width: calc(100vw - 16px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 1ms !important;
        scroll-behavior: auto !important;
        transition-duration: 1ms !important;
      }

    }`;
