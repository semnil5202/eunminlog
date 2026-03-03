import type { Locale } from '@/shared/types/common';
import { SITE_NAME_KO, SITE_NAME_EN, SITE_URL } from '@eunminlog/config/site';

type PrivacySection = {
  heading: string;
  body: string;
};

type PrivacyContent = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: PrivacySection[];
};

const PRIVACY: Record<Locale, PrivacyContent> = {
  ko: {
    title: '개인정보처리방침',
    lastUpdated: '2026년 3월 3일',
    intro: `${SITE_NAME_KO}(${SITE_URL}, 이하 "사이트")는 이용자의 개인정보를 중요시하며, 관련 법령을 준수합니다. 본 방침은 사이트가 수집하는 정보와 그 이용 방법을 안내합니다.`,
    sections: [
      {
        heading: '1. 수집하는 정보',
        body: `사이트는 회원가입 기능이 없으며, 이용자의 이름, 이메일 등 개인식별정보를 직접 수집하지 않습니다. 다만, 아래 제3자 서비스를 통해 비식별 정보가 자동으로 수집될 수 있습니다.\n\n• 접속 로그: IP 주소, 브라우저 유형, 운영체제, 방문 일시\n• 쿠키 및 유사 기술: Google Analytics, Google AdSense가 사용하는 쿠키`,
      },
      {
        heading: '2. 정보 이용 목적',
        body: '• 방문 통계 분석 및 사이트 개선 (Google Analytics)\n• 맞춤형 광고 제공 (Google AdSense)',
      },
      {
        heading: '3. 제3자 서비스',
        body: `사이트는 아래 제3자 서비스를 사용하며, 각 서비스의 개인정보처리방침이 적용됩니다.\n\n• Google Analytics: https://policies.google.com/privacy\n• Google AdSense: https://policies.google.com/technologies/ads`,
      },
      {
        heading: '4. 쿠키 관리',
        body: '이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만, 쿠키를 차단하면 일부 서비스 이용에 제한이 있을 수 있습니다.',
      },
      {
        heading: '5. 개인정보의 보유 및 파기',
        body: '사이트는 개인식별정보를 직접 보유하지 않습니다. 제3자 서비스가 수집한 데이터의 보유 기간은 각 서비스의 정책을 따릅니다.',
      },
      {
        heading: '6. 방침 변경',
        body: '본 방침이 변경될 경우 사이트에 공지합니다.',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'March 3, 2026',
    intro: `${SITE_NAME_EN} (${SITE_URL}, hereinafter "the Site") values your privacy and complies with applicable laws. This policy explains what information is collected and how it is used.`,
    sections: [
      {
        heading: '1. Information We Collect',
        body: `The Site does not require registration and does not directly collect personally identifiable information such as names or emails. However, the following non-identifying information may be automatically collected through third-party services.\n\n• Access logs: IP address, browser type, operating system, visit timestamps\n• Cookies and similar technologies: cookies used by Google Analytics and Google AdSense`,
      },
      {
        heading: '2. Purpose of Use',
        body: '• Traffic analysis and site improvement (Google Analytics)\n• Personalized advertising (Google AdSense)',
      },
      {
        heading: '3. Third-Party Services',
        body: `The Site uses the following third-party services, each governed by their own privacy policies.\n\n• Google Analytics: https://policies.google.com/privacy\n• Google AdSense: https://policies.google.com/technologies/ads`,
      },
      {
        heading: '4. Managing Cookies',
        body: 'You can refuse cookie storage through your browser settings. However, blocking cookies may limit some features of the Site.',
      },
      {
        heading: '5. Data Retention',
        body: 'The Site does not directly retain personally identifiable information. Data collected by third-party services is retained according to their respective policies.',
      },
      {
        heading: '6. Policy Changes',
        body: 'Any changes to this policy will be posted on the Site.',
      },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    lastUpdated: '2026年3月3日',
    intro: `${SITE_NAME_EN}（${SITE_URL}、以下「本サイト」）は、利用者のプライバシーを重視し、関連法令を遵守します。本ポリシーでは、収集する情報とその利用方法についてご案内します。`,
    sections: [
      {
        heading: '1. 収集する情報',
        body: `本サイトは会員登録機能がなく、氏名やメールアドレスなどの個人識別情報を直接収集しません。ただし、以下の第三者サービスを通じて非識別情報が自動的に収集される場合があります。\n\n• アクセスログ：IPアドレス、ブラウザ種類、OS、訪問日時\n• Cookieおよび類似技術：Google Analytics、Google AdSenseが使用するCookie`,
      },
      {
        heading: '2. 利用目的',
        body: '• アクセス統計分析およびサイト改善（Google Analytics）\n• パーソナライズ広告の提供（Google AdSense）',
      },
      {
        heading: '3. 第三者サービス',
        body: `本サイトは以下の第三者サービスを使用しており、各サービスのプライバシーポリシーが適用されます。\n\n• Google Analytics：https://policies.google.com/privacy\n• Google AdSense：https://policies.google.com/technologies/ads`,
      },
      {
        heading: '4. Cookieの管理',
        body: 'ブラウザの設定からCookieの保存を拒否できます。ただし、Cookieをブロックすると一部機能が制限される場合があります。',
      },
      {
        heading: '5. データの保持と削除',
        body: '本サイトは個人識別情報を直接保持しません。第三者サービスが収集したデータの保持期間は、各サービスのポリシーに従います。',
      },
      {
        heading: '6. ポリシーの変更',
        body: '本ポリシーに変更がある場合、本サイト上でお知らせします。',
      },
    ],
  },
  'zh-CN': {
    title: '隐私政策',
    lastUpdated: '2026年3月3日',
    intro: `${SITE_NAME_EN}（${SITE_URL}，以下简称"本站"）重视用户隐私，遵守相关法律法规。本政策说明本站收集的信息及其使用方式。`,
    sections: [
      {
        heading: '1. 收集的信息',
        body: `本站无需注册，不直接收集姓名、邮箱等个人身份信息。但以下第三方服务可能会自动收集非身份识别信息。\n\n• 访问日志：IP地址、浏览器类型、操作系统、访问时间\n• Cookie及类似技术：Google Analytics和Google AdSense使用的Cookie`,
      },
      {
        heading: '2. 使用目的',
        body: '• 访问统计分析及网站改进（Google Analytics）\n• 个性化广告投放（Google AdSense）',
      },
      {
        heading: '3. 第三方服务',
        body: `本站使用以下第三方服务，各服务适用其自身的隐私政策。\n\n• Google Analytics：https://policies.google.com/privacy\n• Google AdSense：https://policies.google.com/technologies/ads`,
      },
      {
        heading: '4. Cookie管理',
        body: '您可以通过浏览器设置拒绝Cookie存储。但阻止Cookie可能会限制部分功能。',
      },
      {
        heading: '5. 数据保留',
        body: '本站不直接保留个人身份信息。第三方服务收集的数据保留期限遵循各服务的政策。',
      },
      {
        heading: '6. 政策变更',
        body: '本政策如有变更，将在本站公告。',
      },
    ],
  },
  'zh-TW': {
    title: '隱私權政策',
    lastUpdated: '2026年3月3日',
    intro: `${SITE_NAME_EN}（${SITE_URL}，以下簡稱「本站」）重視用戶隱私，遵守相關法律法規。本政策說明本站收集的資訊及其使用方式。`,
    sections: [
      {
        heading: '1. 收集的資訊',
        body: `本站無需註冊，不直接收集姓名、電子郵件等個人身份資訊。但以下第三方服務可能會自動收集非身份識別資訊。\n\n• 存取日誌：IP位址、瀏覽器類型、作業系統、存取時間\n• Cookie及類似技術：Google Analytics和Google AdSense使用的Cookie`,
      },
      {
        heading: '2. 使用目的',
        body: '• 存取統計分析及網站改進（Google Analytics）\n• 個人化廣告投放（Google AdSense）',
      },
      {
        heading: '3. 第三方服務',
        body: `本站使用以下第三方服務，各服務適用其自身的隱私權政策。\n\n• Google Analytics：https://policies.google.com/privacy\n• Google AdSense：https://policies.google.com/technologies/ads`,
      },
      {
        heading: '4. Cookie管理',
        body: '您可以透過瀏覽器設定拒絕Cookie儲存。但封鎖Cookie可能會限制部分功能。',
      },
      {
        heading: '5. 資料保留',
        body: '本站不直接保留個人身份資訊。第三方服務收集的資料保留期限遵循各服務的政策。',
      },
      {
        heading: '6. 政策變更',
        body: '本政策如有變更，將在本站公告。',
      },
    ],
  },
  id: {
    title: 'Kebijakan Privasi',
    lastUpdated: '3 Maret 2026',
    intro: `${SITE_NAME_EN} (${SITE_URL}, selanjutnya disebut "Situs") menghargai privasi Anda dan mematuhi hukum yang berlaku. Kebijakan ini menjelaskan informasi yang dikumpulkan dan cara penggunaannya.`,
    sections: [
      {
        heading: '1. Informasi yang Dikumpulkan',
        body: `Situs tidak memerlukan pendaftaran dan tidak mengumpulkan informasi identitas pribadi seperti nama atau email secara langsung. Namun, informasi non-identitas berikut dapat dikumpulkan secara otomatis melalui layanan pihak ketiga.\n\n• Log akses: alamat IP, jenis browser, sistem operasi, waktu kunjungan\n• Cookie dan teknologi serupa: cookie yang digunakan oleh Google Analytics dan Google AdSense`,
      },
      {
        heading: '2. Tujuan Penggunaan',
        body: '• Analisis statistik kunjungan dan peningkatan situs (Google Analytics)\n• Iklan yang dipersonalisasi (Google AdSense)',
      },
      {
        heading: '3. Layanan Pihak Ketiga',
        body: `Situs menggunakan layanan pihak ketiga berikut, masing-masing diatur oleh kebijakan privasi mereka sendiri.\n\n• Google Analytics: https://policies.google.com/privacy\n• Google AdSense: https://policies.google.com/technologies/ads`,
      },
      {
        heading: '4. Pengelolaan Cookie',
        body: 'Anda dapat menolak penyimpanan cookie melalui pengaturan browser. Namun, memblokir cookie dapat membatasi beberapa fitur Situs.',
      },
      {
        heading: '5. Penyimpanan Data',
        body: 'Situs tidak menyimpan informasi identitas pribadi secara langsung. Data yang dikumpulkan oleh layanan pihak ketiga disimpan sesuai dengan kebijakan masing-masing.',
      },
      {
        heading: '6. Perubahan Kebijakan',
        body: 'Perubahan pada kebijakan ini akan diumumkan di Situs.',
      },
    ],
  },
  vi: {
    title: 'Chính sách bảo mật',
    lastUpdated: '3 tháng 3, 2026',
    intro: `${SITE_NAME_EN} (${SITE_URL}, sau đây gọi là "Trang web") coi trọng quyền riêng tư của bạn và tuân thủ luật pháp hiện hành. Chính sách này giải thích thông tin được thu thập và cách sử dụng.`,
    sections: [
      {
        heading: '1. Thông tin thu thập',
        body: `Trang web không yêu cầu đăng ký và không trực tiếp thu thập thông tin nhận dạng cá nhân như tên hoặc email. Tuy nhiên, các thông tin không nhận dạng sau có thể được thu thập tự động thông qua dịch vụ bên thứ ba.\n\n• Nhật ký truy cập: địa chỉ IP, loại trình duyệt, hệ điều hành, thời gian truy cập\n• Cookie và công nghệ tương tự: cookie được sử dụng bởi Google Analytics và Google AdSense`,
      },
      {
        heading: '2. Mục đích sử dụng',
        body: '• Phân tích thống kê truy cập và cải thiện trang web (Google Analytics)\n• Quảng cáo cá nhân hóa (Google AdSense)',
      },
      {
        heading: '3. Dịch vụ bên thứ ba',
        body: `Trang web sử dụng các dịch vụ bên thứ ba sau, mỗi dịch vụ được điều chỉnh bởi chính sách bảo mật riêng.\n\n• Google Analytics: https://policies.google.com/privacy\n• Google AdSense: https://policies.google.com/technologies/ads`,
      },
      {
        heading: '4. Quản lý Cookie',
        body: 'Bạn có thể từ chối lưu trữ cookie thông qua cài đặt trình duyệt. Tuy nhiên, việc chặn cookie có thể hạn chế một số tính năng.',
      },
      {
        heading: '5. Lưu giữ dữ liệu',
        body: 'Trang web không trực tiếp lưu giữ thông tin nhận dạng cá nhân. Dữ liệu do dịch vụ bên thứ ba thu thập được lưu giữ theo chính sách của từng dịch vụ.',
      },
      {
        heading: '6. Thay đổi chính sách',
        body: 'Mọi thay đổi chính sách sẽ được thông báo trên Trang web.',
      },
    ],
  },
  th: {
    title: 'นโยบายความเป็นส่วนตัว',
    lastUpdated: '3 มีนาคม 2026',
    intro: `${SITE_NAME_EN} (${SITE_URL} ต่อไปนี้เรียกว่า "เว็บไซต์") ให้ความสำคัญกับความเป็นส่วนตัวของคุณและปฏิบัติตามกฎหมายที่เกี่ยวข้อง นโยบายนี้อธิบายข้อมูลที่เก็บรวบรวมและวิธีการใช้งาน`,
    sections: [
      {
        heading: '1. ข้อมูลที่เก็บรวบรวม',
        body: `เว็บไซต์ไม่ต้องการการลงทะเบียนและไม่เก็บรวบรวมข้อมูลระบุตัวตนส่วนบุคคล เช่น ชื่อหรืออีเมลโดยตรง อย่างไรก็ตาม ข้อมูลที่ไม่ระบุตัวตนต่อไปนี้อาจถูกเก็บรวบรวมโดยอัตโนมัติผ่านบริการของบุคคลที่สาม\n\n• บันทึกการเข้าถึง: ที่อยู่ IP ประเภทเบราว์เซอร์ ระบบปฏิบัติการ เวลาเข้าชม\n• คุกกี้และเทคโนโลยีที่คล้ายกัน: คุกกี้ที่ใช้โดย Google Analytics และ Google AdSense`,
      },
      {
        heading: '2. วัตถุประสงค์การใช้งาน',
        body: '• วิเคราะห์สถิติการเข้าชมและปรับปรุงเว็บไซต์ (Google Analytics)\n• โฆษณาส่วนบุคคล (Google AdSense)',
      },
      {
        heading: '3. บริการของบุคคลที่สาม',
        body: `เว็บไซต์ใช้บริการของบุคคลที่สามต่อไปนี้ แต่ละบริการอยู่ภายใต้นโยบายความเป็นส่วนตัวของตนเอง\n\n• Google Analytics: https://policies.google.com/privacy\n• Google AdSense: https://policies.google.com/technologies/ads`,
      },
      {
        heading: '4. การจัดการคุกกี้',
        body: 'คุณสามารถปฏิเสธการจัดเก็บคุกกี้ผ่านการตั้งค่าเบราว์เซอร์ อย่างไรก็ตาม การบล็อกคุกกี้อาจจำกัดคุณสมบัติบางอย่าง',
      },
      {
        heading: '5. การเก็บรักษาข้อมูล',
        body: 'เว็บไซต์ไม่เก็บรักษาข้อมูลระบุตัวตนส่วนบุคคลโดยตรง ข้อมูลที่เก็บรวบรวมโดยบริการของบุคคลที่สามจะถูกเก็บรักษาตามนโยบายของแต่ละบริการ',
      },
      {
        heading: '6. การเปลี่ยนแปลงนโยบาย',
        body: 'การเปลี่ยนแปลงนโยบายนี้จะประกาศบนเว็บไซต์',
      },
    ],
  },
};

export const getPrivacyContent = (locale: Locale): PrivacyContent =>
  PRIVACY[locale] ?? PRIVACY.ko;
