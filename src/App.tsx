import { Suspense } from "react";
import { useRoutes } from "react-router-dom";
import { siteRoutes } from "@/site/siteRoutes";
import { adminRoutes } from "@/admin/adminRoutes";
import { LoginPage } from "@/auth/LoginPage";
import { NotFoundPage } from "@/components/NotFoundPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoader } from "@/components/PageLoader";

// Two areas, one router:
//   siteRoutes  -> public reader site at "/"      (src/site)
//   adminRoutes -> admin console at ADMIN_BASE_PATH (src/admin, behind RequireAuth;
//                  deliberately not "/admin" — see utils/constants.ts)
// plus the shared /login gate and a catch-all 404. Page components are lazily
// loaded, so a <Suspense> boundary wraps the route tree.
function App() {
  const element = useRoutes([
    siteRoutes,
    { path: "login", element: <LoginPage /> },
    adminRoutes,
    { path: "404", element: <NotFoundPage /> },
    { path: "*", element: <NotFoundPage /> },
  ]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </ErrorBoundary>
  );
}

export default App;
