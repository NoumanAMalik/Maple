import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
    variable: "--font-instrument-serif",
    subsets: ["latin"],
    weight: "400",
    style: ["normal", "italic"],
});

// JetBrains Mono - excellent monospace font for code editing
const jetbrainsMono = localFont({
    src: [
        {
            path: "../public/fonts/webfonts/JetBrainsMono-Regular.woff2",
            weight: "400",
            style: "normal",
        },
        {
            path: "../public/fonts/webfonts/JetBrainsMono-Medium.woff2",
            weight: "500",
            style: "normal",
        },
        {
            path: "../public/fonts/webfonts/JetBrainsMono-Bold.woff2",
            weight: "700",
            style: "normal",
        },
        {
            path: "../public/fonts/webfonts/JetBrainsMono-Italic.woff2",
            weight: "400",
            style: "italic",
        },
    ],
    variable: "--font-jetbrains-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Maple Editor",
    description: "A custom-built code editor with syntax highlighting. Code beautifully, in your browser.",
    metadataBase: new URL("https://trymaple.dev"),
    openGraph: {
        title: "Maple",
        description: "Code beautifully, in your browser.",
        siteName: "Maple Editor",
        type: "website",
        images: [
            {
                url: "/api/og",
                width: 1200,
                height: 630,
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Maple",
        description: "Code beautifully, in your browser.",
        images: [
            {
                url: "/api/og",
                width: 1200,
                height: 630,
            },
        ],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
