import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider } from "../lib/theme-context";
import { LanguageProvider } from "../lib/language-context";
import CookieBanner from "./components/CookieBanner";

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <CookieBanner />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
