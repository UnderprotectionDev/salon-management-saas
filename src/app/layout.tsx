import type { Metadata } from "next";
import { JetBrains_Mono, Playfair_Display, Poppins } from "next/font/google";
import { getToken } from "@/lib/auth-server";
import { ConvexClientProvider } from "@/modules/convex/providers/ConvexClientProvider";
import { OrganizationProvider } from "@/modules/organization/providers/OrganizationProvider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Salon Management",
  description: "Premium salon management platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getToken();
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${jetbrainsMono.variable} ${playfair.variable} font-sans antialiased`}
      >
        <ConvexClientProvider initialToken={token}>
          <OrganizationProvider>{children}</OrganizationProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
