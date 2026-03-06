import type { SVGProps } from 'react';

export function TableIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Table"
      {...props}
    >
      <title>Table</title>
      <path
        d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5ZM3.5 3C3.22386 3 3 3.22386 3 3.5V6H6V3H3.5ZM7 3V6H13V3.5C13 3.22386 12.7761 3 12.5 3H7ZM13 7H7V9H13V7ZM13 10H7V13H12.5C12.7761 13 13 12.7761 13 12.5V10ZM6 13V10H3V12.5C3 12.7761 3.22386 13 3.5 13H6ZM3 9H6V7H3V9Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}
