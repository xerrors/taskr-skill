export const vscodeBoardStyles = `    :root {
      color-scheme: light dark;
      --bg: var(--vscode-sideBar-background, #1f1f1f);
      --fg: var(--vscode-foreground, #cccccc);
      --muted: var(--vscode-descriptionForeground, #9d9d9d);
      --border: var(--vscode-sideBar-border, var(--vscode-widget-border, #3c3c3c));
      --input-bg: var(--vscode-input-background, #252526);
      --input-fg: var(--vscode-input-foreground, #cccccc);
      --input-border: var(--vscode-input-border, #3c3c3c);
      --panel-bg: var(--vscode-editorWidget-background, var(--vscode-sideBar-background, #252526));
      --menu-bg: var(--vscode-dropdown-background, var(--vscode-menu-background, var(--bg)));
      --menu-border: var(--vscode-dropdown-border, var(--border));
      --focus: var(--vscode-focusBorder, #007fd4);
      --hover: var(--vscode-list-hoverBackground, rgba(90, 93, 94, 0.31));
      --active: var(--vscode-list-activeSelectionBackground, #04395e);
      --active-fg: var(--vscode-list-activeSelectionForeground, #ffffff);
      --badge-bg: var(--vscode-badge-background, #4d4d4d);
      --badge-fg: var(--vscode-badge-foreground, #ffffff);
      --button-bg: var(--vscode-button-secondaryBackground, var(--vscode-button-background, #3a3d41));
      --button-fg: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground, #ffffff));
      --button-hover: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-hoverBackground, #45494e));
      --error: var(--vscode-errorForeground, #f48771);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, 400);
    }

    * { box-sizing: border-box; }

    html {
      padding: 0;
    }

    body {
      margin: 0;
      padding: 0;
      color: var(--fg);
      background: var(--bg);
      line-height: 1.4;
      overflow: hidden;
    }

    button,
    .vscode-search-field input {
      font: inherit;
    }

    button {
      color: inherit;
    }

    .taskr-vscode-view {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      height: 100vh;
      min-width: 0;
      background: var(--bg);
    }

    .vscode-toolbar-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-height: 24px;
      padding: 2px 8px;
      border: 1px solid transparent;
      border-radius: 2px;
      color: var(--button-fg);
      background: var(--button-bg);
      cursor: pointer;
    }

    .vscode-button-icon,
    .vscode-field-icon,
    .vscode-icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .vscode-icon {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .vscode-icon-button {
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid transparent;
      border-radius: 4px;
      color: var(--muted);
      background: transparent;
      cursor: pointer;
    }

    .vscode-icon-button:hover {
      color: var(--fg);
      background: var(--hover);
    }

    .vscode-toolbar-button:hover {
      background: var(--button-hover);
    }

    .vscode-toolbar-button:focus-visible,
    .vscode-icon-button:focus-visible,
    .vscode-menu-option:focus-visible,
    .vscode-sort-option:focus-visible,
    .vscode-search-field input:focus-visible,
    .vscode-group-title:focus-visible,
    .vscode-task-row:focus-visible {
      outline: 1px solid var(--focus);
      outline-offset: -1px;
    }

    .vscode-controls {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 6px;
      align-items: center;
      padding: 6px 20px;
      border-bottom: 1px solid var(--border);
    }

    .vscode-search-field {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr) auto;
      align-items: center;
      min-width: 0;
      min-height: 30px;
      color: var(--muted);
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 5px;
    }

    .vscode-search-field:focus-within {
      border-color: var(--focus);
      box-shadow: inset 0 0 0 1px var(--focus);
    }

    .vscode-field-icon {
      width: 22px;
      color: var(--muted);
      pointer-events: none;
    }

    .vscode-search-field input {
      min-width: 0;
      min-height: 28px;
      padding: 3px 2px;
      color: var(--input-fg);
      background: transparent;
      border: 0;
      border-radius: 4px;
    }

    .vscode-search-field input:focus-visible {
      outline: 0;
    }

    .vscode-clear-search {
      width: 24px;
      height: 24px;
      margin-right: 2px;
    }

    .vscode-sort-control {
      position: relative;
    }

    .vscode-sort-button {
      color: var(--fg);
      background: var(--input-bg);
      border-color: var(--input-border);
    }

    .vscode-sort-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      z-index: 30;
      min-width: 128px;
      padding: 4px;
      color: var(--fg);
      background: var(--menu-bg);
      border: 1px solid var(--menu-border);
      border-radius: 5px;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
    }

    .vscode-sort-menu[hidden],
    .vscode-detail-actions-menu[hidden],
    .vscode-clear-search[hidden] {
      display: none;
    }

    .vscode-menu-option,
    .vscode-sort-option {
      position: relative;
      width: 100%;
      min-height: 26px;
      padding: 4px 26px 4px 8px;
      border: 0;
      border-radius: 3px;
      color: inherit;
      background: transparent;
      font-size: 12px;
      text-align: left;
      cursor: pointer;
    }

    .vscode-menu-option {
      display: flex;
      align-items: center;
      gap: 7px;
      padding-right: 8px;
      white-space: nowrap;
    }

    .vscode-menu-option .vscode-icon {
      width: 13px;
      height: 13px;
    }

    .vscode-sort-option:hover,
    .vscode-menu-option:hover,
    .vscode-sort-option.is-selected {
      background: var(--hover);
    }

    .vscode-danger-option {
      color: var(--error);
    }

    .vscode-sort-option.is-selected::after {
      content: "";
      position: absolute;
      top: 50%;
      right: 9px;
      width: 5px;
      height: 9px;
      border-right: 1px solid currentColor;
      border-bottom: 1px solid currentColor;
      transform: translateY(-60%) rotate(45deg);
    }

    .vscode-status-line {
      min-height: 18px;
      padding: 2px 4px;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
      font-size: 11px;
    }

    .vscode-status-line:empty {
      display: none;
    }

    .vscode-status-line.is-error {
      color: var(--error);
    }

    .taskr-vscode-view > .vscode-task-list {
      min-height: 0;
      overflow: auto;
      padding: 0 0 6px;
    }

    .vscode-group {
      margin: 0;
      border-bottom: 1px solid var(--border);
    }

    .vscode-group-title {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 28px;
      padding: 0 4px;
      border: 0;
      color: var(--muted);
      background: var(--bg);
      font-size: 12px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }

    .vscode-group-title:hover {
      background: var(--hover);
    }

    .vscode-chevron {
      width: 12px;
      height: 14px;
      flex: 0 0 12px;
      position: relative;
    }

    .vscode-chevron::before {
      content: "";
      position: absolute;
      left: 2px;
      top: 3px;
      width: 5px;
      height: 5px;
      border-right: 1px solid currentColor;
      border-bottom: 1px solid currentColor;
      transform: rotate(45deg);
    }

    .vscode-group.is-collapsed .vscode-chevron::before {
      left: 2px;
      top: 4px;
      transform: rotate(-45deg);
    }

    .vscode-count {
      min-width: 0;
      margin-left: auto;
      margin-right: 12px;
      padding: 0;
      color: var(--muted);
      background: transparent;
      text-align: center;
      font-size: 11px;
      line-height: 18px;
    }

    .vscode-empty {
      padding: 5px 4px 7px 20px;
      color: var(--muted);
      font-size: 12px;
    }

    .vscode-task-row {
      position: relative;
      width: 100%;
      display: block;
      padding: 4px 20px;
      border: 0;
      color: var(--fg);
      background: transparent;
      text-align: left;
      cursor: pointer;
    }

    .vscode-task-row:hover {
      background: var(--hover);
    }

    .vscode-task-row.is-active {
      color: var(--active-fg);
      background: var(--active);
    }

    .vscode-task-main {
      min-width: 0;
    }

    .vscode-task-title {
      display: block;
      overflow: hidden;
      color: inherit;
      font-weight: 500;
      line-height: 18px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .vscode-task-request {
      display: -webkit-box;
      margin-top: 1px;
      color: var(--muted);
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      font-size: 12px;
      line-height: 17px;
    }

    .vscode-detail {
      position: fixed;
      inset: 0;
      display: grid;
      padding: 0;
      grid-template-rows: auto minmax(0, 1fr);
      color: var(--fg);
      background: var(--bg);
      transform: translateX(100%);
      transition: transform 140ms ease-out;
      z-index: 10;
    }

    .vscode-detail.is-open {
      transform: translateX(0);
    }

    .vscode-detail-header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      min-height: 40px;
      padding: 7px 8px;
      border-bottom: 1px solid var(--border);
      background: var(--vscode-sideBarSectionHeader-background, var(--bg));
    }

    .vscode-detail-actions {
      position: relative;
      flex: 0 0 auto;
    }

    .vscode-detail-actions-button {
      color: var(--fg);
    }

    .vscode-detail-actions-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      z-index: 30;
      min-width: 132px;
      padding: 4px;
      color: var(--fg);
      background: var(--menu-bg);
      border: 1px solid var(--menu-border);
      border-radius: 5px;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
    }

    .vscode-detail-scroll {
      min-height: 0;
      overflow: auto;
      padding: 0;
    }

    .vscode-detail-kicker {
      color: var(--muted);
      font-size: 11px;
      font-family: var(--vscode-editor-font-family);
      line-height: 1.35;
      word-break: break-all;
      padding: 8px 12px;
    }

    h2 {
      margin: 5px 0 12px;
      font-size: 15px;
      line-height: 1.35;
      font-weight: 600;
      padding: 0 12px;
    }

    .vscode-detail-meta {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 3px 8px;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      color: var(--muted);
      font-size: 11px;
      padding: 0 12px;
    }

    .vscode-meta-item {
      display: contents;
    }

    .vscode-meta-key {
      min-width: 0;
      color: var(--muted);
      line-height: 1.35;
    }

    .vscode-detail-meta code {
      color: var(--fg);
      font-family: var(--vscode-editor-font-family);
      font-size: 11px;
      word-break: break-all;
      white-space: normal;
    }

    .vscode-section {
      margin: 0;
      padding: 0;
      border-bottom: 1px solid var(--border);
    }

    .vscode-section summary {
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 28px;
      padding: 0 4px;
      cursor: pointer;
      font-size: 12px;
      line-height: 1.4;
      font-weight: 600;
      color: var(--muted);
      list-style: none;
      background: var(--bg);
    }

    .vscode-section summary::-webkit-details-marker {
      display: none;
    }

    .vscode-section:not([open]) .vscode-chevron::before {
      left: 2px;
      top: 4px;
      transform: rotate(-45deg);
    }

    .vscode-section summary:hover {
      background: var(--hover);
    }

    .vscode-section-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .vscode-markdown {
      color: var(--fg);
      font-size: 12px;
      line-height: 1.5;
      overflow-wrap: anywhere;
      padding: 2px 4px 10px 20px;
    }

    .vscode-markdown p,
    .vscode-markdown ul,
    .vscode-markdown ol {
      margin: 0 0 10px;
    }

    .vscode-markdown ul,
    .vscode-markdown ol {
      display: grid;
      gap: 8px;
      padding-left: 0px;
    }

    .vscode-markdown .task-list {
      display: grid;
      gap: 8px;
      padding: 0;
      list-style: none;
    }

    .vscode-markdown .task-list-item {
      display: grid;
      grid-template-columns: 14px minmax(0, 1fr);
      gap: 5px;
      align-items: start;
    }

    .vscode-markdown .task-list-item input {
      width: 12px;
      height: 12px;
      margin: 1px 0 0;
    }

    .vscode-markdown h1,
    .vscode-markdown h2,
    .vscode-markdown h3 {
      margin: 8px 0 6px;
      font-size: 13px;
      text-transform: none;
      color: var(--fg);
    }

    .vscode-markdown code {
      font-family: var(--vscode-editor-font-family);
      background: var(--vscode-textCodeBlock-background);
      padding: 1px 3px;
      border-radius: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      .vscode-detail {
        transition: none;
      }
    }
`;
