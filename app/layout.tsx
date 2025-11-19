import "./globals.css";
import "./styles/home.css";  // ✅ corrected import
import { ReactNode } from "react";

export const metadata = {
  title: "Briskon Procurement Solution",
  description: "Digital Procurement & Reverse Auction Platform by Briskon",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
