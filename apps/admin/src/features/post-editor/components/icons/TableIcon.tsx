import type { SVGProps } from 'react';

export function TableIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Table"
      {...props}
    >
      <title>Table</title>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M3 9h18M3 15h18" />
    </svg>
  );
}
