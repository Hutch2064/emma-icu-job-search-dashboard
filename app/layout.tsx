import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emma ICU Job Search Platform",
  description: "Local Dallas-area ICU nursing job search dashboard for Emma Baron.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
