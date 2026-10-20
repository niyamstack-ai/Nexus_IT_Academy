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

  const REORDERABLE = new Set([
    "hero", "partners", "alumni", "journey", "guarantee", "course", "jobs", "fees", "eligibility", "batch", "contact"
  ]);

  let selected = null;
  let dragId = null;

  function nearestSection(el) {
    return el && el.closest ? el.closest("[data-nexus-section]") : null;
  }

  function setSelected(id) {
    document.querySelectorAll("[data-nexus-section].nexus-selected").forEach((n) => {
      n.classList.remove("nexus-selected");
    });
    selected = id;
    if (!id) return;
    const node = document.querySelector(`[data-nexus-section="${id}"]`);
    if (node) {
      node.classList.add("nexus-selected");
      node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function post(msg) {
    if (window.parent !== window) window.parent.postMessage(msg, "*");
  }

  function currentOrder() {
    return [...document.querySelectorAll("[data-nexus-section]")]
      .map((n) => n.getAttribute("data-nexus-section"))
      .filter((id) => REORDERABLE.has(id));
  }

  function decorateSections() {
    document.querySelectorAll("[data-nexus-section]").forEach((node) => {
      const id = node.getAttribute("data-nexus-section");
      if (!node.querySelector(".nexus-section-label")) {
        const chip = document.createElement("span");
        chip.className = "nexus-section-label";
        chip.textContent = LABEL[id] || id;
        node.appendChild(chip);
      }
      if (REORDERABLE.has(id) && !node.querySelector(".nexus-drag-handle")) {
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

      if (REORDERABLE.has(id)) {
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
          if (!fromId || fromId === toId || !REORDERABLE.has(fromId)) return;
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
      if (e.target.closest && e.target.closest(".nexus-drag-handle")) return;
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

  window.addEventListener("message", (e) => {
    const data = e.data || {};
    if (data.type === "nexus-highlight") setSelected(data.section || null);
    if (data.type === "nexus-scroll" && data.section) {
      const node = document.querySelector(`[data-nexus-section="${data.section}"]`);
      if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  decorateSections();
  post({ type: "nexus-ready" });
})();
