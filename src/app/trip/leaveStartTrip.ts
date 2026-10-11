/**
 * The hand-off on Your trip from the empty "start a trip" form to the filled-in bookings:
 * the form fades and lifts away first, then `then` swaps the content, and the bookings rise
 * in (ck-rise, staggered in page.tsx). With reduced motion it swaps straight away.
 * The fade runs through the Web Animations API, so there is no stylesheet to keep in step.
 */
export const START_TRIP_ID = "start-trip";
const LEAVE_MS = 220;

export function leaveStartTrip(then: () => void) {
  const el = typeof document === "undefined" ? null : document.getElementById(START_TRIP_ID);
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    then();
    return;
  }
  // Only opacity and transform, held at the end until the content is swapped.
  el.animate(
    [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: "translateY(-10px)" },
    ],
    { duration: LEAVE_MS, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
  );
  window.setTimeout(then, LEAVE_MS);
}
