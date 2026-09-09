import { useCallback, useState } from "react";
import { App } from "antd";

// Runs an async action with a busy flag + antd success/error toast.
// `run(fn, "Saved", refetch)` — the third arg is called on success.
export function useAsyncRunner() {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<unknown>, okMessage: string, onSuccess?: () => void) => {
      setBusy(true);
      try {
        await fn();
        message.success(okMessage);
        onSuccess?.();
      } catch (err) {
        message.error(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [message],
  );

  return { busy, run };
}
