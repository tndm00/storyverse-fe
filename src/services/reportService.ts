// Report / moderation-queue facade.
//   DATA_SOURCE=mock -> src/services/mock/db.ts
//   DATA_SOURCE=api  -> Moderation service /v1/reports
//
// Signatures + return shapes are unchanged so the admin pages (ReportsQueuePage,
// ReportDetailPage, DashboardPage) need no edits. In API mode:
//   - the free-text `q` filter is ignored (no backend search)
//   - report summaries carry no target title / reporter name — shown as
//     "<TargetType> <id8>" / "Người dùng #<id>"
//   - `ReportDetail.story` is always null (no cross-service lookup)
//   - a decision is recorded but NOT applied to the reported content (backend is audit-only)

import dayjs from "dayjs";
import { reports, findStory } from "./mock/db";
import { withLatency, failWithLatency, paginate } from "./mock/latency";
import { useRealApi } from "./dataSource";
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
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

interface ReportDetailDto extends ReportSummaryDto {
  reporterUserId: number;
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

function summaryToReport(d: ReportSummaryDto): Report {
  return {
    id: d.id,
    targetType: d.targetType,
    targetRef: { id: d.targetId, title: `${d.targetType} ${shortId(d.targetId)}` },
    reason: d.reason,
    reporterName: "—",
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
    targetRef: { id: d.targetId, title: `${d.targetType} ${shortId(d.targetId)}` },
    reason: d.reason,
    reporterName: `Người dùng #${d.reporterUserId}`,
    note: d.description ?? "",
    status: d.status,
    action: (last?.action as ModerationAction) ?? null,
    resolutionNote: last?.note ?? null,
    createdAt: d.createdAt,
    history,
    story: null,
  };
}

// ---- user-facing: file a report (both modes hit the real API) --------

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

const byDateDesc = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export function listReports(params: ReportListParams = {}): Promise<Paged<Report>> {
  return useRealApi ? listReportsApi(params) : listReportsMock(params);
}

async function listReportsApi({
  pageNumber = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  status = "all",
  reason = "all",
}: ReportListParams): Promise<Paged<Report>> {
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

function listReportsMock({
  pageNumber = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  status = "all",
  reason = "all",
  q = "",
}: ReportListParams): Promise<Paged<Report>> {
  let rows = [...reports].sort(byDateDesc);
  if (status !== "all") rows = rows.filter((r) => r.status === status);
  if (reason !== "all") rows = rows.filter((r) => r.reason === reason);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.targetRef.title.toLowerCase().includes(needle) ||
        r.reporterName.toLowerCase().includes(needle),
    );
  }
  return withLatency(paginate(rows, pageNumber, pageSize));
}

const STATUSES: ReportStatus[] = ["Pending", "Reviewing", "Resolved", "Dismissed"];

export function counts(): Promise<ReportCounts> {
  if (useRealApi) return countsApi();
  const by = (s: ReportStatus) => reports.filter((r) => r.status === s).length;
  return withLatency({
    Pending: by("Pending"),
    Reviewing: by("Reviewing"),
    Resolved: by("Resolved"),
    Dismissed: by("Dismissed"),
    total: reports.length,
  });
}

async function countsApi(): Promise<ReportCounts> {
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
  if (useRealApi) {
    return moderationApi.client
      .get<ReportDetailDto>(`/v1/reports/${reportId}`)
      .then(detailToReport);
  }
  const report = reports.find((r) => r.id === reportId);
  if (!report) return failWithLatency<ReportDetail>(MESSAGES.report.notFound);
  const story = report.targetType !== "Comment" ? findStory(report.targetRef.id) : null;
  return withLatency({ ...report, story });
}

export function pickUp(reportId: string): Promise<Report> {
  if (useRealApi) {
    return moderationApi.client
      .post<ReportDetailDto>(`/v1/reports/${reportId}/review`)
      .then(detailToReport);
  }
  const report = reports.find((r) => r.id === reportId);
  if (!report) return failWithLatency<Report>(MESSAGES.report.notFound);
  if (report.status !== "Pending")
    return failWithLatency<Report>(MESSAGES.report.onlyPendingCanPickUp);
  report.status = "Reviewing";
  report.history = [
    ...report.history,
    { at: dayjs().toISOString(), actor: "Content Moderator", action: "Picked up", note: null },
  ];
  return withLatency({ ...report });
}

export function act(reportId: string, { action, note }: ModerationInput): Promise<Report> {
  if (useRealApi) {
    if (!action) return Promise.reject(new Error(MESSAGES.report.chooseAction));
    if (action !== "Dismiss" && !note)
      return Promise.reject(new Error(MESSAGES.report.noteRequired));
    const req =
      action === "Dismiss"
        ? moderationApi.dismissReport(reportId, note || "Không vi phạm.")
        : moderationApi.resolveReport(reportId, { action, note });
    return (req as Promise<ReportDetailDto>).then(detailToReport);
  }
  const report = reports.find((r) => r.id === reportId);
  if (!report) return failWithLatency<Report>(MESSAGES.report.notFound);
  if (!action) return failWithLatency<Report>(MESSAGES.report.chooseAction);
  if (action !== "Dismiss" && !note) return failWithLatency<Report>(MESSAGES.report.noteRequired);
  report.action = action;
  report.status = action === "Dismiss" ? "Dismissed" : "Resolved";
  report.resolutionNote = note || "No violation found.";
  report.history = [
    ...report.history,
    { at: dayjs().toISOString(), actor: "Content Moderator", action, note: report.resolutionNote },
  ];
  return withLatency({ ...report });
}
