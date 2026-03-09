/** 가격 설명 + 금액 입력 행. 체험 방문, 제품 리뷰 폼에서 공용. */

import type { FocusEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

type PriceInputRowProps = {
  prefixRegister: UseFormRegisterReturn;
  priceRegister: UseFormRegisterReturn;
  onPrefixBlur: (e: FocusEvent<HTMLInputElement>) => void;
  prefixPlaceholder?: string;
};

export function PriceInputRow({
  prefixRegister,
  priceRegister,
  onPrefixBlur,
  prefixPlaceholder = 'ex) 1인 기준 ',
}: PriceInputRowProps) {
  const { onBlur: prefixOnBlur, ...prefixRest } = prefixRegister;

  const handlePrefixBlur = (e: FocusEvent<HTMLInputElement>) => {
    prefixOnBlur(e);
    onPrefixBlur(e);
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        {...prefixRest}
        onBlur={handlePrefixBlur}
        placeholder={prefixPlaceholder}
        className="h-9 grow basis-0 border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
      />
      <input
        type="number"
        {...priceRegister}
        placeholder="금액"
        className="h-9 grow basis-0 border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}
