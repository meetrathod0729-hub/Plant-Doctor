
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Leaf, LoaderCircle } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { getCurrentUser, loginUser } from "../services/api";

export default function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            await loginUser({ email: email.trim(), password });
            await getCurrentUser();
            navigate("/dashboard", { replace: true });
        } catch (err) {
            localStorage.removeItem("plant_doctor_token");
            setError(
                err.response?.data?.detail ||
                err.message ||
                "Unable to log in. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout mode="login">
            <div className="mb-8">
                <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
                    <Leaf size={25} />
                </span>

                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-forest-600">
                    Welcome back
                </p>
                <h1 className="mt-2 font-display text-4xl font-semibold text-forest-900">
                    Let's grow together.
                </h1>
                <p className="mt-3 leading-6 text-stone-500">
                    Sign in to care for your plants and revisit their progress.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="mb-2 block text-sm font-medium text-forest-900">
                        Email address
                    </label>
                    <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 outline-none transition placeholder:text-stone-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-forest-900">
                        Password
                    </label>

                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Enter your password"
                            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 pr-12 outline-none transition placeholder:text-stone-400 focus:border-forest-500 focus:ring-4 focus:ring-forest-100"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-stone-500 hover:bg-stone-100"
                        >
                            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-700 px-4 py-3.5 font-semibold text-white shadow-soft transition hover:bg-forest-800 disabled:opacity-60"
                >
                    {loading && <LoaderCircle size={19} className="animate-spin" />}
                    {loading ? "Signing you in..." : "Sign in"}
                </button>
            </form>

            <p className="mt-7 text-center text-sm text-stone-500">
                New to Plant Doctor?{" "}
                <Link to="/signup" className="font-semibold text-forest-700 hover:underline">
                    Create an account
                </Link>
            </p>
        </AuthLayout>
    );
}
