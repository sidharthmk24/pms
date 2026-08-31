import type { Metadata } from "next";
import { Anek_Malayalam, Geist_Mono } from "next/font/google";
import "./globals.css";

// Brand typeface: Anek Malayalam covers Latin + Malayalam scripts
const anekMalayalam = Anek_Malayalam({
  variable: "--font-anek",
  subsets: ["latin", "malayalam"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Kairali PMS",
    template: "%s · Kairali PMS",
  },
  description: "Publisher management system for Kairali Books",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${anekMalayalam.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
