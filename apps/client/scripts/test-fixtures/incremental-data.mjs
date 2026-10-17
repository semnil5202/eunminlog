const locales = ['en', 'ja'];

const bookmark =
  '<aside data-type="link-bookmark" data-url="https://eunminlog.site/travel/domestic/post-12/" data-title="원래 제목" data-description="원래 설명"><a href="https://eunminlog.site/travel/domestic/post-12/"><strong>원래 제목</strong><p>원래 설명</p></a></aside>';

export function makePost(number) {
  return {
    id: `post-${String(number).padStart(2, '0')}`,
    slug: `post-${number}`,
    title: `글 ${number}`,
    description: `요약 ${number}`,
    content: `<p>본문 ${number}</p>${number === 1 ? bookmark : ''}`,
    category: number === 12 ? 'travel' : 'cafe',
    sub_category: number === 12 ? 'domestic' : 'hotplace',
    thumbnail: '/favicon.svg',
    thumbnail_alt: `썸네일 ${number}`,
    is_sponsored: false,
    is_coupang_partners: false,
    is_recommended: number < 3,
    is_multilingual: true,
    rating: null,
    place_name: '',
    address: '',
    price_prefix: null,
    price: null,
    product_name: null,
    purchase_source: null,
    purchase_link: null,
    image_alts: [],
    created_at: new Date(Date.UTC(2026, 0, 31 - number)).toISOString(),
    updated_at: '2026-02-01T00:00:00.000Z',
  };
}

export function makeTranslations(post) {
  return locales.map((locale) => ({
    id: `${post.id}-${locale}`,
    post_id: post.id,
    locale,
    title: `${locale} ${post.title}`,
    description: `${locale} ${post.description}`,
    content: post.content,
    place_name: null,
    address: null,
    product_name: null,
    purchase_source: null,
    price_prefix: null,
    thumbnail_alt: null,
    image_alts: [],
    created_at: post.created_at,
    updated_at: post.updated_at,
  }));
}

export function makeFixture() {
  const posts = Array.from({ length: 12 }, (_, index) => makePost(index + 1));
  const categories = [
    {
      id: 'cafe',
      slug: 'cafe',
      name: '카페',
      parent_id: null,
      sort_order: 1,
      is_multilingual: true,
    },
    {
      id: 'hotplace',
      slug: 'hotplace',
      name: '핫플',
      parent_id: 'cafe',
      sort_order: 2,
      is_multilingual: true,
    },
    {
      id: 'travel',
      slug: 'travel',
      name: '여행',
      parent_id: null,
      sort_order: 3,
      is_multilingual: true,
    },
    {
      id: 'domestic',
      slug: 'domestic',
      name: '국내',
      parent_id: 'travel',
      sort_order: 4,
      is_multilingual: true,
    },
  ];
  return {
    posts,
    post_translations: posts.flatMap(makeTranslations),
    categories,
    category_translations: categories.flatMap((category) =>
      locales.map((locale) => ({
        category_id: category.id,
        locale,
        name: `${locale} ${category.name}`,
      })),
    ),
  };
}

export const scenarios = [
  [
    'title-body',
    (data) =>
      Object.assign(data.posts[0], {
        title: '수정한 제목',
        content: '<p>수정한 본문</p>',
        updated_at: '2026-03-01T00:00:00.000Z',
      }),
  ],
  [
    'translation',
    (data) =>
      Object.assign(data.post_translations[0], {
        title: 'Edited English title',
        content: '<p>Edited English body</p>',
      }),
  ],
  [
    'publish',
    (data) => {
      const post = makePost(13);
      data.posts.push(post);
      data.post_translations.push(...makeTranslations(post));
    },
  ],
  [
    'delete',
    (data) => {
      data.posts = data.posts.filter((post) => post.id !== 'post-01');
      data.post_translations = data.post_translations.filter((row) => row.post_id !== 'post-01');
    },
  ],
  [
    'recommendation',
    (data) => {
      data.posts[0].is_recommended = false;
      data.posts[4].is_recommended = true;
    },
  ],
  [
    'slug-category',
    (data) =>
      Object.assign(data.posts[0], {
        slug: 'moved-post',
        category: 'travel',
        sub_category: 'domestic',
      }),
  ],
  [
    'multilingual-off',
    (data) => {
      data.posts[0].is_multilingual = false;
    },
  ],
  [
    'bookmark-translation',
    (data) => {
      data.post_translations.find((row) => row.post_id === 'post-12' && row.locale === 'en').title =
        'Changed bookmark target';
    },
  ],
  [
    'last-category-delete',
    (data) => {
      data.posts = data.posts.filter((post) => post.id !== 'post-12');
      data.post_translations = data.post_translations.filter((row) => row.post_id !== 'post-12');
    },
  ],
  [
    'feed-11-to-10',
    (data) => {
      data.posts = data.posts.filter((post) => post.id !== 'post-11');
      data.post_translations = data.post_translations.filter((row) => row.post_id !== 'post-11');
    },
  ],
  [
    'category-label',
    (data) => {
      data.categories[0].name = '수정된 분류';
      data.category_translations[0].name = 'Edited category';
    },
  ],
];
