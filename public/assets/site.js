(function () {
  // Alumni carousel
  document.querySelectorAll(".carousel").forEach((carousel) => {
    const track = carousel.querySelector(".carousel__track");
    const slides = carousel.querySelectorAll(".carousel-slide");
    const dotsWrap = carousel.querySelector(".carousel__dots");
    if (!track || slides.length <= 1) return;

    let current = 0;
    const autoplayMs = (parseInt(carousel.dataset.autoplay, 10) || 5) * 1000;

    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
    });

    const dots = dotsWrap.querySelectorAll(".carousel__dot");

    function goTo(index) {
      current = index;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("active", i === current));
    }

    let timer = setInterval(() => goTo((current + 1) % slides.length), autoplayMs);
    carousel.addEventListener("mouseenter", () => clearInterval(timer));
    carousel.addEventListener("mouseleave", () => {
      timer = setInterval(() => goTo((current + 1) % slides.length), autoplayMs);
    });
  });

  // Fee timeline scroll animation
  const feeSteps = document.querySelectorAll(".fee-step");
  const progress = document.querySelector(".fee-timeline__progress");
  const line = document.querySelector(".fee-timeline__line");

  function updateFeeTimeline() {
    if (!feeSteps.length || !progress || !line) return;
    const trigger = window.innerHeight * 0.6;
    let activeIndex = -1;

    feeSteps.forEach((step, index) => {
      const rect = step.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (mid < trigger) {
        activeIndex = index;
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });

    if (activeIndex >= 0) {
      const active = feeSteps[activeIndex];
      const lineRect = line.getBoundingClientRect();
      const stepRect = active.getBoundingClientRect();
      const h = stepRect.top - lineRect.top + stepRect.height / 2;
      progress.style.height = Math.max(0, h) + "px";
    }
  }

  window.addEventListener("scroll", updateFeeTimeline, { passive: true });
  updateFeeTimeline();
})();
