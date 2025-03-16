"use client"
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  useEffect(() => {
    const setBodyHeight = () => {
      document.body.style.height = `${window.innerHeight}px`;
    };

    setBodyHeight();
    window.addEventListener("resize", setBodyHeight);

    return () => window.removeEventListener("resize", setBodyHeight);
  }, []);

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <SessionProvider> 
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}
        >
            {children}   
        </body>
      </SessionProvider>
    </html>
  );
}
