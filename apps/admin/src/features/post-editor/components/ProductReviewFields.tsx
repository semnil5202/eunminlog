/** 제품 리뷰 전용 필드 — 제품 목록(제품명/구매처/구매링크), 가격. */

import type { FocusEvent } from 'react';
import { useFieldArray, type Control, type UseFormSetValue } from 'react-hook-form';

import type { PostFormValues } from '../types/form';

type ProductReviewFieldsProps = {
  control: Control<PostFormValues>;
  setValue: UseFormSetValue<PostFormValues>;
};

export function ProductReviewFields({ control, setValue }: ProductReviewFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'products' });

  const handlePricePrefixBlur = (e: FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && !val.endsWith(' ')) {
      setValue('pricePrefix', val + ' ');
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="space-y-3">
        <label className="block text-base font-bold">제품 목록</label>
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-2 border border-input p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">제품 {index + 1}</span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  aria-label={`제품 ${index + 1} 삭제`}
                >
                  ×
                </button>
              )}
            </div>
            <input
              type="text"
              {...control.register(`products.${index}.name`)}
              placeholder="제품명을 입력해주세요."
              className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <input
                type="text"
                {...control.register(`products.${index}.source`)}
                placeholder="구매처명을 입력해주세요."
                className="h-9 grow basis-0 border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
              />
              <input
                type="url"
                {...control.register(`products.${index}.link`)}
                placeholder="https://..."
                className="h-9 grow basis-0 border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ name: '', source: '', link: '' })}
          className="h-9 w-full border border-dashed border-input text-sm text-muted-foreground hover:bg-accent"
        >
          + 제품 추가
        </button>
      </div>
      <div className="flex gap-2">
        <div className="grow-[2] basis-0">
          <label className="mb-1 block text-base font-bold">가격 설명</label>
          <input
            type="text"
            {...control.register('pricePrefix', { onBlur: handlePricePrefixBlur })}
            placeholder="ex) 메인 메뉴 평균 가격: "
            className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="grow basis-0">
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-base font-bold">금액</label>
            <span className="text-[12px] text-muted-foreground">(단위: 만원)</span>
          </div>
          <input
            type="number"
            {...control.register('price')}
            placeholder="금액"
            className="h-9 w-full border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>
    </div>
  );
}
