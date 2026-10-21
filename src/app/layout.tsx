import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { MaterialProvider } from "@/src/components/material-provider";
import "./global.css";

const helveticaRegular = localFont({
  src: [
    {
      path: "../../public/fonts/Helvetica Regular.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-helvetica",
});

export const metadata: Metadata = {
  title: "Shiori Graph Tool (CrinGraph)",
  description: "View and compare frequency response graphs for earphones/headphones.",
  appleWebApp: { capable: true, title: "Shiori Graph Tool (CrinGraph)", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={helveticaRegular.variable}
    >
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body><MaterialProvider>{children}</MaterialProvider></body>
    </html>
  );
}
