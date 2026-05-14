export const boardClientScript = `    let model = window.__TASKR_BOARD__;
    const board = document.querySelector("#board");
    const tableView = document.querySelector("#tableView");
    const detail = document.querySelector("#detail");
    const backdrop = document.querySelector("#backdrop");
    const closeButton = document.querySelector("#close");
    const search = document.querySelector("#search");
    const refreshButton = document.querySelector("#refresh");
    const tableViewButton = document.querySelector("#tableViewButton");
    const boardViewButton = document.querySelector("#boardViewButton");
    const languageToggle = document.querySelector("#languageToggle");
    const sortSelect = document.querySelector("#sortSelect");
    const toolbarStatus = document.querySelector("#toolbarStatus");
    const masthead = document.querySelector(".masthead");
    const languageStorageKey = "taskr-board-language";
    const autoRefreshIntervalMs = 5000;
    let modelSignature = boardModelSignature(model);
    let activeId = null;
    let currentView = "table";
    let sortBy = "updatedAt";
    let language = preferredLanguage();
    let statusTimer = null;
    let autoRefreshTimer = null;
    let refreshInFlight = false;
    let pendingManualRefresh = false;
    let latestRefreshFailed = false;
    let headerCompact = false;
    let headerFrame = null;

    const copy = {
      en: {
        appTitle: "Taskr Board",
        eyebrow: "Repo-local task memory",
        statsAria: "Task statistics",
        stats: {
          total: "Total",
          active: "Active",
          done: "Done"
        },
        search: {
          aria: "Filter tasks",
          placeholder: "Filter by title, id, request, or commit..."
        },
        refresh: {
          label: "Refresh",
          aria: "Refresh tasks"
        },
        sort: {
          label: "Sort",
          aria: "Sort tasks",
          created: "Created",
          updated: "Updated"
        },
        view: {
          aria: "Board view",
          table: "Table",
          board: "Board"
        },
        languageToggle: {
          label: "🇨🇳 ZH",
          aria: "Switch language to Chinese"
        },
        hint: "Click any task to open its detail.",
        tableAria: "Taskr task table",
        boardAria: "Taskr Kanban board",
        closeDetail: "Close task detail",
        detailKicker: "Task detail",
        selectTask: "Select a task",
        deletedTask: "This task no longer exists.",
        noTasks: "No tasks",
        noCards: "No cards",
        noRequest: "No request recorded.",
        unknown: "Unknown",
        none: "None",
        empty: "Empty.",
        commitUnknown: "commit unknown",
        originalStatus: "was",
        linesAdded: "+{count}",
        linesDeleted: "-{count}",
        filesChanged: {
          one: "1 changed file",
          many: "{count} changed files"
        },
        commitStatuses: {
          created: "Created",
          not_created: "Not created",
          not_applicable: "Not applicable"
        },
        tableHeaders: ["Task", "Status", "Criteria", "Updated", "Commit"],
        statuses: {
          planned: "Planned",
          in_progress: "In Progress",
          pending_confirmation: "Pending Confirmation",
          implemented: "Implemented",
          blocked: "Blocked"
        },
        meta: {
          status: "Status",
          updated: "Updated",
          commitStatus: "Commit status",
          path: "Path",
          branch: "Branch",
          criteria: "Criteria",
          commits: "Commits",
          commitId: "Commit ID",
          diff: "Diff",
          unavailable: "Unavailable"
        },
        sections: {
          "Request": "Request",
          "Acceptance Criteria": "Acceptance Criteria",
          "Implementation Plan": "Implementation Plan",
          "Progress Log": "Progress Log",
          "Agent Notes": "Agent Notes",
          "Completion Summary": "Completion Summary",
          "Unparsed Content": "Additional content"
        },
        actions: {
          edit: "Edit",
          cancel: "Cancel",
          save: "Save",
          delete: "Delete",
          confirmDelete: "Delete task",
          keepTask: "Keep task"
        },
        statusEditor: {
          label: "Change status",
          help: "Manual status changes are available while this task is pending confirmation."
        },
        danger: {
          title: "Danger zone",
          copy: "Deleting this task removes the local Markdown file.",
          confirmTitle: "Delete this task?",
          warning: "This will permanently delete {path}.",
          task: "Task",
          id: "ID",
          path: "Path"
        },
        statusMessages: {
          refreshing: "Refreshing...",
          refreshed: "Refreshed",
          refreshFailed: "Refresh failed",
          saving: "Saving...",
          saved: "Saved",
          saveFailed: "Save failed",
          deleting: "Deleting...",
          deleted: "Deleted",
          deleteFailed: "Delete failed"
        },
        contentAria: "{section} content"
      },
      zh: {
        appTitle: "Taskr 看板",
        eyebrow: "仓库本地任务记忆",
        statsAria: "任务统计",
        stats: {
          total: "全部",
          active: "进行中",
          done: "已完成"
        },
        search: {
          aria: "筛选任务",
          placeholder: "按标题、ID、需求或文件筛选..."
        },
        refresh: {
          label: "刷新",
          aria: "刷新任务"
        },
        sort: {
          label: "排序",
          aria: "任务排序",
          created: "创建时间",
          updated: "更新时间"
        },
        view: {
          aria: "看板视图",
          table: "表格",
          board: "看板"
        },
        languageToggle: {
          label: "🌐 EN",
          aria: "切换到英文"
        },
        hint: "点击任意任务查看详情。",
        tableAria: "Taskr 任务表格",
        boardAria: "Taskr 看板",
        closeDetail: "关闭任务详情",
        detailKicker: "任务详情",
        selectTask: "选择一个任务",
        deletedTask: "这个任务已不存在。",
        noTasks: "暂无任务",
        noCards: "暂无卡片",
        noRequest: "没有记录需求。",
        unknown: "未知",
        none: "无",
        empty: "空。",
        commitUnknown: "commit 未知",
        originalStatus: "原为",
        linesAdded: "+{count}",
        linesDeleted: "-{count}",
        filesChanged: {
          one: "1 个变更文件",
          many: "{count} 个变更文件"
        },
        commitStatuses: {
          created: "Created",
          not_created: "Not created",
          not_applicable: "Not applicable"
        },
        tableHeaders: ["任务", "状态", "验收项", "更新于", "提交"],
        statuses: {
          planned: "已规划",
          in_progress: "进行中",
          pending_confirmation: "待确认",
          implemented: "已实现",
          blocked: "受阻"
        },
        meta: {
          status: "状态",
          updated: "更新于",
          commitStatus: "提交状态",
          path: "路径",
          branch: "分支",
          criteria: "验收项",
          commits: "提交",
          commitId: "提交 ID",
          diff: "增删行",
          unavailable: "不可用"
        },
        sections: {
          "Request": "需求",
          "Acceptance Criteria": "验收标准",
          "Implementation Plan": "实现计划",
          "Progress Log": "进度日志",
          "Agent Notes": "代理备注",
          "Completion Summary": "完成总结",
          "Unparsed Content": "其他内容"
        },
        actions: {
          edit: "编辑",
          cancel: "取消",
          save: "保存",
          delete: "删除",
          confirmDelete: "确认删除",
          keepTask: "保留任务"
        },
        statusEditor: {
          label: "手动修改状态",
          help: "待确认任务可以由人工修改为任意状态。"
        },
        danger: {
          title: "危险操作",
          copy: "删除任务会移除本地 Markdown 文件。",
          confirmTitle: "删除这个任务？",
          warning: "这会永久删除 {path}。",
          task: "任务",
          id: "ID",
          path: "路径"
        },
        statusMessages: {
          refreshing: "正在刷新...",
          refreshed: "已刷新",
          refreshFailed: "刷新失败",
          saving: "正在保存...",
          saved: "已保存",
          saveFailed: "保存失败",
          deleting: "正在删除...",
          deleted: "已删除",
          deleteFailed: "删除失败"
        },
        contentAria: "{section}内容"
      }
    };

    function preferredLanguage() {
      try {
        const saved = localStorage.getItem(languageStorageKey);
        if (saved === "en" || saved === "zh") return saved;
      } catch {
        // Ignore storage failures; browser language is still a sensible default.
      }
      return navigator.language && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
    }

    function currentCopy() {
      return copy[language] || copy.en;
    }

    function t(path) {
      const parts = path.split(".");
      let value = currentCopy();
      let fallback = copy.en;
      for (const part of parts) {
        value = value && value[part];
        fallback = fallback && fallback[part];
      }
      return typeof value === "string" ? value : typeof fallback === "string" ? fallback : path;
    }

    function translateRecord(path, key, fallback = key) {
      const localized = currentCopy()[path] || {};
      const english = copy.en[path] || {};
      return localized[key] || english[key] || fallback;
    }

    function statusLabel(status) {
      return translateRecord("statuses", status, status);
    }

    function commitStatusLabel(status) {
      return translateRecord("commitStatuses", status, status || t("unknown"));
    }

    function sectionLabel(sectionName) {
      return translateRecord("sections", sectionName, sectionName);
    }

    function formatChangedFileCount(count) {
      if (count === 1) return t("filesChanged.one");
      return t("filesChanged.many").replace("{count}", String(count));
    }

    function applyLanguage() {
      document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
      document.title = t("appTitle");
      document.querySelector("#eyebrow").textContent = t("eyebrow");
      document.querySelector("#title").textContent = t("appTitle");
      document.querySelector(".stats").setAttribute("aria-label", t("statsAria"));
      document.querySelector("#totalTasksLabel").textContent = t("stats.total");
      document.querySelector("#activeTasksLabel").textContent = t("stats.active");
      document.querySelector("#implementedTasksLabel").textContent = t("stats.done");
      search.setAttribute("aria-label", t("search.aria"));
      search.placeholder = t("search.placeholder");
      refreshButton.textContent = t("refresh.label");
      refreshButton.setAttribute("aria-label", t("refresh.aria"));
      refreshButton.title = t("refresh.aria");
      document.querySelector("#sortLabel").textContent = t("sort.label");
      sortSelect.setAttribute("aria-label", t("sort.aria"));
      sortSelect.title = t("sort.aria");
      sortSelect.options[0].textContent = t("sort.updated");
      sortSelect.options[1].textContent = t("sort.created");
      document.querySelector(".view-toggle").setAttribute("aria-label", t("view.aria"));
      tableViewButton.textContent = t("view.table");
      boardViewButton.textContent = t("view.board");
      languageToggle.textContent = t("languageToggle.label");
      languageToggle.setAttribute("aria-label", t("languageToggle.aria"));
      languageToggle.title = t("languageToggle.aria");
      document.querySelector("#hint").textContent = t("hint");
      tableView.setAttribute("aria-label", t("tableAria"));
      board.setAttribute("aria-label", t("boardAria"));
      closeButton.setAttribute("aria-label", t("closeDetail"));
      if (!activeId) {
        document.querySelector("#detailKicker").textContent = t("detailKicker");
        document.querySelector("#detailTitle").textContent = t("selectTask");
        document.querySelector("#detailBasics").replaceChildren();
      }
    }

    function setLanguage(nextLanguage) {
      language = nextLanguage;
      try {
        localStorage.setItem(languageStorageKey, language);
      } catch {
        // The board still works without persistent storage.
      }
      applyLanguage();
      render();
      syncDetail();
    }

    function updateStats() {
      document.querySelector("#repo").textContent = model.repoRoot;
      document.querySelector("#totalTasks").textContent = model.tasks.length;
      document.querySelector("#activeTasks").textContent = model.tasks.filter((task) => ["planned", "in_progress", "pending_confirmation", "blocked"].includes(task.status)).length;
      document.querySelector("#implementedTasks").textContent = model.tasks.filter((task) => task.status === "implemented").length;
    }

    function render() {
      const query = search.value.trim().toLowerCase();
      const tasks = sortTasks(model.tasks.filter((task) => matches(task, query)));
      renderBoard(tasks);
      renderTable(tasks);
      syncView();
    }

    function sortTasks(tasks) {
      return [...tasks].sort((left, right) => {
        const field = sortBy === "createdAt" ? "createdAt" : "updatedAt";
        const compared = compareTimestamp(right[field], left[field]);
        if (compared !== 0) return compared;
        return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
      });
    }

    function compareTimestamp(left, right) {
      const leftTime = timestampValue(left);
      const rightTime = timestampValue(right);
      if (leftTime !== rightTime) return leftTime - rightTime;
      return String(left || "").localeCompare(String(right || ""));
    }

    function timestampValue(value) {
      const normalized = String(value || "").replace(/([+-]\\d{2})(\\d{2})$/, "$1:$2");
      const time = Date.parse(normalized);
      return Number.isNaN(time) ? 0 : time;
    }

    function renderBoard(tasks) {
      board.replaceChildren(
        ...boardColumns().map((group) =>
          column(group, tasks.filter((task) => group.statuses.includes(task.status)))
        )
      );
    }

    function renderTable(tasks) {
      if (tasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty table-empty";
        empty.textContent = t("noTasks");
        tableView.replaceChildren(empty);
        return;
      }

      const scroll = document.createElement("div");
      scroll.className = "table-scroll";
      const table = document.createElement("table");
      table.className = "task-table";

      const head = document.createElement("thead");
      const headRow = document.createElement("tr");
      for (const label of currentCopy().tableHeaders) {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = label;
        headRow.append(cell);
      }
      head.append(headRow);

      const body = document.createElement("tbody");
      body.append(...tasks.map(tableRow));
      table.append(head, body);
      scroll.append(table);
      tableView.replaceChildren(scroll);
    }

    function tableRow(task) {
      const row = document.createElement("tr");
      row.className = "task-row" + (task.id === activeId ? " is-active" : "");
      row.tabIndex = 0;
      row.addEventListener("click", () => openDetail(task));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail(task);
        }
      });

      const title = document.createElement("td");
      title.className = "task-title-cell";
      const titleMain = document.createElement("span");
      titleMain.className = "task-title-main";
      titleMain.textContent = task.title;
      const titleSub = document.createElement("span");
      titleSub.className = "task-title-sub";
      titleSub.textContent = task.id;
      title.append(titleMain, titleSub);

      const status = document.createElement("td");
      status.append(statusChip(task.status));

      const criteria = document.createElement("td");
      criteria.append(criteriaPill(task));

      const updated = document.createElement("td");
      updated.textContent = formatTimestamp(task.updatedAt);

      const commit = document.createElement("td");
      commit.textContent = commitSummary(task);

      row.append(title, status, criteria, updated, commit);
      return row;
    }

    function statusChip(status) {
      const element = document.createElement("span");
      element.className = "status-chip";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.setAttribute("aria-hidden", "true");
      element.dataset.status = status;
      element.append(dot, document.createTextNode(statusLabel(status)));
      return element;
    }

    function syncView() {
      const showingTable = currentView === "table";
      tableView.classList.toggle("is-hidden", !showingTable);
      board.classList.toggle("is-hidden", showingTable);
      tableViewButton.setAttribute("aria-pressed", String(showingTable));
      boardViewButton.setAttribute("aria-pressed", String(!showingTable));
    }

    function setView(view) {
      currentView = view;
      syncView();
    }

    function boardColumns() {
      return [
        { id: "planned", statuses: ["planned"] },
        { id: "in_progress", statuses: ["in_progress", "pending_confirmation"] },
        { id: "implemented", statuses: ["implemented"] },
        { id: "blocked", statuses: ["blocked"] }
      ];
    }

    function column(group, tasks) {
      const element = document.createElement("article");
      element.className = "column";
      element.dataset.status = group.id;

      const header = document.createElement("div");
      header.className = "column-header";

      const title = document.createElement("h2");
      title.className = "column-title";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = group.statuses.map((status) => statusLabel(status)).join(" / ");
      title.append(dot, label);

      const count = document.createElement("span");
      count.className = "count";
      count.textContent = String(tasks.length);
      header.append(title, count);

      const cards = document.createElement("div");
      cards.className = "cards";
      if (tasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = t("noCards");
        cards.append(empty);
      } else {
        cards.append(...tasks.map(card));
      }

      element.append(header, cards);
      return element;
    }

    function card(task) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "card" + (task.id === activeId ? " is-active" : "");
      if (task.status === "implemented") {
        button.className += " card-compact";
      }
      button.addEventListener("click", () => openDetail(task));

      const id = document.createElement("div");
      id.className = "card-id";
      id.textContent = task.id;

      const title = document.createElement("h3");
      title.className = "card-title";
      title.textContent = task.title;

      if (task.status === "implemented") {
        button.setAttribute("aria-label", task.title + " · " + statusLabel(task.status));
        const meta = document.createElement("div");
        meta.className = "compact-meta";
        const compactId = document.createElement("span");
        compactId.className = "compact-id";
        compactId.textContent = task.id;
        meta.append(compactId, criteriaPill(task));
        button.append(title, meta);
        return button;
      }

      const request = document.createElement("div");
      request.className = "card-request";
      request.textContent = task.sections.Request || t("noRequest");

      const footer = document.createElement("div");
      footer.className = "card-footer";
      if (task.status === "pending_confirmation") {
        footer.append(statusPill(task.status));
      }
      footer.append(
        criteriaPill(task),
        pill(commitSummary(task))
      );

      button.append(id, title, request, footer);
      return button;
    }

    function openDetail(task, options = {}) {
      activeId = task.id;
      render();
      updateDetail(task);
      detail.classList.add("is-open");
      detail.setAttribute("aria-hidden", "false");
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add("is-open"));
      if (options.focusClose !== false) {
        closeButton.focus({ preventScroll: true });
      }
    }

    function updateDetail(task) {
      const status = statusLabel(task.status);
      const original = task.originalStatus && task.originalStatus !== task.status ? " · " + t("originalStatus") + " " + task.originalStatus : "";
      document.querySelector("#detailKicker").textContent = task.id + " · " + status + original;
      document.querySelector("#detailTitle").textContent = task.title;
      document.querySelector("#detailBasics").replaceChildren(
        detailBasic(t("meta.path"), task.path),
        detailBasic(t("meta.updated"), formatTimestamp(task.updatedAt))
      );
      document.querySelector("#detailBody").replaceChildren(detailContent(task));
    }

    function closeDetail() {
      activeId = null;
      detail.classList.remove("is-open");
      detail.setAttribute("aria-hidden", "true");
      backdrop.classList.remove("is-open");
      setTimeout(() => { backdrop.hidden = true; }, 180);
      render();
    }

    function detailContent(task) {
      const fragment = document.createDocumentFragment();
      const meta = document.createElement("div");
      meta.className = "meta-grid";
      meta.append(
        statusMeta(task),
        progressMeta(task)
      );
      fragment.append(meta);
      if (task.commitDetails.length > 0) {
        fragment.append(commitPanel(task));
      }

      for (const name of coreSectionNames()) {
        if (Object.prototype.hasOwnProperty.call(task.sections || {}, name)) {
          fragment.append(section(name, task.sections[name] || t("empty")));
        }
      }
      if (task.unsectionedBody && task.unsectionedBody.trim()) {
        fragment.append(section("Unparsed Content", task.unsectionedBody));
      }
      fragment.append(dangerZone(task));
      return fragment;
    }

    function coreSectionNames() {
      return ["Request", "Acceptance Criteria", "Implementation Plan", "Progress Log", "Agent Notes", "Completion Summary"];
    }

    function dangerZone(task) {
      const wrapper = document.createElement("section");
      wrapper.className = "danger-zone";

      const head = document.createElement("div");
      head.className = "danger-zone-head";
      const text = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = t("danger.title");
      const copy = document.createElement("p");
      copy.textContent = t("danger.copy");
      text.append(title, copy);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "danger-button";
      deleteButton.textContent = t("actions.delete");

      head.append(text, deleteButton);

      const confirm = document.createElement("div");
      confirm.className = "danger-confirm";
      confirm.hidden = true;
      const confirmTitle = document.createElement("h4");
      confirmTitle.textContent = t("danger.confirmTitle");
      const warning = document.createElement("p");
      warning.textContent = t("danger.warning").replace("{path}", task.path);
      const facts = document.createElement("dl");
      facts.className = "danger-facts";
      facts.append(
        fact(t("danger.task"), task.title),
        fact(t("danger.id"), task.id),
        fact(t("danger.path"), task.path)
      );
      const status = document.createElement("div");
      status.className = "danger-status";
      const actions = document.createElement("div");
      actions.className = "danger-actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "section-action";
      cancel.textContent = t("actions.keepTask");
      const confirmDelete = document.createElement("button");
      confirmDelete.type = "button";
      confirmDelete.className = "danger-button danger-button-solid";
      confirmDelete.textContent = t("actions.confirmDelete");
      actions.append(cancel, confirmDelete);
      confirm.append(confirmTitle, warning, facts, status, actions);

      deleteButton.addEventListener("click", () => {
        confirm.hidden = false;
        confirmDelete.focus({ preventScroll: true });
      });
      cancel.addEventListener("click", () => {
        status.textContent = "";
        confirm.hidden = true;
        deleteButton.focus({ preventScroll: true });
      });
      confirmDelete.addEventListener("click", () => deleteTaskFromDetail(task, status, confirmDelete, cancel));

      wrapper.append(head, confirm);
      return wrapper;
    }

    function fact(label, value) {
      const fragment = document.createDocumentFragment();
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      fragment.append(term, description);
      return fragment;
    }

    function commitPanel(task) {
      const wrapper = document.createElement("section");
      wrapper.className = "commit-panel";

      const head = document.createElement("div");
      head.className = "commit-panel-header";
      const heading = document.createElement("h3");
      heading.className = "commit-panel-title";
      heading.textContent = t("meta.commits");
      const summary = document.createElement("div");
      summary.className = "commit-panel-summary";
      summary.append(
        pill(t("meta.commitStatus") + ": " + commitStatusLabel(task.commitStatus)),
        pill(t("meta.branch") + ": " + (task.branch || t("none")))
      );
      head.append(heading, summary);

      const list = document.createElement("div");
      list.className = "commit-list";
      list.append(...task.commitDetails.map(commitRow));

      wrapper.append(head, list);
      return wrapper;
    }

    function commitRow(commit) {
      const row = document.createElement("div");
      row.className = "commit-row";

      const main = document.createElement("div");
      main.className = "commit-row-main";
      const id = document.createElement("div");
      id.className = "commit-id";
      id.textContent = commit.shortHash || commit.hash;
      id.title = commit.hash;
      const stats = document.createElement("div");
      stats.className = "commit-stats";
      stats.append(...commitStatPills(commit));
      main.append(id, stats);
      row.append(main);

      if (commit.subject) {
        const subject = document.createElement("div");
        subject.className = "commit-subject";
        subject.textContent = commit.subject;
        row.append(subject);
      }

      if (commit.files && commit.files.length > 0) {
        row.append(commitFileList(commit.files));
      }

      if (commit.error) {
        const error = document.createElement("div");
        error.className = "commit-subject";
        error.textContent = t("meta.unavailable");
        row.append(error);
      }

      return row;
    }

    function commitFileList(files) {
      const list = document.createElement("div");
      list.className = "commit-files";
      for (const file of files) {
        const item = document.createElement("div");
        item.className = "commit-file";

        const status = document.createElement("span");
        status.className = "file-status";
        status.dataset.status = file.status;
        status.textContent = file.status;
        status.title = fileStatusTitle(file.status);

        const path = document.createElement("div");
        path.className = "file-path";
        path.textContent = file.path;

        const lines = document.createElement("div");
        lines.className = "file-lines";
        const added = pill(t("linesAdded").replace("{count}", String(file.additions)));
        added.classList.add("diff-add");
        const deleted = pill(t("linesDeleted").replace("{count}", String(file.deletions)));
        deleted.classList.add("diff-delete");
        lines.append(added, deleted);

        item.append(status, path, lines);
        list.append(item);
      }
      return list;
    }

    function fileStatusTitle(status) {
      if (status === "U") return "U · Added";
      if (status === "D") return "D · Deleted";
      return "M · Modified";
    }

    function commitStatPills(commit) {
      if (commit.additions === null || commit.deletions === null || commit.filesChanged === null) {
        return [pill(t("meta.diff") + ": " + t("meta.unavailable"))];
      }

      const added = pill(t("linesAdded").replace("{count}", String(commit.additions)));
      added.classList.add("diff-add");
      const deleted = pill(t("linesDeleted").replace("{count}", String(commit.deletions)));
      deleted.classList.add("diff-delete");
      return [added, deleted, pill(formatChangedFileCount(commit.filesChanged))];
    }

    function section(title, content) {
      const wrapper = document.createElement("section");
      wrapper.className = "section";
      wrapper.dataset.section = title;

      const head = document.createElement("div");
      head.className = "section-head";
      const heading = document.createElement("h3");
      heading.textContent = sectionLabel(title);
      const tools = document.createElement("div");
      tools.className = "section-tools";
      const status = document.createElement("span");
      status.className = "section-status";
      const body = document.createElement("div");
      body.className = "section-body";

      function readMode(value) {
        status.textContent = "";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "section-action";
        edit.textContent = t("actions.edit");
        edit.addEventListener("click", () => editMode(value));
        tools.replaceChildren(status, edit);

        const content = document.createElement("div");
        content.className = "markdown-content";
        content.innerHTML = window.renderTaskrMarkdown(value);
        body.replaceChildren(content);
      }

      function editMode(value) {
        status.textContent = "";
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("aria-label", t("contentAria").replace("{section}", sectionLabel(title)));

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "section-action";
        cancel.textContent = t("actions.cancel");
        cancel.addEventListener("click", () => readMode(value));

        const save = document.createElement("button");
        save.type = "button";
        save.className = "section-action";
        save.textContent = t("actions.save");
        save.addEventListener("click", () => saveSection(title, textarea.value, status, save));

        tools.replaceChildren(status, cancel, save);
        body.replaceChildren(textarea);
        textarea.focus({ preventScroll: true });
      }

      head.append(heading, tools);
      wrapper.append(head, body);
      readMode(content);
      return wrapper;
    }

    function statusMeta(task) {
      const item = document.createElement("div");
      item.className = "meta status-meta";
      const key = document.createElement("span");
      key.textContent = t("meta.status");
      const body = document.createElement("div");
      body.className = "status-editor-wrap";
      body.append(statusChip(task.status));

      if (task.status === "pending_confirmation") {
        const controls = document.createElement("div");
        controls.className = "status-editor";
        const select = document.createElement("select");
        select.setAttribute("aria-label", t("statusEditor.label"));
        for (const status of model.statuses) {
          const option = document.createElement("option");
          option.value = status;
          option.textContent = statusLabel(status);
          option.selected = status === task.status;
          select.append(option);
        }
        const save = document.createElement("button");
        save.type = "button";
        save.className = "section-action";
        save.textContent = t("actions.save");
        const message = document.createElement("div");
        message.className = "status-editor-message";
        message.textContent = t("statusEditor.help");
        save.addEventListener("click", () => saveStatus(task.id, select.value, message, save));
        controls.append(select, save);
        body.append(controls, message);
      }

      item.append(key, body);
      return item;
    }

    function metaItem(label, value) {
      const item = document.createElement("div");
      item.className = "meta";
      const key = document.createElement("span");
      key.textContent = label;
      const body = document.createElement("div");
      body.textContent = String(value);
      item.append(key, body);
      return item;
    }

    function detailBasic(label, value) {
      const item = document.createElement("div");
      item.className = "detail-basic";
      const key = document.createElement("span");
      key.textContent = label;
      const body = document.createElement("code");
      body.textContent = String(value);
      item.append(key, body);
      return item;
    }

    function progressMeta(task) {
      const item = document.createElement("div");
      item.className = "meta";
      const key = document.createElement("span");
      key.textContent = t("meta.criteria");
      const total = task.criteria.total;
      const checked = task.criteria.checked;
      const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

      const row = document.createElement("div");
      row.className = "progress-row";
      const label = document.createElement("div");
      label.className = "progress-label";
      label.textContent = total > 0 ? checked + "/" + total : "0/0";

      const track = document.createElement("div");
      track.className = "progress-track";
      track.setAttribute("role", "progressbar");
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", String(total));
      track.setAttribute("aria-valuenow", String(checked));
      const fill = document.createElement("span");
      fill.className = "progress-fill";
      fill.style.width = percent + "%";
      track.append(fill);

      const value = document.createElement("div");
      value.className = "progress-percent";
      value.textContent = total > 0 ? percent + "%" : "0%";
      row.append(label, track, value);
      item.append(key, row);
      return item;
    }

    function pill(value) {
      const element = document.createElement("span");
      element.className = "pill";
      element.textContent = value;
      return element;
    }

    function statusPill(status) {
      const element = pill(statusLabel(status));
      element.className += " status-pill";
      element.dataset.status = status;
      return element;
    }

    function criteriaPill(task) {
      const element = document.createElement("span");
      element.className = "pill mini-progress";
      const text = document.createElement("span");
      text.textContent = task.criteria.checked + "/" + task.criteria.total;
      const bar = document.createElement("span");
      bar.className = "mini-progress-bar";
      const fill = document.createElement("span");
      const percent = task.criteria.total > 0 ? Math.round((task.criteria.checked / task.criteria.total) * 100) : 0;
      fill.style.width = percent + "%";
      bar.append(fill);
      element.append(text, bar);
      return element;
    }

    function commitSummary(task) {
      const status = commitStatusLabel(task.commitStatus);
      if (!task.commits.length) return status || t("commitUnknown");
      return status + " · " + task.commits[0].slice(0, 7);
    }

    function formatTimestamp(value) {
      if (!value) return t("unknown");
      const normalized = String(value).replace(/([+-]\\d{2})(\\d{2})$/, "$1:$2");
      const date = new Date(normalized);
      if (Number.isNaN(date.getTime())) return String(value);
      const parts = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZoneName: "short"
      }).formatToParts(date).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
      }, {});
      return parts.year + "-" + parts.month + "-" + parts.day + " " + parts.hour + ":" + parts.minute + " " + parts.timeZoneName;
    }

    function matches(task, query) {
      if (!query) return true;
      return [
        task.id,
        task.title,
        task.path,
        task.sections.Request,
        task.commits.join(" ")
      ].join(" ").toLowerCase().includes(query);
    }

    function findTask(id) {
      return model.tasks.find((task) => task.id === id) || null;
    }

    async function loadTasks(options = {}) {
      const source = options.source === "auto" ? "auto" : "manual";
      const isManual = source === "manual";

      if (refreshInFlight) {
        if (isManual) {
          pendingManualRefresh = true;
          refreshButton.disabled = true;
          setToolbarStatus(t("statusMessages.refreshing"));
        }
        return;
      }

      refreshInFlight = true;
      if (isManual) {
        refreshButton.disabled = true;
        setToolbarStatus(t("statusMessages.refreshing"));
      }
      try {
        const response = await fetch("/api/tasks", { headers: { accept: "application/json" } });
        const data = await parseJson(response);
        if (!response.ok) {
          throw new Error(data && data.error ? data.error : t("statusMessages.refreshFailed"));
        }
        applyBoardModel(data);
        if (isManual) {
          setToolbarStatus(t("statusMessages.refreshed"));
        } else if (latestRefreshFailed) {
          setToolbarStatus("");
        }
        latestRefreshFailed = false;
      } catch (error) {
        latestRefreshFailed = true;
        setToolbarStatus(t("statusMessages.refreshFailed") + ": " + errorMessage(error), true);
      } finally {
        refreshInFlight = false;
        if (!pendingManualRefresh) {
          refreshButton.disabled = false;
        }
        if (pendingManualRefresh) {
          pendingManualRefresh = false;
          void loadTasks({ source: "manual" });
        }
      }
    }

    function shouldAutoRefresh() {
      if (document.hidden || detail.querySelector("textarea")) return false;
      const activeElement = document.activeElement;
      return !(
        activeElement &&
        detail.contains(activeElement) &&
        activeElement.matches("select, input:not([type='checkbox'])")
      );
    }

    function startAutoRefresh() {
      if (autoRefreshTimer !== null) return;
      autoRefreshTimer = setInterval(() => {
        if (shouldAutoRefresh()) {
          void loadTasks({ source: "auto" });
        }
      }, autoRefreshIntervalMs);
    }

    function boardModelSignature(value) {
      try {
        return JSON.stringify({
          repoRoot: value.repoRoot,
          statuses: value.statuses,
          tasks: value.tasks
        });
      } catch {
        return "";
      }
    }

    function applyBoardModel(data, options = {}) {
      const nextSignature = boardModelSignature(data);
      const changed = options.force === true || nextSignature !== modelSignature;
      model = data;
      modelSignature = nextSignature;
      if (changed) {
        updateStats();
        render();
        syncDetail();
      }
      return changed;
    }

    async function saveStatus(id, status, statusNode, saveButton) {
      saveButton.disabled = true;
      statusNode.textContent = t("statusMessages.saving");
      try {
        const response = await fetch("/api/tasks/" + encodeURIComponent(id) + "/status", {
          method: "PUT",
          headers: {
            accept: "application/json",
            "content-type": "application/json"
          },
          body: JSON.stringify({ status })
        });
        const data = await parseJson(response);
        if (!response.ok) {
          throw new Error(data && data.error ? data.error : t("statusMessages.saveFailed"));
        }
        applyBoardModel(data, { force: true });
        setToolbarStatus(t("statusMessages.saved"));
      } catch (error) {
        statusNode.textContent = t("statusMessages.saveFailed") + ": " + errorMessage(error);
        setToolbarStatus(t("statusMessages.saveFailed") + ": " + errorMessage(error), true);
      } finally {
        saveButton.disabled = false;
      }
    }

    async function saveSection(sectionTitle, content, statusNode, saveButton) {
      if (!activeId) return;
      saveButton.disabled = true;
      statusNode.textContent = t("statusMessages.saving");
      try {
        const response = await fetch("/api/tasks/" + encodeURIComponent(activeId) + "/sections/" + encodeURIComponent(sectionTitle), {
          method: "PUT",
          headers: {
            accept: "application/json",
            "content-type": "application/json"
          },
          body: JSON.stringify({ content })
        });
        const data = await parseJson(response);
        if (!response.ok) {
          throw new Error(data && data.error ? data.error : t("statusMessages.saveFailed"));
        }
        applyBoardModel(data, { force: true });
        setToolbarStatus(t("statusMessages.saved"));
      } catch (error) {
        statusNode.textContent = t("statusMessages.saveFailed");
        setToolbarStatus(t("statusMessages.saveFailed") + ": " + errorMessage(error), true);
      } finally {
        saveButton.disabled = false;
      }
    }

    async function deleteTaskFromDetail(task, statusNode, confirmButton, cancelButton) {
      confirmButton.disabled = true;
      cancelButton.disabled = true;
      statusNode.textContent = t("statusMessages.deleting");
      try {
        const response = await fetch("/api/tasks/" + encodeURIComponent(task.id), {
          method: "DELETE",
          headers: { accept: "application/json" }
        });
        const data = await parseJson(response);
        if (!response.ok) {
          throw new Error(data && data.error ? data.error : t("statusMessages.deleteFailed"));
        }
        model = data;
        modelSignature = boardModelSignature(data);
        updateStats();
        setToolbarStatus(t("statusMessages.deleted"));
        closeDetail();
      } catch (error) {
        statusNode.textContent = t("statusMessages.deleteFailed") + ": " + errorMessage(error);
        setToolbarStatus(t("statusMessages.deleteFailed") + ": " + errorMessage(error), true);
      } finally {
        confirmButton.disabled = false;
        cancelButton.disabled = false;
      }
    }

    async function parseJson(response) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    function syncDetail() {
      if (!activeId || !detail.classList.contains("is-open")) return;
      const task = findTask(activeId);
      if (task) {
        updateDetail(task);
        return;
      }
      document.querySelector("#detailKicker").textContent = t("detailKicker");
      document.querySelector("#detailTitle").textContent = t("selectTask");
      document.querySelector("#detailBasics").replaceChildren();
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = t("deletedTask");
      document.querySelector("#detailBody").replaceChildren(empty);
      activeId = null;
      render();
    }

    function closeDeleteConfirm() {
      const confirm = detail.querySelector(".danger-confirm:not([hidden])");
      if (!confirm) return false;
      confirm.hidden = true;
      return true;
    }

    function setToolbarStatus(message, sticky = false) {
      toolbarStatus.textContent = message;
      if (statusTimer) clearTimeout(statusTimer);
      if (!sticky && message) {
        statusTimer = setTimeout(() => { toolbarStatus.textContent = ""; }, 1800);
      }
    }

    function errorMessage(error) {
      return error instanceof Error ? error.message : String(error);
    }

    function syncHeader() {
      if (headerFrame !== null) return;
      headerFrame = requestAnimationFrame(() => {
        headerFrame = null;
        const shouldCompact = headerCompact ? window.scrollY > 16 : window.scrollY > 88;
        if (shouldCompact === headerCompact) return;
        headerCompact = shouldCompact;
        masthead.classList.toggle("is-compact", headerCompact);
      });
    }

    closeButton.addEventListener("click", closeDetail);
    backdrop.addEventListener("click", closeDetail);
    search.addEventListener("input", render);
    refreshButton.addEventListener("click", () => loadTasks({ source: "manual" }));
    sortSelect.addEventListener("change", () => {
      sortBy = sortSelect.value === "createdAt" ? "createdAt" : "updatedAt";
      render();
    });
    tableViewButton.addEventListener("click", () => setView("table"));
    boardViewButton.addEventListener("click", () => setView("board"));
    languageToggle.addEventListener("click", () => setLanguage(language === "en" ? "zh" : "en"));
    window.addEventListener("scroll", syncHeader, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (shouldAutoRefresh()) {
        void loadTasks({ source: "auto" });
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && detail.classList.contains("is-open")) {
        if (closeDeleteConfirm()) return;
        closeDetail();
      }
    });

    applyLanguage();
    updateStats();
    syncHeader();
    render();
    startAutoRefresh();`;
