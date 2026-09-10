// Report / moderation-queue facade — Moderation service /v1/reports.
//
// Signatures + return shapes are unchanged so the admin pages (ReportsQueuePage,
// ReportDetailPage, DashboardPage) need no edits.
//   - the free-text `q` filter is ignored (no backend search)
//   - report summaries carry no target title / reporter name — shown as
//     "<TargetType> <id8>" / "Người dùng #<id>"
//   - `ReportDetail.story` is always null (no cross-service lookup)
//   - a decision is recorded but NOT applied to the reported content (backend is audit-only)

import { moderationApi } from "./api/moderationApi";
import { DEFAULT_PAGE_SIZE, MESSAGES } from "@/utils/constants";
import type { ModerationAction, ReportReason, ReportStatus, TargetType } from "@/utils/constants";
import type { HistoryEntry, Paged, Report, ReportDetail } from "@/types/domain";

export interface ReportListParams {
  pageNumber?: number;
  pageSize?: number;
  status?: ReportStatus | "all";
  reason?: ReportReason | "all";
  q?: string;
}

export type ReportCounts = Record<ReportStatus, number> & { total: number };

export interface ModerationInput {
  action: ModerationAction | null;
  note: string;
}

// ---- backend DTOs -----------------------------------------------------

interface ReportActionDto {
  id: string;
  moderatorUserId: number;
  action: string;
  note: string;
  createdAt: string;
}

interface ReportSummaryDto {
  id: string;
  targetType: TargetType;
  targetId: string;
  targetTitle: string | null;
  reason: ReportReason;
  status: ReportStatus;
  reporterUserId: number | null;
  reporterDisplayName: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface ReportDetailDto extends ReportSummaryDto {
  reporterUserId: number;
  reporterDisplayName: string | null;
  description: string;
  updatedAt: string | null;
  actions: ReportActionDto[];
}

interface PagedDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

const shortId = (id: string) => id.replace(/-/g, "").slice(0, 8);

const targetTitleFor = (d: ReportSummaryDto) =>
  d.targetTitle ?? `${d.targetType} ${shortId(d.targetId)}`;

const reporterNameFor = (d: { reporterDisplayName: string | null; reporterUserId: number | null }) =>
  d.reporterDisplayName ?? (d.reporterUserId != null ? `Người dùng #${d.reporterUserId}` : "—");

function summaryToReport(d: ReportSummaryDto): Report {
  return {
    id: d.id,
    targetType: d.targetType,
    targetRef: { id: d.targetId, title: targetTitleFor(d) },
    reason: d.reason,
    reporterName: reporterNameFor(d),
    note: "",
    status: d.status,
    action: null,
    resolutionNote: null,
    createdAt: d.createdAt,
    history: [],
  };
}

function detailToReport(d: ReportDetailDto): ReportDetail {
  const actions = d.actions ?? [];
  const last = actions.at(-1);
  const history: HistoryEntry[] = actions.map((a) => ({
    at: a.createdAt,
    actor: `Moderator #${a.moderatorUserId}`,
    action: a.action,
    note: a.note || null,
  }));
  return {
    id: d.id,
    targetType: d.targetType,
    targetRef: { id: d.targetId, title: targetTitleFor(d) },
    reason: d.reason,
    reporterName: reporterNameFor(d),
    note: d.description ?? "",
    status: d.status,
    action: (last?.action as ModerationAction) ?? null,
    resolutionNote: last?.note ?? null,
    createdAt: d.createdAt,
    history,
    story: null,
  };
}

// ---- user-facing: file a report ---------------------------------------

export async function fileReport(input: {
  targetType: TargetType;
  targetId: string;
  reason: ReportReason;
  description: string;
}): Promise<void> {
  await moderationApi.submitReport({
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    description: input.description.trim(),
  });
}

// ---- admin queue ---------------------------------------------------

export async function listReports({
  pageNumber = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  status = "all",
  reason = "all",
}: ReportListParams = {}): Promise<Paged<Report>> {
  const paged = await moderationApi.client.get<PagedDto<ReportSummaryDto>>("/v1/reports", {
    params: {
      status: status === "all" ? undefined : status,
      reason: reason === "all" ? undefined : reason,
      "page-number": pageNumber,
      "page-size": pageSize,
    },
  });
  return {
    items: paged.items.map(summaryToReport),
    pageNumber: paged.pageNumber,
    pageSize: paged.pageSize,
    totalCount: paged.totalCount,
    totalPages: paged.totalPages,
  };
}

const STATUSES: ReportStatus[] = ["Pending", "Reviewing", "Resolved", "Dismissed"];

export async function counts(): Promise<ReportCounts> {
  const perStatus = await Promise.all(
    STATUSES.map((s) =>
      moderationApi.client
        .get<PagedDto<ReportSummaryDto>>("/v1/reports", { params: { status: s, "page-size": 1 } })
        .then((p) => [s, p.totalCount] as const),
    ),
  );
  const out = Object.fromEntries(perStatus) as Record<ReportStatus, number>;
  return { ...out, total: STATUSES.reduce((n, s) => n + out[s], 0) };
}

export function get(reportId: string): Promise<ReportDetail> {
  return moderationApi.client.get<ReportDetailDto>(`/v1/reports/${reportId}`).then(detailToReport);
}

export function pickUp(reportId: string): Promise<Report> {
  return moderationApi.client
    .post<ReportDetailDto>(`/v1/reports/${reportId}/review`)
    .then(detailToReport);
}

export function act(reportId: string, { action, note }: ModerationInput): Promise<Report> {
  if (!action) return Promise.reject(new Error(MESSAGES.report.chooseAction));
  if (action !== "Dismiss" && !note) return Promise.reject(new Error(MESSAGES.report.noteRequired));
  const req =
    action === "Dismiss"
      ? moderationApi.dismissReport(reportId, note || "Không vi phạm.")
      : moderationApi.resolveReport(reportId, { action, note });
  return (req as Promise<ReportDetailDto>).then(detailToReport);
}
