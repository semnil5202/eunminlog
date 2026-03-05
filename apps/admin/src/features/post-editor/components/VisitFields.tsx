/** 체험 방문 전용 필드 — 장소, 주소, 가격대. */

type VisitFieldsProps = {
  placeName: string;
  address: string;
  priceMin: string;
  priceMax: string;
  onPlaceNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
};

export function VisitFields({
  placeName,
  address,
  priceMin,
  priceMax,
  onPlaceNameChange,
  onAddressChange,
  onPriceMinChange,
  onPriceMaxChange,
}: VisitFieldsProps) {
  return (
    <div className="mt-8 space-y-4">
      <div>
        <label className="mb-1 block text-base font-bold text-primary-600">장소</label>
        <input
          type="text"
          value={placeName}
          onChange={(e) => onPlaceNameChange(e.target.value)}
          placeholder="장소를 입력해주세요."
          className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div>
        <label className="mb-1 block text-base font-bold text-primary-600">주소</label>
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="주소를 입력해주세요."
          className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div>
        <div className="mb-1 flex items-baseline gap-1.5">
          <label className="text-base font-bold text-primary-600">가격대</label>
          <span className="text-[14px] text-muted-foreground">(단위: 만원)</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priceMin}
            onChange={(e) => onPriceMinChange(e.target.value)}
            placeholder="최소"
            className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="shrink-0 text-sm text-muted-foreground">-</span>
          <input
            type="number"
            value={priceMax}
            onChange={(e) => onPriceMaxChange(e.target.value)}
            placeholder="최대"
            className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>
    </div>
  );
}
