/**
 * tooltip.js
 * Shows the text of [data-tooltip] in a single shared .tooltip element
 * (styles/04-components/tooltip.css) on mouse/pen hover or keyboard focus.
 *
 * The tooltip is appended to <body> and position: fixed, so it isn't
 * clipped by overflow: hidden ancestors (e.g. .work-card-media).
 */

(() => {
  const GAP = 8;      // px between trigger and tooltip
  const MARGIN = 8;   // px kept clear of the viewport edges

  const tip = document.createElement("div");
  tip.className = "tooltip";
  tip.id = "tooltip";
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);

  let current = null;

  const position = (trigger) => {
    const r = trigger.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;

    // Preferred side, flipped if it would leave the viewport
    let placement = trigger.dataset.tooltipPosition === "bottom" ? "bottom" : "top";
    if (placement === "top" && r.top - GAP - h < MARGIN) placement = "bottom";
    else if (placement === "bottom" && r.bottom + GAP + h > window.innerHeight - MARGIN) placement = "top";

    const top = placement === "top" ? r.top - GAP - h : r.bottom + GAP;
    const centered = r.left + r.width / 2 - w / 2;
    const left = Math.min(Math.max(centered, MARGIN), window.innerWidth - w - MARGIN);

    tip.dataset.placement = placement;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  };

  const show = (trigger) => {
    const text = trigger.dataset.tooltip;
    if (!text) return;
    if (current && current !== trigger) hide();
    current = trigger;

    tip.textContent = text;

    // Match the trigger's theme context (e.g. a dark section on a light page)
    const themed = trigger.closest("[data-theme]");
    if (themed) tip.setAttribute("data-theme", themed.getAttribute("data-theme"));
    else tip.removeAttribute("data-theme");

    // Announce to assistive tech, unless the trigger itself is hidden from it
    if (trigger.getAttribute("aria-hidden") !== "true") {
      trigger.setAttribute("aria-describedby", tip.id);
    }

    position(trigger);
    tip.classList.add("is-visible");
  };

  const hide = () => {
    if (!current) return;
    if (current.getAttribute("aria-describedby") === tip.id) {
      current.removeAttribute("aria-describedby");
    }
    current = null;
    tip.classList.remove("is-visible");
  };

  // Hover: mouse and pen only — on touch, the tap would navigate first
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const trigger = e.target.closest("[data-tooltip]");
    if (trigger && trigger !== current) show(trigger);
  });

  document.addEventListener("pointerout", (e) => {
    if (!current) return;
    const to = e.relatedTarget;
    if (to && current.contains(to)) return; // still inside the trigger
    if (e.target.closest("[data-tooltip]") === current) hide();
  });

  // Keyboard focus
  document.addEventListener("focusin", (e) => {
    const trigger = e.target.closest("[data-tooltip]");
    if (trigger && trigger.matches(":focus-visible")) show(trigger);
  });

  document.addEventListener("focusout", (e) => {
    if (e.target.closest("[data-tooltip]") === current) hide();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });

  // Fixed positioning goes stale when the page moves under it
  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("resize", hide);
})();
