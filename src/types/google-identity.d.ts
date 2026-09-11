// Minimal ambient typing for the Google Identity Services (GIS) script loaded
// in index.html (https://accounts.google.com/gsi/client). We only use the
// `accounts.id` sign-in-with-Google surface, so this intentionally covers
// just that — no need for the full @types/google.accounts package.
export {};

declare global {
  interface GoogleCredentialResponse {
    credential: string;
    select_by?: string;
  }

  interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    ux_mode?: "popup" | "redirect";
  }

  interface GoogleButtonConfiguration {
    type?: "standard" | "icon";
    theme?: "outline" | "filled_blue" | "filled_black";
    size?: "large" | "medium" | "small";
    text?: "signin_with" | "signup_with" | "continue_with" | "signin";
    shape?: "rectangular" | "pill" | "circle" | "square";
    width?: string | number;
    logo_alignment?: "left" | "center";
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
