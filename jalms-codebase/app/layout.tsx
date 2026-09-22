import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Outfit, Inter } from "next/font/google"; // [NEW] Premium fonts
import "./globals.css";
import { Toaster } from "sonner";
import { cookies } from "next/headers";
import { AppearanceProvider, type ThemePreference, type UiDensity } from "@/components/appearance-provider";


// [NEW] Primary Heading Font - Geometric & Modern
const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

// [NEW] Body Font - Clean & Legible
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arsync",
  description: "Arsync application",
  icons: {
    icon: "https://jjuy48ud0l.ufs.sh/f/h9KMQVU48dkngJ8vJO6mplvt3DPjiHqOXYorsf8C5zRhynb2",
    apple: "https://jjuy48ud0l.ufs.sh/f/h9KMQVU48dkngJ8vJO6mplvt3DPjiHqOXYorsf8C5zRhynb2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const densityCookie = cookieStore.get("arsync-density")?.value;
  const themeCookie = cookieStore.get("arsync-theme")?.value;
  const density: UiDensity = densityCookie === "comfortable" ? "comfortable" : "compact";
  const theme: ThemePreference = themeCookie === "light" || themeCookie === "dark" ? themeCookie : "system";
  const appearanceScript = `(()=>{try{const d=${JSON.stringify(density)},t=${JSON.stringify(theme)},r=document.documentElement,x=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);r.dataset.density=d;r.dataset.theme=t;r.classList.toggle('dark',x);r.style.colorScheme=x?'dark':'light'}catch(_){}})();`;

  return (
    <html lang="en" data-density={density} data-theme={theme} suppressHydrationWarning>
      <head>
        <Script id="appearance-preference" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body
        className={`${inter.variable} ${outfit.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
        suppressHydrationWarning
      >
        <AppearanceProvider initialDensity={density} initialTheme={theme}>
          {children}
          <Toaster />
        </AppearanceProvider>
      </body>
    </html>
  );
}
