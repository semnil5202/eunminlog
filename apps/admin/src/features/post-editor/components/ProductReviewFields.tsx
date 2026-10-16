/** 제품 리뷰 전용 필드 — 제품 목록과 선택 평점 입력. */

import { useEffect, type FocusEvent } from 'react';
import { getSingleProductName } from '@eunminlog/config/rating';
import {
  useController,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormSetValue,
} from 'react-hook-form';

import type { PostFormValues } from '../types/form';
import { PriceInputRow } from './PriceInputRow';

type ProductReviewFieldsProps = {
  control: Control<PostFormValues>;
  setValue: UseFormSetValue<PostFormValues>;
};

export function ProductReviewFields({ control, setValue }: ProductReviewFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'products' });
  const products = useWatch({ control, name: 'products' });
  const { field: rating, fieldState: ratingState } = useController({ control, name: 'rating' });
  const canRate = Boolean(getSingleProductName(products.map((product) => product.name)));

  useEffect(() => {
    if (!canRate && rating.value !== null) {
      setValue('rating', null, { shouldDirty: true, shouldValidate: true });
    }
  }, [canRate, rating.value, setValue]);

  const handlePricePrefixBlur = (index: number) => (e: FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && !val.endsWith(' ')) {
      setValue(`products.${index}.pricePrefix`, val + ' ');
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-base font-bold">제품 목록</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...control.register('isCoupangPartners')}
            className="size-4 accent-primary-600"
          />
          <span className="text-sm font-medium">쿠팡 파트너스 여부</span>
        </label>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-2 border border-input p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">제품 {index + 1}</span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-lg text-muted-foreground hover:text-foreground"
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
            <PriceInputRow
              prefixRegister={control.register(`products.${index}.pricePrefix`)}
              priceRegister={control.register(`products.${index}.price`)}
              onPrefixBlur={handlePricePrefixBlur(index)}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ name: '', source: '', link: '', pricePrefix: '', price: '' })}
          className="h-9 w-full border border-dashed border-input text-sm text-muted-foreground hover:bg-accent"
        >
          + 제품 추가
        </button>
      </div>
      {canRate && (
        <div className="space-y-2">
          <label htmlFor="product-rating" className="block text-base font-bold">
            은민 평점
          </label>
          <div className="flex items-center gap-2">
            <input
              {...rating}
              id="product-rating"
              type="number"
              min={1}
              max={5}
              step={0.1}
              value={rating.value ?? ''}
              onChange={(event) =>
                rating.onChange(event.target.value === '' ? null : event.target.valueAsNumber)
              }
              aria-invalid={Boolean(ratingState.error)}
              aria-describedby="product-rating-help"
              placeholder="예: 3.8"
              className="h-9 w-28 border border-input bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground"
            />
            <span className="text-sm text-muted-foreground">/5</span>
          </div>
          <p id="product-rating-help" className="text-sm text-muted-foreground">
            1~5점, 소수 한 자리까지 입력할 수 있습니다. 비워두면 공개되지 않습니다.
            <br />
            리뷰 JSON-LD 적용을 위해 단일 제품만 평가합니다.
          </p>
          {ratingState.error && (
            <p className="text-sm text-destructive">{ratingState.error.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
