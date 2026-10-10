
import { Sprout, Leaf, Sun, Flower2 } from "lucide-react";

export default function AuthLayout({ children, mode = "login" }) {
    return (
        <main className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
            <section className="flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16 xl:px-24">
                <a href="/" className="flex items-center gap-3 self-start">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-700 text-white">
                        <Sprout size={24} />
                    </span>
                    <span>
                        <span className="block font-display text-2xl font-bold text-forest-900">
                            Plant Doctor
                        </span>
                        <span className="text-xs tracking-wide text-forest-600">
                            A little care goes a long way
                        </span>
                    </span>
                </a>

                <div className="flex flex-1 items-center justify-center py-12">
                    <div className="w-full max-w-md">
                        {children}
                    </div>
                </div>

                <p className="text-center text-xs text-stone-500">
                    Made for people who love growing things.
                </p>
            </section>

            <aside className="relative hidden overflow-hidden bg-forest-900 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
                <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full border border-white/10" />
                <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-white/10" />

                <div className="relative flex items-center gap-2 text-sm text-white/70">
                    <Leaf size={18} />
                    PLANT CARE, MADE PERSONAL
                </div>

                <div className="relative mx-auto max-w-lg">
                    <div className="relative rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
                        <div className="flex items-center justify-between pb-4">
                            <span className="text-sm text-white/80">
                                Your plant journal
                            </span>
                            <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
                                Growing together
                            </span>
                        </div>

                        <img
                            src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1000&q=85"
                            alt="Lush green plant leaves"
                            className="h-72 w-full rounded-2xl object-cover"
                        />

                        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/20 text-emerald-200">
                                <Flower2 size={22} />
                            </span>
                            <div>
                                <p className="font-medium">A healthier plant starts here</p>
                                <p className="mt-1 text-sm text-white/60">
                                    Understand the signs. Take action. Watch it grow.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative max-w-lg">
                    <Sun className="mb-5 text-emerald-300" size={28} />
                    <h2 className="font-display text-4xl leading-tight xl:text-5xl">
                        Every leaf has a story. Let's help yours thrive.
                    </h2>
                    <p className="mt-5 max-w-md leading-7 text-white/65">
                        Get practical plant-care guidance from a photo, keep track of
                        changes, and give your plants the attention they need.
                    </p>
                </div>
            </aside>
        </main>
    );
}
