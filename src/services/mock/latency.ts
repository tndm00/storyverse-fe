// Helpers that make the mock services feel like a real network layer.

import { MOCK_LATENCY_MS } from "@/utils/constants";
import type { Paged } from "@/types/domain";

export function withLatency<T>(value: T, ms = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

export function failWithLatency<T = never>(message: string, ms = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

// Mirrors the backend PagedResponseDto<T> shape.
export function paginate<T>(array: readonly T[], pageNumber = 1, pageSize = 20): Paged<T> {
  const totalCount = array.length;
  const start = (pageNumber - 1) * pageSize;
  const items = array.slice(start, start + pageSize);
  return {
    items,
    pageNumber,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}
