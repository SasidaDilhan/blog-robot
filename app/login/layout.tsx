// app/login/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ No <html> or <body> tags here — root layout handles those
  return <>{children}</>;
}