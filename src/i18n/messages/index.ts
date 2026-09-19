import { catalog } from "./catalog";
import { common } from "./common";
import { dashboard } from "./dashboard";
import { enums } from "./enums";
import { layout, login } from "./layout";
import { reports } from "./reports";
import { review } from "./review";

// Every admin message, merged. MessageKey (the union of all keys) is what makes t("...") type-safe:
// a mistyped key does not compile, and each entry must carry every language (see defineMessages).
export const messages = {
  ...common,
  ...enums,
  ...layout,
  ...login,
  ...dashboard,
  ...review,
  ...reports,
  ...catalog,
};

export type MessageKey = keyof typeof messages;
