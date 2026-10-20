(function () {
  const LABEL = {
    ticker: "Announcement Bar",
    header: "Header / Nav",
    hero: "Hero",
    partners: "Hiring Partners",
    alumni: "Alumni",
    journey: "Journey",
    guarantee: "Placement Guarantee",
    course: "Course / Syllabus",
    jobs: "Job Profiles",
    fees: "Fee Structure",
    eligibility: "Eligibility",
    batch: "Next Batch",
    contact: "Contact / Footer"
  };

  const BUILTIN_REORDERABLE = new Set([
    "hero", "partners", "alumni", "journey", "guarantee", "course", "jobs", "fees", "eligibility", "batch"
  ]);
  const LOCKED = new Set(["ticker", "header", "contact"]);

  let selected = null;
  let dragId = null;
  let toolbar = null;

  function isReorderable(id) {
    return BUILTIN_REORDERABLE.has(id) || (typeof id === "string" && id.startsWith("blk_"));
  }

  function nearestSection(el) {
    return el && el.closest ? el.closest("[data-nexus-section]") : null;
  }

  function post(msg) {
    if (window.parent !== window) window.parent.postMessage(msg, "*");
  }

  function currentOrder() {
    return [...document.querySelectorAll("[data-nexus-section]")]
      .map((n) => n.getAttribute("data-nexus-section"))
      .filter((id) => isReorderable(id));
  }

  function ensureToolbar() {
    if (toolbar) return toolbar;
    toolbar = document.createElement("div");
    toolbar.className = "nexus-float-toolbar";
    toolbar.innerHTML = `
      <button type="button" data-tb="edit" title="Edit">Edit</button>
      <button type="button" data-tb="up" title="Move up">↑</button>
      <button type="button" data-tb="down" title="Move down">↓</button>
      <button type="button" data-tb="hide" title="Hide / show">Hide</button>
      <button type="button" data-tb="remove" title="Remove" class="nexus-tb-danger">Remove</button>
    `;
    toolbar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tb]");
      if (!btn || !selected) return;
      e.preventDefault();
      e.stopPropagation();
      post({ type: "nexus-toolbar", action: btn.dataset.tb, section: selected });
    });
    document.body.appendChild(toolbar);
    return toolbar;
  }

  function positionToolbar(node) {
    const bar = ensureToolbar();
    if (!node || !selected) {
      bar.classList.remove("is-visible");
      return;
    }
    const rect = node.getBoundingClientRect();
    const top = Math.max(8, rect.top + window.scrollY - 40);
    const left = Math.min(
      window.scrollX + rect.left + 8,
      window.scrollX + document.documentElement.clientWidth - 320
    );
    bar.style.top = `${top}px`;
    bar.style.left = `${left}px`;
    bar.classList.add("is-visible");

    const locked = LOCKED.has(selected);
    bar.querySelector('[data-tb="up"]').disabled = locked || !isReorderable(selected);
    bar.querySelector('[data-tb="down"]').disabled = locked || !isReorderable(selected);
    bar.querySelector('[data-tb="remove"]').disabled = locked;
    bar.querySelector('[data-tb="hide"]').textContent =
      node.getAttribute("data-nexus-hidden") === "true" ? "Show" : "Hide";
  }

  function setSelected(id) {
    document.querySelectorAll("[data-nexus-section].nexus-selected").forEach((n) => {
      n.classList.remove("nexus-selected");
    });
    selected = id;
    if (!id) {
      positionToolbar(null);
      return;
    }
    const node = document.querySelector(`[data-nexus-section="${id}"]`);
    if (node) {
      node.classList.add("nexus-selected");
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
      positionToolbar(node);
    } else {
      positionToolbar(null);
    }
  }

  function decorateSections() {
    document.querySelectorAll("[data-nexus-section]").forEach((node) => {
      const id = node.getAttribute("data-nexus-section");
      if (!node.querySelector(".nexus-section-label")) {
        const chip = document.createElement("span");
        chip.className = "nexus-section-label";
        chip.textContent = LABEL[id] || node.getAttribute("data-nexus-label") || id;
        node.appendChild(chip);
      }
      if (node.getAttribute("data-nexus-hidden") === "true" && !node.querySelector(".nexus-hidden-badge")) {
        const badge = document.createElement("span");
        badge.className = "nexus-hidden-badge";
        badge.textContent = "Hidden";
        node.appendChild(badge);
      }
      if (isReorderable(id) && !node.querySelector(".nexus-drag-handle")) {
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "nexus-drag-handle";
        handle.title = "Drag to reorder this section";
        handle.textContent = "⋮⋮ Drag";
        handle.draggable = true;
        handle.addEventListener("dragstart", (e) => {
          dragId = id;
          e.dataTransfer.setData("text/plain", id);
          e.dataTransfer.effectAllowed = "move";
          node.classList.add("nexus-dragging");
          post({ type: "nexus-select", section: id });
        });
        handle.addEventListener("dragend", () => {
          node.classList.remove("nexus-dragging");
          document.querySelectorAll(".nexus-drag-over").forEach((n) => n.classList.remove("nexus-drag-over"));
          dragId = null;
        });
        node.appendChild(handle);
      }

      if (isReorderable(id)) {
        node.addEventListener("dragover", (e) => {
          if (!dragId || dragId === id) return;
          e.preventDefault();
          node.classList.add("nexus-drag-over");
        });
        node.addEventListener("dragleave", () => node.classList.remove("nexus-drag-over"));
        node.addEventListener("drop", (e) => {
          e.preventDefault();
          node.classList.remove("nexus-drag-over");
          const fromId = e.dataTransfer.getData("text/plain") || dragId;
          const toId = id;
          if (!fromId || fromId === toId || !isReorderable(fromId)) return;
          const order = currentOrder();
          const from = order.indexOf(fromId);
          const to = order.indexOf(toId);
          if (from < 0 || to < 0) return;
          order.splice(from, 1);
          order.splice(to, 0, fromId);
          post({ type: "nexus-reorder", order });
        });
      }
    });
  }

  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest && e.target.closest(".nexus-drag-handle, .nexus-float-toolbar")) return;
      const a = e.target.closest && e.target.closest("a");
      if (a) {
        e.preventDefault();
        e.stopPropagation();
      }
      const section = nearestSection(e.target);
      if (!section) return;
      e.preventDefault();
      e.stopPropagation();
      const id = section.getAttribute("data-nexus-section");
      setSelected(id);
      post({ type: "nexus-select", section: id });
    },
    true
  );

  window.addEventListener("scroll", () => {
    if (!selected) return;
    const node = document.querySelector(`[data-nexus-section="${selected}"]`);
    positionToolbar(node);
  }, true);

  window.addEventListener("message", (e) => {
    const data = e.data || {};
    if (data.type === "nexus-highlight") setSelected(data.section || null);
    if (data.type === "nexus-scroll" && data.section) {
      const node = document.querySelector(`[data-nexus-section="${data.section}"]`);
      if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  decorateSections();
  ensureToolbar();
  post({ type: "nexus-ready" });
})();
