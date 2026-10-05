import type { UseFormSetValue } from 'react-hook-form';

import type { PostFormType } from '@/shared/types/post';
import type { PostFormValues } from '../types/form';

/** 폼 형식을 바꾸고 이전 형식의 전용 입력을 초기화한다.
 * @param setValue 폼 값 갱신 함수
 * @param formType 변경할 폼 형식
 */
export function changePostFormType(
  setValue: UseFormSetValue<PostFormValues>,
  formType: PostFormType,
) {
  setValue('formType', formType, { shouldDirty: true });
  setValue('isCoupangPartners', false);
  setValue('placeName', '');
  setValue('address', '');
  setValue('pricePrefix', '');
  setValue('price', '');
  setValue('products', [{ name: '', source: '', link: '', pricePrefix: '', price: '' }]);
}
