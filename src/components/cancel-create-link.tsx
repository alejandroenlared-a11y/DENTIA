"use client";

import { useRouter } from "next/navigation";
import type React from "react";

type CancelCreateLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function CancelCreateLink({ href, children, className = "button", ariaLabel }: CancelCreateLinkProps) {
  const router = useRouter();

  return (
    <button
      aria-label={ariaLabel}
      className={className}
      type="button"
      onClick={() => {
        router.replace(href, { scroll: false });
        window.location.assign(href);
      }}
    >
      {children}
    </button>
  );
}
