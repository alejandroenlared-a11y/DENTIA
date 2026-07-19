import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";

type DashboardLinkProps = NextLinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps>;

export function DashboardLink({ prefetch = false, ...props }: DashboardLinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}
