// Seed content for the Canh Ba home page. Swap for `contentApi` once the reader
// site is wired to the backend (GET /v1/stories, ranking query).

export interface StoryCard {
  slug: string;
  letter: string;
  kicker: string;
  title: string;
  readTime: string;
  reads: string;
  excerpt?: string;
  by?: string;
}

export interface Edition {
  feature: StoryCard;
  side: [StoryCard, StoryCard];
}

export const EDITIONS: Edition[] = [
  {
    feature: {
      slug: "nguoi-gac-dem-tram-thu-phi-cu",
      letter: "N",
      kicker: "Truyện dài kỳ",
      title: "Người gác đêm ở trạm thu phí cũ",
      readTime: "12 phút đọc",
      reads: "2.140 lượt đọc",
      excerpt:
        "Ông Tư nhận ca trực cuối cùng trước khi trạm thu phí đóng cửa vĩnh viễn — nhưng có người vẫn đến trả tiền mỗi đêm.",
      by: "Kể bởi Minh Thư",
    },
    side: [
      {
        slug: "chuyen-xe-cuoi-o-ben-cu",
        letter: "C",
        kicker: "Truyện thành viên",
        title: "Chuyến xe cuối ở bến cũ",
        readTime: "6 phút đọc",
        reads: "1.005 lượt đọc",
      },
      {
        slug: "vi-sao-khong-nen-huyt-sao-ban-dem",
        letter: "V",
        kicker: "Hỏi đáp tâm linh",
        title: "Vì sao không nên huýt sáo ban đêm",
        readTime: "5 phút đọc",
        reads: "742 lượt đọc",
      },
    ],
  },
  {
    feature: {
      slug: "ba-tieng-go-cua-luc-giao-thua",
      letter: "B",
      kicker: "Truyện dài kỳ",
      title: "Ba tiếng gõ cửa lúc giao thừa",
      readTime: "15 phút đọc",
      reads: "1.412 lượt đọc",
      excerpt:
        "Năm nào cũng vậy, đúng khoảnh khắc chuyển giao có ba tiếng gõ ngoài cửa. Năm nay, bà nội bảo tôi ra mở.",
      by: "Kể bởi Hồng Ân",
    },
    side: [
      {
        slug: "chiec-guong-cu-cua-ba-ngoai",
        letter: "C",
        kicker: "Truyện thành viên",
        title: "Chiếc gương cũ của bà ngoại",
        readTime: "7 phút đọc",
        reads: "980 lượt đọc",
      },
      {
        slug: "loi-tat-qua-nghia-trang-lang",
        letter: "L",
        kicker: "Truyện thành viên",
        title: "Lối tắt qua nghĩa trang làng",
        readTime: "9 phút đọc",
        reads: "655 lượt đọc",
      },
    ],
  },
  {
    feature: {
      slug: "can-nha-cuoi-hem-khong-so",
      letter: "C",
      kicker: "Truyện dài kỳ",
      title: "Căn nhà cuối hẻm không số",
      readTime: "18 phút đọc",
      reads: "3.204 lượt đọc",
      excerpt:
        "Cả con hẻm chỉ có mười hai căn, đánh số từ 1 đến 11. Căn thứ mười hai không có số, và đêm nào đèn cũng sáng.",
      by: "Kể bởi Duy Khang",
    },
    side: [
      {
        slug: "nguoi-ban-dong-hanh-tren-chuyen-tau-dem",
        letter: "N",
        kicker: "Truyện thành viên",
        title: "Người bạn đồng hành trên chuyến tàu đêm",
        readTime: "8 phút đọc",
        reads: "1.876 lượt đọc",
      },
      {
        slug: "den-dau-o-gian-tho",
        letter: "Đ",
        kicker: "Hỏi đáp tâm linh",
        title: "Đèn dầu ở gian thờ không chịu tắt",
        readTime: "4 phút đọc",
        reads: "531 lượt đọc",
      },
    ],
  },
];

export interface TrendingItem {
  slug: string;
  title: string;
  reads: string;
}

export const TRENDING: TrendingItem[] = [
  {
    slug: "can-nha-cuoi-hem-khong-so",
    title: "Căn nhà cuối hẻm không số",
    reads: "3.204 lượt đọc",
  },
  {
    slug: "nguoi-ban-dong-hanh-tren-chuyen-tau-dem",
    title: "Người bạn đồng hành trên chuyến tàu đêm",
    reads: "1.876 lượt đọc",
  },
  {
    slug: "ba-tieng-go-cua-luc-giao-thua",
    title: "Ba tiếng gõ cửa lúc giao thừa",
    reads: "1.412 lượt đọc",
  },
  {
    slug: "chiec-guong-cu-cua-ba-ngoai",
    title: "Chiếc gương cũ của bà ngoại",
    reads: "980 lượt đọc",
  },
  {
    slug: "loi-tat-qua-nghia-trang-lang",
    title: "Lối tắt qua nghĩa trang làng",
    reads: "655 lượt đọc",
  },
];
