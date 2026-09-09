// One client module per backend microservice (story-be-prj/src/Services/*).
//
//   authenticationApi  -> Authentications   (implemented)
//   contentApi         -> Contents          (implemented)
//   communityApi       -> Communities       (backend skeleton — calls stubbed)
//   libraryApi         -> Libraries         (backend skeleton — calls stubbed)
//   moderationApi      -> Moderations       (backend skeleton — calls stubbed)
//   notificationApi    -> Notifications     (backend skeleton — calls stubbed)

export { authenticationApi } from "./authenticationApi";
export { contentApi } from "./contentApi";
export { communityApi } from "./communityApi";
export { libraryApi } from "./libraryApi";
export { moderationApi } from "./moderationApi";
export { notificationApi } from "./notificationApi";

export { createApiClient, ApiError, notImplemented } from "./client";
export { BACKEND_SERVICES, resolveBaseUrl } from "./config";

import { authenticationApi } from "./authenticationApi";
import { contentApi } from "./contentApi";
import { communityApi } from "./communityApi";
import { libraryApi } from "./libraryApi";
import { moderationApi } from "./moderationApi";
import { notificationApi } from "./notificationApi";

export const api = {
  authentication: authenticationApi,
  content: contentApi,
  community: communityApi,
  library: libraryApi,
  moderation: moderationApi,
  notification: notificationApi,
};
