import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider } from "../lib/theme-context";
import { LanguageProvider } from "../lib/language-context";
import { UserSettingsProvider } from "../lib/user-settings-context";
import CookieBanner from "./components/CookieBanner";
import { PostHogProvider } from "../lib/posthog";

export default function App() {
  return (
    <PostHogProvider>
      <ThemeProvider>
        <LanguageProvider>
          <UserSettingsProvider>
            <AuthProvider>
              <RouterProvider router={router} />
              <CookieBanner />
            </AuthProvider>
          </UserSettingsProvider>
        </LanguageProvider>
      </ThemeProvider>
    </PostHogProvider>
  );
}
