import { useEffect, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import {

    Activity,
    Moon,

    AlertCircle,

    ArrowRight,

    CheckCircle2,

    Clock3,

    ImagePlus,

    Leaf,

    LoaderCircle,

    LogOut,

    RefreshCw,

    ScanLine,

    Sprout,
    Sun,

    Upload,

    X,

} from "lucide-react";

import { getCurrentUser, logoutUser } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const API_BASE = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

function getToken() {

    return localStorage.getItem("plant_doctor_token");

}

function normalizeDiagnosis(item) {

    if (!item || typeof item !== "object") return null;

    return {

        id: item.id || item._id,

        plant_name: item.plant_name || "Unknown plant",

        health_status: item.health_status || "Uncertain",

        likely_issue: item.likely_issue || "Not specified",

        confidence: Number(item.confidence ?? 0),

        observations: Array.isArray(item.observations)

            ? item.observations

            : item.observations

                ? [item.observations]

                : [],

        recommendations: Array.isArray(item.recommendations)

            ? item.recommendations

            : item.recommendations

                ? [item.recommendations]

                : [],

        next_check: item.next_check || "Monitor your plant",

        created_at: item.created_at || null,

    };

}

function getStatus(status = "") {

    const value = status.toLowerCase();

    if (value === "healthy") {

        return {

            label: "Looking healthy",

            icon: CheckCircle2,

            classes: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-100 dark:border-emerald-900",

        };

    }

    if (value === "needs attention") {

        return {

            label: "Needs attention",

            icon: AlertCircle,

            classes: "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-100 dark:border-amber-900",

        };

    }

    return {

        label: "Uncertain",

        icon: Activity,

        classes: "bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-200 border-stone-200 dark:border-slate-700",

    };

}

function formatDate(value) {

    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString(undefined, {

        day: "numeric",

        month: "short",

        year: "numeric",

    });

}

async function authorizedFetch(path, options = {}) {

    const token = getToken();

    if (!token) {

        throw new Error(

            "Your session token was not found. Please sign in again."

        );

    }

    const response = await fetch(`${API_BASE}${path}`, {

        ...options,

        headers: {

            Authorization: `Bearer ${token}`,

            ...options.headers,

        },

    });

    if (response.status === 401) {

        await logoutUser();

        window.location.href = "/login";

        throw new Error("Your session has expired. Please sign in again.");

    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {

        throw new Error(

            data.detail || data.message || `Request failed (${response.status}).`

        );

    }

    return data;

}

export default function Dashboard() {

    const navigate = useNavigate();

    const fileInputRef = useRef(null);
    const { darkMode, toggleTheme } = useTheme();

    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);

    const [selectedFile, setSelectedFile] = useState(null);

    const [previewUrl, setPreviewUrl] = useState("");

    const [diagnosing, setDiagnosing] = useState(false);

    const [diagnosis, setDiagnosis] = useState(null);

    const [uploadError, setUploadError] = useState("");

    const [history, setHistory] = useState([]);

    const [historyLoading, setHistoryLoading] = useState(true);

    const [historyError, setHistoryError] = useState("");

    useEffect(() => {

        let active = true;

        async function initialize() {

            try {

                const currentUser = await getCurrentUser();

                if (active) setUser(currentUser?.user || currentUser);

                // History errors should not log the user out.

                try {

                    const data = await authorizedFetch(

                        "/api/history/?limit=20"

                    );

                    if (active) {

                        const items = Array.isArray(data.diagnoses)

                            ? data.diagnoses

                            : [];

                        setHistory(

                            items.map(normalizeDiagnosis).filter(Boolean)

                        );

                    }

                } catch (error) {

                    if (active) setHistoryError(error.message);

                } finally {

                    if (active) setHistoryLoading(false);

                }

            } catch {

                await logoutUser();

                if (active) navigate("/login", { replace: true });

            } finally {

                if (active) setLoading(false);

            }

        }

        initialize();

        return () => {

            active = false;

        };

    }, [navigate]);

    useEffect(() => {

        return () => {

            if (previewUrl) URL.revokeObjectURL(previewUrl);

        };

    }, [previewUrl]);

    async function handleLogout() {

        await logoutUser();

        navigate("/login", { replace: true });

    }

    function handleFileChange(event) {

        const file = event.target.files?.[0];

        // Permit choosing the same file again later.

        event.target.value = "";

        if (!file) return;

        setUploadError("");

        setDiagnosis(null);

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {

            setSelectedFile(null);

            setPreviewUrl("");

            setUploadError("Please select a JPEG, PNG, or WebP image.");

            return;

        }

        if (file.size > 10 * 1024 * 1024) {

            setSelectedFile(null);

            setPreviewUrl("");

            setUploadError("Your image must be 10 MB or smaller.");

            return;

        }

        setSelectedFile(file);

        setPreviewUrl(URL.createObjectURL(file));

    }

    async function handleDiagnose() {

        if (!selectedFile || diagnosing) return;

        setDiagnosing(true);

        setUploadError("");

        setDiagnosis(null);

        try {

            const formData = new FormData();

            formData.append("image", selectedFile);

            const data = await authorizedFetch("/api/diagnose/", {

                method: "POST",

                body: formData,

            });

            const raw = data.diagnosis || data.analysis;

            if (!raw) {

                throw new Error("The server returned no diagnosis.");

            }

            let parsed = raw;

            // Supports the earlier endpoint that returned JSON as text.

            if (typeof raw === "string") {

                try {

                    parsed = JSON.parse(raw);

                } catch {

                    throw new Error(

                        "The model response was not valid structured JSON. Please try again."

                    );

                }

            }

            const result = normalizeDiagnosis(parsed);

            if (!result) {

                throw new Error("Could not read the diagnosis response.");

            }

            setDiagnosis(result);

            // Reload saved diagnoses after successful analysis.

            try {

                const historyData = await authorizedFetch(

                    "/api/history/?limit=20"

                );

                setHistory(

                    (historyData.diagnoses || [])

                        .map(normalizeDiagnosis)

                        .filter(Boolean)

                );

                setHistoryError("");

            } catch (error) {

                // The diagnosis succeeded even if history refresh failed.

                setHistoryError(error.message);

            }

        } catch (error) {

            setUploadError(error.message || "Plant analysis failed.");

        } finally {

            setDiagnosing(false);

        }

    }

    if (loading) {

        return (

            <main className="flex min-h-screen items-center justify-center bg-cream text-forest-800 dark:bg-slate-950 dark:text-slate-100">

                <div className="flex items-center gap-3">

                    <Sprout className="animate-pulse" />

                    Preparing your garden...

                </div>

            </main>

        );

    }

    const healthyCount = history.filter(

        (item) => item.health_status.toLowerCase() === "healthy"

    ).length;

    const attentionCount = history.filter(

        (item) => item.health_status.toLowerCase() === "needs attention"

    ).length;

    return (

        <main className="min-h-screen bg-cream text-forest-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">

            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-forest-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-10 dark:border-slate-700 dark:bg-slate-900/95">

                <div className="flex items-center gap-3">

                    <span className="rounded-xl bg-forest-700 p-2.5 text-white">

                        <Sprout size={23} />

                    </span>

                    <span className="font-display text-2xl font-bold">

                        Plant Doctor

                    </span>

                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
                        title={`Switch to ${darkMode ? "light" : "dark"} mode`}
                        className="inline-flex items-center gap-2 rounded-xl border border-forest-100 bg-white px-3 py-2.5 text-sm font-medium text-forest-800 transition hover:bg-forest-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        <span className="hidden sm:inline">{darkMode ? "Light mode" : "Dark mode"}</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-4"
                    >
                        <LogOut size={17} />
                        <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>

            </header>

            <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 sm:px-10 sm:py-12">

                <section className="relative overflow-hidden rounded-3xl bg-forest-800 p-7 text-white sm:p-10 lg:p-12">

                    <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/10" />

                    <div className="pointer-events-none absolute -bottom-48 right-40 h-80 w-80 rounded-full border border-white/10" />

                    <div className="relative max-w-3xl">

                        <Leaf size={30} className="mb-6 text-emerald-300" />

                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200 sm:text-sm">

                            Your personal plant-care space

                        </p>

                        <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">

                            Welcome, {user?.name || "plant lover"}.

                        </h1>

                        <p className="mt-4 max-w-2xl leading-7 text-white/75">

                            Every leaf has a story. Understand what your plant

                            needs, take action, and watch it grow.

                        </p>

                        <button

                            onClick={() =>

                                document

                                    .getElementById("plant-uploader")

                                    ?.scrollIntoView({ behavior: "smooth" })

                            }

                            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 font-semibold text-forest-900 transition hover:bg-emerald-200 dark:text-slate-100"

                        >

                            Check your plant

                            <ArrowRight size={18} />

                        </button>

                    </div>

                </section>

                <section className="grid gap-4 sm:grid-cols-3">

                    <StatCard

                        icon={ScanLine}

                        label="Total diagnoses"

                        value={history.length}

                        note="Saved plant checks"

                    />

                    <StatCard

                        icon={CheckCircle2}

                        label="Looking healthy"

                        value={healthyCount}

                        note="Healthy diagnoses"

                    />

                    <StatCard

                        icon={Activity}

                        label="Needs attention"

                        value={attentionCount}

                        note="Checks to follow up"

                    />

                </section>

                <section

                    id="plant-uploader"

                    className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]"

                >

                    <div className="rounded-3xl border border-forest-100 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">

                        <div className="mb-6 flex items-start gap-4">

                            <span className="rounded-2xl bg-emerald-50 p-3 text-forest-700 dark:bg-emerald-950/50 dark:text-emerald-300">

                                <ImagePlus size={25} />

                            </span>

                            <div>

                                <h2 className="font-display text-2xl font-bold">

                                    How is your plant doing?

                                </h2>

                                <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-slate-400">

                                    Share a clear photo of its leaves and let

                                    your AI plant-care assistant take a look.

                                </p>

                            </div>

                        </div>

                        <input

                            ref={fileInputRef}

                            type="file"

                            accept="image/jpeg,image/png,image/webp"

                            className="hidden"

                            onChange={handleFileChange}

                        />

                        {previewUrl ? (

                            <div className="relative overflow-hidden rounded-2xl bg-stone-50 dark:bg-slate-800">

                                <img

                                    src={previewUrl}

                                    alt="Selected plant"

                                    className="max-h-[360px] w-full object-contain"

                                />

                                <button

                                    type="button"

                                    onClick={() => {

                                        setSelectedFile(null);

                                        setPreviewUrl("");

                                        setDiagnosis(null);

                                        setUploadError("");

                                    }}

                                    aria-label="Remove selected image"

                                    className="absolute right-3 top-3 rounded-full bg-white p-2 text-stone-600 shadow transition hover:bg-stone-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"

                                >

                                    <X size={18} />

                                </button>

                            </div>

                        ) : (

                            <button

                                type="button"

                                onClick={() => fileInputRef.current?.click()}

                                className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-forest-100 bg-[#faf9f4] px-5 py-10 text-center transition hover:border-forest-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-800"

                            >

                                <span className="rounded-2xl bg-emerald-100 p-4 text-forest-700 dark:bg-emerald-900/60 dark:text-emerald-300">

                                    <Upload size={27} />

                                </span>

                                <span className="mt-4 font-semibold">

                                    Choose a plant photo

                                </span>

                                <span className="mt-2 text-sm text-stone-500 dark:text-slate-400">

                                    JPEG, PNG or WebP · Up to 10 MB

                                </span>

                                <span className="mt-4 text-xs text-stone-400 dark:text-slate-500">

                                    A clear photo in natural light works best.

                                </span>

                            </button>

                        )}

                        {selectedFile && (

                            <p className="mt-3 truncate text-sm text-stone-500 dark:text-slate-400">

                                {selectedFile.name}

                            </p>

                        )}

                        {uploadError && (

                            <div

                                role="alert"

                                className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700 dark:bg-red-950/40 dark:text-red-300"

                            >

                                <AlertCircle

                                    size={18}

                                    className="mt-0.5 shrink-0"

                                />

                                {uploadError}

                            </div>

                        )}

                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                            <button

                                type="button"

                                onClick={handleDiagnose}

                                disabled={!selectedFile || diagnosing}

                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-forest-800 px-5 py-3.5 font-semibold text-white transition hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                {diagnosing ? (

                                    <>

                                        <LoaderCircle

                                            size={19}

                                            className="animate-spin"

                                        />

                                        Examining your plant...

                                    </>

                                ) : (

                                    <>

                                        <ScanLine size={19} />

                                        Analyze plant

                                    </>

                                )}

                            </button>

                            {selectedFile && !diagnosing && (

                                <button

                                    type="button"

                                    onClick={() =>

                                        fileInputRef.current?.click()

                                    }

                                    className="rounded-xl border border-forest-100 px-5 py-3.5 font-semibold transition hover:bg-stone-50 dark:border-slate-700 dark:hover:bg-slate-800"

                                >

                                    Change photo

                                </button>

                            )}

                        </div>

                        <p className="mt-4 text-xs leading-5 text-stone-400 dark:text-slate-500">

                            AI assessments can be uncertain. Use the results as

                            guidance, not as a confirmed plant-disease diagnosis.

                        </p>

                    </div>

                    <div className="space-y-5">

                        {diagnosis ? (

                            <DiagnosisPanel diagnosis={diagnosis} />

                        ) : (

                            <div className="flex min-h-64 flex-col justify-center rounded-3xl bg-[#e9efe5] p-7 sm:p-8 dark:bg-slate-800">

                                <span className="mb-5 w-fit rounded-2xl bg-white p-3 text-forest-700 dark:bg-slate-900 dark:text-emerald-300">

                                    <Sprout size={27} />

                                </span>

                                <h2 className="font-display text-2xl font-bold">

                                    A healthier plant starts here.

                                </h2>

                                <p className="mt-3 max-w-md text-sm leading-6 text-stone-600 dark:text-slate-300">

                                    Your diagnosis will appear here with

                                    visible observations, practical next steps,

                                    and a suggested time to check again.

                                </p>

                            </div>

                        )}

                        <div className="rounded-2xl border border-forest-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">

                            <div className="flex items-center gap-3">

                                <Clock3

                                    size={21}

                                    className="text-forest-700 dark:text-emerald-300"

                                />

                                <div>

                                    <h3 className="font-semibold">

                                        Small steps, healthier plants

                                    </h3>

                                    <p className="mt-1 text-sm leading-5 text-stone-500 dark:text-slate-400">

                                        Follow the recommended care steps and

                                        check back on your plant's progress.

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>

                <section className="pb-8">

                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

                        <div>

                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-700 dark:text-emerald-300">

                                Your plant journal

                            </p>

                            <h2 className="mt-2 font-display text-3xl font-bold">

                                Recent diagnoses

                            </h2>

                            <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">

                                Your saved plant checks, all in one place.

                            </p>

                        </div>

                        <button

                            type="button"

                            onClick={async () => {

                                setHistoryLoading(true);

                                setHistoryError("");

                                try {

                                    const data = await authorizedFetch(

                                        "/api/history/?limit=20"

                                    );

                                    setHistory(

                                        (data.diagnoses || [])

                                            .map(normalizeDiagnosis)

                                            .filter(Boolean)

                                    );

                                } catch (error) {

                                    setHistoryError(error.message);

                                } finally {

                                    setHistoryLoading(false);

                                }

                            }}

                            className="flex items-center gap-2 rounded-xl border border-forest-100 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"

                        >

                            <RefreshCw size={16} />

                            Refresh

                        </button>

                    </div>

                    {historyError && (

                        <div

                            role="alert"

                            className="mb-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"

                        >

                            Could not refresh your history: {historyError}

                        </div>

                    )}

                    {historyLoading ? (

                        <div className="flex items-center justify-center gap-3 rounded-2xl border border-forest-100 bg-white p-10 text-stone-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">

                            <LoaderCircle

                                size={20}

                                className="animate-spin"

                            />

                            Growing your journal...

                        </div>

                    ) : history.length === 0 ? (

                        <div className="rounded-2xl border border-dashed border-forest-200 bg-white/70 px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-900/70">

                            <Sprout

                                size={34}

                                className="mx-auto text-forest-700 dark:text-emerald-300"

                            />

                            <h3 className="mt-4 font-semibold">

                                Your plant journal starts here

                            </h3>

                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500 dark:text-slate-400">

                                Your saved diagnoses will appear here after

                                your first successful plant analysis.

                            </p>

                        </div>

                    ) : (

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                            {history.map((item, index) => (


                                <HistoryCard
                                    key={item.id || `${item.created_at}-${index}`}
                                    item={item}
                                    onOpen={() => {
                                        setDiagnosis(item);
                                        document
                                            .getElementById("plant-uploader")
                                            ?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start",
                                            });
                                    }}
                                />


                            ))}

                        </div>

                    )}

                </section>

                <footer className="border-t border-forest-100 py-6 text-center text-sm text-stone-500 dark:border-slate-700 dark:text-slate-400">

                    Made with care for the plants that make a house a home.

                </footer>

            </div>

        </main>

    );

}

function StatCard({ icon: Icon, label, value, note }) {

    return (

        <div className="rounded-2xl border border-forest-100 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">

            <div className="flex items-center justify-between">

                <span className="text-sm font-medium text-stone-500 dark:text-slate-400">

                    {label}

                </span>

                <span className="rounded-xl bg-emerald-50 p-2.5 text-forest-700 dark:bg-emerald-950/50 dark:text-emerald-300">

                    <Icon size={21} />

                </span>

            </div>

            <p className="mt-4 text-3xl font-bold tabular-nums">{value}</p>

            <p className="mt-1 text-xs text-stone-400 dark:text-slate-500">{note}</p>

        </div>

    );

}

function DiagnosisPanel({ diagnosis }) {

    const status = getStatus(diagnosis.health_status);

    const StatusIcon = status.icon;

    const confidence = Math.round(

        Math.max(0, Math.min(1, diagnosis.confidence)) * 100

    );

    return (

        <div className="overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

            <div className="bg-forest-800 p-6 text-white sm:p-7">

                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">

                    Your plant assessment

                </p>

                <h2 className="mt-3 font-display text-3xl font-bold">

                    {diagnosis.plant_name}

                </h2>

                <span

                    className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${status.classes}`}

                >

                    <StatusIcon size={16} />

                    {status.label}

                </span>

            </div>

            <div className="space-y-6 p-6 sm:p-7">

                <div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">

                        Likely issue

                    </p>

                    <p className="mt-2 text-lg font-semibold">

                        {diagnosis.likely_issue}

                    </p>

                </div>

                <div>

                    <div className="flex items-center justify-between gap-3">

                        <p className="text-sm font-medium text-stone-600 dark:text-slate-300">

                            Model confidence

                        </p>

                        <span className="text-sm font-bold">

                            {confidence}%

                        </span>

                    </div>

                    <div

                        className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-slate-800"

                        role="progressbar"

                        aria-valuenow={confidence}

                        aria-valuemin={0}

                        aria-valuemax={100}

                    >

                        <div

                            className="h-full rounded-full bg-emerald-600 transition-all"

                            style={{ width: `${confidence}%` }}

                        />

                    </div>

                    <p className="mt-2 text-xs leading-5 text-stone-400 dark:text-slate-500">

                        This reflects the model's estimate, not a calibrated

                        probability that a diagnosis is correct.

                    </p>

                </div>

                <div>

                    <h3 className="font-semibold">What we observed</h3>

                    <ul className="mt-3 space-y-2">

                        {diagnosis.observations.length ? (

                            diagnosis.observations.map((text, index) => (

                                <li

                                    key={index}

                                    className="flex gap-2 text-sm leading-6 text-stone-600 dark:text-slate-300"

                                >

                                    <Leaf

                                        size={16}

                                        className="mt-1 shrink-0 text-forest-700 dark:text-emerald-300"

                                    />

                                    {text}

                                </li>

                            ))

                        ) : (

                            <li className="text-sm text-stone-500 dark:text-slate-400">

                                No observations were provided.

                            </li>

                        )}

                    </ul>

                </div>

                <div className="rounded-2xl bg-[#eef4eb] p-4 sm:p-5 dark:bg-slate-800">

                    <h3 className="font-semibold text-forest-900 dark:text-slate-100">

                        What to do now

                    </h3>

                    <ul className="mt-3 space-y-3">

                        {diagnosis.recommendations.length ? (

                            diagnosis.recommendations.map((text, index) => (

                                <li

                                    key={index}

                                    className="flex gap-2 text-sm leading-6 text-stone-700 dark:text-slate-200"

                                >

                                    <CheckCircle2

                                        size={17}

                                        className="mt-1 shrink-0 text-forest-700 dark:text-emerald-300"

                                    />

                                    {text}

                                </li>

                            ))

                        ) : (

                            <li className="text-sm text-stone-500 dark:text-slate-400">

                                Monitor the plant and seek more information if

                                symptoms develop.

                            </li>

                        )}

                    </ul>

                </div>

                <div className="flex items-start gap-3 border-t border-stone-100 pt-5 dark:border-slate-700">

                    <Clock3

                        size={20}

                        className="mt-0.5 text-forest-700 dark:text-emerald-300"

                    />

                    <div>

                        <p className="text-sm font-semibold">

                            When to check again

                        </p>

                        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">

                            {diagnosis.next_check}

                        </p>

                    </div>

                </div>

            </div>

        </div>

    );

}


function HistoryCard({ item, onOpen }) {
    const status = getStatus(item.health_status);
    const StatusIcon = status.icon;

    return (
        <article className="rounded-2xl border border-forest-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-xl bg-emerald-50 p-3 text-forest-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Sprout size={22} />
                    </span>

                    <div className="min-w-0">
                        <h3 className="truncate font-semibold">
                            {item.plant_name}
                        </h3>

                        <p className="mt-1 text-xs text-stone-400 dark:text-slate-500">
                            {formatDate(item.created_at)}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onOpen}
                    aria-label={`View diagnosis for ${item.plant_name}`}
                    title="View diagnosis"
                    className="mt-1 shrink-0 text-stone-400 transition hover:text-forest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-500 dark:hover:text-emerald-300"
                >
                    <ArrowRight size={17} />
                </button>
            </div>

            <div className="mt-5">
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.classes}`}
                >
                    <StatusIcon size={14} />
                    {status.label}
                </span>
            </div>

            <p className="mt-4 text-sm font-medium">
                {item.likely_issue}
            </p>

            <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-slate-400">
                {item.observations[0] || "No observations recorded."}
            </p>

            <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4 text-xs text-stone-500 dark:border-slate-700 dark:text-slate-400">
                <Clock3 size={14} />
                Check again: {item.next_check}
            </div>
        </article>
    );
}
