import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intellsys Marketing Cloud",
  description: "Omni-channel marketing platform for WhatsApp, SMS & Email",
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
