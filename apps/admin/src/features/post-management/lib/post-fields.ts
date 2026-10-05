import type { PostFormValues } from '@/features/post-editor/types/form';
import type { TranslationResult } from '@/features/translation/types';

/** 선택한 폼 형식에 해당하는 게시글 전용 필드만 저장한다.
 * @param values 게시글 폼 값
 */
export function postSpecificFields(values: PostFormValues) {
  const isVisit = values.formType === 'visit';
  const isProductReview = values.formType === 'product-review';
  const products = isProductReview ? values.products.filter((product) => product.name.trim()) : [];
  const productPricePrefixes = products.map((product) => product.pricePrefix);
  const productPrices = products.map((product) => (product.price ? Number(product.price) : 0));

  return {
    place_name: isVisit ? values.placeName || null : null,
    address: isVisit ? values.address || null : null,
    price_prefix: isProductReview
      ? productPricePrefixes.some(Boolean)
        ? productPricePrefixes
        : null
      : isVisit && values.pricePrefix
        ? [values.pricePrefix]
        : null,
    price: isProductReview
      ? productPrices.some(Boolean)
        ? productPrices
        : null
      : isVisit && values.price
        ? [Number(values.price)]
        : null,
    product_name: products.length ? products.map((product) => product.name) : null,
    purchase_source: products.length ? products.map((product) => product.source) : null,
    purchase_link: products.length ? products.map((product) => product.link) : null,
    is_coupang_partners: isProductReview && values.isCoupangPartners,
  };
}

/** 선택한 폼 형식에 해당하는 번역 전용 필드만 저장한다.
 * @param formType 게시글 폼 형식
 * @param translation 번역 결과
 */
export function translationSpecificFields(
  formType: PostFormValues['formType'],
  translation: TranslationResult,
) {
  return {
    place_name: formType === 'visit' ? translation.place_name || null : null,
    address: formType === 'visit' ? translation.address || null : null,
    product_name:
      formType === 'product-review' && translation.product_name?.length
        ? translation.product_name
        : null,
    purchase_source:
      formType === 'product-review' && translation.purchase_source?.length
        ? translation.purchase_source
        : null,
    price_prefix:
      formType !== 'basic' && translation.price_prefix?.length ? translation.price_prefix : null,
  };
}
