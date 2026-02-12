import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getToken } from "@/lib/auth-server";
import { ConvexClientProvider } from "@/modules/convex/providers/ConvexClientProvider";
import { OrganizationProvider } from "@/modules/organization/providers/OrganizationProvider";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-sans",
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
      <body className={`${jetbrainsMono.variable} font-sans antialiased`}>
        <ConvexClientProvider initialToken={token}>
          <OrganizationProvider>{children}</OrganizationProvider>
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
