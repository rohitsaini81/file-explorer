import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "File Manager",
  description: "File manager powered by Next.js API routes and temporary arrays",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
