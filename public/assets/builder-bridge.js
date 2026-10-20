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

  let selected = null;

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

  document.addEventListener(
    "click",
    (e) => {
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
      if (window.parent !== window) {
        window.parent.postMessage({ type: "nexus-select", section: id }, "*");
      }
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

  document.querySelectorAll("[data-nexus-section]").forEach((node) => {
    const id = node.getAttribute("data-nexus-section");
    if (!node.querySelector(".nexus-section-label")) {
      const chip = document.createElement("span");
      chip.className = "nexus-section-label";
      chip.textContent = LABEL[id] || id;
      node.appendChild(chip);
    }
  });

  if (window.parent !== window) {
    window.parent.postMessage({ type: "nexus-ready" }, "*");
  }
})();
