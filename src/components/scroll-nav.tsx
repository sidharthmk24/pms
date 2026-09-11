"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { scroller } from "react-scroll";

export function scrollToTarget(
  target: string,
  options?: {
    offset?: number;
    duration?: number;
    mode?: "register" | "login";
  }
) {
  if (typeof window === "undefined") return;

  if (options?.mode) {
    window.dispatchEvent(
      new CustomEvent("author-mode", { detail: { mode: options.mode } })
    );
  }

  // 1. Trigger react-scroll animation
  try {
    scroller.scrollTo(target, {
      duration: options?.duration ?? 700,
      delay: 0,
      smooth: "easeInOutCubic",
      offset: options?.offset ?? -90,
    });
  } catch (err) {
    console.debug("[scroll-nav] react-scroll error", err);
  }

  // 2. Direct DOM scroll to guarantee scrolling down under all circumstances
  const targetId = target === "signup" || target === "login" ? "auth" : target;
  const el = document.getElementById(targetId) || document.getElementById(target);
  if (el) {
    const y = el.getBoundingClientRect().top + window.pageYOffset + (options?.offset ?? -90);
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  // Update hash in URL without jumping
  if (window.history?.pushState) {
    window.history.pushState(null, "", `#${target}`);
  }
}

interface ScrollButtonProps {
  to: string;
  mode?: "register" | "login";
  offset?: number;
  duration?: number;
  className?: string;
  children: ReactNode;
  title?: string;
}

export function ScrollButton({
  to,
  mode,
  offset = -90,
  duration = 750,
  className = "",
  children,
  title,
}: ScrollButtonProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();

    if (pathname === "/publish" || pathname === "/") {
      scrollToTarget(to, { offset, duration, mode });
    } else {
      const hash = to;
      const param = mode ? `?mode=${mode}` : "";
      router.push(`/publish${param}#${hash}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
}

export function AutoScrollOnHash() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleInitialHash() {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;

      const validTargets = ["auth", "signup", "login", "genres", "guidelines", "process"];
      if (validTargets.includes(hash)) {
        setTimeout(() => {
          scrollToTarget(hash, {
            offset: -90,
            mode: hash === "login" ? "login" : hash === "signup" ? "register" : undefined,
          });
        }, 150);
      }
    }

    handleInitialHash();
    window.addEventListener("hashchange", handleInitialHash);

    return () => {
      window.removeEventListener("hashchange", handleInitialHash);
    };
  }, [pathname]);

  return null;
}
