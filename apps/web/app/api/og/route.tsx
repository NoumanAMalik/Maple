import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
    const instrumentSerif = await fetch(
        new URL("../../../public/fonts/InstrumentSerif-Italic.ttf", import.meta.url),
    ).then((res) => res.arrayBuffer());

    const geistSans = await fetch(new URL("../../../public/fonts/Geist-Regular.ttf", import.meta.url)).then((res) =>
        res.arrayBuffer(),
    );

    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fbf7f4",
                fontFamily: "Geist Sans",
            }}
        >
            <div
                style={{
                    fontSize: 96,
                    fontFamily: "Instrument Serif",
                    fontStyle: "italic",
                    color: "#1a1612",
                    letterSpacing: "-0.02em",
                    marginBottom: 24,
                }}
            >
                Maple
            </div>

            <div
                style={{
                    fontSize: 32,
                    fontFamily: "Geist Sans",
                    color: "#6b6056",
                    letterSpacing: "0.01em",
                }}
            >
                Code beautifully.
            </div>
        </div>,
        {
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: "Instrument Serif",
                    data: instrumentSerif,
                    style: "italic",
                    weight: 400,
                },
                {
                    name: "Geist Sans",
                    data: geistSans,
                    style: "normal",
                    weight: 400,
                },
            ],
        },
    );
}
