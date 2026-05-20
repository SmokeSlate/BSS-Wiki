(function () {
  "use strict";

  var defaultUrl = "/assets/fix-flow.json";
  var previewKey = "bss-troubleshooter-builder-preview";
  var autosaveKey = "bss-troubleshooter-builder-autosave";
  var appShellEl = document.querySelector(".app-shell");

  var statusEl = document.getElementById("builder-status");
  if (!statusEl || !window.Troubleshooter) {
    return;
  }

  var metaEl = document.getElementById("builder-meta");
  var treePanelEl = document.getElementById("tree-panel");
  var canvasSurfaceEl = document.getElementById("canvas-surface");
  var canvasStageEl = document.getElementById("canvas-stage");
  var editorPanelEl = document.getElementById("editor-panel");
  var selectedNodeLabelEl = document.getElementById("selected-node-label");
  var jsonOutputEl = document.getElementById("json-output");
  var markdownOutputEl = document.getElementById("markdown-output");
  var importInputEl = document.getElementById("import-json");
  var undoActionEl = document.getElementById("undo-action");
  var redoActionEl = document.getElementById("redo-action");
  var toggleSidebarEl = document.getElementById("toggle-sidebar");
  var toggleSidebarCollapsedEl = document.getElementById("toggle-sidebar-collapsed");
  var toggleInspectorEl = document.getElementById("toggle-inspector");
  var toggleInspectorCollapsedEl = document.getElementById("toggle-inspector-collapsed");
  var toggleSidebarIconEl = document.getElementById("toggle-sidebar-icon");
  var toggleInspectorIconEl = document.getElementById("toggle-inspector-icon");
  var sidebarResizerEl = document.getElementById("sidebar-resizer");
  var inspectorResizerEl = document.getElementById("inspector-resizer");
  var desktopCollapseWidth = 1024;

  var state = {
    data: null,
    selected: {
      type: "node",
      path: []
    },
    clipboard: null,
    sourceLabel: defaultUrl,
    history: {
      entries: [],
      index: -1,
      applying: false
    },
    viewport: {
      x: 180,
      y: 40,
      scale: 1
    },
    layout: {
      sidebarWidth: 300,
      inspectorWidth: 420,
      sidebarCollapsed: false,
      inspectorCollapsed: false
    }
  };

  var panState = {
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
    suppressClick: false
  };

  var dragState = {
    choicePath: null
  };

  function setStatus(message, tone) {
    if (!message) {
      statusEl.className = "hidden mt-4 rounded-xl border px-4 py-3 text-sm";
      statusEl.textContent = "";
      return;
    }

    var base = "mt-4 rounded-xl border px-4 py-3 text-sm";
    var styles = tone === "error"
      ? " border-rose-400/30 bg-rose-500/10 text-rose-100"
      : " border-indigo-400/30 bg-indigo-500/10 text-indigo-100";
    statusEl.className = base + styles;
    statusEl.textContent = message;
  }

  function saveAutosave(serializedData) {
    if (!window.localStorage) {
      return;
    }
    try {
      localStorage.setItem(autosaveKey, serializedData);
    } catch (error) {
      setStatus(error.message || "Could not save the current builder flow.", "error");
    }
  }

  function loadAutosave() {
    if (!window.localStorage) {
      return null;
    }
    try {
      var raw = localStorage.getItem(autosaveKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      localStorage.removeItem(autosaveKey);
      return null;
    }
  }

  function blankNode() {
    return {
      title: "New step",
      image: "",
      question: "What should this step ask?",
      details: "",
      choices: []
    };
  }

  function blankChoice() {
    return {
      label: "New path",
      description: "",
      result: null,
      next: null
    };
  }

  function blankResult() {
    return {
      title: "New result",
      image: "",
      summary: "Explain the outcome.",
      steps: ["First action"],
      links: []
    };
  }

  function parsePath(rawPath) {
    return rawPath
      ? rawPath.split(".").filter(Boolean).map(function (value) { return Number(value); })
      : [];
  }

  function pathText(path) {
    return path.length ? path.map(function (part) { return part + 1; }).join(".") : "root";
  }

  function escape(value) {
    return Troubleshooter.escapeHtml(value);
  }

  function linesToText(items) {
    return (items || []).join("\n");
  }

  function linksToText(links) {
    return (links || []).map(function (link) {
      return link.label + " | " + link.href;
    }).join("\n");
  }

  function parseLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  }

  function parseLinks(text) {
    return parseLines(text).map(function (line) {
      var parts = line.split("|");
      return {
        label: (parts[0] || "").trim(),
        href: (parts[1] || "").trim()
      };
    }).filter(function (item) {
      return item.label && item.href;
    });
  }

  function cloneChoice(choice) {
    return Troubleshooter.cloneData(choice);
  }

  function normalizeNodeData(node) {
    return Troubleshooter.normalizeData({
      root: node
    }).root;
  }

  function normalizeChoiceData(choice) {
    return Troubleshooter.normalizeData({
      root: {
        choices: [choice]
      }
    }).root.choices[0] || blankChoice();
  }

  function getChoiceParentInfo(choicePath) {
    if (!choicePath.length) {
      return null;
    }
    var parentPath = choicePath.slice(0, -1);
    var parentNode = getNodeAtPath(parentPath);
    var choiceIndex = choicePath[choicePath.length - 1];
    if (!parentNode || !parentNode.choices[choiceIndex]) {
      return null;
    }
    return {
      parentNode: parentNode,
      parentPath: parentPath,
      choiceIndex: choiceIndex,
      choicePath: choicePath.slice(),
      choice: parentNode.choices[choiceIndex]
    };
  }

  function getSelectedChoiceInfo() {
    if (state.selected.type === "result") {
      return getChoiceParentInfo(state.selected.path);
    }
    if (state.selected.type === "node" && state.selected.path.length) {
      return getChoiceParentInfo(state.selected.path);
    }
    return null;
  }

  function cloneSelectedState() {
    return {
      type: state.selected.type,
      path: state.selected.path.slice()
    };
  }

  function readImageFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error("No image selected."));
        return;
      }
      if (String(file.type || "").indexOf("image/") !== 0) {
        reject(new Error("Selected file is not an image."));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ""));
      };
      reader.onerror = function () {
        reject(new Error("Could not read that image file."));
      };
      reader.readAsDataURL(file);
    });
  }

  function applyLayoutState() {
    if (!appShellEl) {
      return;
    }
    var canCollapse = window.innerWidth > desktopCollapseWidth;
    appShellEl.style.setProperty("--sidebar-width", state.layout.sidebarWidth + "px");
    appShellEl.style.setProperty("--inspector-width", state.layout.inspectorWidth + "px");
    appShellEl.classList.toggle("left-collapsed", canCollapse && state.layout.sidebarCollapsed);
    appShellEl.classList.toggle("right-collapsed", canCollapse && state.layout.inspectorCollapsed);
    if (toggleSidebarIconEl) {
      toggleSidebarIconEl.textContent = canCollapse && state.layout.sidebarCollapsed ? "▶" : "◀";
    }
    if (toggleInspectorIconEl) {
      toggleInspectorIconEl.textContent = canCollapse && state.layout.inspectorCollapsed ? "◀" : "▶";
    }
  }

  function updateHistoryControls() {
    if (undoActionEl) {
      undoActionEl.disabled = state.history.index <= 0;
    }
    if (redoActionEl) {
      redoActionEl.disabled = state.history.index < 0 || state.history.index >= state.history.entries.length - 1;
    }
  }

  function clampScale(value) {
    return Math.max(0.45, Math.min(1.8, value));
  }

  function applyViewportTransform() {
    if (!canvasStageEl) {
      return;
    }
    canvasStageEl.style.transform =
      "translate(" + state.viewport.x + "px, " + state.viewport.y + "px) scale(" + state.viewport.scale + ")";
  }

  function zoomAtPoint(clientX, clientY, deltaY) {
    if (!canvasSurfaceEl) {
      return;
    }
    var rect = canvasSurfaceEl.getBoundingClientRect();
    var pointX = clientX - rect.left;
    var pointY = clientY - rect.top;
    var oldScale = state.viewport.scale;
    var factor = deltaY < 0 ? 1.08 : 0.92;
    var nextScale = clampScale(oldScale * factor);
    if (nextScale === oldScale) {
      return;
    }
    var worldX = (pointX - state.viewport.x) / oldScale;
    var worldY = (pointY - state.viewport.y) / oldScale;
    state.viewport.x = pointX - worldX * nextScale;
    state.viewport.y = pointY - worldY * nextScale;
    state.viewport.scale = nextScale;
    applyViewportTransform();
  }

  function setupCanvasNavigation() {
    if (!canvasSurfaceEl || !canvasStageEl) {
      return;
    }

    applyViewportTransform();

    canvasSurfaceEl.addEventListener("wheel", function (event) {
      event.preventDefault();
      zoomAtPoint(event.clientX, event.clientY, event.deltaY);
    }, { passive: false });

    canvasSurfaceEl.addEventListener("mousedown", function (event) {
      if (event.button !== 0) {
        return;
      }
      if (event.target && typeof event.target.closest === "function" &&
          event.target.closest("[data-select-node], [data-select-result], [data-drag-choice], button, input, textarea, select, label, a")) {
        return;
      }
      panState.pointerId = "mouse";
      panState.startX = event.clientX;
      panState.startY = event.clientY;
      panState.originX = state.viewport.x;
      panState.originY = state.viewport.y;
      panState.moved = false;
      canvasSurfaceEl.classList.add("is-panning");
    });

    window.addEventListener("mousemove", function (event) {
      if (panState.pointerId !== "mouse") {
        return;
      }
      var dx = event.clientX - panState.startX;
      var dy = event.clientY - panState.startY;
      if (!panState.moved && Math.abs(dx) + Math.abs(dy) > 4) {
        panState.moved = true;
      }
      state.viewport.x = panState.originX + dx;
      state.viewport.y = panState.originY + dy;
      applyViewportTransform();
    });

    window.addEventListener("mouseup", function () {
      if (panState.pointerId !== "mouse") {
        return;
      }
      if (panState.moved) {
        panState.suppressClick = true;
        window.setTimeout(function () {
          panState.suppressClick = false;
        }, 0);
      }
      panState.pointerId = null;
      canvasSurfaceEl.classList.remove("is-panning");
    });

    canvasSurfaceEl.addEventListener("click", function (event) {
      if (!panState.suppressClick) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      panState.suppressClick = false;
    }, true);
  }

  function toggleSidebar() {
    if (window.innerWidth <= desktopCollapseWidth) {
      return;
    }
    state.layout.sidebarCollapsed = !state.layout.sidebarCollapsed;
    applyLayoutState();
  }

  function toggleInspector() {
    if (window.innerWidth <= desktopCollapseWidth) {
      return;
    }
    state.layout.inspectorCollapsed = !state.layout.inspectorCollapsed;
    applyLayoutState();
  }

  function setupLayoutControls() {
    function bindPointerResize(handleEl, side) {
      if (!handleEl) {
        return;
      }
      handleEl.addEventListener("pointerdown", function (event) {
        var startX = event.clientX;
        var startWidth = side === "sidebar" ? state.layout.sidebarWidth : state.layout.inspectorWidth;
        handleEl.classList.add("is-active");
        handleEl.setPointerCapture(event.pointerId);

        function onMove(moveEvent) {
          var delta = moveEvent.clientX - startX;
          if (side === "sidebar") {
            state.layout.sidebarWidth = Math.max(220, Math.min(520, startWidth + delta));
          } else {
            state.layout.inspectorWidth = Math.max(320, Math.min(620, startWidth - delta));
          }
          applyLayoutState();
        }

        function onEnd(endEvent) {
          handleEl.classList.remove("is-active");
          handleEl.releasePointerCapture(endEvent.pointerId);
          handleEl.removeEventListener("pointermove", onMove);
          handleEl.removeEventListener("pointerup", onEnd);
          handleEl.removeEventListener("pointercancel", onEnd);
        }

        handleEl.addEventListener("pointermove", onMove);
        handleEl.addEventListener("pointerup", onEnd);
        handleEl.addEventListener("pointercancel", onEnd);
      });
    }

    if (toggleSidebarEl) {
      toggleSidebarEl.addEventListener("click", toggleSidebar);
    }
    if (toggleSidebarCollapsedEl) {
      toggleSidebarCollapsedEl.addEventListener("click", toggleSidebar);
    }
    if (toggleInspectorEl) {
      toggleInspectorEl.addEventListener("click", toggleInspector);
    }
    if (toggleInspectorCollapsedEl) {
      toggleInspectorCollapsedEl.addEventListener("click", toggleInspector);
    }

    bindPointerResize(sidebarResizerEl, "sidebar");
    bindPointerResize(inspectorResizerEl, "inspector");
    window.addEventListener("resize", applyLayoutState);
    applyLayoutState();
  }

  function getNodeAtPath(path) {
    return Troubleshooter.getNodeAtPath(state.data.root, path) || state.data.root;
  }

  function getChoiceAtPath(choicePath) {
    if (!choicePath.length) {
      return null;
    }
    var parentPath = choicePath.slice(0, -1);
    var parentNode = getNodeAtPath(parentPath);
    return parentNode.choices[choicePath[choicePath.length - 1]] || null;
  }

  function selectFlow() {
    state.selected = {
      type: "flow",
      path: []
    };
    renderAll();
  }

  function selectNode(path) {
    state.selected = {
      type: "node",
      path: path.slice()
    };
    renderAll();
  }

  function selectResult(choicePath) {
    state.selected = {
      type: "result",
      path: choicePath.slice()
    };
    renderAll();
  }

  function setData(data, sourceLabel) {
    state.data = Troubleshooter.normalizeData(data);
    state.sourceLabel = sourceLabel || defaultUrl;
    if (state.selected.type === "node" && state.selected.path.length && !Troubleshooter.getNodeAtPath(state.data.root, state.selected.path)) {
      state.selected = { type: "node", path: [] };
    }
    if (state.selected.type === "result" && !getChoiceAtPath(state.selected.path)) {
      state.selected = { type: "node", path: [] };
    }
    renderAll();
  }

  function normalizeSelectedState(selected) {
    var fallback = {
      type: "node",
      path: []
    };
    if (!selected || typeof selected !== "object") {
      return fallback;
    }
    if (selected.type === "flow") {
      return {
        type: "flow",
        path: []
      };
    }
    if (selected.type === "result" && getChoiceAtPath(selected.path)) {
      return {
        type: "result",
        path: selected.path.slice()
      };
    }
    if (selected.type === "node" && getNodeAtPath(selected.path)) {
      return {
        type: "node",
        path: selected.path.slice()
      };
    }
    return fallback;
  }

  function buildHistoryEntry(serializedData) {
    return {
      serialized: serializedData,
      data: Troubleshooter.cloneData(state.data),
      selected: cloneSelectedState()
    };
  }

  function syncHistory(serializedData) {
    if (state.history.applying) {
      updateHistoryControls();
      return;
    }

    if (state.history.index < 0 || !state.history.entries.length) {
      state.history.entries = [buildHistoryEntry(serializedData)];
      state.history.index = 0;
      updateHistoryControls();
      return;
    }

    var currentEntry = state.history.entries[state.history.index];
    if (currentEntry.serialized === serializedData) {
      currentEntry.selected = cloneSelectedState();
      updateHistoryControls();
      return;
    }

    state.history.entries = state.history.entries.slice(0, state.history.index + 1);
    state.history.entries.push(buildHistoryEntry(serializedData));
    state.history.index = state.history.entries.length - 1;
    updateHistoryControls();
  }

  function applyHistoryEntry(entry) {
    if (!entry) {
      return;
    }
    state.history.applying = true;
    state.data = Troubleshooter.normalizeData(entry.data);
    state.selected = normalizeSelectedState(entry.selected);
    renderAll();
    state.history.applying = false;
    updateHistoryControls();
  }

  function undoHistory() {
    if (state.history.index <= 0) {
      return;
    }
    state.history.index -= 1;
    applyHistoryEntry(state.history.entries[state.history.index]);
    setStatus("Undid the last change.", "success");
  }

  function redoHistory() {
    if (state.history.index < 0 || state.history.index >= state.history.entries.length - 1) {
      return;
    }
    state.history.index += 1;
    applyHistoryEntry(state.history.entries[state.history.index]);
    setStatus("Redid the change.", "success");
  }

  function copySelection() {
    if (state.selected.type === "flow") {
      state.clipboard = {
        type: "flow",
        payload: Troubleshooter.cloneData(state.data)
      };
      setStatus("Copied flow to the builder clipboard.", "success");
      return;
    }

    if (state.selected.type === "node" && !state.selected.path.length) {
      state.clipboard = {
        type: "node",
        payload: Troubleshooter.cloneData(state.data.root)
      };
      setStatus("Copied root step to the builder clipboard.", "success");
      return;
    }

    var choiceInfo = getSelectedChoiceInfo();
    if (!choiceInfo) {
      setStatus("Select a branch, step, or result to copy.", "error");
      return;
    }

    state.clipboard = {
      type: "choice",
      payload: cloneChoice(choiceInfo.choice)
    };
    setStatus("Copied branch to the builder clipboard.", "success");
  }

  function pasteSelection() {
    if (!state.clipboard) {
      setStatus("The builder clipboard is empty.", "error");
      return;
    }

    if (state.clipboard.type === "flow") {
      if (state.selected.type !== "flow") {
        setStatus("Flow clipboard data can only be pasted into flow settings.", "error");
        return;
      }
      setData(Troubleshooter.cloneData(state.clipboard.payload), "builder clipboard");
      setStatus("Pasted flow from the builder clipboard.", "success");
      return;
    }

    if (state.clipboard.type === "node") {
      if (state.selected.type === "flow" || (state.selected.type === "node" && !state.selected.path.length)) {
        state.data.root = normalizeNodeData(state.clipboard.payload);
        state.selected = {
          type: "node",
          path: []
        };
        renderAll();
        setStatus("Pasted step into the root position.", "success");
        return;
      }

      var nodeChoiceInfo = getSelectedChoiceInfo();
      if (!nodeChoiceInfo) {
        setStatus("Select a step or result to paste this step into.", "error");
        return;
      }

      nodeChoiceInfo.choice.next = normalizeNodeData(state.clipboard.payload);
      nodeChoiceInfo.choice.result = null;
      selectNode(nodeChoiceInfo.choicePath);
      setStatus("Pasted step into the selected branch.", "success");
      return;
    }

    if (state.clipboard.type === "choice") {
      var normalizedChoice = normalizeChoiceData(state.clipboard.payload);
      if (state.selected.type === "flow" || (state.selected.type === "node" && !state.selected.path.length)) {
        state.data.root.choices.push(normalizedChoice);
        selectNode([]);
        setStatus("Pasted branch into the root step.", "success");
        return;
      }

      var replaceChoiceInfo = getSelectedChoiceInfo();
      if (!replaceChoiceInfo) {
        setStatus("Select a branch, step, or result to paste over.", "error");
        return;
      }

      replaceChoiceInfo.parentNode.choices[replaceChoiceInfo.choiceIndex] = normalizedChoice;
      if (normalizedChoice.next) {
        selectNode(replaceChoiceInfo.choicePath);
      } else {
        selectResult(replaceChoiceInfo.choicePath);
      }
      setStatus("Pasted branch from the builder clipboard.", "success");
      return;
    }
  }

  function deleteSelection() {
    var choiceInfo = getSelectedChoiceInfo();
    if (!choiceInfo) {
      setStatus("The root step cannot be deleted.", "error");
      return;
    }

    choiceInfo.parentNode.choices.splice(choiceInfo.choiceIndex, 1);
    selectNode(choiceInfo.parentPath);
    setStatus("Deleted the selected branch.", "success");
  }

  function duplicateSelection() {
    var choiceInfo = getSelectedChoiceInfo();
    if (!choiceInfo) {
      setStatus("Select a branch, step, or result to duplicate.", "error");
      return;
    }

    var duplicate = cloneChoice(choiceInfo.choice);
    var insertIndex = choiceInfo.choiceIndex + 1;
    choiceInfo.parentNode.choices.splice(insertIndex, 0, duplicate);
    if (duplicate.next) {
      selectNode(choiceInfo.parentPath.concat(insertIndex));
    } else {
      selectResult(choiceInfo.parentPath.concat(insertIndex));
    }
    setStatus("Duplicated the selected branch.", "success");
  }

  function cutSelection() {
    if (!getSelectedChoiceInfo()) {
      setStatus("The root step cannot be cut.", "error");
      return;
    }
    copySelection();
    deleteSelection();
    setStatus("Cut the selected branch to the builder clipboard.", "success");
  }

  function addPathFromSelection() {
    if (state.selected.type === "flow") {
      state.data.root.choices.push(blankChoice());
      selectNode([]);
      setStatus("Added a new root path.", "success");
      return;
    }

    if (state.selected.type === "node") {
      currentNode().choices.push(blankChoice());
      renderAll();
      setStatus("Added a new path to the selected step.", "success");
      return;
    }

    var choiceInfo = getChoiceParentInfo(state.selected.path);
    if (!choiceInfo) {
      setStatus("Could not add a path from the current selection.", "error");
      return;
    }
    choiceInfo.parentNode.choices.push(blankChoice());
    selectNode(choiceInfo.parentPath);
    setStatus("Added a sibling path to the parent step.", "success");
  }

  function isEditableTarget(target) {
    if (!target) {
      return false;
    }
    var tagName = String(target.tagName || "").toLowerCase();
    return tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      Boolean(target.isContentEditable);
  }

  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", function (event) {
      if (isEditableTarget(event.target)) {
        return;
      }

      var key = String(event.key || "").toLowerCase();
      var hasModifier = event.metaKey || event.ctrlKey;
      if (hasModifier && !event.shiftKey && !event.altKey && key === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if (hasModifier && !event.altKey && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoHistory();
        } else {
          undoHistory();
        }
        return;
      }
      if (hasModifier && !event.shiftKey && !event.altKey && key === "y") {
        event.preventDefault();
        redoHistory();
        return;
      }
      if (hasModifier && !event.shiftKey && !event.altKey && key === "x") {
        event.preventDefault();
        cutSelection();
        return;
      }
      if (hasModifier && !event.shiftKey && !event.altKey && key === "v") {
        event.preventDefault();
        pasteSelection();
        return;
      }
      if (hasModifier && !event.shiftKey && !event.altKey && key === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (!hasModifier && !event.shiftKey && !event.altKey && (key === "delete" || key === "backspace")) {
        event.preventDefault();
        deleteSelection();
        return;
      }
      if (!hasModifier && event.shiftKey && !event.altKey && key === "a") {
        event.preventDefault();
        addPathFromSelection();
      }
    });
  }

  function currentNode() {
    return getNodeAtPath(state.selected.path);
  }

  function currentChoice() {
    return getChoiceAtPath(state.selected.path);
  }

  function updateOutputs() {
    var serializedData = JSON.stringify(state.data, null, 2);
    jsonOutputEl.value = serializedData;
    markdownOutputEl.value = Troubleshooter.treeToMarkdown(state.data);
    saveAutosave(serializedData);
    syncHistory(serializedData);
    metaEl.textContent = "Source: " + state.sourceLabel + " | Updated " + new Date().toLocaleString();
    if (state.selected.type === "flow") {
      selectedNodeLabelEl.textContent = "Flow";
    } else if (state.selected.type === "result") {
      selectedNodeLabelEl.textContent = "Result " + pathText(state.selected.path);
    } else {
      selectedNodeLabelEl.textContent = "Step " + pathText(state.selected.path);
    }
  }

  function stepCard(kind, title, meta, badge, icon, attrs, selected, dark, image, cardAttrs) {
    var classes = kind === "split" ? "split-card" : "step-card";
    if (selected) {
      classes += " selected";
    }
    var iconClass = kind === "result" ? "result" : kind === "split" ? "split" : "step";
    return (
      '<article class="' + classes + '" ' + (cardAttrs || "") + ">" +
        '<button type="button" class="card-button" ' + attrs + ">" +
          '<div class="card-row">' +
            '<span class="card-icon ' + iconClass + '">' + icon + "</span>" +
            '<div>' +
              '<span class="card-badge ' + (dark ? "split" : kind === "result" ? "result" : "step") + '">' + badge + "</span>" +
              '<div class="card-title mt-2">' + escape(title) + "</div>" +
              (meta ? '<div class="card-meta">' + escape(meta) + "</div>" : "") +
              (image
                ? '<img src="' + escape(image) + '" alt="' + escape(title) + '" class="mt-3 rounded-lg w-full h-24 object-cover border border-gray-700" />'
                : "") +
            "</div>" +
            '<span class="text-xs text-[#9d948b]">' + (dark ? "⋯" : "⋮") + "</span>" +
          "</div>" +
        "</button>" +
      "</article>"
    );
  }

  function renderResultCard(choice, choicePath) {
    var selected = state.selected.type === "result" && state.selected.path.join(".") === choicePath.join(".");
    var result = choice.result || blankResult();
    return (
      '<div class="branch-stack">' +
        stepCard(
          "result",
          result.title || choice.label || "Result",
          result.summary || "Result details",
          "Result",
          "✓",
          'data-select-result="' + choicePath.join(".") + '"',
          selected,
          false,
          result.image,
          'draggable="true" data-drag-choice="' + choicePath.join(".") + '"'
        ) +
      "</div>"
    );
  }

  function renderBranchContinuation(choice, choicePath) {
    if (choice.next) {
      return renderNodeStack(choice.next, choicePath);
    }
    return renderResultCard(choice, choicePath);
  }

  function choiceSpan(choice) {
    if (!choice || !choice.next) {
      return 1;
    }
    return nodeSpan(choice.next);
  }

  function nodeSpan(node) {
    if (!node || !node.choices || !node.choices.length) {
      return 1;
    }
    if (node.choices.length === 1) {
      return choiceSpan(node.choices[0]);
    }
    return node.choices.reduce(function (total, choice) {
      return total + choiceSpan(choice);
    }, 0);
  }

  function renderBranchGrid(node, path) {
    var spans = node.choices.map(function (choice) {
      return Math.max(1, choiceSpan(choice));
    });
    var totalWidth = spans.reduce(function (total, span) {
      return total + (span * 312);
    }, 0);
    var startOffset = spans.length ? (spans[0] * 312) / 2 : 0;
    var endOffset = spans.length ? (spans[spans.length - 1] * 312) / 2 : 0;
    return (
      '<div class="branch-grid" style="--branch-line-start:' + startOffset + 'px;--branch-line-end:' + endOffset + 'px;min-width:' + totalWidth + 'px;">' +
        node.choices.map(function (choice, index) {
          var choicePath = path.concat(index);
          var span = spans[index];
          return (
            '<div class="branch-column" style="--branch-span:' + span + ';">' +
              '<div class="branch-pill">' + escape(choice.label || ("Path " + (index + 1))) + "</div>" +
              '<div class="flow-line"></div>' +
              renderBranchContinuation(choice, choicePath) +
            "</div>"
          );
        }).join("") +
      "</div>"
    );
  }

  function renderSingleContinuation(choice, path, index) {
    return (
      '<div class="flow-line"></div>' +
      (choice.label
        ? '<div class="branch-pill">' + escape(choice.label) + "</div>"
        : "") +
      renderBranchContinuation(choice, path.concat(index))
    );
  }

  function renderNodeStack(node, path) {
    var selected = state.selected.type === "node" && state.selected.path.join(".") === path.join(".");
    var nodePath = path.join(".");
    var html =
      '<div class="flow-stack">' +
        stepCard(
          "step",
          node.title || "Untitled step",
          node.question || "No question yet.",
          path.length ? "Step " + pathText(path) : "Start",
          path.length ? "→" : "◎",
          'data-select-node="' + nodePath + '" data-drop-node="' + nodePath + '"',
          selected,
          false,
          node.image,
          path.length ? 'draggable="true" data-drag-choice="' + nodePath + '"' : ""
        );

    if (node.choices.length === 1) {
      html += renderSingleContinuation(node.choices[0], path, 0);
    } else if (node.choices.length > 1) {
      html +=
        '<div class="flow-line"></div>' +
        stepCard(
          "split",
          "Paths",
          node.choices.length + " branches",
          "Split",
          "⇄",
          'data-select-node="' + path.join(".") + '"',
          selected,
          true
        ) +
        '<div class="flow-line"></div>' +
        renderBranchGrid(node, path);
    }

    html += "</div>";
    return html;
  }

  function renderTree() {
    treePanelEl.innerHTML = renderNodeStack(state.data.root, []);

    Array.prototype.forEach.call(treePanelEl.querySelectorAll("[data-select-node]"), function (button) {
      button.addEventListener("click", function () {
        selectNode(parsePath(button.getAttribute("data-select-node")));
      });
    });

    Array.prototype.forEach.call(treePanelEl.querySelectorAll("[data-select-result]"), function (button) {
      button.addEventListener("click", function () {
        selectResult(parsePath(button.getAttribute("data-select-result")));
      });
    });

    setupTreeDragAndDrop();
  }

  function isPathPrefix(prefix, path) {
    return prefix.every(function (segment, index) {
      return path[index] === segment;
    });
  }

  function canDropChoiceOnNode(choicePath, targetNodePath) {
    if (!choicePath.length) {
      return false;
    }

    var sourceInfo = getChoiceParentInfo(choicePath);
    var targetNode = getNodeAtPath(targetNodePath);
    if (!sourceInfo || !targetNode) {
      return false;
    }

    if (sourceInfo.choice.next && isPathPrefix(choicePath, targetNodePath)) {
      return false;
    }

    return true;
  }

  function clearTreeDragState() {
    dragState.choicePath = null;
    Array.prototype.forEach.call(treePanelEl.querySelectorAll(".is-dragging"), function (element) {
      element.classList.remove("is-dragging");
    });
    Array.prototype.forEach.call(treePanelEl.querySelectorAll(".drop-target"), function (element) {
      element.classList.remove("drop-target");
    });
  }

  function moveChoiceToNode(choicePath, targetNodePath) {
    if (!canDropChoiceOnNode(choicePath, targetNodePath)) {
      setStatus("That branch cannot be moved into the selected step.", "error");
      return;
    }

    var sourceInfo = getChoiceParentInfo(choicePath);
    var targetNode = getNodeAtPath(targetNodePath);
    var movedChoice = sourceInfo.parentNode.choices.splice(sourceInfo.choiceIndex, 1)[0];
    targetNode.choices.push(movedChoice);

    var insertedPath = targetNodePath.concat(targetNode.choices.length - 1);
    if (movedChoice.next) {
      selectNode(insertedPath);
    } else {
      selectResult(insertedPath);
    }
    setStatus("Moved the branch under step " + pathText(targetNodePath) + ".", "success");
  }

  function setupTreeDragAndDrop() {
    Array.prototype.forEach.call(treePanelEl.querySelectorAll("[data-drag-choice]"), function (card) {
      card.addEventListener("dragstart", function (event) {
        dragState.choicePath = parsePath(card.getAttribute("data-drag-choice"));
        card.classList.add("is-dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", dragState.choicePath.join("."));
        }
      });

      card.addEventListener("dragend", function () {
        clearTreeDragState();
      });
    });

    Array.prototype.forEach.call(treePanelEl.querySelectorAll("[data-drop-node]"), function (target) {
      var targetPath = parsePath(target.getAttribute("data-drop-node"));
      var targetCard = target.closest(".step-card");
      if (!targetCard) {
        return;
      }

      function markDrop(event) {
        if (!dragState.choicePath || !canDropChoiceOnNode(dragState.choicePath, targetPath)) {
          return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "move";
        }
        targetCard.classList.add("drop-target");
      }

      target.addEventListener("dragenter", markDrop);
      target.addEventListener("dragover", markDrop);
      target.addEventListener("dragleave", function () {
        targetCard.classList.remove("drop-target");
      });
      target.addEventListener("drop", function (event) {
        if (!dragState.choicePath) {
          return;
        }
        event.preventDefault();
        var movedPath = dragState.choicePath.slice();
        clearTreeDragState();
        moveChoiceToNode(movedPath, targetPath);
      });
    });
  }

  function inputClass(multiline) {
    return "w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-indigo-400" + (multiline ? " min-h-[96px]" : "");
  }

  function controlButton(label, attrs, tone) {
    var style = tone === "primary"
      ? "inline-flex text-white bg-indigo-500 border-0 py-2 px-4 hover:bg-indigo-400 text-xs rounded-full"
      : tone === "danger"
        ? "inline-flex text-white bg-rose-500 border-0 py-2 px-4 hover:bg-rose-400 text-xs rounded-full"
        : "inline-flex text-white bg-gray-900 border border-gray-700 py-2 px-4 hover:border-indigo-400 text-xs rounded-full";
    return '<button type="button" ' + attrs + ' class="' + style + '">' + label + "</button>";
  }

  function imageControlBlock(title, fieldName, value, uploadId) {
    return (
      '<div class="rounded-2xl border border-gray-700 bg-gray-800 p-4 space-y-4">' +
        '<div class="flex items-center justify-between gap-3">' +
          '<p class="text-sm font-medium text-white">' + title + "</p>" +
          '<label class="inline-flex items-center justify-center text-white bg-gray-900 border border-gray-700 py-2 px-4 hover:border-indigo-400 text-xs rounded-full cursor-pointer">' +
            '<span>Upload</span>' +
            '<input id="' + uploadId + '" type="file" accept="image/*" class="hidden" />' +
          "</label>" +
        "</div>" +
        (value
          ? '<img src="' + escape(value) + '" alt="' + escape(title) + '" class="rounded-xl w-full max-h-56 object-cover border border-gray-700" />'
          : '<div class="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-400">No image selected.</div>') +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Image URL</span>' +
          '<input data-image-field="' + fieldName + '" type="text" value="' + escape(value || "") + '" class="' + inputClass(false) + '" />' +
        "</label>" +
      "</div>"
    );
  }

  function renderFlowEditor() {
    editorPanelEl.innerHTML =
        '<div class="space-y-5">' +
          '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Title</span>' +
          '<input data-flow-field="title" type="text" value="' + escape(state.data.title) + '" class="' + inputClass(false) + '" />' +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Description</span>' +
          '<textarea data-flow-field="description" class="' + inputClass(true) + '">' + escape(state.data.description) + "</textarea>" +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Intro</span>' +
          '<textarea data-flow-field="intro" class="' + inputClass(true) + '">' + escape(state.data.intro) + "</textarea>" +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Quick links (Label | URL)</span>' +
          '<textarea data-flow-field="quickLinks" class="' + inputClass(true) + '">' + escape(linksToText(state.data.quickLinks)) + "</textarea>" +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Support checklist (one per line)</span>' +
          '<textarea data-flow-field="supportChecklist" class="' + inputClass(true) + '">' + escape(linesToText(state.data.supportChecklist)) + "</textarea>" +
        "</label>" +
      "</div>";

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-flow-field]"), function (field) {
      field.addEventListener("input", function () {
        var key = field.getAttribute("data-flow-field");
        if (key === "quickLinks") {
          state.data.quickLinks = parseLinks(field.value);
        } else if (key === "supportChecklist") {
          state.data.supportChecklist = parseLines(field.value);
        } else {
          state.data[key] = field.value;
        }
        updateOutputs();
      });
    });
  }

  function choiceControls(choice, index, path, total) {
    var choicePath = path.concat(index);
    return (
      '<article class="rounded-2xl border border-gray-700 bg-gray-800 p-4 space-y-4">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<div>' +
            '<p class="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">Path ' + (index + 1) + "</p>" +
            '<p class="text-sm text-gray-300">' + escape(choice.next ? "Continues to another step." : "Ends in a result.") + "</p>" +
          "</div>" +
          '<div class="flex flex-wrap gap-2">' +
            controlButton("Up", 'data-move-choice="up|' + index + '"' + (index === 0 ? " disabled" : ""), "neutral") +
            controlButton("Down", 'data-move-choice="down|' + index + '"' + (index === total - 1 ? " disabled" : ""), "neutral") +
            controlButton("Duplicate", 'data-duplicate-choice="' + index + '"', "neutral") +
            controlButton("Delete", 'data-remove-choice="' + index + '"', "danger") +
          "</div>" +
        "</div>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Branch label</span>' +
          '<input data-choice-field="label|' + index + '" type="text" value="' + escape(choice.label) + '" class="' + inputClass(false) + '" />' +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Branch help text</span>' +
          '<input data-choice-field="description|' + index + '" type="text" value="' + escape(choice.description) + '" class="' + inputClass(false) + '" />' +
        "</label>" +
        '<div class="flex flex-wrap gap-2">' +
          controlButton(choice.next ? "Step Selected" : "Convert To Step", 'data-choice-mode="node|' + index + '"', choice.next ? "primary" : "neutral") +
          controlButton(choice.result ? "Result Selected" : "Convert To Result", 'data-choice-mode="result|' + index + '"', choice.result ? "primary" : "neutral") +
          (choice.next ? controlButton("Open Step", 'data-open-node="' + choicePath.join(".") + '"', "neutral") : "") +
          (choice.result ? controlButton("Open Result", 'data-open-result="' + choicePath.join(".") + '"', "neutral") : "") +
        "</div>" +
      "</article>"
    );
  }

  function renderNodeEditor() {
    var node = currentNode();
    var path = state.selected.path.slice();

    editorPanelEl.innerHTML =
      '<div class="space-y-5">' +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Step title</span>' +
          '<input data-node-field="title" type="text" value="' + escape(node.title) + '" class="' + inputClass(false) + '" />' +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Question</span>' +
          '<textarea data-node-field="question" class="' + inputClass(true) + '">' + escape(node.question) + "</textarea>" +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Details</span>' +
          '<textarea data-node-field="details" class="' + inputClass(true) + '">' + escape(node.details) + "</textarea>" +
        "</label>" +
        imageControlBlock("Step Image", "node.image", node.image, "node-image-upload") +
        '<div class="flex items-center justify-between gap-3">' +
          '<div>' +
            '<p class="text-xs uppercase tracking-[0.18em] text-gray-400 mb-2">Paths</p>' +
            '<h3 class="text-xl font-semibold text-white">Branch Controls</h3>' +
          "</div>" +
          controlButton("Add Path", 'id="add-choice"', "primary") +
        "</div>" +
        '<div class="space-y-4">' +
          node.choices.map(function (choice, index) {
            return choiceControls(choice, index, path, node.choices.length);
          }).join("") +
          (node.choices.length ? "" : '<div class="rounded-2xl border border-dashed border-gray-700 p-5 text-sm text-gray-400">This step has no paths yet.</div>') +
        "</div>" +
      "</div>";

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-node-field]"), function (field) {
      field.addEventListener("input", function () {
        node[field.getAttribute("data-node-field")] = field.value;
        renderTree();
        updateOutputs();
      });
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-image-field='node.image']"), function (field) {
      field.addEventListener("input", function () {
        node.image = field.value;
        renderTree();
        updateOutputs();
      });
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-choice-field]"), function (field) {
      field.addEventListener("input", function () {
        var parts = field.getAttribute("data-choice-field").split("|");
        node.choices[Number(parts[1])][parts[0]] = field.value;
        renderTree();
        updateOutputs();
      });
    });

    document.getElementById("add-choice").addEventListener("click", function () {
      node.choices.push(blankChoice());
      renderAll();
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-move-choice]"), function (button) {
      button.addEventListener("click", function () {
        var parts = button.getAttribute("data-move-choice").split("|");
        var direction = parts[0];
        var index = Number(parts[1]);
        var target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= node.choices.length) {
          return;
        }
        var temp = node.choices[index];
        node.choices[index] = node.choices[target];
        node.choices[target] = temp;
        renderAll();
      });
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-duplicate-choice]"), function (button) {
      button.addEventListener("click", function () {
        var index = Number(button.getAttribute("data-duplicate-choice"));
        node.choices.splice(index + 1, 0, cloneChoice(node.choices[index]));
        renderAll();
      });
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-remove-choice]"), function (button) {
      button.addEventListener("click", function () {
        node.choices.splice(Number(button.getAttribute("data-remove-choice")), 1);
        renderAll();
      });
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-choice-mode]"), function (button) {
      button.addEventListener("click", function () {
        var parts = button.getAttribute("data-choice-mode").split("|");
        var mode = parts[0];
        var index = Number(parts[1]);
        var choice = node.choices[index];
        if (mode === "node") {
          if (!choice.next) {
            choice.next = blankNode();
          }
          choice.result = null;
          selectNode(path.concat(index));
          return;
        }
        if (!choice.result) {
          choice.result = blankResult();
        }
        choice.next = null;
        selectResult(path.concat(index));
      });
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-open-node]"), function (button) {
      button.addEventListener("click", function () {
        selectNode(parsePath(button.getAttribute("data-open-node")));
      });
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-open-result]"), function (button) {
      button.addEventListener("click", function () {
        selectResult(parsePath(button.getAttribute("data-open-result")));
      });
    });

    var nodeUploadEl = document.getElementById("node-image-upload");
    if (nodeUploadEl) {
      nodeUploadEl.addEventListener("change", function () {
        var file = nodeUploadEl.files && nodeUploadEl.files[0];
        readImageFile(file).then(function (dataUrl) {
          node.image = dataUrl;
          renderAll();
          setStatus("Attached step image.", "success");
        }).catch(function (error) {
          setStatus(error.message || "Could not load that image.", "error");
        });
      });
    }
  }

  function renderResultEditor() {
    var choice = currentChoice();
    if (!choice) {
      selectNode([]);
      return;
    }
    if (!choice.result) {
      choice.result = blankResult();
    }

    editorPanelEl.innerHTML =
      '<div class="space-y-5">' +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Result title</span>' +
          '<input data-result-field="title" type="text" value="' + escape(choice.result.title) + '" class="' + inputClass(false) + '" />' +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Summary</span>' +
          '<textarea data-result-field="summary" class="' + inputClass(true) + '">' + escape(choice.result.summary) + "</textarea>" +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Steps (one per line)</span>' +
          '<textarea data-result-field="steps" class="' + inputClass(true) + '">' + escape(linesToText(choice.result.steps)) + "</textarea>" +
        "</label>" +
        '<label class="block">' +
          '<span class="block text-sm font-medium text-white mb-2">Links (Label | URL)</span>' +
          '<textarea data-result-field="links" class="' + inputClass(true) + '">' + escape(linksToText(choice.result.links)) + "</textarea>" +
        "</label>" +
        imageControlBlock("Result Image", "result.image", choice.result.image, "result-image-upload") +
        '<div class="rounded-2xl border border-gray-700 bg-gray-800 p-4 space-y-4">' +
          '<p class="text-xs uppercase tracking-[0.18em] text-gray-400">Attached Branch</p>' +
          '<label class="block">' +
            '<span class="block text-sm font-medium text-white mb-2">Branch label</span>' +
            '<input data-choice-meta="label" type="text" value="' + escape(choice.label) + '" class="' + inputClass(false) + '" />' +
          "</label>" +
          '<label class="block">' +
            '<span class="block text-sm font-medium text-white mb-2">Branch help text</span>' +
            '<input data-choice-meta="description" type="text" value="' + escape(choice.description) + '" class="' + inputClass(false) + '" />' +
          "</label>" +
        "</div>" +
        '<div class="flex flex-wrap gap-2">' +
          controlButton("Convert To Step", 'id="convert-result-to-node"', "primary") +
          controlButton("Delete Result", 'id="remove-result"', "danger") +
        "</div>" +
      "</div>";

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-choice-meta]"), function (field) {
      field.addEventListener("input", function () {
        choice[field.getAttribute("data-choice-meta")] = field.value;
        renderTree();
        updateOutputs();
      });
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-result-field]"), function (field) {
      field.addEventListener("input", function () {
        var key = field.getAttribute("data-result-field");
        if (key === "steps") {
          choice.result.steps = parseLines(field.value);
        } else if (key === "links") {
          choice.result.links = parseLinks(field.value);
        } else {
          choice.result[key] = field.value;
        }
        renderTree();
        updateOutputs();
      });
    });

    Array.prototype.forEach.call(editorPanelEl.querySelectorAll("[data-image-field='result.image']"), function (field) {
      field.addEventListener("input", function () {
        choice.result.image = field.value;
        renderTree();
        updateOutputs();
      });
    });

    document.getElementById("convert-result-to-node").addEventListener("click", function () {
      choice.next = blankNode();
      choice.result = null;
      selectNode(state.selected.path);
    });

    document.getElementById("remove-result").addEventListener("click", function () {
      choice.result = null;
      selectNode(state.selected.path.slice(0, -1));
    });

    var resultUploadEl = document.getElementById("result-image-upload");
    if (resultUploadEl) {
      resultUploadEl.addEventListener("change", function () {
        var file = resultUploadEl.files && resultUploadEl.files[0];
        readImageFile(file).then(function (dataUrl) {
          choice.result.image = dataUrl;
          renderAll();
          setStatus("Attached result image.", "success");
        }).catch(function (error) {
          setStatus(error.message || "Could not load that image.", "error");
        });
      });
    }
  }

  function renderEditor() {
    if (state.selected.type === "flow") {
      renderFlowEditor();
      return;
    }
    if (state.selected.type === "result") {
      renderResultEditor();
      return;
    }
    renderNodeEditor();
  }

  function renderAll() {
    renderTree();
    renderEditor();
    updateOutputs();
  }

  function copyText(text, successMessage) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      setStatus("Clipboard API is not available in this browser.", "error");
      return;
    }
    navigator.clipboard.writeText(text).then(function () {
      setStatus(successMessage, "success");
    }).catch(function (error) {
      setStatus(error.message || "Clipboard write failed.", "error");
    });
  }

  document.getElementById("select-flow").addEventListener("click", selectFlow);

  if (undoActionEl) {
    undoActionEl.addEventListener("click", undoHistory);
  }
  if (redoActionEl) {
    redoActionEl.addEventListener("click", redoHistory);
  }

  document.getElementById("load-default").addEventListener("click", function () {
    Troubleshooter.loadJsonUrl(defaultUrl).then(function (data) {
      state.selected = { type: "node", path: [] };
      setData(data, defaultUrl);
      setStatus("Loaded default flow.", "success");
    }).catch(function (error) {
      setStatus(error.message || "Could not load the default JSON file.", "error");
    });
  });

  importInputEl.addEventListener("change", function () {
    var file = importInputEl.files && importInputEl.files[0];
    Troubleshooter.readJsonFile(file).then(function (data) {
      state.selected = { type: "node", path: [] };
      setData(data, file.name);
      setStatus("Imported troubleshooting JSON.", "success");
    }).catch(function (error) {
      setStatus(error.message || "Could not import that JSON file.", "error");
    });
  });

  document.getElementById("download-json").addEventListener("click", function () {
    Troubleshooter.downloadText("fix-flow.json", jsonOutputEl.value, "application/json;charset=utf-8");
    setStatus("Downloaded JSON.", "success");
  });

  document.getElementById("download-md").addEventListener("click", function () {
    Troubleshooter.downloadText("fix.md", markdownOutputEl.value, "text/markdown;charset=utf-8");
    setStatus("Downloaded markdown.", "success");
  });

  document.getElementById("copy-json").addEventListener("click", function () {
    copyText(jsonOutputEl.value, "Copied JSON.");
  });

  document.getElementById("copy-md").addEventListener("click", function () {
    copyText(markdownOutputEl.value, "Copied markdown.");
  });

  document.getElementById("open-preview").addEventListener("click", function () {
    localStorage.setItem(previewKey, jsonOutputEl.value);
    window.open("/fix?source=builder", "_blank");
    setStatus("Opened preview.", "success");
  });

  document.getElementById("add-root-choice").addEventListener("click", function () {
    state.data.root.choices.push(blankChoice());
    renderAll();
  });

  jsonOutputEl.addEventListener("change", function () {
    try {
      setData(JSON.parse(jsonOutputEl.value), "manual JSON edit");
      setStatus("Applied JSON changes.", "success");
    } catch (error) {
      setStatus(error.message || "JSON output contains invalid syntax.", "error");
    }
  });

  markdownOutputEl.addEventListener("focus", function () {
    markdownOutputEl.select();
  });

  var autosavedFlow = loadAutosave();
  if (autosavedFlow) {
    setData(autosavedFlow, "browser storage");
    setStatus("Restored the last saved builder flow from browser storage.", "success");
  } else {
    Troubleshooter.loadJsonUrl(defaultUrl).then(function (data) {
      setData(data, defaultUrl);
      setStatus("", "success");
    }).catch(function (error) {
      setStatus(error.message || "Could not initialize builder state.", "error");
    });
  }

  setupLayoutControls();
  setupCanvasNavigation();
  setupKeyboardShortcuts();
})();
