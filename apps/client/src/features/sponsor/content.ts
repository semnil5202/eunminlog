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
      title: '은민로그 소개',
      description: `${SITE_NAME_KO}는 개발자와 마케터 커플이 맛집, 술집, 카페, 여행지, 야구장 등 직접 경험한 곳을 기록하는 블로그입니다.`,
    },
    hero: {
      headline: '개발자·마케터 커플이 운영하는 일상 블로그',
      subtext:
        '맛집과 술집, 분위기 좋은 카페, 여행지, 야구장까지 직접 가보고 경험한 것들을 기록합니다.',
      cta: '기록 둘러보기',
    },
    blogIntro: {
      heading: '은민로그를 소개합니다',
      paragraphs: [
        '은민로그는 개발자와 마케터로 일하는 커플이 함께 운영합니다. 쉬는 날이면 맛있는 곳과 걷기 좋은 동네를 찾아다닙니다.',
        '식당, 술집, 카페, 여행지, 야구장 등 직접 다녀온 곳의 분위기와 동선, 가격대처럼 그날 경험한 것들을 기록합니다. 한국인 커플의 시선으로 찾은 로컬한 장소를 널리 알리고자 일부 글을 여러 언어로 번역합니다.',
      ],
      note: '* 다국어 지원 여부는 글과 카테고리에 따라 다를 수 있습니다.',
    },
    seoStrengths: {
      heading: '은민로그의 블로그 운영 방식',
      subtext:
        '읽는 사람은 편하게 둘러보고, 검색 엔진은 글의 내용을 잘 이해할 수 있도록 직접 만들고 운영합니다.',
      multilingual: {
        heading: '🌍 8개 언어로 만나는 은민로그',
        description:
          '한국어로 작성한 일부 글을 영어, 일본어, 중국어(간체/번체), 인도네시아어, 베트남어, 태국어로도 소개합니다.',
      },
      features: [
        {
          title: '⚡ 빠르게 열리는 블로그 (SSG)',
          description:
            '글 페이지를 미리 만들어 두는 정적 사이트 생성 방식을 사용해 빠르고 안정적으로 볼 수 있습니다.',
        },
        {
          title: '🧩 검색과 AI가 읽기 쉬운 글 (JSON-LD)',
          description:
            '장소와 리뷰 정보를 구조화해 검색 엔진과 AI가 글의 내용을 더 정확하게 이해하도록 돕습니다.',
        },
        {
          title: '🔗 언어에 맞게 연결되는 번역 글 (Hreflang)',
          description:
            '각 언어의 번역 글을 서로 연결해 해외 독자가 자신에게 맞는 언어로 찾을 수 있게 합니다.',
        },
        {
          title: '🗺 새 글을 알리는 사이트맵 (Sitemap)',
          description:
            '사이트의 글과 카테고리를 정리해 검색 엔진이 새 콘텐츠를 빠르게 발견할 수 있도록 합니다.',
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
      subtext: '은민로그와 잘 맞는 공간과 브랜드의 협찬 및 제휴 제안을 받고 있습니다.',
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
      ],
    },
    cta: {
      heading: '협찬 문의하기',
      subtext: '함께 소개하고 싶은 공간이나 제품이 있다면 이메일로 제안해주세요.',
      buttonLabel: '이메일로 문의하기',
      mailto: {
        subject: `[${SITE_NAME_EN}] 협찬 문의`,
        body:
          `안녕하세요, ${SITE_NAME_KO} 팀에게 협찬 문의드립니다.\n\n` +
          '1. 업체명/브랜드명:\n' +
          '2. 협업 유형 (제품 리뷰 / 체험 방문 / 기타):\n' +
          '3. 예산 범위:\n' +
          '4. 희망 일정:\n' +
          '5. 기타 전달 사항:\n',
      },
    },
  },
  en: {
    meta: {
      title: `About ${SITE_NAME_EN}`,
      description: `${SITE_NAME_EN} is a daily-life blog run by a developer and marketer couple, sharing firsthand experiences at restaurants, bars, cafes, travel destinations, and baseball stadiums.`,
    },
    hero: {
      headline: 'A Daily Blog Run by a Developer and Marketer Couple',
      subtext:
        'We visit restaurants, bars, atmospheric cafes, travel destinations, and baseball stadiums, and record what we experience there.',
      cta: 'Browse Our Stories',
    },
    blogIntro: {
      heading: `About ${SITE_NAME_EN}`,
      paragraphs: [
        `${SITE_NAME_EN} is run by a couple who work as a developer and a marketer. On our days off, we look for good food and neighborhoods that are pleasant to explore on foot.`,
        'We record what we experienced that day, including the atmosphere, route, and price range of restaurants, bars, cafes, travel destinations, and baseball stadiums we visit. To share local places from a Korean couple\'s perspective with more people, we translate selected posts into multiple languages.',
      ],
      note: '* Multilingual availability may vary by post and category.',
    },
    seoStrengths: {
      heading: `How We Run ${SITE_NAME_EN}`,
      subtext:
        'We build and operate the blog so readers can browse comfortably and search engines can understand each post clearly.',
      multilingual: {
        heading: `🌍 Read ${SITE_NAME_EN} in 8 Languages`,
        description:
          'Selected Korean posts are also available in English, Japanese, Chinese (Simplified and Traditional), Indonesian, Vietnamese, and Thai.',
      },
      features: [
        {
          title: '⚡ A Fast-Loading Blog (SSG)',
          description:
            'Post pages are generated in advance with static site generation, making them fast and reliable to browse.',
        },
        {
          title: '🧩 Posts Search Engines and AI Can Read (JSON-LD)',
          description:
            'Place and review details are structured to help search engines and AI understand each post more accurately.',
        },
        {
          title: '🔗 Translations Linked by Language (Hreflang)',
          description:
            'Language versions are connected so international readers can find the post in the language that suits them.',
        },
        {
          title: '🗺 A Sitemap That Shares New Posts (Sitemap)',
          description:
            'Posts and categories are organized so search engines can discover new content quickly.',
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
      subtext: `We welcome sponsorship and partnership proposals from places and brands that fit ${SITE_NAME_EN}.`,
      types: [
        {
          title: 'Product Review',
          description:
            'We create review content focusing on the features and strengths of the product or service.',
          icon: '📝',
        },
        {
          title: 'Experience Visit',
          description: 'We visit the venue or destination in person and write a vivid review.',
          icon: '📍',
        },
      ],
    },
    cta: {
      heading: 'Sponsorship Inquiries',
      subtext: 'If you have a place or product you would like us to introduce, send us a proposal by email.',
      buttonLabel: 'Send an Email',
      mailto: {
        subject: `[${SITE_NAME_EN}] Sponsorship Inquiry`,
        body:
          `Hello, I'd like to inquire about sponsorship with ${SITE_NAME_EN}.\n\n` +
          '1. Company/Brand name:\n' +
          '2. Collaboration type (Product review / Experience visit / Other):\n' +
          '3. Budget range:\n' +
          '4. Preferred timeline:\n' +
          '5. Additional notes:\n',
      },
    },
  },
  ja: {
    meta: {
      title: `${SITE_NAME_EN}について`,
      description: `${SITE_NAME_EN}は、開発者とマーケターのカップルが、飲食店やカフェ、旅行先、野球場などで実際に体験したことを記録する日常ブログです。`,
    },
    hero: {
      headline: '開発者とマーケターのカップルが運営する日常ブログ',
      subtext:
        'グルメや居酒屋、雰囲気の良いカフェ、旅行先、野球場まで、実際に訪れて体験したことを記録しています。',
      cta: '記事を見る',
    },
    blogIntro: {
      heading: `${SITE_NAME_EN}のご紹介`,
      paragraphs: [
        `${SITE_NAME_EN}は、開発者とマーケターとして働くカップルが一緒に運営しています。休日には、おいしい店や歩いて楽しい街を探しに出かけます。`,
        '飲食店や居酒屋、カフェ、旅行先、野球場など、実際に訪れた場所の雰囲気や行き方、価格帯といったその日の体験を記録しています。韓国人カップルの視点で見つけたローカルな場所を広く伝えるため、一部の記事を多言語に翻訳しています。',
      ],
      note: '* 多言語対応は記事やカテゴリによって異なる場合があります。',
    },
    seoStrengths: {
      heading: `${SITE_NAME_EN}の運営方法`,
      subtext:
        '読者が快適に閲覧でき、検索エンジンが記事の内容を正しく理解できるよう、自分たちで構築・運営しています。',
      multilingual: {
        heading: `🌍 8言語で読める${SITE_NAME_EN}`,
        description:
          '韓国語で作成した一部の記事を、英語、日本語、中国語（簡体字・繁体字）、インドネシア語、ベトナム語、タイ語でも紹介しています。',
      },
      features: [
        {
          title: '⚡ すばやく開くブログ（SSG）',
          description:
            '記事ページを事前に生成する静的サイト生成を採用し、速く安定した閲覧を実現しています。',
        },
        {
          title: '🧩 検索とAIが理解しやすい記事（JSON-LD）',
          description:
            '場所やレビューの情報を構造化し、検索エンジンやAIが記事をより正確に理解できるようにしています。',
        },
        {
          title: '🔗 言語ごとにつながる翻訳記事（Hreflang）',
          description:
            '各言語の翻訳記事を結び、海外の読者が自分に合った言語で見つけられるようにしています。',
        },
        {
          title: '🗺 新しい記事を知らせるサイトマップ（Sitemap）',
          description:
            '記事とカテゴリを整理し、検索エンジンが新しいコンテンツをすばやく見つけられるようにしています。',
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
      subtext: `${SITE_NAME_EN}に合う場所やブランドからの協賛・提携のご提案を受け付けています。`,
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
      ],
    },
    cta: {
      heading: '協賛のお問い合わせ',
      subtext: '一緒に紹介したい場所や商品がありましたら、メールでご提案ください。',
      buttonLabel: 'メールで問い合わせる',
      mailto: {
        subject: `[${SITE_NAME_EN}] 協賛お問い合わせ`,
        body:
          `こんにちは、${SITE_NAME_EN}チームに協賛のお問い合わせをいたします。\n\n` +
          '1. 会社名/ブランド名:\n' +
          '2. コラボレーションの種類（製品レビュー / 体験訪問 / その他）:\n' +
          '3. 予算範囲:\n' +
          '4. 希望スケジュール:\n' +
          '5. その他の連絡事項:\n',
      },
    },
  },
  'zh-CN': {
    meta: {
      title: `关于${SITE_NAME_EN}`,
      description: `${SITE_NAME_EN}是由一对从事开发与营销工作的情侣共同运营的日常博客，记录亲自体验过的餐厅、酒吧、咖啡馆、旅游景点和棒球场。`,
    },
    hero: {
      headline: '由一对从事开发与营销工作的情侣共同运营的日常博客',
      subtext: '记录我们亲自去过并体验过的餐厅、酒吧、氛围舒适的咖啡馆、旅游景点和棒球场。',
      cta: '浏览文章',
    },
    blogIntro: {
      heading: `关于${SITE_NAME_EN}`,
      paragraphs: [
        `${SITE_NAME_EN}由一对从事开发和营销工作的情侣共同运营。休息日时，我们喜欢寻找美食和适合散步的街区。`,
        '我们记录亲自去过的餐厅、酒吧、咖啡馆、旅游景点和棒球场，包括当天感受到的氛围、路线与价格区间。为了让更多人认识韩国情侣视角下发现的本地好去处，我们将部分文章翻译成多种语言。',
      ],
      note: '* 多语言支持可能因文章和类别而异。',
    },
    seoStrengths: {
      heading: `${SITE_NAME_EN}的运营方式`,
      subtext: '我们亲自搭建并运营博客，让读者轻松浏览，也让搜索引擎清楚理解文章内容。',
      multilingual: {
        heading: `🌍 用8种语言阅读${SITE_NAME_EN}`,
        description:
          '部分韩语文章也提供英语、日语、中文（简体/繁体）、印尼语、越南语和泰语版本。',
      },
      features: [
        {
          title: '⚡ 快速打开的博客（SSG）',
          description: '采用预先生成文章页面的静态站点方式，浏览快速且稳定。',
        },
        {
          title: '🧩 搜索引擎和AI易读的文章（JSON-LD）',
          description: '将地点和评价信息结构化，帮助搜索引擎和AI更准确地理解文章。',
        },
        {
          title: '🔗 按语言连接的翻译文章（Hreflang）',
          description: '连接不同语言的翻译文章，让海外读者能找到适合自己的语言版本。',
        },
        {
          title: '🗺 帮助发现新文章的站点地图（Sitemap）',
          description: '整理文章与类别，帮助搜索引擎快速发现新内容。',
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
      subtext: `我们欢迎与${SITE_NAME_EN}调性相符的场所和品牌提出赞助或合作建议。`,
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
      ],
    },
    cta: {
      heading: '赞助咨询',
      subtext: '如果有希望我们共同介绍的场所或产品，欢迎通过邮件提出建议。',
      buttonLabel: '发送邮件',
      mailto: {
        subject: `[${SITE_NAME_EN}] 赞助咨询`,
        body:
          `您好，想向${SITE_NAME_EN}团队咨询赞助事宜。\n\n` +
          '1. 公司名/品牌名:\n' +
          '2. 合作类型（产品评价 / 体验访问 / 其他）:\n' +
          '3. 预算范围:\n' +
          '4. 期望日程:\n' +
          '5. 其他事项:\n',
      },
    },
  },
  'zh-TW': {
    meta: {
      title: `關於${SITE_NAME_EN}`,
      description: `${SITE_NAME_EN}是由一對從事開發與行銷工作的情侶共同經營的日常部落格，記錄親自體驗過的餐廳、酒吧、咖啡館、旅遊景點和棒球場。`,
    },
    hero: {
      headline: '由一對從事開發與行銷工作的情侶共同經營的日常部落格',
      subtext: '記錄我們親自去過並體驗過的餐廳、酒吧、氣氛舒適的咖啡館、旅遊景點和棒球場。',
      cta: '瀏覽文章',
    },
    blogIntro: {
      heading: `關於${SITE_NAME_EN}`,
      paragraphs: [
        `${SITE_NAME_EN}由一對從事開發和行銷工作的情侶共同經營。休假時，我們喜歡尋找美食和適合散步的街區。`,
        '我們記錄親自去過的餐廳、酒吧、咖啡館、旅遊景點和棒球場，包括當天感受到的氣氛、路線與價格區間。為了讓更多人認識韓國情侶視角下發現的在地好去處，我們將部分文章翻譯成多種語言。',
      ],
      note: '* 多語言支援可能因文章和類別而異。',
    },
    seoStrengths: {
      heading: `${SITE_NAME_EN}的經營方式`,
      subtext: '我們親自打造並經營部落格，讓讀者輕鬆瀏覽，也讓搜尋引擎清楚理解文章內容。',
      multilingual: {
        heading: `🌍 用8種語言閱讀${SITE_NAME_EN}`,
        description:
          '部分韓文文章也提供英文、日文、中文（簡體/繁體）、印尼文、越南文和泰文版本。',
      },
      features: [
        {
          title: '⚡ 快速開啟的部落格（SSG）',
          description: '採用預先生成文章頁面的靜態網站方式，瀏覽快速且穩定。',
        },
        {
          title: '🧩 搜尋引擎和AI易讀的文章（JSON-LD）',
          description: '將地點和評價資訊結構化，幫助搜尋引擎和AI更準確地理解文章。',
        },
        {
          title: '🔗 依語言連結的翻譯文章（Hreflang）',
          description: '連結不同語言的翻譯文章，讓海外讀者能找到適合自己的語言版本。',
        },
        {
          title: '🗺 幫助發現新文章的網站地圖（Sitemap）',
          description: '整理文章與類別，幫助搜尋引擎快速發現新內容。',
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
      subtext: `我們歡迎與${SITE_NAME_EN}調性相符的場所和品牌提出贊助或合作建議。`,
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
      ],
    },
    cta: {
      heading: '贊助諮詢',
      subtext: '如果有希望我們共同介紹的場所或產品，歡迎透過電子郵件提出建議。',
      buttonLabel: '發送電子郵件',
      mailto: {
        subject: `[${SITE_NAME_EN}] 贊助諮詢`,
        body:
          `您好，想向${SITE_NAME_EN}團隊諮詢贊助事宜。\n\n` +
          '1. 公司名/品牌名:\n' +
          '2. 合作類型（產品評價 / 體驗訪問 / 其他）:\n' +
          '3. 預算範圍:\n' +
          '4. 期望日程:\n' +
          '5. 其他事項:\n',
      },
    },
  },
  id: {
    meta: {
      title: `Tentang ${SITE_NAME_EN}`,
      description: `${SITE_NAME_EN} adalah blog keseharian yang dikelola pasangan developer dan marketer, berisi pengalaman langsung di restoran, bar, kafe, destinasi wisata, dan stadion bisbol.`,
    },
    hero: {
      headline: 'Blog Keseharian oleh Pasangan Developer dan Marketer',
      subtext:
        'Kami mengunjungi dan mencatat pengalaman di restoran, bar, kafe dengan suasana nyaman, destinasi wisata, dan stadion bisbol.',
      cta: 'Lihat Cerita Kami',
    },
    blogIntro: {
      heading: `Tentang ${SITE_NAME_EN}`,
      paragraphs: [
        `${SITE_NAME_EN} dikelola oleh pasangan yang bekerja sebagai developer dan marketer. Saat libur, kami mencari makanan enak dan lingkungan yang nyaman untuk dijelajahi dengan berjalan kaki.`,
        'Kami mencatat pengalaman hari itu, termasuk suasana, rute, dan kisaran harga di restoran, bar, kafe, destinasi wisata, serta stadion bisbol yang kami kunjungi. Untuk memperkenalkan tempat-tempat lokal dari sudut pandang pasangan Korea kepada lebih banyak orang, sebagian artikel kami terjemahkan ke beberapa bahasa.',
      ],
      note: '* Ketersediaan multibahasa dapat berbeda menurut artikel dan kategori.',
    },
    seoStrengths: {
      heading: `Cara Kami Mengelola ${SITE_NAME_EN}`,
      subtext:
        'Kami membangun dan mengelola blog ini agar nyaman dibaca dan mudah dipahami oleh mesin pencari.',
      multilingual: {
        heading: `🌍 Baca ${SITE_NAME_EN} dalam 8 Bahasa`,
        description:
          'Sebagian artikel berbahasa Korea juga tersedia dalam bahasa Inggris, Jepang, Mandarin (Sederhana dan Tradisional), Indonesia, Vietnam, dan Thai.',
      },
      features: [
        {
          title: '⚡ Blog yang Cepat Dibuka (SSG)',
          description:
            'Halaman artikel dibuat terlebih dahulu dengan metode static site generation agar cepat dan stabil saat dibuka.',
        },
        {
          title: '🧩 Artikel yang Mudah Dibaca Pencarian dan AI (JSON-LD)',
          description:
            'Informasi tempat dan ulasan disusun secara terstruktur agar mesin pencari dan AI memahami artikel dengan lebih akurat.',
        },
        {
          title: '🔗 Terjemahan yang Terhubung per Bahasa (Hreflang)',
          description:
            'Setiap versi bahasa saling terhubung agar pembaca internasional dapat menemukan bahasa yang sesuai.',
        },
        {
          title: '🗺 Sitemap untuk Mengenalkan Artikel Baru (Sitemap)',
          description:
            'Artikel dan kategori ditata agar mesin pencari dapat menemukan konten baru dengan cepat.',
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
      subtext: `Kami menerima proposal sponsor dan kemitraan dari tempat serta brand yang cocok dengan ${SITE_NAME_EN}.`,
      types: [
        {
          title: 'Ulasan Produk',
          description:
            'Membuat konten ulasan yang berfokus pada fitur dan keunggulan produk atau layanan.',
          icon: '📝',
        },
        {
          title: 'Kunjungan Langsung',
          description:
            'Kunjungi tempat atau destinasi Anda secara langsung dan tulis ulasan yang hidup.',
          icon: '📍',
        },
      ],
    },
    cta: {
      heading: 'Pertanyaan Sponsor',
      subtext: 'Jika ada tempat atau produk yang ingin diperkenalkan bersama kami, kirimkan proposal melalui email.',
      buttonLabel: 'Kirim Email',
      mailto: {
        subject: `[${SITE_NAME_EN}] Kerja Sama Sponsor`,
        body:
          `Halo, saya ingin bertanya tentang sponsorship dengan ${SITE_NAME_EN}.\n\n` +
          '1. Nama perusahaan/merek:\n' +
          '2. Jenis kolaborasi (Ulasan produk / Kunjungan langsung / Lainnya):\n' +
          '3. Kisaran anggaran:\n' +
          '4. Jadwal yang diinginkan:\n' +
          '5. Catatan tambahan:\n',
      },
    },
  },
  vi: {
    meta: {
      title: `Giới Thiệu ${SITE_NAME_EN}`,
      description: `${SITE_NAME_EN} là blog đời sống do một cặp đôi làm nghề phát triển phần mềm và tiếp thị cùng vận hành, ghi lại trải nghiệm tại nhà hàng, quán bar, quán cà phê, điểm du lịch và sân bóng chày.`,
    },
    hero: {
      headline: 'Blog Đời Sống Của Cặp Đôi Lập Trình Viên và Chuyên Viên Tiếp Thị',
      subtext:
        'Chúng tôi trực tiếp ghé thăm và ghi lại trải nghiệm tại nhà hàng, quán bar, quán cà phê có không gian đẹp, điểm du lịch và sân bóng chày.',
      cta: 'Xem Các Bài Viết',
    },
    blogIntro: {
      heading: `Giới Thiệu ${SITE_NAME_EN}`,
      paragraphs: [
        `${SITE_NAME_EN} được vận hành bởi một cặp đôi làm nghề phát triển phần mềm và tiếp thị. Vào ngày nghỉ, chúng tôi tìm những món ngon và các khu phố thú vị để đi bộ khám phá.`,
        'Chúng tôi ghi lại trải nghiệm trong ngày, từ không gian, đường đi đến mức giá tại những nhà hàng, quán bar, quán cà phê, điểm du lịch và sân bóng chày đã ghé thăm. Để giới thiệu rộng rãi hơn những địa điểm địa phương được nhìn từ góc độ của một cặp đôi Hàn Quốc, một số bài viết được dịch sang nhiều ngôn ngữ.',
      ],
      note: '* Hỗ trợ đa ngôn ngữ có thể khác nhau tùy theo bài viết và danh mục.',
    },
    seoStrengths: {
      heading: `Cách Chúng Tôi Vận Hành ${SITE_NAME_EN}`,
      subtext:
        'Chúng tôi tự xây dựng và vận hành blog để người đọc dễ dàng khám phá, đồng thời giúp công cụ tìm kiếm hiểu rõ nội dung.',
      multilingual: {
        heading: `🌍 Đọc ${SITE_NAME_EN} Bằng 8 Ngôn Ngữ`,
        description:
          'Một số bài viết tiếng Hàn cũng có bản tiếng Anh, Nhật, Trung (Giản thể và Phồn thể), Indonesia, Việt và Thái.',
      },
      features: [
        {
          title: '⚡ Blog Tải Nhanh (SSG)',
          description:
            'Các trang bài viết được tạo sẵn bằng phương pháp tạo trang tĩnh, giúp tải nhanh và ổn định.',
        },
        {
          title: '🧩 Bài Viết Dễ Hiểu Với Tìm Kiếm và AI (JSON-LD)',
          description:
            'Thông tin địa điểm và đánh giá được cấu trúc để công cụ tìm kiếm và AI hiểu bài viết chính xác hơn.',
        },
        {
          title: '🔗 Bản Dịch Được Kết Nối Theo Ngôn Ngữ (Hreflang)',
          description:
            'Các phiên bản ngôn ngữ được liên kết để độc giả quốc tế tìm thấy ngôn ngữ phù hợp.',
        },
        {
          title: '🗺 Sitemap Giúp Khám Phá Bài Viết Mới (Sitemap)',
          description:
            'Bài viết và danh mục được sắp xếp để công cụ tìm kiếm nhanh chóng phát hiện nội dung mới.',
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
      subtext: `Chúng tôi chào đón đề xuất tài trợ và hợp tác từ những địa điểm, thương hiệu phù hợp với ${SITE_NAME_EN}.`,
      types: [
        {
          title: 'Đánh Giá Sản Phẩm',
          description:
            'Tạo nội dung đánh giá tập trung vào đặc điểm và ưu điểm của sản phẩm hoặc dịch vụ.',
          icon: '📝',
        },
        {
          title: 'Trải Nghiệm Trực Tiếp',
          description:
            'Trực tiếp ghé thăm cửa hàng hoặc điểm du lịch và viết bài đánh giá sống động.',
          icon: '📍',
        },
      ],
    },
    cta: {
      heading: 'Liên Hệ Tài Trợ',
      subtext: 'Nếu có địa điểm hoặc sản phẩm muốn cùng chúng tôi giới thiệu, hãy gửi đề xuất qua email.',
      buttonLabel: 'Gửi Email',
      mailto: {
        subject: `[${SITE_NAME_EN}] Hợp Tác Tài Trợ`,
        body:
          `Xin chào, tôi muốn hỏi về hợp tác tài trợ với ${SITE_NAME_EN}.\n\n` +
          '1. Tên công ty/thương hiệu:\n' +
          '2. Loại hợp tác (Đánh giá sản phẩm / Trải nghiệm trực tiếp / Khác):\n' +
          '3. Phạm vi ngân sách:\n' +
          '4. Lịch trình mong muốn:\n' +
          '5. Ghi chú thêm:\n',
      },
    },
  },
  th: {
    meta: {
      title: `เกี่ยวกับ ${SITE_NAME_EN}`,
      description: `${SITE_NAME_EN} เป็นบล็อกไลฟ์สไตล์ที่ดูแลโดยคู่รักนักพัฒนาและนักการตลาด บันทึกประสบการณ์จริงจากร้านอาหาร บาร์ คาเฟ่ สถานที่ท่องเที่ยว และสนามเบสบอล`,
    },
    hero: {
      headline: 'บล็อกไลฟ์สไตล์ของคู่รักนักพัฒนาและนักการตลาด',
      subtext:
        'เราไปสัมผัสและบันทึกเรื่องราวจากร้านอาหาร บาร์ คาเฟ่บรรยากาศดี สถานที่ท่องเที่ยว และสนามเบสบอลด้วยตัวเอง',
      cta: 'ดูเรื่องราวของเรา',
    },
    blogIntro: {
      heading: `เกี่ยวกับ ${SITE_NAME_EN}`,
      paragraphs: [
        `${SITE_NAME_EN} ดูแลร่วมกันโดยคู่รักที่ทำงานเป็นนักพัฒนาและนักการตลาด ในวันหยุดเรามักออกตามหาอาหารอร่อยและย่านที่เดินเที่ยวได้อย่างเพลิดเพลิน`,
        'เราบันทึกประสบการณ์ในวันนั้น ทั้งบรรยากาศ เส้นทาง และช่วงราคา จากร้านอาหาร บาร์ คาเฟ่ สถานที่ท่องเที่ยว และสนามเบสบอลที่ไปเยือน เพื่อแนะนำสถานที่ท้องถิ่นจากมุมมองของคู่รักชาวเกาหลีให้ผู้คนรู้จักมากขึ้น เราจึงแปลบทความบางส่วนเป็นหลายภาษา',
      ],
      note: '* การรองรับหลายภาษาอาจแตกต่างกันตามบทความและหมวดหมู่',
    },
    seoStrengths: {
      heading: `วิธีที่เราดูแล ${SITE_NAME_EN}`,
      subtext:
        'เราสร้างและดูแลบล็อกด้วยตัวเอง เพื่อให้ผู้อ่านใช้งานสะดวกและเครื่องมือค้นหาเข้าใจเนื้อหาได้ชัดเจน',
      multilingual: {
        heading: `🌍 อ่าน ${SITE_NAME_EN} ได้ใน 8 ภาษา`,
        description:
          'บทความภาษาเกาหลีบางส่วนมีฉบับภาษาอังกฤษ ญี่ปุ่น จีน (ตัวย่อและตัวเต็ม) อินโดนีเซีย เวียดนาม และไทย',
      },
      features: [
        {
          title: '⚡ บล็อกที่เปิดได้รวดเร็ว (SSG)',
          description:
            'หน้าบทความถูกสร้างไว้ล่วงหน้าด้วยระบบเว็บไซต์แบบสถิต จึงเปิดได้รวดเร็วและเสถียร',
        },
        {
          title: '🧩 บทความที่ระบบค้นหาและ AI เข้าใจง่าย (JSON-LD)',
          description:
            'ข้อมูลสถานที่และรีวิวถูกจัดโครงสร้างเพื่อให้เครื่องมือค้นหาและ AI เข้าใจบทความได้แม่นยำยิ่งขึ้น',
        },
        {
          title: '🔗 บทความแปลที่เชื่อมโยงตามภาษา (Hreflang)',
          description:
            'บทความแต่ละภาษาถูกเชื่อมโยงกัน เพื่อให้ผู้อ่านต่างประเทศพบภาษาที่เหมาะกับตนเอง',
        },
        {
          title: '🗺 Sitemap ที่ช่วยให้พบเรื่องใหม่ (Sitemap)',
          description:
            'บทความและหมวดหมู่ถูกจัดระเบียบเพื่อให้เครื่องมือค้นหาพบเนื้อหาใหม่ได้อย่างรวดเร็ว',
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
      subtext: `เรายินดีรับข้อเสนอสนับสนุนและความร่วมมือจากสถานที่หรือแบรนด์ที่เหมาะกับ ${SITE_NAME_EN}`,
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
      ],
    },
    cta: {
      heading: 'สอบถามเรื่องสปอนเซอร์',
      subtext: 'หากมีสถานที่หรือผลิตภัณฑ์ที่อยากให้เราแนะนำร่วมกัน กรุณาส่งข้อเสนอทางอีเมล',
      buttonLabel: 'ส่งอีเมล',
      mailto: {
        subject: `[${SITE_NAME_EN}] สอบถามสปอนเซอร์`,
        body:
          `สวัสดีครับ/ค่ะ ต้องการสอบถามเรื่องสปอนเซอร์กับ ${SITE_NAME_EN}\n\n` +
          '1. ชื่อบริษัท/แบรนด์:\n' +
          '2. ประเภทความร่วมมือ (รีวิวสินค้า / เยี่ยมชมสถานที่ / อื่นๆ):\n' +
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
