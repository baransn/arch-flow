import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arch Flow - Architecture Visualization",
  description: "Visualize and animate system architecture from GitHub repositories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
