/** 명시적으로 새 캐러셀을 생성하는 툴바 버튼. */
export function CreateCarousel({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="캐러셀 만들기"
      aria-label="캐러셀 만들기"
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="5" y="3" width="14" height="12" rx="2" />
        <circle cx="9" cy="7" r="1" />
        <path d="m7 13 4-4 3 3 2-2 3 3M3 20h18M6 17l-3 3 3 3M18 17l3 3-3 3" />
      </svg>
    </button>
  );
}
