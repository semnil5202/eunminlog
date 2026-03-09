/** 체험 방문 전용 필드 — 장소, 주소, 가격. */

import type { FocusEvent } from 'react';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

import type { PostFormValues } from '../types/form';
import { PriceInputRow } from './PriceInputRow';

type VisitFieldsProps = {
  register: UseFormRegister<PostFormValues>;
  errors: FieldErrors<PostFormValues>;
  setValue: UseFormSetValue<PostFormValues>;
};

export function VisitFields({ register, errors, setValue }: VisitFieldsProps) {
  const handlePricePrefixBlur = (e: FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && !val.endsWith(' ')) {
      setValue('pricePrefix', val + ' ');
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div>
        <label className="mb-1 block text-base font-bold">
          장소 <span className="text-primary-600">*</span>
        </label>
        <input
          type="text"
          {...register('placeName')}
          placeholder="장소를 입력해주세요."
          className={`h-9 w-full border ${errors.placeName ? 'border-red-500' : 'border-input'} bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground`}
        />
        {errors.placeName && (
          <p className="mt-1 text-[14px] text-red-500">{errors.placeName.message}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-base font-bold">
          주소 <span className="text-primary-600">*</span>
        </label>
        <input
          type="text"
          {...register('address')}
          placeholder="주소를 입력해주세요."
          className={`h-9 w-full border ${errors.address ? 'border-red-500' : 'border-input'} bg-transparent px-3 text-sm shadow-xs outline-none placeholder:text-muted-foreground`}
        />
        {errors.address && (
          <p className="mt-1 text-[14px] text-red-500">{errors.address.message}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-base font-bold">가격</label>
        <PriceInputRow
          prefixRegister={register('pricePrefix')}
          priceRegister={register('price')}
          onPrefixBlur={handlePricePrefixBlur}
          prefixPlaceholder="ex) 메인 메뉴 평균 가격: "
        />
      </div>
    </div>
  );
}
