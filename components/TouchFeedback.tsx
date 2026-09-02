"use client";

import { useEffect } from "react";

// Makes tap feedback (globals.css' `:active` scale/dim rule) actually fire
// on iOS Safari. WebKit has a decades-old quirk where `:active` on <a> and
// <button> never triggers from a touch tap unless *something* on the page
// is listening for touch events — normally you'd never notice because most
// sites have at least one touchstart/touchmove listener somewhere, but this
// app didn't have any, so every tap (vehicle cards, nav tabs, form buttons)
// gave zero visual sign it registered until whatever it triggered actually
// finished (navigation, a state update, a server action). A single no-op
// listener, registered once here in the root layout, is the standard fix.
export default function TouchFeedback() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  return null;
}
