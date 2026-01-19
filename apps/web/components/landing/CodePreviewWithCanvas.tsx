"use client";

import dynamic from "next/dynamic";
import { CodePreview } from "./CodePreview";

const PixelBlast = dynamic(() => import("./PixelBlast"), { ssr: false });

export function CodePreviewWithCanvas(): React.JSX.Element {
    return (
        <div className="relative w-full max-w-md mx-auto">
            {/* PixelBlast background */}
            <div className="absolute -inset-x-24 -inset-y-16 pointer-events-none z-0">
                <PixelBlast
                    variant="circle"
                    pixelSize={6}
                    color="#c17f59"
                    patternScale={3}
                    patternDensity={1.2}
                    pixelSizeJitter={0.5}
                    enableRipples
                    rippleSpeed={0.4}
                    rippleThickness={0.12}
                    rippleIntensityScale={1.5}
                    liquid
                    liquidStrength={0.12}
                    liquidRadius={1.2}
                    liquidWobbleSpeed={5}
                    speed={0.6}
                    edgeFade={0.25}
                    transparent
                />
            </div>
            <div className="relative z-10">
                <CodePreview />
            </div>
        </div>
    );
}
