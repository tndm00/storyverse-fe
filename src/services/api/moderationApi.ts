// story-be-prj/src/Services/Moderations  (Moderation.Api)
// Status: IMPLEMENTED. Routes: Moderation.Api/Controllers/v1/ReportsController.
//   Report: reason Copyright|Inappropriate|Spam|Other, target Story|Chapter|Comment,
//   status Pending -> Reviewing -> Resolved | Dismissed.
//   resolve action: Warn | Hide | Remove.  (decisions are audit-only — the backend
//   has no event bus, so nothing is applied to the reported content.)
// Filing a report = any authed user. Queue/decision = reports.review / reports.resolve
// (Moderator or PlatformAdmin).

import { createApiClient } from "./client";
import { resolveBaseUrl } from "./config";

const client = createApiClient(resolveBaseUrl("moderation"));

type Query = Record<string, string | number | boolean | undefined>;

export const moderationApi = {
  client,

  submitReport: (body: {
    targetType: string;
    targetId: string;
    reason: string;
    description: string;
  }) => client.post("/v1/reports", body),

  listReports: (params?: Query) => client.get("/v1/reports", { params }),
  getReport: (reportId: string) => client.get(`/v1/reports/${reportId}`),
  startReview: (reportId: string) => client.post(`/v1/reports/${reportId}/review`),
  resolveReport: (reportId: string, body: { action: string; note: string }) =>
    client.post(`/v1/reports/${reportId}/resolve`, body),
  dismissReport: (reportId: string, note: string) =>
    client.post(`/v1/reports/${reportId}/dismiss`, { note }),
};
