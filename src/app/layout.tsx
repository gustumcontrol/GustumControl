import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GusStum Control",
  description: "Panel operativo del hotel",
  icons: {
    icon: "/flavicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        {/* Font Awesome Pro — servido vía CDN desde el mismo mirror que usa
            TopUpProject, sin necesitar un token de licencia npm. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/Leonciogrullon/FontAwesome-Pro@main/css/all.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
