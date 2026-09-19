import { defineMessages } from "../defineMessages";

// Sidebar menu, header and settings pages.
export const layout = defineMessages({
  "nav.dashboard": { en: "Dashboard", vi: "Tổng quan" },
  "nav.reviewQueue": { en: "Review queue", vi: "Hàng đợi duyệt" },
  "nav.rejectedQueue": { en: "Rejected", vi: "Bị từ chối" },
  "nav.reports": { en: "Reports", vi: "Báo cáo" },
  "nav.comments": { en: "Comments", vi: "Bình luận" },
  "nav.stories": { en: "Stories", vi: "Truyện" },
  "nav.genres": { en: "Genres", vi: "Thể loại" },
  "nav.authors": { en: "Authors", vi: "Tác giả" },
  "nav.searchSync": { en: "Search sync", vi: "Đồng bộ tìm kiếm" },
  "nav.settings": { en: "Settings", vi: "Cấu hình" },
  "nav.settingsAppearance": { en: "Appearance", vi: "Giao diện" },
  "nav.settingsLanguage": { en: "Language", vi: "Ngôn ngữ" },

  "layout.logout": { en: "Log out", vi: "Đăng xuất" },
  "layout.defaultUserName": { en: "Admin", vi: "Quản trị viên" },

  "settings.appearanceTitle": { en: "Appearance", vi: "Giao diện" },
  "settings.appearanceHint": {
    en: "Choose a light or dark look for the admin console. Your choice is remembered in this browser.",
    vi: "Chọn giao diện sáng hoặc tối cho bảng điều khiển. Lựa chọn được ghi nhớ trên trình duyệt này.",
  },
  "settings.light": { en: "Light", vi: "Sáng" },
  "settings.dark": { en: "Dark", vi: "Tối" },
  "settings.languageTitle": { en: "Language", vi: "Ngôn ngữ" },
  "settings.languageHint": {
    en: "Choose the language of the admin console. Your choice is remembered in this browser.",
    vi: "Chọn ngôn ngữ của bảng điều khiển. Lựa chọn được ghi nhớ trên trình duyệt này.",
  },
});

// Sign-in page of the admin console.
export const login = defineMessages({
  "login.tagline": {
    en: "Content review & moderation console",
    vi: "Bảng điều khiển duyệt nội dung và kiểm duyệt",
  },
  "login.emailRequired": { en: "Enter your email", vi: "Nhập email của bạn" },
  "login.emailInvalid": { en: "Invalid email", vi: "Email không hợp lệ" },
  "login.password": { en: "Password", vi: "Mật khẩu" },
  "login.passwordRequired": { en: "Enter your password", vi: "Nhập mật khẩu của bạn" },
  "login.signIn": { en: "Sign in", vi: "Đăng nhập" },
  "login.notAllowed": {
    en: "This account is not allowed in the admin console.",
    vi: "Tài khoản này không được phép vào bảng điều khiển quản trị.",
  },
});
