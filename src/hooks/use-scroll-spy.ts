"use client";

import { useEffect, useState } from "react";

/**
 * Scroll-spy: returns the id of the section currently in view.
 * Sections are matched by element id; the active one is the last whose
 * top has crossed the offset threshold.
 */
export function useScrollSpy(ids: string[], offset = 120) {
  const [active, setActive] = useState<string>(ids[0] ?? "");

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + offset;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) {
          current = id;
        }
      }
      // near bottom → force last
      if (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 80
      ) {
        current = ids[ids.length - 1] ?? current;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids, offset]);

  return active;
}
