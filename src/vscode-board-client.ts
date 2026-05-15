export const vscodeBoardClientScript = `    let model = window.__TASKR_BOARD__;
    const vscode = acquireVsCodeApi();
    const taskList = document.querySelector("#taskList");
    const search = document.querySelector("#search");
    const clearSearchButton = document.querySelector("#clearSearch");
    const sortButton = document.querySelector("#sortButton");
    const sortMenu = document.querySelector("#sortMenu");
    const sortOptions = [...document.querySelectorAll(".vscode-sort-option")];
    const statusLine = document.querySelector("#statusLine");
    const detail = document.querySelector("#detail");
    const closeDetailButton = document.querySelector("#closeDetail");
    const detailActionsButton = document.querySelector("#detailActionsButton");
    const detailActionsMenu = document.querySelector("#detailActionsMenu");
    const openTaskButton = document.querySelector("#openTask");
    const deleteTaskButton = document.querySelector("#deleteTask");
    let activeId = null;
    let requestSerial = 0;
    const pendingRequests = new Map();
    const persistedState = vscode.getState() || {};
    const collapsedGroups = new Set(Array.isArray(persistedState.collapsedGroups) ? persistedState.collapsedGroups : ["done"]);
    const sortLabels = { progress: "Progress", updatedAt: "Updated", createdAt: "Created" };
    let sortBy = Object.prototype.hasOwnProperty.call(sortLabels, persistedState.sortBy) ? persistedState.sortBy : "progress";

    search.addEventListener("input", () => {
      updateSearchState();
      render();
    });
    clearSearchButton.addEventListener("click", () => {
      search.value = "";
      updateSearchState();
      render();
      search.focus();
    });
    sortButton.addEventListener("click", () => {
      setSortMenuOpen(sortMenu.hidden);
    });
    sortMenu.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const option = target ? target.closest(".vscode-sort-option") : null;
      if (option) chooseSort(option.dataset.sort);
    });
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!sortMenu.hidden && (!target || (!sortButton.contains(target) && !sortMenu.contains(target)))) {
        setSortMenuOpen(false);
      }
      if (!detailActionsMenu.hidden && (!target || (!detailActionsButton.contains(target) && !detailActionsMenu.contains(target)))) {
        setDetailActionsMenuOpen(false);
      }
    });
    closeDetailButton.addEventListener("click", closeDetail);
    detailActionsButton.addEventListener("click", () => {
      setDetailActionsMenuOpen(detailActionsMenu.hidden);
    });
    openTaskButton.addEventListener("click", () => {
      const task = activeTask();
      setDetailActionsMenuOpen(false);
      if (task) openTask(task.id);
    });
    deleteTaskButton.addEventListener("click", () => {
      const task = activeTask();
      setDetailActionsMenuOpen(false);
      if (task) deleteTask(task);
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !sortMenu.hidden) {
        setSortMenuOpen(false);
        sortButton.focus({ preventScroll: true });
        return;
      }
      if (event.key === "Escape" && !detailActionsMenu.hidden) {
        setDetailActionsMenuOpen(false);
        detailActionsButton.focus({ preventScroll: true });
        return;
      }
      if (event.key === "Escape" && detail.classList.contains("is-open")) {
        closeDetail();
      }
    });

    window.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.type === "taskr.response") {
        const pending = pendingRequests.get(message.requestId);
        if (!pending) return;
        pendingRequests.delete(message.requestId);
        clearTimeout(pending.timeout);
        message.ok ? pending.resolve(message.data) : pending.reject(new Error(message.error || "Request failed"));
        return;
      }
      if (message.type === "taskr.model" && message.model) {
        model = message.model;
        if (message.message) setStatus(String(message.message));
        render();
        if (activeId) {
          const task = activeTask();
          task ? renderDetail(task) : closeDetail();
        }
        return;
      }
      if (message.type === "taskr.error" && message.error) {
        setStatus(String(message.error), true);
      }
    });

    updateSearchState();
    syncSortOptions();
    render();

    function render() {
      const tasks = sortedTasks(filteredTasks(model.tasks));
      const groups = [
        { id: "in_progress", title: "In Progress", tasks: tasks.filter((task) => task.status === "in_progress") },
        { id: "pending_confirmation", title: "Pending", tasks: tasks.filter((task) => task.status === "pending_confirmation") },
        { id: "planned", title: "Planned", tasks: tasks.filter((task) => task.status === "planned") },
        { id: "blocked", title: "Blocked", tasks: tasks.filter((task) => task.status === "blocked") },
        { id: "done", title: "Done", tasks: tasks.filter((task) => task.status === "implemented") }
      ];
      taskList.replaceChildren(...groups.map(groupSection));
    }

    function groupSection(group) {
      const section = document.createElement("section");
      section.className = "vscode-group";
      section.dataset.group = group.id;
      const isCollapsed = collapsedGroups.has(group.id);
      if (isCollapsed) section.classList.add("is-collapsed");
      const title = document.createElement("button");
      title.type = "button";
      title.className = "vscode-group-title";
      title.setAttribute("aria-expanded", String(!isCollapsed));
      title.addEventListener("click", () => toggleGroup(group.id));
      const chevron = document.createElement("span");
      chevron.className = "vscode-chevron";
      chevron.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = group.title;
      const count = document.createElement("span");
      count.className = "vscode-count";
      count.textContent = String(group.tasks.length);
      title.append(chevron, label, count);
      section.append(title);
      if (isCollapsed) {
        return section;
      }
      if (group.tasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "vscode-empty";
        empty.textContent = "No tasks";
        section.append(empty);
      } else {
        section.append(...group.tasks.map(taskRow));
      }
      return section;
    }

    function toggleGroup(id) {
      collapsedGroups.has(id) ? collapsedGroups.delete(id) : collapsedGroups.add(id);
      vscode.setState({ ...vscode.getState(), collapsedGroups: [...collapsedGroups] });
      render();
    }

    function taskRow(task) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "vscode-task-row";
      button.dataset.status = task.status;
      if (task.id === activeId) button.classList.add("is-active");
      button.addEventListener("click", () => openDetail(task));

      const main = document.createElement("span");
      main.className = "vscode-task-main";
      const title = document.createElement("span");
      title.className = "vscode-task-title";
      title.textContent = task.title;
      const request = document.createElement("span");
      request.className = "vscode-task-request";
      request.textContent = sectionText(task, "Request") || task.id;
      main.append(title, request);
      button.append(main);
      return button;
    }

    function filteredTasks(tasks) {
      const query = search.value.trim().toLowerCase();
      if (!query) return tasks;
      return tasks.filter((task) => [
        task.id,
        task.title,
        task.path,
        sectionText(task, "Request"),
        task.status,
        task.branch || "",
        ...(task.commits || [])
      ].join(" ").toLowerCase().includes(query));
    }

    function sortedTasks(tasks) {
      const copy = [...tasks];
      if (sortBy === "createdAt") {
        copy.sort((left, right) => compareTimestamp(right.createdAt, left.createdAt));
        return copy;
      }
      if (sortBy === "updatedAt") {
        copy.sort((left, right) => compareTimestamp(right.updatedAt, left.updatedAt));
        return copy;
      }
      copy.sort((left, right) => {
        const progress = progressValue(right) - progressValue(left);
        return progress || compareTimestamp(right.updatedAt, left.updatedAt);
      });
      return copy;
    }

    function chooseSort(value) {
      if (!Object.prototype.hasOwnProperty.call(sortLabels, value)) return;
      sortBy = value;
      syncSortOptions();
      setSortMenuOpen(false);
      vscode.setState({ ...vscode.getState(), sortBy });
      render();
      sortButton.focus({ preventScroll: true });
    }

    function setSortMenuOpen(isOpen) {
      sortMenu.hidden = !isOpen;
      sortButton.setAttribute("aria-expanded", String(isOpen));
    }

    function setDetailActionsMenuOpen(isOpen) {
      detailActionsMenu.hidden = !isOpen;
      detailActionsButton.setAttribute("aria-expanded", String(isOpen));
    }

    function syncSortOptions() {
      sortOptions.forEach((option) => {
        const isSelected = option.dataset.sort === sortBy;
        option.setAttribute("aria-checked", String(isSelected));
        option.classList.toggle("is-selected", isSelected);
      });
      const label = sortLabels[sortBy] || sortLabels.progress;
      sortButton.title = "Sort: " + label;
      sortButton.setAttribute("aria-label", "Sort tasks by " + label);
    }

    function updateSearchState() {
      clearSearchButton.hidden = search.value.length === 0;
    }

    function openDetail(task) {
      activeId = task.id;
      render();
      renderDetail(task);
      detail.classList.add("is-open");
      detail.setAttribute("aria-hidden", "false");
      detail.removeAttribute("inert");
      detail.inert = false;
      closeDetailButton.focus({ preventScroll: true });
    }

    function closeDetail() {
      activeId = null;
      setDetailActionsMenuOpen(false);
      detail.classList.remove("is-open");
      detail.setAttribute("aria-hidden", "true");
      detail.setAttribute("inert", "");
      detail.inert = true;
      render();
    }

    function renderDetail(task) {
      document.querySelector("#detailKicker").textContent = task.id;
      document.querySelector("#detailTitle").textContent = task.title;
      const meta = document.querySelector("#detailMeta");
      meta.replaceChildren(
        metaLine("Status", statusLabel(task.status)),
        metaLine("Updated", formatTimestamp(task.updatedAt)),
        metaLine("Criteria", criteriaLabel(task) || "0/0"),
        metaLine("Commit", commitLabel(task) || "Not created")
      );
      const body = document.querySelector("#detailBody");
      const sections = ["Request", "Acceptance Criteria", "Implementation Plan", "Progress Log", "Agent Notes", "Completion Summary"]
        .map((name) => sectionContent(task, name))
        .filter((section) => section)
        .map(({ title, content }) => detailSection(title, content));
      if (task.unsectionedBody && task.unsectionedBody.trim()) {
        sections.push(detailSection("Unparsed Content", task.unsectionedBody));
      }
      body.replaceChildren(...sections);
    }

    function sectionContent(task, name) {
      if (!Object.prototype.hasOwnProperty.call(task.sections || {}, name)) return null;
      const content = task.sections[name] || "";
      return isEmptySectionContent(content) ? null : { title: name, content };
    }

    function isEmptySectionContent(content) {
      const value = content.trim();
      return value === "" || value === "Empty." || value === "暂无。" || value === "空。";
    }

    function detailSection(title, value) {
      const section = document.createElement("details");
      section.className = "vscode-section";
      section.open = true;
      const heading = document.createElement("summary");
      const chevron = document.createElement("span");
      chevron.className = "vscode-chevron";
      chevron.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "vscode-section-label";
      label.textContent = title;
      heading.append(chevron, label);
      const content = document.createElement("div");
      content.className = "vscode-markdown";
      content.innerHTML = window.renderTaskrMarkdown(value);
      section.append(heading, content);
      return section;
    }

    function metaLine(label, value) {
      const item = document.createElement("div");
      item.className = "vscode-meta-item";
      const key = document.createElement("span");
      key.className = "vscode-meta-key";
      key.textContent = label + ": ";
      const body = document.createElement("code");
      body.className = "vscode-meta-value";
      body.textContent = String(value);
      item.append(key, body);
      return item;
    }

    async function openTask(id) {
      try {
        await request({ action: "openTask", id });
      } catch (error) {
        setStatus(errorMessage(error), true);
      }
    }

    async function deleteTask(task) {
      try {
        const data = await request({ action: "deleteTask", id: task.id });
        model = data;
        if (model.tasks.some((current) => current.id === task.id)) {
          return;
        }
        closeDetail();
      } catch (error) {
        setStatus(errorMessage(error), true);
      }
    }

    function request(message) {
      const requestId = ++requestSerial;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingRequests.delete(requestId);
          reject(new Error("Request timed out."));
        }, 15000);
        pendingRequests.set(requestId, { resolve, reject, timeout });
        vscode.postMessage({ type: "taskr.request", requestId, ...message });
      });
    }

    function activeTask() {
      return model.tasks.find((task) => task.id === activeId) || null;
    }

    function sectionText(task, section) {
      return task.sections && task.sections[section] ? task.sections[section] : "";
    }

    function criteriaLabel(task) {
      return task.criteria.total > 0 ? task.criteria.checked + "/" + task.criteria.total : "";
    }

    function commitLabel(task) {
      if (task.commitStatus === "created" && task.commits.length > 0) {
        return task.commits[0];
      }
      if (task.commitStatus === "not_applicable") return "N/A";
      return "";
    }

    function progressValue(task) {
      if (task.status === "implemented") return 4;
      if (task.status === "pending_confirmation") return 3;
      if (task.status === "in_progress") return 2;
      if (task.status === "planned") return 1;
      return 0;
    }

    function compareTimestamp(left, right) {
      return Date.parse(left || "") - Date.parse(right || "");
    }

    function formatTimestamp(value) {
      if (!value) return "Unknown";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    }

    function statusLabel(status) {
      return status.replace(/_/g, " ").replace(/\\b\\w/g, (value) => value.toUpperCase());
    }

    function setStatus(message, isError = false) {
      statusLine.textContent = message || "";
      statusLine.classList.toggle("is-error", Boolean(isError));
    }

    function errorMessage(error) {
      return error instanceof Error ? error.message : String(error);
    }
`;
