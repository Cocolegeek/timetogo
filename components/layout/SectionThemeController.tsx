"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSection } from "@/lib/section-theme";

/**
 * Mirrors the current section (derived from the URL) into a `data-section`
 * attribute on <html>. CSS does the rest — see globals.css.
 *
 * No render. Mount once at the root of the tree.
 */
export function SectionThemeController() {
  const pathname = usePathname();

  useEffect(() => {
    const section = getSection(pathname);
    document.documentElement.dataset.section = section;
  }, [pathname]);

  return null;
}
