import type { Locale } from '@/shared/types/common';
import { SITE_NAME_KO, SITE_NAME_EN } from '@eunminlog/config/site';

type StatItem = {
  value: string;
  label: string;
};

type CollaborationType = {
  title: string;
  description: string;
  icon: string;
};

type SeoFeature = {
  title: string;
  description: string;
};

type SponsorContent = {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    headline: string;
    subtext: string;
    cta: string;
  };
  blogIntro: {
    heading: string;
    paragraphs: string[];
    note: string;
  };
  seoStrengths: {
    heading: string;
    subtext: string;
    multilingual: {
      heading: string;
      description: string;
    };
    features: SeoFeature[];
  };
  stats: {
    heading: string;
    items: StatItem[];
    note: string;
  };
  collaboration: {
    heading: string;
    subtext: string;
    types: CollaborationType[];
  };
  cta: {
    heading: string;
    subtext: string;
    buttonLabel: string;
    mailto: {
      subject: string;
      body: string;
    };
  };
};

const CONTACT_EMAIL = 'eunminlog@gmail.com';

const SPONSOR: Record<Locale, SponsorContent> = {
  ko: {
    meta: {
      title: '협찬 문의',
      description: `${SITE_NAME_KO}는 맛집, 카페, 여행 콘텐츠를 8개 언어로 제공하는 커플 블로그입니다. 협찬 및 광고 문의를 받고 있습니다.`,
    },
    hero: {
      headline: '당신의 공간과 브랜드를\n더 많은 사람에게 알리세요',
      subtext: `${SITE_NAME_KO}는 맛집, 카페, 여행 콘텐츠를 8개 언어로 전 세계에 전달하는 블로그입니다.`,
      cta: '이메일로 문의하기',
    },
    blogIntro: {
      heading: '은민로그를 소개합니다',
      paragraphs: [
        '서울과 전국 각지의 맛집, 카페, 여행지를 직접 방문해, 경험을 바탕으로 리뷰 콘텐츠를 제작하는 커플 블로거입니다.',
        '단순한 후기 작성이 아닌, 검색 결과에서 잘 보이는 콘텐츠로 제작해 더 많은 사람에게 노출하고 다국어 지원을 통해 해외 독자에게도 당신의 이야기를 전달합니다.',
      ],
      note: '* 다국어 적용은 카테고리에 따라 상이할 수 있으므로 문의 부탁드립니다.',
    },
    seoStrengths: {
      heading: '글로벌 도달, 검색에 강한 콘텐츠',
      subtext:
        '단순히 글을 올리는 블로그가 아니라, 검색 결과에서 더 잘 노출되도록 설계된 기술 기반 콘텐츠 플랫폼입니다.',
      multilingual: {
        heading: '🌍 8개 언어 다국어 지원',
        description: '한국어, 영어, 일본어, 중국어(간체/번체), 인도네시아어, 베트남어, 태국어',
      },
      features: [
        {
          title: '⚡ 정적 사이트 생성 (SSG)',
          description:
            '모든 페이지를 미리 생성해 빠른 로딩 속도와 안정적인 사용자 경험을 제공합니다.',
        },
        {
          title: '🧩 JSON-LD 구조화 데이터',
          description:
            '검색 엔진과 AI가 이해하기 쉬운 구조로 콘텐츠를 구성해, 검색 결과는 물론 AI 기반 검색 환경에서도 리뷰와 정보가 더 잘 노출되도록 합니다.',
        },
        {
          title: '🔗 Hreflang 태그',
          description:
            '각 언어별 콘텐츠가 해당 국가 검색 결과에 잘 노출되도록 구성해, 해외 독자에게도 정확하게 전달됩니다.',
        },
        {
          title: '🗺 XML Sitemap',
          description:
            '주요 언어와 콘텐츠 페이지를 중심으로 사이트 구조를 정리해, 검색 엔진이 콘텐츠를 빠르고 효율적으로 인식할 수 있도록 합니다.',
        },
      ],
    },
    stats: {
      heading: '숫자로 보는 은민로그',
      // TODO: 실제 GA4 데이터로 교체
      items: [
        { value: '-', label: '월간 방문자' },
        { value: '8', label: '지원 언어' },
        { value: '-', label: '게시된 리뷰' },
        { value: '-', label: '콘텐츠 카테고리' },
      ],
      note: '* Google Analytics 기반',
    },
    collaboration: {
      heading: '협업 방식',
      subtext: '브랜드와 공간의 특성에 맞춰, 목적에 맞는 형태로 협업을 진행합니다.',
      types: [
        {
          title: '제품 리뷰',
          description: '제품 또는 서비스의 특징과 장점을 중심으로, 리뷰 콘텐츠를 제작합니다.',
          icon: '📝',
        },
        {
          title: '체험 방문',
          description: '매장이나 여행지를 직접 방문하여 생생한 후기를 작성합니다.',
          icon: '📍',
        },
        {
          title: '배너 광고',
          description: '사이트 흐름을 해치지 않는 위치에 자연스럽게 배너를 노출합니다.',
          icon: '📢',
        },
      ],
    },
    cta: {
      heading: '협찬 문의하기',
      subtext:
        '협업 방식, 다국어 적용, 일정 등 자세한 사항은 이메일로 문의해주세요. 빠르게 검토 후 안내드리겠습니다.',
      buttonLabel: '이메일로 문의하기',
      mailto: {
        subject: `[${SITE_NAME_EN}] 협찬 문의`,
        body:
          `안녕하세요, ${SITE_NAME_KO} 팀에게 협찬 문의드립니다.\n\n` +
          '1. 업체명/브랜드명:\n' +
          '2. 협업 유형 (제품 리뷰 / 체험 방문 / 배너 광고 / 기타):\n' +
          '3. 예산 범위:\n' +
          '4. 희망 일정:\n' +
          '5. 기타 전달 사항:\n',
      },
    },
  },
  en: {
    meta: {
      title: 'Sponsorship Inquiry',
      description: `${SITE_NAME_EN} is a couples blog offering food, cafe, and travel content in 8 languages. We welcome sponsorship and advertising inquiries.`,
    },
    hero: {
      headline: 'Your Space and Brand\nTo More People',
      subtext: `${SITE_NAME_EN} is a blog delivering food, cafe, and travel content to the world in 8 languages.`,
      cta: 'Send Email Inquiry',
    },
    blogIntro: {
      heading: `About ${SITE_NAME_EN}`,
      paragraphs: [
        'A couple of bloggers who visit restaurants, cafes, and travel destinations across Seoul and Korea, creating review content based on firsthand experience.',
        'Not just writing reviews, but creating content that ranks well in search results to reach more people, and delivering your story to international readers through multilingual support.',
      ],
      note: '* Multilingual availability may vary by category. Please inquire for details.',
    },
    seoStrengths: {
      heading: 'Global Reach, Search-Strong Content',
      subtext:
        'Not just a blog, but a technology-driven content platform designed to rank higher in search results.',
      multilingual: {
        heading: '🌍 8-Language Multilingual Support',
        description:
          'Korean, English, Japanese, Chinese (Simplified/Traditional), Indonesian, Vietnamese, Thai',
      },
      features: [
        {
          title: '⚡ Static Site Generation (SSG)',
          description:
            'All pages are pre-generated, providing fast loading speed and a stable user experience.',
        },
        {
          title: '🧩 JSON-LD Structured Data',
          description:
            'Structures content in a way that search engines and AI can easily understand, ensuring reviews and information are better exposed in both search results and AI-powered search environments.',
        },
        {
          title: '🔗 Hreflang Tags',
          description:
            "Configures content for each language to rank well in the corresponding country's search results, accurately reaching international readers.",
        },
        {
          title: '🗺 XML Sitemap',
          description:
            'Organizes site structure around key languages and content pages, enabling search engines to recognize content quickly and efficiently.',
        },
      ],
    },
    stats: {
      heading: `${SITE_NAME_EN} in Numbers`,
      // TODO: Replace with actual GA4 data
      items: [
        { value: '-', label: 'Monthly Visitors' },
        { value: '8', label: 'Languages' },
        { value: '-', label: 'Published Reviews' },
        { value: '-', label: 'Content Categories' },
      ],
      note: '* Based on Google Analytics',
    },
    collaboration: {
      heading: 'Collaboration Options',
      subtext:
        'We collaborate in formats tailored to the characteristics and goals of your brand and space.',
      types: [
        {
          title: 'Product Review',
          description:
            'Creates review content focusing on the features and strengths of the product or service.',
          icon: '📝',
        },
        {
          title: 'Experience Visit',
          description: 'Visit your venue or destination in person and write a vivid review.',
          icon: '📍',
        },
        {
          title: 'Banner Advertising',
          description: "Naturally display banners in positions that don't disrupt the site flow.",
          icon: '📢',
        },
      ],
    },
    cta: {
      heading: 'Get in Touch',
      subtext:
        'For details on collaboration format, multilingual support, schedule, and more, please contact us by email. We will review and respond promptly.',
      buttonLabel: 'Send Email Inquiry',
      mailto: {
        subject: `[${SITE_NAME_EN}] Sponsorship Inquiry`,
        body:
          `Hello, I'd like to inquire about sponsorship with ${SITE_NAME_EN}.\n\n` +
          '1. Company/Brand name:\n' +
          '2. Collaboration type (Product review / Experience visit / Banner ad / Other):\n' +
          '3. Budget range:\n' +
          '4. Preferred timeline:\n' +
          '5. Additional notes:\n',
      },
    },
  },
  ja: {
    meta: {
      title: '協賛お問い合わせ',
      description: `${SITE_NAME_EN}は、グルメ、カフェ、旅行コンテンツを8言語で提供するカップルブログです。協賛・広告のお問い合わせを受け付けています。`,
    },
    hero: {
      headline: 'あなたの空間とブランドを\nもっと多くの人に届けましょう',
      subtext: `${SITE_NAME_EN}は、グルメ、カフェ、旅行コンテンツを8言語で世界に届けるブログです。`,
      cta: 'メールで問い合わせる',
    },
    blogIntro: {
      heading: `${SITE_NAME_EN}のご紹介`,
      paragraphs: [
        'ソウルと韓国各地のレストラン、カフェ、観光地を直接訪問し、体験をもとにレビューコンテンツを制作するカップルブロガーです。',
        '単なるレビュー作成ではなく、検索結果で目立つコンテンツとして制作し、より多くの人に届け、多言語対応を通じて海外の読者にもあなたの物語を伝えます。',
      ],
      note: '* 多言語対応はカテゴリにより異なる場合がございますので、お問い合わせください。',
    },
    seoStrengths: {
      heading: 'グローバルリーチ、検索に強いコンテンツ',
      subtext:
        '単にブログを書くだけでなく、検索結果でより目立つように設計された技術基盤のコンテンツプラットフォームです。',
      multilingual: {
        heading: '🌍 8言語多言語対応',
        description:
          '韓国語、英語、日本語、中国語（簡体字/繁体字）、インドネシア語、ベトナム語、タイ語',
      },
      features: [
        {
          title: '⚡ 静的サイト生成（SSG）',
          description:
            'すべてのページを事前に生成し、速い読み込み速度と安定したユーザー体験を提供します。',
        },
        {
          title: '🧩 JSON-LD構造化データ',
          description:
            '検索エンジンとAIが理解しやすい構造でコンテンツを構成し、検索結果はもちろんAI基盤の検索環境でもレビューと情報がより良く露出されるようにします。',
        },
        {
          title: '🔗 Hreflangタグ',
          description:
            '各言語のコンテンツが該当国の検索結果に適切に表示されるよう構成し、海外の読者にも正確に届けます。',
        },
        {
          title: '🗺 XMLサイトマップ',
          description:
            '主要な言語とコンテンツページを中心にサイト構造を整理し、検索エンジンがコンテンツを素早く効率的に認識できるようにします。',
        },
      ],
    },
    stats: {
      heading: `数字で見る${SITE_NAME_EN}`,
      // TODO: 実際のGA4データに置き換え
      items: [
        { value: '-', label: '月間訪問者' },
        { value: '8', label: '対応言語' },
        { value: '-', label: '公開レビュー' },
        { value: '-', label: 'コンテンツカテゴリ' },
      ],
      note: '* Google Analyticsに基づく',
    },
    collaboration: {
      heading: 'コラボレーション方法',
      subtext: 'ブランドと空間の特性に合わせ、目的に合った形でコラボレーションを進めます。',
      types: [
        {
          title: '製品レビュー',
          description: '製品やサービスの特徴と強みを中心に、レビューコンテンツを制作します。',
          icon: '📝',
        },
        {
          title: '体験訪問',
          description: '店舗や観光地を直接訪問し、生き生きとしたレビューを書きます。',
          icon: '📍',
        },
        {
          title: 'バナー広告',
          description: 'サイトの流れを妨げない位置に自然にバナーを表示します。',
          icon: '📢',
        },
      ],
    },
    cta: {
      heading: 'お問い合わせ',
      subtext:
        '協業方式、多言語対応、スケジュールなど、詳しくはメールでお問い合わせください。迅速に検討しご案内いたします。',
      buttonLabel: 'メールで問い合わせる',
      mailto: {
        subject: `[${SITE_NAME_EN}] 協賛お問い合わせ`,
        body:
          `こんにちは、${SITE_NAME_EN}チームに協賛のお問い合わせをいたします。\n\n` +
          '1. 会社名/ブランド名:\n' +
          '2. コラボレーションの種類（製品レビュー / 体験訪問 / バナー広告 / その他）:\n' +
          '3. 予算範囲:\n' +
          '4. 希望スケジュール:\n' +
          '5. その他の連絡事項:\n',
      },
    },
  },
  'zh-CN': {
    meta: {
      title: '赞助咨询',
      description: `${SITE_NAME_EN}是一个以8种语言提供美食、咖啡厅、旅行内容的情侣博客。欢迎赞助和广告咨询。`,
    },
    hero: {
      headline: '您的空间与品牌\n让更多人了解',
      subtext: `${SITE_NAME_EN}是一个以8种语言向全世界传递美食、咖啡厅、旅行内容的博客。`,
      cta: '发送邮件咨询',
    },
    blogIntro: {
      heading: `关于${SITE_NAME_EN}`,
      paragraphs: [
        '走访首尔及韩国各地的餐厅、咖啡厅和旅游景点，基于亲身体验制作评价内容的情侣博主。',
        '不仅仅是撰写评价，而是制作在搜索结果中更容易被看到的内容，让更多人了解，并通过多语言支持将您的故事传递给海外读者。',
      ],
      note: '* 多语言支持因类别而异，请咨询了解详情。',
    },
    seoStrengths: {
      heading: '全球覆盖，搜索实力强的内容',
      subtext:
        '不只是一个发布文章的博客，而是一个为在搜索结果中获得更好展示而设计的技术驱动内容平台。',
      multilingual: {
        heading: '🌍 8种语言多语言支持',
        description: '韩语、英语、日语、中文（简体/繁体）、印尼语、越南语、泰语',
      },
      features: [
        {
          title: '⚡ 静态站点生成（SSG）',
          description: '预先生成所有页面，提供快速加载速度和稳定的用户体验。',
        },
        {
          title: '🧩 JSON-LD结构化数据',
          description:
            '以搜索引擎和AI易于理解的结构组织内容，使评价和信息不仅在搜索结果中，在AI搜索环境中也能更好地展示。',
        },
        {
          title: '🔗 Hreflang标签',
          description: '配置各语言内容使其在对应国家的搜索结果中良好展示，准确传达给海外读者。',
        },
        {
          title: '🗺 XML站点地图',
          description: '围绕主要语言和内容页面整理站点结构，使搜索引擎能够快速高效地识别内容。',
        },
      ],
    },
    stats: {
      heading: `数字看${SITE_NAME_EN}`,
      // TODO: 替换为实际GA4数据
      items: [
        { value: '-', label: '月访问量' },
        { value: '8', label: '支持语言' },
        { value: '-', label: '已发布评价' },
        { value: '-', label: '内容类别' },
      ],
      note: '* 基于Google Analytics',
    },
    collaboration: {
      heading: '合作方式',
      subtext: '根据品牌和空间的特点，以符合目标的形式进行合作。',
      types: [
        {
          title: '产品评价',
          description: '以产品或服务的特点和优势为核心，制作评价内容。',
          icon: '📝',
        },
        {
          title: '体验访问',
          description: '亲自访问店铺或旅游景点，撰写生动的评价。',
          icon: '📍',
        },
        {
          title: '横幅广告',
          description: '在不影响网站流畅度的位置自然地展示横幅广告。',
          icon: '📢',
        },
      ],
    },
    cta: {
      heading: '联系我们',
      subtext: '合作方式、多语言支持、日程等详细事项，请通过邮件联系我们。我们会尽快审核并回复。',
      buttonLabel: '发送邮件咨询',
      mailto: {
        subject: `[${SITE_NAME_EN}] 赞助咨询`,
        body:
          `您好，想向${SITE_NAME_EN}团队咨询赞助事宜。\n\n` +
          '1. 公司名/品牌名:\n' +
          '2. 合作类型（产品评价 / 体验访问 / 横幅广告 / 其他）:\n' +
          '3. 预算范围:\n' +
          '4. 期望日程:\n' +
          '5. 其他事项:\n',
      },
    },
  },
  'zh-TW': {
    meta: {
      title: '贊助諮詢',
      description: `${SITE_NAME_EN}是一個以8種語言提供美食、咖啡廳、旅行內容的情侶部落格。歡迎贊助和廣告諮詢。`,
    },
    hero: {
      headline: '您的空間與品牌\n讓更多人了解',
      subtext: `${SITE_NAME_EN}是一個以8種語言向全世界傳遞美食、咖啡廳、旅行內容的部落格。`,
      cta: '發送郵件諮詢',
    },
    blogIntro: {
      heading: `關於${SITE_NAME_EN}`,
      paragraphs: [
        '走訪首爾及韓國各地的餐廳、咖啡廳和旅遊景點，基於親身體驗製作評價內容的情侶部落客。',
        '不僅僅是撰寫評價，而是製作在搜尋結果中更容易被看到的內容，讓更多人了解，並透過多語言支援將您的故事傳遞給海外讀者。',
      ],
      note: '* 多語言支援因類別而異，請洽詢了解詳情。',
    },
    seoStrengths: {
      heading: '全球覆蓋，搜尋實力強的內容',
      subtext:
        '不只是一個發布文章的部落格，而是一個為在搜尋結果中獲得更好展示而設計的技術驅動內容平台。',
      multilingual: {
        heading: '🌍 8種語言多語言支援',
        description: '韓語、英語、日語、中文（簡體/繁體）、印尼語、越南語、泰語',
      },
      features: [
        {
          title: '⚡ 靜態網站生成（SSG）',
          description: '預先生成所有頁面，提供快速載入速度和穩定的使用者體驗。',
        },
        {
          title: '🧩 JSON-LD結構化資料',
          description:
            '以搜尋引擎和AI易於理解的結構組織內容，使評價和資訊不僅在搜尋結果中，在AI搜尋環境中也能更好地展示。',
        },
        {
          title: '🔗 Hreflang標籤',
          description: '配置各語言內容使其在對應國家的搜尋結果中良好展示，準確傳達給海外讀者。',
        },
        {
          title: '🗺 XML網站地圖',
          description: '圍繞主要語言和內容頁面整理網站結構，使搜尋引擎能夠快速高效地識別內容。',
        },
      ],
    },
    stats: {
      heading: `數字看${SITE_NAME_EN}`,
      // TODO: 替換為實際GA4數據
      items: [
        { value: '-', label: '月訪問量' },
        { value: '8', label: '支援語言' },
        { value: '-', label: '已發布評價' },
        { value: '-', label: '內容類別' },
      ],
      note: '* 基於Google Analytics',
    },
    collaboration: {
      heading: '合作方式',
      subtext: '根據品牌和空間的特點，以符合目標的形式進行合作。',
      types: [
        {
          title: '產品評價',
          description: '以產品或服務的特點和優勢為核心，製作評價內容。',
          icon: '📝',
        },
        {
          title: '體驗訪問',
          description: '親自訪問店鋪或旅遊景點，撰寫生動的評價。',
          icon: '📍',
        },
        {
          title: '橫幅廣告',
          description: '在不影響網站流暢度的位置自然地展示橫幅廣告。',
          icon: '📢',
        },
      ],
    },
    cta: {
      heading: '聯繫我們',
      subtext: '合作方式、多語言支援、日程等詳細事項，請透過郵件聯繫我們。我們會盡快審核並回覆。',
      buttonLabel: '發送郵件諮詢',
      mailto: {
        subject: `[${SITE_NAME_EN}] 贊助諮詢`,
        body:
          `您好，想向${SITE_NAME_EN}團隊諮詢贊助事宜。\n\n` +
          '1. 公司名/品牌名:\n' +
          '2. 合作類型（產品評價 / 體驗訪問 / 橫幅廣告 / 其他）:\n' +
          '3. 預算範圍:\n' +
          '4. 期望日程:\n' +
          '5. 其他事項:\n',
      },
    },
  },
  id: {
    meta: {
      title: 'Kerja Sama Sponsor',
      description: `${SITE_NAME_EN} adalah blog pasangan yang menyediakan konten kuliner, kafe, dan wisata dalam 8 bahasa. Kami menerima pertanyaan sponsor dan iklan.`,
    },
    hero: {
      headline: 'Ruang dan Brand Anda\nke Lebih Banyak Orang',
      subtext: `${SITE_NAME_EN} adalah blog yang menyampaikan konten kuliner, kafe, dan wisata ke seluruh dunia dalam 8 bahasa.`,
      cta: 'Kirim Email',
    },
    blogIntro: {
      heading: `Tentang ${SITE_NAME_EN}`,
      paragraphs: [
        'Pasangan blogger yang mengunjungi restoran, kafe, dan destinasi wisata di Seoul dan seluruh Korea, membuat konten ulasan berdasarkan pengalaman langsung.',
        'Bukan sekadar menulis ulasan, tapi membuat konten yang tampil menonjol di hasil pencarian untuk menjangkau lebih banyak orang, dan menyampaikan cerita Anda kepada pembaca internasional melalui dukungan multibahasa.',
      ],
      note: '* Ketersediaan multibahasa dapat berbeda tergantung kategori. Silakan hubungi kami untuk detail.',
    },
    seoStrengths: {
      heading: 'Jangkauan Global, Konten yang Kuat di Pencarian',
      subtext:
        'Bukan sekadar blog untuk menulis, tapi platform konten berbasis teknologi yang dirancang agar lebih terlihat di hasil pencarian.',
      multilingual: {
        heading: '🌍 Dukungan 8 Bahasa',
        description:
          'Korea, Inggris, Jepang, Mandarin (Sederhana/Tradisional), Indonesia, Vietnam, Thai',
      },
      features: [
        {
          title: '⚡ Static Site Generation (SSG)',
          description:
            'Semua halaman dibuat terlebih dahulu, memberikan kecepatan loading yang cepat dan pengalaman pengguna yang stabil.',
        },
        {
          title: '🧩 Data Terstruktur JSON-LD',
          description:
            'Menyusun konten dalam struktur yang mudah dipahami oleh mesin pencari dan AI, sehingga ulasan dan informasi lebih terekspos baik di hasil pencarian maupun di lingkungan pencarian berbasis AI.',
        },
        {
          title: '🔗 Tag Hreflang',
          description:
            'Mengonfigurasi konten setiap bahasa agar tampil baik di hasil pencarian negara terkait, menjangkau pembaca internasional secara akurat.',
        },
        {
          title: '🗺 XML Sitemap',
          description:
            'Mengatur struktur situs berdasarkan bahasa utama dan halaman konten, memungkinkan mesin pencari mengenali konten dengan cepat dan efisien.',
        },
      ],
    },
    stats: {
      heading: `${SITE_NAME_EN} dalam Angka`,
      // TODO: Ganti dengan data GA4 aktual
      items: [
        { value: '-', label: 'Pengunjung Bulanan' },
        { value: '8', label: 'Bahasa' },
        { value: '-', label: 'Ulasan Dipublikasi' },
        { value: '-', label: 'Kategori Konten' },
      ],
      note: '* Berdasarkan Google Analytics',
    },
    collaboration: {
      heading: 'Opsi Kolaborasi',
      subtext:
        'Kami berkolaborasi dalam format yang disesuaikan dengan karakteristik dan tujuan brand serta ruang Anda.',
      types: [
        {
          title: 'Ulasan Produk',
          description:
            'Membuat konten ulasan yang berfokus pada fitur dan keunggulan produk atau layanan.',
          icon: '📝',
        },
        {
          title: 'Kunjungan Pengalaman',
          description:
            'Kunjungi tempat atau destinasi Anda secara langsung dan tulis ulasan yang hidup.',
          icon: '📍',
        },
        {
          title: 'Iklan Banner',
          description:
            'Menampilkan banner secara alami di posisi yang tidak mengganggu alur situs.',
          icon: '📢',
        },
      ],
    },
    cta: {
      heading: 'Hubungi Kami',
      subtext:
        'Untuk detail tentang format kolaborasi, dukungan multibahasa, jadwal, dan lainnya, silakan hubungi kami melalui email. Kami akan segera meninjau dan membalas.',
      buttonLabel: 'Kirim Email',
      mailto: {
        subject: `[${SITE_NAME_EN}] Kerja Sama Sponsor`,
        body:
          `Halo, saya ingin bertanya tentang sponsorship dengan ${SITE_NAME_EN}.\n\n` +
          '1. Nama perusahaan/merek:\n' +
          '2. Jenis kolaborasi (Ulasan produk / Kunjungan pengalaman / Iklan banner / Lainnya):\n' +
          '3. Kisaran anggaran:\n' +
          '4. Jadwal yang diinginkan:\n' +
          '5. Catatan tambahan:\n',
      },
    },
  },
  vi: {
    meta: {
      title: 'Hợp Tác Tài Trợ',
      description: `${SITE_NAME_EN} là blog đôi cung cấp nội dung ẩm thực, quán cà phê và du lịch bằng 8 ngôn ngữ. Chúng tôi chào đón các yêu cầu tài trợ và quảng cáo.`,
    },
    hero: {
      headline: 'Không Gian và Thương Hiệu Của Bạn\nĐến Nhiều Người Hơn',
      subtext: `${SITE_NAME_EN} là blog truyền tải nội dung ẩm thực, quán cà phê và du lịch đến thế giới bằng 8 ngôn ngữ.`,
      cta: 'Gửi Email Liên Hệ',
    },
    blogIntro: {
      heading: `Giới Thiệu ${SITE_NAME_EN}`,
      paragraphs: [
        'Cặp đôi blogger ghé thăm các nhà hàng, quán cà phê và điểm du lịch trên khắp Seoul và Hàn Quốc, tạo nội dung đánh giá dựa trên trải nghiệm thực tế.',
        'Không chỉ viết đánh giá đơn thuần, mà tạo ra nội dung nổi bật trong kết quả tìm kiếm để tiếp cận nhiều người hơn, và truyền tải câu chuyện của bạn đến độc giả quốc tế thông qua hỗ trợ đa ngôn ngữ.',
      ],
      note: '* Hỗ trợ đa ngôn ngữ có thể khác nhau tùy theo danh mục. Vui lòng liên hệ để biết chi tiết.',
    },
    seoStrengths: {
      heading: 'Phạm Vi Toàn Cầu, Nội Dung Mạnh Trong Tìm Kiếm',
      subtext:
        'Không chỉ là blog viết bài đơn thuần, mà là nền tảng nội dung dựa trên công nghệ được thiết kế để nổi bật hơn trong kết quả tìm kiếm.',
      multilingual: {
        heading: '🌍 Hỗ Trợ 8 Ngôn Ngữ',
        description: 'Tiếng Hàn, Anh, Nhật, Trung (Giản thể/Phồn thể), Indonesia, Việt, Thái',
      },
      features: [
        {
          title: '⚡ Tạo Trang Tĩnh (SSG)',
          description:
            'Tất cả trang được tạo sẵn, cung cấp tốc độ tải nhanh và trải nghiệm người dùng ổn định.',
        },
        {
          title: '🧩 Dữ Liệu Cấu Trúc JSON-LD',
          description:
            'Cấu trúc nội dung theo cách dễ hiểu cho công cụ tìm kiếm và AI, giúp đánh giá và thông tin được hiển thị tốt hơn cả trong kết quả tìm kiếm và môi trường tìm kiếm dựa trên AI.',
        },
        {
          title: '🔗 Thẻ Hreflang',
          description:
            'Cấu hình nội dung từng ngôn ngữ để hiển thị tốt trong kết quả tìm kiếm của quốc gia tương ứng, truyền tải chính xác đến độc giả quốc tế.',
        },
        {
          title: '🗺 XML Sitemap',
          description:
            'Tổ chức cấu trúc trang web xoay quanh các ngôn ngữ và trang nội dung chính, giúp công cụ tìm kiếm nhận diện nội dung nhanh chóng và hiệu quả.',
        },
      ],
    },
    stats: {
      heading: `${SITE_NAME_EN} Qua Những Con Số`,
      // TODO: Thay thế bằng dữ liệu GA4 thực tế
      items: [
        { value: '-', label: 'Lượt Truy Cập/Tháng' },
        { value: '8', label: 'Ngôn Ngữ' },
        { value: '-', label: 'Bài Đánh Giá' },
        { value: '-', label: 'Danh Mục' },
      ],
      note: '* Dựa trên Google Analytics',
    },
    collaboration: {
      heading: 'Hình Thức Hợp Tác',
      subtext:
        'Chúng tôi hợp tác theo hình thức phù hợp với đặc điểm và mục tiêu của thương hiệu và không gian của bạn.',
      types: [
        {
          title: 'Đánh Giá Sản Phẩm',
          description:
            'Tạo nội dung đánh giá tập trung vào đặc điểm và ưu điểm của sản phẩm hoặc dịch vụ.',
          icon: '📝',
        },
        {
          title: 'Ghé Thăm Trải Nghiệm',
          description:
            'Trực tiếp ghé thăm cửa hàng hoặc điểm du lịch và viết bài đánh giá sống động.',
          icon: '📍',
        },
        {
          title: 'Quảng Cáo Banner',
          description:
            'Hiển thị banner một cách tự nhiên ở vị trí không làm gián đoạn luồng trang web.',
          icon: '📢',
        },
      ],
    },
    cta: {
      heading: 'Liên Hệ',
      subtext:
        'Để biết chi tiết về hình thức hợp tác, hỗ trợ đa ngôn ngữ, lịch trình và hơn thế nữa, vui lòng liên hệ qua email. Chúng tôi sẽ xem xét và phản hồi nhanh chóng.',
      buttonLabel: 'Gửi Email Liên Hệ',
      mailto: {
        subject: `[${SITE_NAME_EN}] Hợp Tác Tài Trợ`,
        body:
          `Xin chào, tôi muốn hỏi về hợp tác tài trợ với ${SITE_NAME_EN}.\n\n` +
          '1. Tên công ty/thương hiệu:\n' +
          '2. Loại hợp tác (Đánh giá sản phẩm / Ghé thăm trải nghiệm / Quảng cáo banner / Khác):\n' +
          '3. Phạm vi ngân sách:\n' +
          '4. Lịch trình mong muốn:\n' +
          '5. Ghi chú thêm:\n',
      },
    },
  },
  th: {
    meta: {
      title: 'สอบถามสปอนเซอร์',
      description: `${SITE_NAME_EN} เป็นบล็อกคู่รักที่นำเสนอเนื้อหาร้านอาหาร คาเฟ่ และท่องเที่ยวใน 8 ภาษา ยินดีรับสอบถามสปอนเซอร์และโฆษณา`,
    },
    hero: {
      headline: 'พื้นที่และแบรนด์ของคุณ\nให้คนรู้จักมากขึ้น',
      subtext: `${SITE_NAME_EN} เป็นบล็อกที่ส่งมอบเนื้อหาร้านอาหาร คาเฟ่ และท่องเที่ยวไปทั่วโลกใน 8 ภาษา`,
      cta: 'ส่งอีเมลสอบถาม',
    },
    blogIntro: {
      heading: `เกี่ยวกับ ${SITE_NAME_EN}`,
      paragraphs: [
        'คู่รักบล็อกเกอร์ที่ไปเยือนร้านอาหาร คาเฟ่ และสถานที่ท่องเที่ยวทั่วโซลและเกาหลีด้วยตนเอง สร้างเนื้อหารีวิวจากประสบการณ์จริง',
        'ไม่ใช่แค่เขียนรีวิวธรรมดา แต่สร้างเนื้อหาที่โดดเด่นในผลการค้นหาเพื่อเข้าถึงคนมากขึ้น และส่งมอบเรื่องราวของคุณให้ผู้อ่านต่างประเทศผ่านการรองรับหลายภาษา',
      ],
      note: '* การรองรับหลายภาษาอาจแตกต่างกันตามหมวดหมู่ กรุณาสอบถามรายละเอียด',
    },
    seoStrengths: {
      heading: 'เข้าถึงทั่วโลก, เนื้อหาที่แข็งแกร่งในการค้นหา',
      subtext:
        'ไม่ใช่แค่บล็อกเขียนบทความ แต่เป็นแพลตฟอร์มเนื้อหาที่ขับเคลื่อนด้วยเทคโนโลยีที่ออกแบบมาให้โดดเด่นในผลการค้นหา',
      multilingual: {
        heading: '🌍 รองรับ 8 ภาษา',
        description: 'เกาหลี, อังกฤษ, ญี่ปุ่น, จีน (ตัวย่อ/ตัวเต็ม), อินโดนีเซีย, เวียดนาม, ไทย',
      },
      features: [
        {
          title: '⚡ การสร้างเว็บไซต์แบบสถิต (SSG)',
          description:
            'สร้างทุกหน้าล่วงหน้า ให้ความเร็วในการโหลดที่รวดเร็วและประสบการณ์ผู้ใช้ที่เสถียร',
        },
        {
          title: '🧩 ข้อมูลโครงสร้าง JSON-LD',
          description:
            'จัดโครงสร้างเนื้อหาในรูปแบบที่เครื่องมือค้นหาและ AI เข้าใจได้ง่าย ทำให้รีวิวและข้อมูลแสดงผลได้ดีขึ้นทั้งในผลการค้นหาและสภาพแวดล้อมการค้นหาที่ขับเคลื่อนด้วย AI',
        },
        {
          title: '🔗 แท็ก Hreflang',
          description:
            'กำหนดค่าเนื้อหาแต่ละภาษาให้แสดงผลดีในผลการค้นหาของประเทศที่เกี่ยวข้อง ส่งมอบถึงผู้อ่านต่างประเทศอย่างแม่นยำ',
        },
        {
          title: '🗺 XML Sitemap',
          description:
            'จัดระเบียบโครงสร้างเว็บไซต์รอบภาษาหลักและหน้าเนื้อหา ช่วยให้เครื่องมือค้นหารับรู้เนื้อหาได้อย่างรวดเร็วและมีประสิทธิภาพ',
        },
      ],
    },
    stats: {
      heading: `${SITE_NAME_EN} ในตัวเลข`,
      // TODO: แทนที่ด้วยข้อมูล GA4 จริง
      items: [
        { value: '-', label: 'ผู้เยี่ยมชมรายเดือน' },
        { value: '8', label: 'ภาษา' },
        { value: '-', label: 'รีวิวที่เผยแพร่' },
        { value: '-', label: 'หมวดหมู่เนื้อหา' },
      ],
      note: '* อ้างอิงจาก Google Analytics',
    },
    collaboration: {
      heading: 'รูปแบบความร่วมมือ',
      subtext: 'ร่วมมือในรูปแบบที่เหมาะกับลักษณะและเป้าหมายของแบรนด์และพื้นที่ของคุณ',
      types: [
        {
          title: 'รีวิวสินค้า',
          description: 'สร้างเนื้อหารีวิวที่เน้นคุณสมบัติและจุดเด่นของผลิตภัณฑ์หรือบริการ',
          icon: '📝',
        },
        {
          title: 'เยี่ยมชมสถานที่',
          description: 'ไปเยือนร้านค้าหรือสถานที่ท่องเที่ยวด้วยตนเองและเขียนรีวิวที่มีชีวิตชีวา',
          icon: '📍',
        },
        {
          title: 'โฆษณาแบนเนอร์',
          description: 'แสดงแบนเนอร์อย่างเป็นธรรมชาติในตำแหน่งที่ไม่รบกวนการไหลของเว็บไซต์',
          icon: '📢',
        },
      ],
    },
    cta: {
      heading: 'ติดต่อเรา',
      subtext:
        'สำหรับรายละเอียดเกี่ยวกับรูปแบบความร่วมมือ การรองรับหลายภาษา กำหนดการ และอื่นๆ กรุณาติดต่อทางอีเมล เราจะตรวจสอบและตอบกลับอย่างรวดเร็ว',
      buttonLabel: 'ส่งอีเมลสอบถาม',
      mailto: {
        subject: `[${SITE_NAME_EN}] สอบถามสปอนเซอร์`,
        body:
          `สวัสดีครับ/ค่ะ ต้องการสอบถามเรื่องสปอนเซอร์กับ ${SITE_NAME_EN}\n\n` +
          '1. ชื่อบริษัท/แบรนด์:\n' +
          '2. ประเภทความร่วมมือ (รีวิวสินค้า / เยี่ยมชมสถานที่ / โฆษณาแบนเนอร์ / อื่นๆ):\n' +
          '3. ช่วงงบประมาณ:\n' +
          '4. กำหนดการที่ต้องการ:\n' +
          '5. หมายเหตุเพิ่มเติม:\n',
      },
    },
  },
};

export const getSponsorContent = (locale: Locale): SponsorContent => SPONSOR[locale] ?? SPONSOR.ko;

export const buildMailtoHref = (content: SponsorContent): string => {
  const { mailto } = content.cta;
  const subject = encodeURIComponent(mailto.subject);
  const body = encodeURIComponent(mailto.body);
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
};
