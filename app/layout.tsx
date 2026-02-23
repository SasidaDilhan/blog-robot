import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog Automation App",
  description: "AI Blog Automation SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-100">
        {children}
      </body>
    </html>
  );
}