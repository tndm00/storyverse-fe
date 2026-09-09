// Which backend the service facades talk to. See .env.example.
//   "mock" -> src/services/mock/*   (default)
//   "api"  -> src/services/api/*     (real backend)
import { DATA_SOURCE } from "@/utils/constants";

export const activeDataSource =
  import.meta.env.VITE_DATA_SOURCE === DATA_SOURCE.api ? DATA_SOURCE.api : DATA_SOURCE.mock;

export const useRealApi = activeDataSource === DATA_SOURCE.api;
