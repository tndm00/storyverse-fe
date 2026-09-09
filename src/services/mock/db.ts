// In-memory mock database. THROWAWAY: all state lives in module-scoped arrays and
// resets on full page reload. Services mutate these arrays directly so that a
// subsequent refetch reflects the change. Replace with real API calls (see
// src/services/api/) once the backend exposes the matching endpoints.

import dayjs from "dayjs";
import { DEMO_CREDENTIALS } from "@/utils/constants";
import type {
  ChapterStatus,
  ModerationAction,
  ReportReason,
  ReportStatus,
  ReviewStatus,
  StoryStatus,
  TargetType,
} from "@/utils/constants";
import type { Chapter, HistoryEntry, Report, ReviewItem, Story } from "@/types/domain";

interface MockUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
}

const GENRES = [
  "Ngôn Tình",
  "Kiếm Hiệp",
  "Tiên Hiệp",
  "Huyền Huyễn",
  "Đô Thị",
  "Trinh Thám",
  "Kinh Dị",
  "Hài Hước",
  "Hành Động",
  "Xuyên Không",
];
const TAGS = ["trọng sinh", "hệ thống", "sủng", "cường giả", "nữ cường", "vả mặt", "điền văn"];
const AUTHORS = [
  "Mặc Hương Đồng Khứu",
  "Nhĩ Căn",
  "Thiên Tằm Thổ Đậu",
  "Vong Ngữ",
  "Cố Mạn",
  "Đường Gia Tam Thiếu",
  "Tần Nặc",
  "Diệp Phi Dạ",
];
const READERS = ["reader_an", "linh_reader", "bao_ngoc", "tuan.pham", "mai_2k1", "hoang_dev"];

const LOREM =
  "Ngày ấy, khi ánh trăng phủ lên đỉnh Thiên Sơn, hắn đứng lặng nhìn về phương xa. " +
  "Con đường tu luyện phía trước còn dài, nhưng trong lòng hắn đã không còn do dự. " +
  "Một hơi thở, một niệm đầu, thiên địa như thu vào lòng bàn tay. ";

const daysAgo = (n: number): string => dayjs().subtract(n, "day").toISOString();
const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length];
const pickN = <T>(arr: readonly T[], count: number, seed: number): T[] => {
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) out.push(arr[(seed + i * 3) % arr.length]);
  return [...new Set(out)];
};
const id = (prefix: string, n: number): string => `${prefix}-${String(n).padStart(4, "0")}`;

// ---- users ------------------------------------------------------------------

export const users: MockUser[] = [
  {
    id: "usr-0001",
    email: DEMO_CREDENTIALS.email,
    password: DEMO_CREDENTIALS.password,
    displayName: "Platform Admin",
    avatarUrl: null,
    roles: ["PLATFORM_ADMIN"],
  },
  {
    id: "usr-0002",
    email: "mod@storyverse.local",
    password: "mod123",
    displayName: "Content Moderator",
    avatarUrl: null,
    roles: ["MODERATOR"],
  },
  {
    id: "usr-0003",
    email: "author@storyverse.local",
    password: "author123",
    displayName: "Người Kể Chuyện",
    avatarUrl: null,
    roles: ["Reader", "Author"],
  },
];

// ---- stories --------------------------------------------------------------

const STORY_STATUS_BY_INDEX: readonly StoryStatus[] = [
  "Ongoing",
  "Ongoing",
  "Completed",
  "Hiatus",
  "Draft",
  "Dropped",
  "Ongoing",
  "Completed",
];

export const stories: Story[] = Array.from({ length: 34 }, (_, i): Story => {
  const n = i + 1;
  const status = pick(STORY_STATUS_BY_INDEX, i);
  const title =
    `${pick(["Nghịch Thiên", "Vạn Cổ", "Đấu Phá", "Thần Ấn", "Tuyệt Thế", "Ma Đạo", "Tinh Thần", "Cửu Tinh"], i)} ` +
    `${pick(["Tà Thần", "Thần Vương", "Chi Lộ", "Vương Tọa", "Đường", "Truyền Kỳ", "Biến", "Quyết"], i + 3)} ${n}`;
  return {
    publicId: id("st", n),
    title,
    slug: `story-${n}`,
    description:
      "Một thiếu niên bình phàm vô tình có được truyền thừa thượng cổ, từ đó bước lên con đường nghịch thiên cải mệnh, " +
      "tranh phong với thiên kiêu vạn tộc, đạp lên đỉnh phong của thế giới tu luyện.",
    coverImageUrl: `https://picsum.photos/seed/story${n}/120/160`,
    status,
    authorName: pick(AUTHORS, i),
    language: "vi",
    ageRating: i % 5 === 0 ? "Mature" : "General",
    viewCount: Math.floor(2000 + Math.random() * 900000),
    followCount: Math.floor(50 + Math.random() * 40000),
    ratingAvg: Number((3.4 + Math.random() * 1.6).toFixed(1)),
    ratingCount: Math.floor(5 + Math.random() * 3000),
    genres: pickN(GENRES, 2, i),
    tags: pickN(TAGS, 3, i),
    chapterCount: Math.floor(5 + Math.random() * 800),
    publishedAt: status === "Draft" ? null : daysAgo(30 + i * 4),
    createdAt: daysAgo(40 + i * 4),
  };
});

// ---- chapters (only the handful that are attached to review items) ---------

const CHAPTER_DRAFT: ChapterStatus = "Draft";

export const chapters: Chapter[] = Array.from({ length: 12 }, (_, i): Chapter => {
  const n = i + 1;
  const story = stories[i % stories.length];
  return {
    publicId: id("ch", n),
    storyPublicId: story.publicId,
    storyTitle: story.title,
    title: `Chương ${100 + n}: ${pick(["Đột phá", "Sinh tử chiến", "Bí cảnh", "Trùng phùng", "Phản bội", "Đại điển"], i)}`,
    orderIndex: 100 + n,
    wordCount: Math.floor(1500 + Math.random() * 3500),
    status: CHAPTER_DRAFT,
    content: LOREM.repeat(18),
    submittedAt: daysAgo(i),
  };
});

// ---- review queue (FE-proposed lifecycle, no backend equivalent yet) ------

const REVIEW_STATUS_BY_INDEX: readonly ReviewStatus[] = [
  "Pending",
  "Pending",
  "Pending",
  "Reviewing",
  "Pending",
  "Approved",
  "Pending",
  "Rejected",
  "Reviewing",
  "Pending",
  "Pending",
  "Approved",
];

export const reviewItems: ReviewItem[] = Array.from({ length: 22 }, (_, i): ReviewItem => {
  const n = i + 1;
  const isChapter = i % 3 === 1;
  const target = isChapter ? chapters[i % chapters.length] : stories[i % stories.length];
  const reviewStatus = pick(REVIEW_STATUS_BY_INDEX, i);
  const history: HistoryEntry[] = [
    {
      at: daysAgo(i + 2),
      actor: isChapter ? (target as Chapter).storyTitle : (target as Story).authorName,
      action: "Submitted",
      note: "Author submitted for review.",
    },
  ];
  if (reviewStatus === "Reviewing" || reviewStatus === "Approved" || reviewStatus === "Rejected") {
    history.push({
      at: daysAgo(i + 1),
      actor: "Platform Admin",
      action: "Started review",
      note: null,
    });
  }
  if (reviewStatus === "Approved") {
    history.push({
      at: daysAgo(i),
      actor: "Platform Admin",
      action: "Approved & published",
      note: "Meets content guidelines.",
    });
  }
  if (reviewStatus === "Rejected") {
    history.push({
      at: daysAgo(i),
      actor: "Platform Admin",
      action: "Rejected",
      note: "Missing primary genre; formatting issues in chapter 1.",
    });
  }
  return {
    id: id("rv", n),
    targetType: isChapter ? "Chapter" : "Story",
    targetPublicId: target.publicId,
    title: isChapter
      ? `${(target as Chapter).storyTitle} — ${(target as Chapter).title}`
      : (target as Story).title,
    authorName: isChapter
      ? stories.find((s) => s.publicId === (target as Chapter).storyPublicId)?.authorName
      : (target as Story).authorName,
    genres: isChapter ? [] : (target as Story).genres,
    submittedAt: daysAgo(i + 2),
    reviewStatus,
    assignedTo: reviewStatus === "Pending" ? null : "Platform Admin",
    decisionReason:
      reviewStatus === "Rejected"
        ? "Missing primary genre; formatting issues in chapter 1."
        : reviewStatus === "Approved"
          ? "Meets content guidelines."
          : null,
    history,
  };
});

// ---- reports --------------------------------------------------------------

const REPORT_STATUS_BY_INDEX: readonly ReportStatus[] = [
  "Pending",
  "Pending",
  "Reviewing",
  "Pending",
  "Resolved",
  "Pending",
  "Dismissed",
  "Pending",
  "Reviewing",
  "Resolved",
  "Pending",
  "Pending",
];

export const reports: Report[] = Array.from({ length: 26 }, (_, i): Report => {
  const n = i + 1;
  const targetType = pick(["Story", "Chapter", "Comment"] as const, i) as TargetType;
  const story = stories[i % stories.length];
  const reason = pick(["Copyright", "Inappropriate", "Spam", "Other"] as const, i) as ReportReason;
  const status = pick(REPORT_STATUS_BY_INDEX, i);
  const action: ModerationAction | null =
    status === "Resolved"
      ? pick(["Warn", "Hide", "Remove"] as const, i)
      : status === "Dismissed"
        ? "Dismiss"
        : null;
  const history: HistoryEntry[] = [
    { at: daysAgo(i + 1), actor: pick(READERS, i), action: "Reported", note: null },
  ];
  if (status === "Reviewing" || status === "Resolved" || status === "Dismissed") {
    history.push({ at: daysAgo(i), actor: "Content Moderator", action: "Picked up", note: null });
  }
  if (action) {
    history.push({
      at: daysAgo(i),
      actor: "Content Moderator",
      action,
      note: status === "Dismissed" ? "No violation found." : "Violation confirmed.",
    });
  }
  return {
    id: id("rp", n),
    targetType,
    targetRef: {
      id: targetType === "Comment" ? id("cm", n) : story.publicId,
      title:
        targetType === "Comment"
          ? `Comment on "${story.title}"`
          : targetType === "Chapter"
            ? `${story.title} — Chương ${20 + n}`
            : story.title,
    },
    reason,
    reporterName: pick(READERS, i),
    note: pick(
      [
        "This chapter is copied word-for-word from another site.",
        "Contains explicit content not marked as Mature.",
        "Spam links in the author's note.",
        "Harassment in the comment thread.",
        "Wrong genre, misleading tags.",
      ],
      i,
    ),
    status,
    action,
    resolutionNote:
      status === "Resolved"
        ? "Action applied per moderation guidelines."
        : status === "Dismissed"
          ? "No violation found."
          : null,
    createdAt: daysAgo(i + 1),
    history,
  };
});

// ---- derived helpers -----------------------------------------------------

export const findStory = (publicId: string): Story | null =>
  stories.find((s) => s.publicId === publicId) ?? null;

export const findChapter = (publicId: string): Chapter | null =>
  chapters.find((c) => c.publicId === publicId) ?? null;
