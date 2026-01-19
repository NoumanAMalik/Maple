import Link from "next/link";
import { CodePreviewWithCanvas } from "@/components/landing/CodePreviewWithCanvas";

function FeatureCard({ title, description }: { title: string; description: string }) {
    return (
        <div className="text-center px-6 py-8">
            <h3 className="text-lg font-medium text-maple-text mb-2">{title}</h3>
            <p className="text-maple-text-secondary text-sm leading-relaxed">{description}</p>
        </div>
    );
}

export default function Home() {
    return (
        <div className="min-h-screen bg-maple-cream">
            {/* Subtle grain texture overlay */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.015]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-6">
                <div className="font-serif text-2xl italic text-maple-text tracking-tight">Maple</div>
                <Link
                    href="/editor"
                    className="text-sm text-maple-text-secondary hover:text-maple-text transition-colors"
                >
                    Open Editor
                </Link>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-16 sm:pt-24 pb-20">
                <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
                    {/* Small badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-maple-warm border border-maple-border text-xs text-maple-text-secondary mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-maple-accent animate-pulse" />
                        Work in progress
                    </div>

                    {/* Main headline */}
                    <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl text-maple-text leading-[1.1] tracking-tight mb-6">
                        Code beautifully,
                        <br />
                        <span className="italic">in your browser</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg sm:text-xl text-maple-text-secondary max-w-xl mx-auto leading-relaxed mb-10">
                        A fully-functional code editor built from scratch. Custom syntax highlighting, no dependencies,
                        pure craft.
                    </p>

                    {/* CTA Button */}
                    <Link
                        href="/editor"
                        className="group inline-flex items-center gap-3 bg-maple-accent hover:bg-maple-accent-hover text-white px-8 py-4 rounded-full text-base font-medium transition-all duration-300 shadow-lg shadow-maple-accent/20 hover:shadow-xl hover:shadow-maple-accent/30 hover:-translate-y-0.5"
                    >
                        Try the Editor
                        <svg
                            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                        </svg>
                    </Link>
                </div>

                {/* Code Preview with 3D Canvas */}
                <CodePreviewWithCanvas />
            </main>

            {/* Features Section */}
            <section className="relative z-10 border-t border-maple-border bg-maple-warm/50">
                <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
                    <h2 className="font-serif text-2xl sm:text-3xl text-maple-text text-center mb-12 italic">
                        Built different
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FeatureCard
                            title="Custom Tokenizer"
                            description="Hand-crafted syntax highlighting engine. No Monaco, no CodeMirror, no shortcuts."
                        />
                        <FeatureCard
                            title="Browser Native"
                            description="No installation required. Open a tab and start coding instantly."
                        />
                        <FeatureCard
                            title="Lightweight"
                            description="Fast, focused, and free of bloat. Just you and your code."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-maple-border">
                <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="font-serif text-xl italic text-maple-text">Maple</div>
                    <p className="text-sm text-maple-text-secondary">trymaple.dev</p>
                </div>
            </footer>
        </div>
    );
}
