import type { Metadata } from "next";
import { Red_Hat_Display, Anek_Malayalam, Geist_Mono } from "next/font/google";
import "./globals.css";

// Brand typography: Red Hat Display for primary branding/English, Anek Malayalam for Malayalam
const redHatDisplay = Red_Hat_Display({
  variable: "--font-red-hat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

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
      className={`${redHatDisplay.variable} ${anekMalayalam.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
