import type { HTMLAttributes } from "react";

export function PanelHeading({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 {...props} className={`mt-3 mb-2 text-[14px] leading-none font-bold text-(--accent-color-contrast) ${className}`} />;
}
