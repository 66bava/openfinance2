import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "../lib/auth-context";
import CookieBanner from "./components/CookieBanner";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <CookieBanner />
    </AuthProvider>
  );
}
