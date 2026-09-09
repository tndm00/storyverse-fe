// Seed content for the Canh Ba reader pages (Nổi bật / Theo chủ đề / Cộng đồng).
// Swap for `contentApi` / `communityApi` once the reader site is wired to the backend.

import type { StoryCard, TrendingItem } from "./homeData";

export interface SpotlightStory {
  slug: string;
  letter: string;
  kicker: string;
  title: string;
  excerpt: string;
  meta: string;
}

export const SPOTLIGHT: SpotlightStory = {
  slug: "dua-tre-ngoi-cuoi-lop-hoc-them",
  letter: "Đ",
  kicker: "Biên tập chọn tuần này",
  title: "Đứa trẻ ngồi cuối lớp học thêm",
  excerpt:
    "Suốt một học kỳ, cô giáo Lan không hề để ý có một học sinh chưa từng được cô gọi tên — cho đến ngày cô mở sổ điểm danh.",
  meta: "Kể bởi Hoài Nam · 4.520 lượt đọc · 9 phút đọc",
};

export const FEATURED_PICKS: StoryCard[] = [
  {
    slug: "buc-anh-thua-mot-nguoi",
    letter: "B",
    kicker: "Biên tập chọn",
    title: "Bức ảnh thừa một người",
    readTime: "7 phút đọc",
    reads: "1.860 lượt đọc",
    excerpt: "Tấm ảnh lớp 12 năm ấy, ai cũng thấy rõ — trừ người đứng giữa.",
  },
  {
    slug: "gieng-nuoc-sau-vuon-ngoai",
    letter: "G",
    kicker: "Biên tập chọn",
    title: "Giếng nước sau vườn ngoại",
    readTime: "10 phút đọc",
    reads: "1.320 lượt đọc",
    excerpt:
      "Ngoại dặn không được nhìn xuống giếng sau 7 giờ tối, nhưng không ai giải thích vì sao.",
  },
  {
    slug: "tieng-goi-trong-ong-nghe-cu",
    letter: "T",
    kicker: "Biên tập chọn",
    title: "Tiếng gọi trong ống nghe cũ",
    readTime: "6 phút đọc",
    reads: "998 lượt đọc",
    excerpt: "Chiếc điện thoại bàn đã cắt thuê bao ba năm, nhưng vẫn đổ chuông đúng 12 giờ đêm.",
  },
];

export interface RecommendedItem extends TrendingItem {
  sub: string;
}

export const COMMUNITY_RECOMMENDED: RecommendedItem[] = [
  {
    slug: "chiec-xich-du-khong-ai-day",
    title: "Chiếc xích đu không ai đẩy",
    sub: "Đề cử bởi @thao.nguyen",
    reads: "1.210 lượt đọc",
  },
  {
    slug: "nguoi-hang-xom-tang-tren",
    title: "Người hàng xóm tầng trên",
    sub: "Đề cử bởi @vu.tran",
    reads: "876 lượt đọc",
  },
  {
    slug: "den-phong-thi-so-7",
    title: "Đèn phòng thi số 7",
    sub: "Đề cử bởi @kimchi_88",
    reads: "640 lượt đọc",
  },
];

export type TopicIcon =
  "house" | "mountain" | "hospital" | "water" | "school" | "village" | "city" | "war";

export interface Topic {
  key: string;
  name: string;
  count: string;
  icon: TopicIcon;
  stories: TrendingItem[];
}

export const TOPICS: Topic[] = [
  {
    key: "nha-hoang",
    name: "Nhà hoang",
    count: "24 truyện",
    icon: "house",
    stories: [
      {
        slug: "can-nha-cuoi-hem-khong-so",
        title: "Căn nhà cuối hẻm không số",
        reads: "3.204 lượt đọc",
      },
      {
        slug: "chiec-chia-khoa-thua-phong-3b",
        title: "Chiếc chìa khóa thừa của phòng 3B",
        reads: "1.540 lượt đọc",
      },
      {
        slug: "biet-thu-bo-hoang-doi-lam-vien",
        title: "Ngôi biệt thự bỏ hoang trên đồi Lâm Viên",
        reads: "1.120 lượt đọc",
      },
      {
        slug: "anh-den-dau-can-nha-so-9",
        title: "Ánh đèn dầu ở căn nhà số 9",
        reads: "860 lượt đọc",
      },
    ],
  },
  {
    key: "mien-nui",
    name: "Miền núi",
    count: "17 truyện",
    icon: "mountain",
    stories: [
      { slug: "suong-mu-o-deo-ba-tang", title: "Sương mù ở đèo Ba Tầng", reads: "1.760 lượt đọc" },
      {
        slug: "tieng-khen-trong-ban-vang",
        title: "Tiếng khèn trong bản vắng",
        reads: "1.030 lượt đọc",
      },
      {
        slug: "nguoi-dan-duong-khong-ten",
        title: "Người dẫn đường không tên",
        reads: "742 lượt đọc",
      },
    ],
  },
  {
    key: "benh-vien",
    name: "Bệnh viện",
    count: "15 truyện",
    icon: "hospital",
    stories: [
      {
        slug: "phong-benh-so-13",
        title: "Phòng bệnh số 13 không ai dám nhận",
        reads: "2.010 lượt đọc",
      },
      {
        slug: "ca-truc-dem-dieu-duong-hanh",
        title: "Ca trực đêm của điều dưỡng Hạnh",
        reads: "1.220 lượt đọc",
      },
      {
        slug: "chiec-giuong-trong-khoa-nhi",
        title: "Chiếc giường trống ở khoa nhi",
        reads: "905 lượt đọc",
      },
    ],
  },
  {
    key: "song-nuoc",
    name: "Sông nước",
    count: "12 truyện",
    icon: "water",
    stories: [
      {
        slug: "nguoi-ban-dong-hanh-tren-chuyen-tau-dem",
        title: "Người bạn đồng hành trên chuyến tàu đêm",
        reads: "1.876 lượt đọc",
      },
      { slug: "ghe-hang-khong-cap-ben", title: "Ghe hàng không cập bến", reads: "980 lượt đọc" },
      {
        slug: "tieng-goi-do-luc-nua-dem",
        title: "Tiếng gọi đò lúc nửa đêm",
        reads: "654 lượt đọc",
      },
    ],
  },
  {
    key: "hoc-duong",
    name: "Học đường",
    count: "21 truyện",
    icon: "school",
    stories: [
      {
        slug: "dua-tre-ngoi-cuoi-lop-hoc-them",
        title: "Đứa trẻ ngồi cuối lớp học thêm",
        reads: "4.520 lượt đọc",
      },
      { slug: "den-phong-thi-so-7", title: "Đèn phòng thi số 7", reads: "1.340 lượt đọc" },
      {
        slug: "chiec-ghe-trong-ban-cuoi",
        title: "Chiếc ghế trống ở bàn cuối",
        reads: "990 lượt đọc",
      },
    ],
  },
  {
    key: "lang-que",
    name: "Làng quê",
    count: "19 truyện",
    icon: "village",
    stories: [
      {
        slug: "loi-tat-qua-nghia-trang-lang",
        title: "Lối tắt qua nghĩa trang làng",
        reads: "655 lượt đọc",
      },
      {
        slug: "gieng-nuoc-sau-vuon-ngoai",
        title: "Giếng nước sau vườn ngoại",
        reads: "1.320 lượt đọc",
      },
      {
        slug: "cay-da-dau-lang",
        title: "Cây đa đầu làng không ai dám chặt",
        reads: "870 lượt đọc",
      },
    ],
  },
  {
    key: "thanh-thi",
    name: "Thành thị",
    count: "13 truyện",
    icon: "city",
    stories: [
      {
        slug: "nguoi-hang-xom-tang-tren",
        title: "Người hàng xóm tầng trên",
        reads: "876 lượt đọc",
      },
      {
        slug: "thang-may-tang-khong-ton-tai",
        title: "Thang máy dừng ở tầng không tồn tại",
        reads: "1.450 lượt đọc",
      },
      {
        slug: "quan-ca-phe-chi-mo-luc-nua-dem",
        title: "Quán cà phê chỉ mở lúc nửa đêm",
        reads: "760 lượt đọc",
      },
    ],
  },
  {
    key: "thoi-chien",
    name: "Thời chiến",
    count: "9 truyện",
    icon: "war",
    stories: [
      { slug: "buc-thu-chua-kip-gui", title: "Bức thư chưa kịp gửi", reads: "1.180 lượt đọc" },
      {
        slug: "nguoi-linh-canh-cay-cau-cu",
        title: "Người lính canh ở cây cầu cũ",
        reads: "940 lượt đọc",
      },
      {
        slug: "ham-tru-an-duoi-san-dinh",
        title: "Hầm trú ẩn dưới sân đình",
        reads: "705 lượt đọc",
      },
    ],
  },
];

export interface CommunityStat {
  value: string;
  label: string;
}

export const COMMUNITY_STATS: CommunityStat[] = [
  { value: "312", label: "người kể chuyện" },
  { value: "1.480", label: "truyện đã đăng" },
  { value: "9.2k", label: "bình luận" },
];

export interface Contributor {
  initials: string;
  name: string;
  role: string;
  bio: string;
  count: string;
}

export const CONTRIBUTORS: Contributor[] = [
  {
    initials: "MT",
    name: "Minh Thư",
    role: "Người kể chuyện",
    bio: "Chuyên viết truyện lấy bối cảnh miền Tây sông nước, hay ghi lại chuyện được người thân kể lại.",
    count: "18 truyện · Xem hồ sơ",
  },
  {
    initials: "HN",
    name: "Hoài Nam",
    role: "Người kể chuyện",
    bio: "Viết truyện học đường, thường lấy cảm hứng từ chuyện được kể trong ký túc xá.",
    count: "12 truyện · Xem hồ sơ",
  },
  {
    initials: "TT",
    name: "Thanh Tùng",
    role: "Người kể chuyện",
    bio: "Sưu tầm và biên lại các câu chuyện dân gian vùng núi phía Bắc.",
    count: "9 truyện · Xem hồ sơ",
  },
];

export interface Discussion {
  id: string;
  title: string;
  replies: string;
}

export const DISCUSSIONS: Discussion[] = [
  {
    id: "d1",
    title: "Có ai từng nghe chuyện ma ở ký túc xá Đại học X chưa?",
    replies: "42 phản hồi",
  },
  { id: "d2", title: "Xin góp ý bản thảo truyện đầu tay của mình", replies: "27 phản hồi" },
  { id: "d3", title: "Vì sao nhiều chuyện ma hay nhắc đến giờ Tý?", replies: "19 phản hồi" },
];

export const SUBMIT_GUIDELINES: string[] = [
  "Câu chuyện do bạn tự viết hoặc được kể lại có xin phép người kể gốc.",
  "Không sao chép nguyên văn từ nguồn khác chưa được cho phép.",
  "Hạn chế mô tả quá mức bạo lực, máu me hoặc nội dung nhạy cảm.",
  "Đội biên tập có thể liên hệ để chỉnh sửa trước khi đăng.",
  "Thời gian phản hồi thường trong vòng 3–5 ngày.",
];
