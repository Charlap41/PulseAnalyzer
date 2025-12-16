
import React, { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/analytics'; // Import Analytics
import { LandingPage } from './components/LandingPage';
import { HelpPage } from './components/HelpPage';
import { LegalPage } from './components/LegalPages';
import { AccountModal } from './components/AccountModal';
import { Session, Dataset, AnalysisResult, Language, ViewState, SubscriptionPlan } from './types';
import { parseFitFile, parseTextFile, calculateTrustScore, fetchAIAnalysis, formatAIResponse, fetchGlobalAIAnalysis, extractDeviceNameFromFilename, calculateSessionStats, calculateMean } from './utils';
import { createCheckoutSession, createPortalSession, STRIPE_PRICES } from './utils/stripe';
import { t } from './translations';
import { DEMO_SESSION, DEMO_AI_TEXT } from './demoData';
import { useAuth } from './hooks/useAuth';
import { usePayments } from './hooks/usePayments';
import { useSessions } from './hooks/useSessions';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCQOl8lcLsZBgYyEYasjIgVhf7RmGrL3_w",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pulseanalyzer-2545d.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pulseanalyzer-2545d",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pulseanalyzer-2545d.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "860609070068",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:860609070068:web:48538c98e3073ff8b2afa1",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ZJJSWY3TMX"
};

console.log("Firebase Config loaded:", firebaseConfig.apiKey ? "API Key present" : "API Key MISSING");

// Safe Initialize
let auth: firebase.auth.Auth | undefined;
let db: firebase.firestore.Firestore | undefined;
let analytics: firebase.analytics.Analytics | undefined;

try {
    if (!firebase.apps.length) {
        console.log("Initializing Firebase...");
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
    }
    // Only access if initialized
    if (firebase.apps.length) {
        auth = firebase.auth();
        db = firebase.firestore();
        analytics = firebase.analytics();
        console.log("Firebase services ready");
    }
} catch (e) {
    console.error("Firebase Init Error:", e);
}

const COLORS = ['#ff3b30', '#ffcc00', '#0a84ff', '#34c7f2', '#bf5af2', '#30d158'];

const activityIcons: Record<string, string> = {
    "course": "fa-person-running",
    "velo": "fa-person-biking",
    "musculation": "fa-dumbbell",
    "natation": "fa-person-swimming",
    "autre": "fa-star"
};

// --- Components ---
import AnalysisChat from './components/AnalysisChat';


const LoadingOverlay = ({ message }: { message: string }) => (
    <div className="fixed inset-0 z-[100] bg-white/60 dark:bg-black/60 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-bolt text-brand-500 animate-pulse"></i>
            </div>
        </div>
        <h3 className="mt-6 text-xl font-bold text-gray-800 dark:text-white animate-pulse">{message}</h3>
    </div>
);

const App: React.FC = () => {
    // --- State ---
    // User & Auth & Data Hooks
    const { user: currentUser, loading: authLoading, login: authLogin, register: authRegister, logout: authLogout } = useAuth();
    const { plan: realUserPlan, expirationDate } = usePayments(currentUser);

    // View State
    const [view, setView] = useState<ViewState>('landing');
    const [lang, setLang] = useState<Language>(() => {
        // Detect browser language, default to English if not French
        return navigator.language.startsWith('fr') ? 'fr' : 'en';
    });
    const [activeTab, setActiveTab] = useState<'session' | 'dashboard'>('session');

    // Demo Mode State
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isDemoLoading, setIsDemoLoading] = useState(false);

    // Compute Effective Plan
    const userPlan = isDemoMode ? 'annual' : realUserPlan;

    // DEBUG: Log user and plan state
    useEffect(() => {
        console.log("App: currentUser =", currentUser?.uid, currentUser?.email);
        console.log("App: realUserPlan =", realUserPlan, "| userPlan =", userPlan);
    }, [currentUser, realUserPlan, userPlan]);

    // Sessions Hook
    const {
        sessions,
        setSessions,
        loading: sessionsLoading,
        activeSessionId,
        setActiveSessionId,
        saveSession,
        deleteSession: hookDeleteSession
    } = useSessions(currentUser, isDemoMode);

    // UI Loading State (Combine auth + sessions + demo)
    const isLoadingSessions = sessionsLoading || isDemoLoading;
    const [status, setStatus] = useState("Prêt");
    const [isProcessing, setIsProcessing] = useState(false); // For visual overlay
    // --- Global Dashboard State ---
    const [globalReport, setGlobalReport] = useState<any>(null);
    const [globalAIText, setGlobalAIText] = useState<string>('');
    const [lastDashboardAnalysisHash, setLastDashboardAnalysisHash] = useState<string>('');
    const [showUpdateAIPopup, setShowUpdateAIPopup] = useState(false);

    // --- Chart & Visualization State ---
    const [isChartFullscreen, setIsChartFullscreen] = useState(false);
    const [isPortraitMobile, setIsPortraitMobile] = useState(false);
    const [smoothing, setSmoothing] = useState(3);
    const [chartFillEnabled, setChartFillEnabled] = useState(true);
    const [connectGaps, setConnectGaps] = useState(false); // Default: show gaps (dropouts visible)
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<any>(null);
    const [expandedDatasetId, setExpandedDatasetId] = useState<string | null>(null);

    // --- Modals & Forms State ---
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [pendingPaymentPriceId, setPendingPaymentPriceId] = useState<string | null>(null);
    const [planOverviewModalOpen, setPlanOverviewModalOpen] = useState(false);

    // Auth Form Local State
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    // Payment Modals
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sessionModalOpen, setSessionModalOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showFinishPurchaseModal, setShowFinishPurchaseModal] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    // --- Action State ---
    const [activeSessionForm, setActiveSessionForm] = useState<{ name: string, type: string, id?: string }>({ name: '', type: 'course' });
    const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);
    const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
    const [exportImages, setExportImages] = useState<{ main: string, stats: string }>({ main: '', stats: '' });

    // --- Session List UI State ---
    const [showSessionList, setShowSessionList] = useState(true);
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
    const [showAllSessions, setShowAllSessions] = useState(false);

    // --- Refs ---
    const justPurchasedRef = useRef(false);
    const pendingLocalhostFix = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- History Tracking (for 24h limit) ---
    const [creationHistory, setCreationHistory] = useState<number[]>(() => {
        const saved = localStorage.getItem('creationHistory');
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem('creationHistory', JSON.stringify(creationHistory));
    }, [creationHistory]);
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // 1. Check LocalStorage on init
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
            setIsDark(false);
        } else {
            // Default to dark
            document.documentElement.classList.add('dark');
            setIsDark(true);
        }

        // 2. Observer for external changes (redundant but safe)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDark(document.documentElement.classList.contains('dark'));
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    const text = t(lang);

    // --- Config Check (FAIL-SAFE) ---
    if (!firebaseConfig.apiKey) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-6">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center max-w-md">
                    <i className="fa-solid fa-triangle-exclamation text-yellow-500 text-5xl mb-6"></i>
                    <h2 className="text-2xl font-bold mb-3 text-gray-900">Configuration Manquante</h2>
                    <p className="text-gray-600 mb-6">
                        L'application ne peut pas démarrer car la configuration Firebase est introuvable.
                    </p>
                    <div className="bg-gray-100 p-4 rounded text-left text-xs font-mono text-gray-700 overflow-x-auto border border-gray-300">
                        pensez à configurer le fichier <span className="font-bold text-gray-900">.env.local</span> avec VITE_FIREBASE_API_KEY...
                    </div>
                </div>
            </div>
        );
    }

    // --- Helper: Simulate Payment for Dev/Testing ---
    // --- Helper: Simulate Payment for Dev/Testing ---
    const simulateUpgrade = () => {
        // Disabled in refactor - use Firestore directly or real debug mode
        console.log("Simulate Upgrade disabled in refactor");
    };

    // --- Demo Mode Functions ---
    const DEMO_ACCOUNT_UID = 'lttX8DqZSfX08ItVJQYOI7aDONr2'; // Firebase UID for demo@pulse-analyzer.com

    const enterDemoMode = async () => {
        console.log("Entering Demo Mode - Loading from Firebase");
        setIsDemoLoading(true);

        const startTime = Date.now();
        let demoSessions: Session[] = [];

        // Try Firebase first
        try {
            if (firebase.apps.length) {
                const db = firebase.firestore();
                const querySnapshot = await db.collection("users").doc(DEMO_ACCOUNT_UID).collection("sessions").get();
                querySnapshot.forEach((doc) => {
                    demoSessions.push(doc.data() as Session);
                });
            }
        } catch (error: any) {
            console.log("Firebase demo access failed:", error.message);
        }

        // Fallback
        if (demoSessions.length === 0) {
            demoSessions = [DEMO_SESSION as Session];
        }

        demoSessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Recalculate analysisResults to ensure dropoutDetails are populated
        demoSessions = demoSessions.map(session => {
            const stats = calculateSessionStats(session);
            if (stats) {
                return { ...session, analysisResults: stats.analysisResults };
            }
            return session;
        });

        // Since we are using the hook, we need to call setSessions from the hook
        setSessions(demoSessions);

        // Wait
        const elapsedTime = Date.now() - startTime;



        const minLoadTime = 2000;
        if (elapsedTime < minLoadTime) {
            await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsedTime));
        }

        setIsDemoMode(true);
        // setUserPlan('annual'); // Handled by derived state: const userPlan = isDemoMode ? 'annual' : realUserPlan
        setSessions(demoSessions);
        setActiveSessionId(demoSessions[0].id);
        setActiveTab('session');
        setView('app');
        setIsDemoLoading(false); // Hide loading overlay
        analytics.logEvent('demo_mode_entered');
    };

    // --- Fullscreen Chart Logic ---
    const toggleFullscreen = () => {
        setIsChartFullscreen(!isChartFullscreen);
    };

    // Detect portrait orientation on mobile when fullscreen opens
    useEffect(() => {
        if (isChartFullscreen) {
            const checkOrientation = () => {
                const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;
                setIsPortraitMobile(isPortrait);
            };
            checkOrientation();
            window.addEventListener('resize', checkOrientation);
            return () => window.removeEventListener('resize', checkOrientation);
        } else {
            setIsPortraitMobile(false);
        }
    }, [isChartFullscreen]);

    const exitDemoMode = () => {
        console.log("Exiting Demo Mode");
        setIsDemoMode(false);
        // User plan will revert to realUserPlan automatically
        // Hook will reload real sessions if user is logged in, but we might need to trigger reload
        setActiveSessionId(null);
        setActiveTab('session');
        setView('landing');
        setGlobalReport(null);
        setGlobalAIText('');
        // Trigger a reload of main sessions? 
        // The hook useSessions depends on isDemoMode, so it should re-fetch automatically!
    };

    // --- Effects ---

    // 0. Track Page Views
    useEffect(() => {
        analytics.logEvent('page_view', { page_title: view });
    }, [view]);

    // 1. Check URL for payment success param (Hash strategy for preview support)
    // 1. Check URL for payment success param (Hash strategy for preview support)
    useEffect(() => {
        // Helper to parse hash params like #payment_success&plan=annual
        const getHashParam = (key: string) => {
            const hash = window.location.hash.substring(1); // remove #
            const pairs = hash.split('&');
            for (const pair of pairs) {
                const [k, v] = pair.split('=');
                if (k === key) return v || 'true';
                if (key === 'payment_success' && k === 'payment_success') return 'true';
            }
            return null;
        };

        const handlePaymentSuccess = (planType: string | null) => {
            console.log("Paiement réussi détecté ! Plan:", planType);
            setShowSuccessModal(true);
            setView('app');

            // Clear URL to prevent modal on refresh
            window.history.replaceState(null, '', window.location.pathname);

            // OPTIMISTIC UPDATE
            justPurchasedRef.current = true;
            setTimeout(() => { justPurchasedRef.current = false; }, 10000);

            if (planType === 'annual') {
                // setUserPlan('annual'); // Removed: Driven by Firestore
                // setExpirationDate(...) // Removed: Driven by Firestore
                console.log("Optimistic update skipped, waiting for Firestore");
            } else if (planType === 'day_pass') {
                // setUserPlan('24h'); // Removed: Driven by Firestore
                // setExpirationDate(...) // Removed: Driven by Firestore
                console.log("Optimistic update skipped, waiting for Firestore");
            }


            // --- LOCALHOST FIX: SIMULATE WEBHOOK ---
            const isDebug = import.meta.env.VITE_DEBUG_MODE === 'true';
            if (isDebug && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                console.log("DEBUG: Checking Localhost Fix conditions...", { hostname: window.location.hostname, currentUser: !!currentUser });
                if (currentUser) {
                    console.log("Localhost detected & User loaded: Writing to Firestore immediately...");
                    const db = firebase.firestore();
                    if (planType === 'annual') {
                        console.log(`DEBUG: Writing Annual Sub for UID: ${currentUser.uid}`);
                        db.collection("customers").doc(currentUser.uid).collection("subscriptions").add({
                            status: 'active',
                            price: { id: STRIPE_PRICES.ANNUAL },
                            items: [{ price: { id: STRIPE_PRICES.ANNUAL } }],
                            current_period_end: { seconds: Math.floor(Date.now() / 1000) + 31536000 },
                            created: firebase.firestore.FieldValue.serverTimestamp()
                        })
                            .then(() => console.log("Simulated Annual Subscription Created Successfully"))
                            .catch((e) => console.error("ERROR writing Annual Sub:", e));
                    } else {
                        console.log(`DEBUG: Writing Day Pass for UID: ${currentUser.uid}`);
                        db.collection("customers").doc(currentUser.uid).collection("payments").add({
                            status: 'succeeded',
                            amount: 499,
                            currency: 'eur',
                            created: firebase.firestore.FieldValue.serverTimestamp(),
                            items: [{ price: { id: STRIPE_PRICES.DAY_PASS } }]
                        })
                            .then(() => console.log("Simulated 24h Payment Created Successfully"))
                            .catch((e) => console.error("ERROR writing Day Pass:", e));
                    }
                } else {
                    console.log("Localhost detected but User NOT loaded yet. Storing plan for delayed write.");
                    pendingLocalhostFix.current = planType;
                }
            }
        };

        const successParam = getHashParam('payment_success');
        const planParam = getHashParam('plan');

        // Only trigger if success param is present AND we haven't just processed it (though URL clear should handle this)
        if (successParam) {
            handlePaymentSuccess(planParam);
        }
    }, [currentUser]); // Added currentUser dependency to retry localhost fix if needed

    // 2. Watch for plan upgrade in real-time
    useEffect(() => {
        if (userPlan !== 'free') {
            // Close all purchase-related modals
            setUpgradeModalOpen(false);
            setAccountModalOpen(false);
            setShowFinishPurchaseModal(false);

            // Only show success if we were explicitly waiting for a purchase completion
            // AND we are not just logging in (which might trigger this if a modal was left open)
            if (showFinishPurchaseModal || upgradeModalOpen) {
                setShowSuccessModal(true);
            }
        }
    }, [userPlan]);

    // 3. Auto-trigger AI Analysis for Annual Plan on legacy sessions
    // 3. Auto-trigger AI Analysis (REMOVED due to infinite loop risk with single-file analysis)
    // Legacy sessions must be manually analyzed.


    // Auto-close welcome modal if payment succeeds
    useEffect(() => {
        if (showSuccessModal || userPlan === 'annual' || userPlan === '24h') {
            setShowWelcomeModal(false);
        }
    }, [showSuccessModal, userPlan]);






    const handleStripeCheckout = async (priceId: string) => {
        console.log("Stripe Checkout Initiated:", priceId);

        // If not logged in, store intent and open auth
        if (!currentUser) {
            setPendingPaymentPriceId(priceId);
            setAuthMode('register');
            setUpgradeModalOpen(false); // Fix Z-Index issue
            setLimitModalOpen(false);
            setAuthModalOpen(true);
            return;
        }

        // --- DIRECT REDIRECT STRATEGY (UX IMPROVEMENT) ---
        // We redirect the CURRENT window to Stripe.

        setIsProcessing(true);
        setStatus(text.nav.statusProcessing);

        try {
            // Async call to fetch URL
            const url = await createCheckoutSession(priceId);

            if (url) {
                console.log("URL received, redirecting current tab:", url);
                window.location.href = url;
            } else {
                throw new Error("URL de paiement vide reçue.");
            }
        } catch (error: any) {
            console.error("Stripe Error:", error);
            alert("Erreur: " + error.message);
            setIsProcessing(false);
            setStatus(text.nav.statusReady);
        }
    };

    const handleManageSubscription = async () => {
        if (!currentUser) return;
        setStatus(text.account.loadingPortal);
        setIsProcessing(true);
        try {
            await createPortalSession();
        } catch (error: any) {
            console.error("Portal Error:", error);
            alert("Impossible d'ouvrir le portail: " + error.message);
            setIsProcessing(false);
            setStatus(text.nav.statusReady);
        }
    };


    const deleteSession = async () => {
        if (!sessionToDeleteId) return;

        // Demo Check
        if (isDemoMode) {
            alert(lang === 'fr' ? 'Action non disponible en mode démo' : 'Action not available in demo mode');
            setDeleteModalOpen(false);
            return;
        }

        setStatus(text.nav.statusProcessing);
        await hookDeleteSession(sessionToDeleteId);

        setDeleteModalOpen(false);
        setSessionToDeleteId(null);
        setStatus(text.nav.statusReady);
    };

    const handleCreateSessionClick = () => {
        console.log("DEBUG: New Session Clicked", { userPlan, sessionsLength: sessions.length });

        // Block session creation in demo mode
        if (isDemoMode) {
            alert(lang === 'fr' ? 'Création de session non disponible en mode démo' : 'Session creation not available in demo mode');
            return;
        }

        // STRICT LIMITS
        // Free: Max 1 session EVER (check creationHistory, not current sessions)
        // This prevents abuse by deleting and recreating sessions
        if (userPlan === 'free' && creationHistory.length >= 1) {
            console.log("DEBUG: Blocked by Free Limit (creationHistory)", { historyLength: creationHistory.length });
            setLimitModalOpen(true);
            return;
        }
        // 24h Pass: Max 5 sessions (CREATED IN THE LAST 24H)
        // Use creationHistory to track actual creations, ignoring deletions
        const recentCreations = creationHistory.filter(ts => ts > (Date.now() - 24 * 60 * 60 * 1000));

        if (userPlan === '24h' && recentCreations.length >= 5) {
            console.log("DEBUG: Blocked by 24h Limit", { recentCount: recentCreations.length });
            setLimitModalOpen(true);
            return;
        }

        setActiveSessionForm({ name: '', type: 'course', id: '' });
        setSessionModalOpen(true);
    }

    // Helper function to format time axis - shows h:mm:ss for >1h, otherwise m:ss
    const formatTimeAxis = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const processDataset = (ds: Dataset, globalStart: number, customSmoothing?: number) => {
        const sm = customSmoothing !== undefined ? customSmoothing : smoothing;
        let processed = [];
        const dataLen = ds.data.length;
        for (let i = 0; i < dataLen; i++) {
            let sum = 0, count = 0;
            const start = Math.max(0, i - sm);
            const end = Math.min(dataLen - 1, i + sm);
            for (let j = start; j <= end; j++) {
                sum += ds.data[j].hr;
                count++;
            }
            const relativeTimeSec = (ds.data[i].ts - globalStart) / 1000;

            // Detect Dropouts for Visualization (> 3s gap)
            if (i > 0) {
                const prevTime = (ds.data[i - 1].ts - globalStart) / 1000;
                if (relativeTimeSec - prevTime > 1.5) {
                    processed.push({ x: prevTime + 0.001, y: null });
                }
            }

            processed.push({
                x: relativeTimeSec + ds.offset,
                y: Math.round((sum / count) * 10) / 10 // Round to 1 decimal
            });
        }
        return {
            label: ds.name,
            data: processed,
            borderColor: ds.color,
            backgroundColor: ds.color + '40', // More opacity for fill
            borderWidth: chartFillEnabled ? 1 : 1.5,
            pointRadius: 0,
            tension: 0.3,
            fill: chartFillEnabled,
            spanGaps: connectGaps // false = show gaps (dropouts visible), true = interpolate
        };
    };

    const activeSession = sessions.find(s => s.id === activeSessionId);

    // Effect to render chart in fullscreen modal
    useEffect(() => {
        if (!isChartFullscreen || !activeSession || activeSession.datasets.length === 0) return;

        let fullscreenChartInstance: any = null;

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            const fullscreenCanvas = document.getElementById('fullscreenChart') as HTMLCanvasElement;
            if (!fullscreenCanvas) return;

            const visibleDatasets = activeSession.datasets.filter(d => d.visible);
            if (visibleDatasets.length === 0) return;

            const globalStart = Math.min(...visibleDatasets.map(d => d.startTime));
            // Use the same processDataset function as the main chart
            const chartDatasets = visibleDatasets.map(ds => processDataset(ds, globalStart));

            // Calculate max X from all datasets to prevent white space at end
            let maxX = 0;
            chartDatasets.forEach(ds => {
                ds.data.forEach((point: { x: number, y: number | null }) => {
                    if (point.y !== null && point.x > maxX) {
                        maxX = point.x;
                    }
                });
            });

            const isDarkMode = document.documentElement.classList.contains('dark');

            // Linear interpolation helper for fullscreen chart - returns null if in a gap
            const interpolateY = (data: { x: number, y: number | null }[], targetX: number): number | null => {
                if (!data || data.length === 0) return null;

                let lowerIdx = -1;
                let upperIdx = -1;

                for (let i = 0; i < data.length; i++) {
                    if (data[i].x <= targetX && data[i].y !== null) lowerIdx = i;
                    if (data[i].x >= targetX && data[i].y !== null && upperIdx === -1) {
                        upperIdx = i;
                        break;
                    }
                }

                if (lowerIdx === -1 && upperIdx === -1) return null;
                if (lowerIdx === -1) return data[upperIdx].y;
                if (upperIdx === -1) return data[lowerIdx].y;
                if (lowerIdx === upperIdx) return data[lowerIdx].y;

                // Check if there's a null (gap) between lower and upper
                for (let i = lowerIdx + 1; i < upperIdx; i++) {
                    if (data[i].y === null) return null;
                }

                const x0 = data[lowerIdx].x;
                const y0 = data[lowerIdx].y!;
                const x1 = data[upperIdx].x;
                const y1 = data[upperIdx].y!;

                if (x1 === x0) return y0;
                const t = (targetX - x0) / (x1 - x0);
                return y0 + t * (y1 - y0);
            };

            // Custom crosshair plugin for fullscreen chart
            const fullscreenCrosshairPlugin = {
                id: 'fullscreenCrosshair',
                afterDraw: (chart: any) => {
                    const tooltip = chart.tooltip;
                    if (!tooltip || !tooltip.caretX) return;

                    const ctx = chart.ctx;
                    const xScale = chart.scales.x;
                    const yScale = chart.scales.y;
                    const dataX = xScale.getValueForPixel(tooltip.caretX);

                    if (dataX === undefined) return;

                    // Draw vertical crosshair line
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(tooltip.caretX, chart.chartArea.top);
                    ctx.lineTo(tooltip.caretX, chart.chartArea.bottom);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
                    ctx.stroke();
                    ctx.restore();

                    // Draw interpolated circles for each dataset
                    chart.data.datasets.forEach((dataset: any) => {
                        const yVal = interpolateY(dataset.data, dataX);
                        if (yVal === null) return;

                        const pixelY = yScale.getPixelForValue(yVal);

                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(tooltip.caretX, pixelY, 6, 0, 2 * Math.PI);
                        ctx.fillStyle = dataset.borderColor;
                        ctx.fill();
                        ctx.strokeStyle = isDarkMode ? '#fff' : '#000';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        ctx.restore();
                    });
                }
            };

            // Watermark plugin for fullscreen chart (free and 24h pass users only)
            const fullscreenWatermarkPlugin = {
                id: 'fullscreenWatermark',
                afterDraw: (chart: any) => {
                    if (userPlan === 'annual') return; // No watermark for annual users

                    const ctx = chart.ctx;
                    const chartArea = chart.chartArea;

                    ctx.save();

                    // Position in bottom-right corner
                    const x = chartArea.right - 15;
                    const y = chartArea.bottom - 20;

                    // Draw "PulseAnalyzer" text
                    ctx.font = 'bold 14px Inter, sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';

                    const pulseText = 'Pulse';
                    const analyzerText = 'Analyzer';
                    const pulseWidth = ctx.measureText(pulseText).width;
                    const analyzerWidth = ctx.measureText(analyzerText).width;

                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = isDarkMode ? '#aaa' : '#555';
                    ctx.fillText(pulseText, x - analyzerWidth, y);

                    // "Analyzer" in brand green
                    ctx.fillStyle = '#00ff9d';
                    ctx.fillText(analyzerText, x, y);

                    // Draw heart icon
                    ctx.font = '12px "Font Awesome 6 Free"';
                    ctx.fillStyle = isDarkMode ? '#aaa' : '#555';
                    ctx.fillText('♥', x - analyzerWidth - pulseWidth - 8, y);

                    ctx.restore();
                }
            };

            // @ts-ignore
            fullscreenChartInstance = new window.Chart(fullscreenCanvas, {
                type: 'line',
                data: { datasets: chartDatasets },
                plugins: [fullscreenCrosshairPlugin, fullscreenWatermarkPlugin],
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 300 },
                    interaction: { mode: 'index', axis: 'x', intersect: false },
                    hover: { mode: null },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { color: isDarkMode ? '#fff' : '#333', font: { size: 14 } } },
                        zoom: {
                            pan: { enabled: true, mode: 'x' },
                            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                        },
                        tooltip: {
                            enabled: false,
                            external: (context: any) => {
                                const { chart, tooltip } = context;
                                const xScale = chart.scales.x;
                                const dataX = tooltip.caretX ? xScale.getValueForPixel(tooltip.caretX) : undefined;

                                // Find or create tooltip inside the chart container (so it rotates with the chart)
                                const chartContainer = chart.canvas.parentElement;
                                let tooltipEl = document.getElementById('fullscreen-tooltip-custom');
                                if (!tooltipEl) {
                                    tooltipEl = document.createElement('div');
                                    tooltipEl.id = 'fullscreen-tooltip-custom';
                                    tooltipEl.style.cssText = `
                                        position: absolute;
                                        background: ${isDarkMode ? 'rgba(15,15,15,0.95)' : 'rgba(255,255,255,0.95)'};
                                        border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
                                        border-radius: 8px;
                                        padding: 10px 14px;
                                        pointer-events: none;
                                        font-family: Inter, sans-serif;
                                        font-size: 13px;
                                        z-index: 10000;
                                        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                                    `;
                                    // Append to chart container instead of body
                                    if (chartContainer) {
                                        chartContainer.style.position = 'relative';
                                        chartContainer.appendChild(tooltipEl);
                                    } else {
                                        document.body.appendChild(tooltipEl);
                                    }
                                }

                                tooltipEl.style.background = isDarkMode ? 'rgba(15,15,15,0.95)' : 'rgba(255,255,255,0.95)';
                                tooltipEl.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                                tooltipEl.style.color = isDarkMode ? '#fff' : '#333';

                                if (tooltip.opacity === 0 || dataX === undefined) {
                                    tooltipEl.style.opacity = '0';
                                    return;
                                }

                                const m = Math.floor(dataX / 60);
                                const s = Math.floor(dataX % 60);
                                let html = `<div style="font-weight: bold; margin-bottom: 6px; color: ${isDarkMode ? '#fff' : '#000'}; font-size: 14px;">${m}m ${s < 10 ? '0' + s : s}s</div>`;

                                chart.data.datasets.forEach((dataset: any) => {
                                    const yVal = interpolateY(dataset.data, dataX);
                                    if (yVal !== null) {
                                        html += `<div style="display: flex; align-items: center; gap: 8px; color: ${isDarkMode ? '#ccc' : '#333'}; margin: 3px 0;">
                                            <span style="width: 12px; height: 12px; background: ${dataset.borderColor}; border-radius: 3px;"></span>
                                            <span style="font-weight: 500;">${dataset.label}:</span> <strong>${yVal.toFixed(0)} bpm</strong>
                                        </div>`;
                                    }
                                });

                                tooltipEl.innerHTML = html;
                                tooltipEl.style.opacity = '1';

                                // Position relative to the canvas within the container
                                const tooltipWidth = tooltipEl.offsetWidth || 180;
                                const canvasWidth = chart.canvas.offsetWidth;
                                const tooltipX = tooltip.caretX + 15;

                                // Flip to left side if would overflow
                                if (tooltipX + tooltipWidth > canvasWidth - 20) {
                                    tooltipEl.style.left = (tooltip.caretX - tooltipWidth - 15) + 'px';
                                } else {
                                    tooltipEl.style.left = tooltipX + 'px';
                                }
                                tooltipEl.style.top = Math.max(10, tooltip.caretY - 40) + 'px';
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            max: maxX,
                            title: { display: true, text: 'Temps (min)', color: isDarkMode ? '#aaa' : '#555' },
                            ticks: {
                                color: isDarkMode ? '#aaa' : '#555',
                                callback: function (value: number) {
                                    return formatTimeAxis(value);
                                }
                            },
                            grid: { color: isDarkMode ? '#333' : '#eee' }
                        },
                        y: {
                            position: 'left',
                            title: { display: true, text: 'BPM', color: isDarkMode ? '#aaa' : '#555' },
                            ticks: { color: isDarkMode ? '#aaa' : '#555' },
                            grid: { color: isDarkMode ? '#333' : '#eee' },
                            grace: '10%'
                        }
                    }
                }
            });
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            if (fullscreenChartInstance) {
                fullscreenChartInstance.destroy();
            }
            // Cleanup tooltip element
            const tooltipEl = document.getElementById('fullscreen-tooltip-custom');
            if (tooltipEl) tooltipEl.remove();
        };
    }, [isChartFullscreen, activeSession, isDark, smoothing, chartFillEnabled, connectGaps]);

    useEffect(() => {
        if (!chartRef.current || !activeSession || activeTab !== 'session') return;

        const visibleDatasets = activeSession.datasets.filter(d => d.visible);
        if (visibleDatasets.length === 0) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            return;
        }

        const globalStart = Math.min(...visibleDatasets.map(d => d.startTime));
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        const chartDatasets = visibleDatasets.map(ds => processDataset(ds, globalStart));

        // Calculate max X from all datasets to prevent white space at end
        let maxX = 0;
        chartDatasets.forEach(ds => {
            ds.data.forEach((point: { x: number, y: number | null }) => {
                if (point.y !== null && point.x > maxX) {
                    maxX = point.x;
                }
            });
        });

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const textColor = isDark ? '#999' : '#666';

        // Linear interpolation helper - returns null if in a gap (dropout)
        const interpolateY = (data: { x: number, y: number | null }[], targetX: number): number | null => {
            if (!data || data.length === 0) return null;

            let lowerIdx = -1;
            let upperIdx = -1;

            for (let i = 0; i < data.length; i++) {
                if (data[i].x <= targetX && data[i].y !== null) lowerIdx = i;
                if (data[i].x >= targetX && data[i].y !== null && upperIdx === -1) {
                    upperIdx = i;
                    break;
                }
            }

            if (lowerIdx === -1 && upperIdx === -1) return null;
            if (lowerIdx === -1) return data[upperIdx].y;
            if (upperIdx === -1) return data[lowerIdx].y;
            if (lowerIdx === upperIdx) return data[lowerIdx].y;

            // Check if there's a null (gap) between lower and upper
            for (let i = lowerIdx + 1; i < upperIdx; i++) {
                if (data[i].y === null) {
                    // We're in a gap - don't interpolate
                    return null;
                }
            }

            const x0 = data[lowerIdx].x;
            const y0 = data[lowerIdx].y!;
            const x1 = data[upperIdx].x;
            const y1 = data[upperIdx].y!;

            if (x1 === x0) return y0;
            const t = (targetX - x0) / (x1 - x0);
            return y0 + t * (y1 - y0);
        };

        // Custom crosshair plugin with interpolated circles
        const crosshairPlugin = {
            id: 'crosshair',
            afterDraw: (chart: any) => {
                const tooltip = chart.tooltip;
                if (!tooltip || !tooltip.caretX) return;

                const ctx = chart.ctx;
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;
                const dataX = xScale.getValueForPixel(tooltip.caretX);

                if (dataX === undefined) return;

                // Draw vertical crosshair line
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(tooltip.caretX, chart.chartArea.top);
                ctx.lineTo(tooltip.caretX, chart.chartArea.bottom);
                ctx.lineWidth = 1;
                ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
                ctx.stroke();
                ctx.restore();

                // Draw interpolated circles for each dataset
                chart.data.datasets.forEach((dataset: any, idx: number) => {
                    const yVal = interpolateY(dataset.data, dataX);
                    if (yVal === null) return;

                    const pixelY = yScale.getPixelForValue(yVal);

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(tooltip.caretX, pixelY, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = dataset.borderColor;
                    ctx.fill();
                    ctx.strokeStyle = isDark ? '#fff' : '#000';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.restore();
                });
            }
        };

        // Watermark plugin for free and 24h pass users only
        const watermarkPlugin = {
            id: 'watermark',
            afterDraw: (chart: any) => {
                if (userPlan === 'annual') return; // No watermark for annual users

                const ctx = chart.ctx;
                const chartArea = chart.chartArea;

                ctx.save();

                // Position in bottom-right corner
                const x = chartArea.right - 10;
                const y = chartArea.bottom - 15;

                // Draw "PulseAnalyzer" text
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                // "Pulse" in dark/light gray
                const pulseText = 'Pulse';
                const analyzerText = 'Analyzer';
                const pulseWidth = ctx.measureText(pulseText).width;
                const analyzerWidth = ctx.measureText(analyzerText).width;

                ctx.globalAlpha = 0.5;
                ctx.fillStyle = isDark ? '#aaa' : '#555';
                ctx.fillText(pulseText, x - analyzerWidth, y);

                // "Analyzer" in brand green
                ctx.fillStyle = '#00ff9d';
                ctx.fillText(analyzerText, x, y);

                // Draw heart icon (using Unicode)
                ctx.font = '10px "Font Awesome 6 Free"';
                ctx.fillStyle = isDark ? '#aaa' : '#555';
                ctx.fillText('♥', x - analyzerWidth - pulseWidth - 5, y);

                ctx.restore();
            }
        };

        // @ts-ignore
        chartInstance.current = new window.Chart(ctx, {
            type: 'line',
            data: { datasets: chartDatasets },
            plugins: [crosshairPlugin, watermarkPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'index', axis: 'x', intersect: false },
                hover: { mode: null }, // Disable default hover points - we use interpolated circles
                plugins: {
                    zoom: {
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'x',
                        },
                        pan: { enabled: true, mode: 'x' }
                    },
                    legend: {
                        labels: { color: textColor, boxWidth: 12, padding: 20 },
                        position: 'top',
                        align: 'start'
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'nearest',
                        intersect: false,
                        backgroundColor: isDark ? 'rgba(15,15,15,0.95)' : 'rgba(255,255,255,0.95)',
                        titleColor: isDark ? '#fff' : '#000',
                        bodyColor: isDark ? '#ccc' : '#333',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        filter: () => false, // Hide default tooltip items, we'll use custom
                        external: function (context: any) {
                            // Custom tooltip positioning
                            const chart = context.chart;
                            const tooltip = context.tooltip;

                            if (!tooltip.caretX) return;

                            // Get the X value in data coordinates
                            const xScale = chart.scales.x;
                            const yScale = chart.scales.y;
                            const dataX = xScale.getValueForPixel(tooltip.caretX);

                            // Helper function to interpolate Y at given X - returns null if in a gap
                            const interpolateY = (data: { x: number, y: number | null }[], targetX: number): number | null => {
                                if (!data || data.length === 0) return null;

                                let lowerIdx = -1;
                                let upperIdx = -1;

                                for (let i = 0; i < data.length; i++) {
                                    if (data[i].x <= targetX && data[i].y !== null) lowerIdx = i;
                                    if (data[i].x >= targetX && data[i].y !== null && upperIdx === -1) {
                                        upperIdx = i;
                                        break;
                                    }
                                }

                                if (lowerIdx === -1 && upperIdx === -1) return null;
                                if (lowerIdx === -1) return data[upperIdx].y;
                                if (upperIdx === -1) return data[lowerIdx].y;
                                if (lowerIdx === upperIdx) return data[lowerIdx].y;

                                // Check if there's a null (gap) between lower and upper
                                for (let i = lowerIdx + 1; i < upperIdx; i++) {
                                    if (data[i].y === null) {
                                        return null;
                                    }
                                }

                                const x0 = data[lowerIdx].x;
                                const y0 = data[lowerIdx].y!;
                                const x1 = data[upperIdx].x;
                                const y1 = data[upperIdx].y!;

                                if (x1 === x0) return y0;
                                const t = (targetX - x0) / (x1 - x0);
                                return y0 + t * (y1 - y0);
                            };

                            // Build tooltip content
                            let tooltipEl = document.getElementById('chartjs-tooltip-custom');
                            if (!tooltipEl) {
                                tooltipEl = document.createElement('div');
                                tooltipEl.id = 'chartjs-tooltip-custom';
                                tooltipEl.style.cssText = `
                                    position: absolute;
                                    background: ${isDark ? 'rgba(15,15,15,0.95)' : 'rgba(255,255,255,0.95)'};
                                    border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
                                    border-radius: 6px;
                                    padding: 8px 12px;
                                    pointer-events: none;
                                    font-family: Inter, sans-serif;
                                    font-size: 12px;
                                    z-index: 100;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                `;
                                document.body.appendChild(tooltipEl);
                            }

                            // ALWAYS Update Theme Styles (Fix for Dark Mode Toggle)
                            tooltipEl.style.background = isDark ? 'rgba(15,15,15,0.95)' : 'rgba(255,255,255,0.95)';
                            tooltipEl.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                            tooltipEl.style.color = isDark ? '#fff' : '#333';


                            if (tooltip.opacity === 0 || dataX === undefined) {
                                tooltipEl.style.opacity = '0';
                                return;
                            }

                            const m = Math.floor(dataX / 60);
                            const s = Math.floor(dataX % 60);
                            let html = `<div style="font-weight: bold; margin-bottom: 4px; color: ${isDark ? '#fff' : '#000'}">${m}m ${s < 10 ? '0' + s : s}s</div>`;

                            chart.data.datasets.forEach((dataset: any) => {
                                const yVal = interpolateY(dataset.data, dataX);
                                if (yVal !== null) {
                                    html += `<div style="display: flex; align-items: center; gap: 6px; color: ${isDark ? '#ccc' : '#333'}">
                                        <span style="width: 10px; height: 10px; background: ${dataset.borderColor}; border-radius: 2px;"></span>
                                        ${dataset.label}: ${yVal.toFixed(1)}
                                    </div>`;
                                }
                            });

                            tooltipEl.innerHTML = html;
                            tooltipEl.style.opacity = '1';

                            const canvasRect = chart.canvas.getBoundingClientRect();
                            const tooltipWidth = tooltipEl.offsetWidth || 150; // Estimate if not rendered yet
                            const viewportWidth = window.innerWidth;
                            const tooltipX = canvasRect.left + tooltip.caretX + 10;

                            // Flip to left side if tooltip would overflow right edge
                            if (tooltipX + tooltipWidth > viewportWidth - 20) {
                                tooltipEl.style.left = (canvasRect.left + window.scrollX + tooltip.caretX - tooltipWidth - 10) + 'px';
                            } else {
                                tooltipEl.style.left = (canvasRect.left + window.scrollX + tooltip.caretX + 10) + 'px';
                            }
                            tooltipEl.style.top = (canvasRect.top + window.scrollY + tooltip.caretY - 30) + 'px';
                        }
                    },
                    // Custom crosshair plugin
                    crosshair: {
                        line: {
                            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                            width: 1
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        max: maxX, // Limit to actual data range - no white space at end
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            callback: (v: number) => formatTimeAxis(v)
                        }
                    },
                    y: {
                        grid: { color: gridColor },
                        position: 'left',
                        ticks: { color: textColor },
                        title: { display: true, text: 'BPM', color: textColor },
                        grace: '10%'
                    }
                }
            }
        });

    }, [activeSession, activeSession?.datasets, smoothing, activeTab, view, chartFillEnabled, connectGaps]);

    const zoomIn = () => chartInstance.current?.zoom(1.1);
    const zoomOut = () => chartInstance.current?.zoom(0.9);
    const resetZoom = () => chartInstance.current?.resetZoom();
    const panLeft = () => chartInstance.current?.pan({ x: -100 });
    const panRight = () => chartInstance.current?.pan({ x: 100 });

    // 5. Dashboard View Logic (Auto-Analysis with Smart Caching)
    useEffect(() => {
        if (activeTab === 'dashboard' && userPlan === 'annual' && sessions.length > 0 && !isProcessing) {
            // Calculate a simple hash of the current data state (count + last modified timestamp of all sessions)
            // This ensures we only re-run if data actually changed.
            const currentDataHash = sessions.map(s => s.id + (s.datasets.length) + (s.analysisText ? '1' : '0')).join('|');

            if (currentDataHash !== lastDashboardAnalysisHash || !globalReport) {
                console.log("Dashboard Data Changed or Analysis Missing. Running Global Analysis...");
                runGlobalAnalysis();
                setLastDashboardAnalysisHash(currentDataHash);
            } else {
                console.log("Dashboard Data Unchanged. Skipping Re-Analysis.");
            }
        }
    }, [activeTab, userPlan, sessions, isProcessing, globalReport]);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            const allResults: AnalysisResult[] = [];

            // Filter sessions based on selection
            const sessionsToAnalyze = selectedSessionIds.size > 0
                ? sessions.filter(s => selectedSessionIds.has(s.id))
                : sessions;

            sessionsToAnalyze.forEach(s => {
                if (s.analysisResults) {
                    // Get reference device name for this session
                    const refDs = s.datasets.find(d => d.id === s.referenceDatasetId);
                    const refName = refDs?.name?.toLowerCase();

                    // Filter out the reference device from results (it has perfect score against itself)
                    const filteredResults = s.analysisResults.filter(r =>
                        r.device.toLowerCase() !== refName &&
                        !(r.correlation >= 0.9999 && r.mae < 0.01) // Also catch any self-comparisons by perfect metrics
                    );
                    allResults.push(...filteredResults);
                }
            });

            if (allResults.length === 0) {
                setGlobalReport(null);
                setGlobalAIText('');
                return;
            }

            const globalScores: any = {};
            allResults.forEach(r => {
                const key = r.device.toLowerCase();
                if (!globalScores[key]) {
                    globalScores[key] = { displayName: r.device, totalMae: 0, totalStd: 0, totalCorr: 0, totalBias: 0, totalRmse: 0, count: 0, activities: {} };
                }
                globalScores[key].totalMae += r.mae;
                globalScores[key].totalStd += r.stdDevError;
                globalScores[key].totalCorr += r.correlation;
                globalScores[key].totalBias += r.bias;
                globalScores[key].totalRmse += r.rmse;
                globalScores[key].count++;

                if (!globalScores[key].activities[r.activity]) {
                    globalScores[key].activities[r.activity] = { totalMae: 0, totalStd: 0, totalCorr: 0, totalBias: 0, totalRmse: 0, count: 0 };
                }
                const act = globalScores[key].activities[r.activity];
                act.totalMae += r.mae;
                act.totalStd += r.stdDevError;
                act.totalCorr += r.correlation;
                act.totalBias += r.bias;
                act.totalRmse += r.rmse;
                act.count++;
            });

            const globalLeaderboard = Object.values(globalScores).map((data: any) => {
                const corr = data.totalCorr / data.count;
                const mae = data.totalMae / data.count;
                const std = data.totalStd / data.count;
                return {
                    device: data.displayName,
                    trustScore: calculateTrustScore(corr, mae, std).toFixed(0),
                    correlation: corr.toFixed(3),
                    mae: mae.toFixed(2),
                    stdDevError: std.toFixed(2),
                    bias: (data.totalBias / data.count).toFixed(2),
                    rmse: (data.totalRmse / data.count).toFixed(2),
                    count: data.count
                };
            }).sort((a: any, b: any) => b.trustScore - a.trustScore);

            const byActivity: any = {};
            const activities = Array.from(new Set(allResults.map(r => r.activity)));
            activities.forEach((activity: string) => {
                byActivity[activity] = [];
                Object.values(globalScores).forEach((data: any) => {
                    if (data.activities[activity]) {
                        const act = data.activities[activity];
                        const corr = act.totalCorr / act.count;
                        const mae = act.totalMae / act.count;
                        const std = act.totalStd / act.count;
                        byActivity[activity].push({
                            device: data.displayName,
                            trustScore: calculateTrustScore(corr, mae, std).toFixed(0),
                            correlation: corr.toFixed(3),
                            mae: mae.toFixed(2),
                            stdDevError: std.toFixed(2),
                            bias: (act.totalBias / act.count).toFixed(2),
                            rmse: (act.totalRmse / act.count).toFixed(2),
                            count: act.count
                        });
                    }
                });
                byActivity[activity].sort((a: any, b: any) => b.trustScore - a.trustScore);
            });

            const newReport = { global: globalLeaderboard, byActivity };
            setGlobalReport(newReport);

            // Create order-independent signature
            const currentSignature = sessions
                .slice()
                .sort((a, b) => a.id.localeCompare(b.id))
                .map(s => s.id + '-' + s.datasets.length)
                .join('|');

            const storedSignature = localStorage.getItem('pulse_global_sig_v2');
            const storedText = localStorage.getItem('pulse_global_text_v2');

            if (storedText) {
                setGlobalAIText(storedText);
                if (storedSignature !== currentSignature) {
                    setShowUpdateAIPopup(true);
                }
            } else {
                // AUTO RUN ONLY IF NEVER GENERATED AND HAS DATA
                if (sessions.length > 0) {
                    runGlobalAnalysis(newReport, currentSignature);
                }
            }
        }
    }, [activeTab, sessions, lang]);

    const runGlobalAnalysis = async (reportToUse?: any, signatureToSave?: string) => {
        // GATE: Block AI regeneration in demo mode (silent return - no alert)
        if (isDemoMode) {
            console.log("Demo mode: runGlobalAnalysis blocked (read-only)");
            return;
        }
        // GATE: AI Analysis is ONLY for Annual Plan
        if (userPlan !== 'annual') {
            setUpgradeModalOpen(true);
            return;
        }

        const report = reportToUse || globalReport;
        if (!report) return;

        setStatus("Analyse IA en cours...");
        setIsProcessing(true);
        setGlobalAIText('');
        setShowUpdateAIPopup(false);

        const globalText = report.global.map((d: any) => `- ${d.device}: Score=${d.trustScore}, Corr=${d.correlation}`).join('\n');
        const activityText = Object.entries(report.byActivity).map(([act, data]: any) =>
            `Pour ${act}: Meilleur = ${data[0]?.device} (${data[0]?.trustScore})`
        ).join('\n');

        const res = await fetchGlobalAIAnalysis(globalText, activityText, lang);
        setGlobalAIText(res);

        // Only cache if it's NOT an error
        if (!res.includes("Error") && !res.includes("Erreur")) {
            if (signatureToSave) {
                localStorage.setItem('pulse_global_sig_v2', signatureToSave);
                localStorage.setItem('pulse_global_text_v2', res);
            } else {
                // Use order-independent signature for saving
                const currentSignature = sessions
                    .slice()
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .map(s => s.id + '-' + s.datasets.length)
                    .join('|');
                localStorage.setItem('pulse_global_sig_v2', currentSignature);
                localStorage.setItem('pulse_global_text_v2', res);
            }
        } else {
            // If error, clear cache to force retry next time
            localStorage.removeItem('pulse_global_sig_v2');
            localStorage.removeItem('pulse_global_text_v2');
        }

        setStatus(text.nav.statusReady);
        setIsProcessing(false);
    };

    const exportChartsToJPG = async () => {
        // LOCK EXPORT for Free Users (Allowed for 24h and Annual)
        if (userPlan === 'free') {
            setUpgradeModalOpen(true);
            return;
        }

        if (!activeSession) return;
        setStatus(text.nav.statusProcessing);
        setIsProcessing(true);

        const exportContainer = document.createElement('div');
        exportContainer.style.position = 'absolute';
        exportContainer.style.left = '-9999px';
        exportContainer.style.width = '1280px';
        exportContainer.style.backgroundColor = '#fff';
        exportContainer.style.padding = '40px';
        exportContainer.style.display = 'flex';
        exportContainer.style.flexDirection = 'column';
        exportContainer.style.gap = '30px';
        exportContainer.className = 'font-sans text-gray-900';
        exportContainer.id = 'export-container-unique';
        document.body.appendChild(exportContainer);

        try {
            const logoHeader = document.createElement('div');
            logoHeader.className = "flex items-center gap-3 mb-6 border-b border-gray-100 pb-4";
            logoHeader.innerHTML = `
                <i class="fa-solid fa-heart-pulse text-2xl" style="color: #00ff9d;"></i>
                <span class="font-bold text-xl tracking-tight text-gray-900">Pulse<span style="color: #00ff9d;">Analyzer</span></span>
            `;
            exportContainer.appendChild(logoHeader);

            const header = document.createElement('div');
            header.innerHTML = `
                <div class="mb-4">
                    <h1 class="text-3xl font-bold text-gray-900">${text.export.reportTitle}: ${activeSession.name}</h1>
                    <p class="text-gray-600 text-sm">${text.export.type}: ${activeSession.type} • ${text.export.date}: ${new Date(activeSession.date || activeSession.createdAt || parseInt(activeSession.id)).toLocaleDateString()}</p>
                </div>
            `;
            exportContainer.appendChild(header);

            if (activeSession.analysisResults && activeSession.analysisResults.length > 0) {
                let tableHtml = `
                <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <h3 class="text-lg font-bold mb-3 text-gray-800 border-b pb-2">${text.export.statsTitle}</h3>
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-50 uppercase text-xs text-gray-900 font-bold">
                            <tr>
                                <th class="px-4 py-2 text-gray-900">${text.table.device}</th>
                                <th class="px-4 py-2 text-center text-gray-900">${text.dashboard.score}</th>
                                <th class="px-4 py-2 text-center text-gray-900">${text.dashboard.corr}</th>
                                <th class="px-4 py-2 text-center text-gray-900">${text.dashboard.mae}</th>
                                <th class="px-4 py-2 text-center text-gray-900">${text.dashboard.rmse}</th>
                            </tr>
                        </thead>
                        <tbody>`;
                activeSession.analysisResults.forEach((r: any) => {
                    const score = calculateTrustScore(r.correlation, r.mae, r.stdDevError).toFixed(0);
                    tableHtml += `
                        <tr class="border-b border-gray-100">
                            <td class="px-4 py-2 font-bold text-gray-900">${r.device}</td>
                            <td class="px-4 py-2 text-center font-mono font-bold text-gray-900">${score}</td>
                            <td class="px-4 py-2 text-center font-mono text-gray-900">${r.correlation.toFixed(3)}</td>
                            <td class="px-4 py-2 text-center font-mono text-gray-900">${r.mae.toFixed(2)}</td>
                            <td class="px-4 py-2 text-center font-mono text-gray-900">${r.rmse.toFixed(2)}</td>
                        </tr>`;
                });
                tableHtml += `</tbody></table></div>`;
                const tableDiv = document.createElement('div');
                tableDiv.innerHTML = tableHtml;
                exportContainer.appendChild(tableDiv);
            }

            const visibleDatasets = activeSession.datasets.filter(d => d.visible);
            const globalStart = Math.min(...visibleDatasets.map(d => d.startTime));
            const processedDatasets = visibleDatasets.map(ds => ({
                ...processDataset(ds, globalStart, smoothing),
                borderWidth: 2,
                pointRadius: 0
            }));

            let trueMaxX = 0;
            processedDatasets.forEach(ds => {
                const max = ds.data.length > 0 ? Math.max(...ds.data.map(p => p.x)) : 0;
                if (max > trueMaxX) trueMaxX = max;
            });

            // HELPER: Create Watermark
            const createWatermark = () => {
                const watermark = document.createElement('div');
                watermark.style.position = 'absolute';
                watermark.style.bottom = '50px'; // Raised to avoid x-axis labels
                watermark.style.right = '15px';
                watermark.style.opacity = '0.5'; // Increased visibility
                watermark.style.pointerEvents = 'none';
                watermark.style.zIndex = '50';
                watermark.innerHTML = `
                    <div class="flex flex-col items-end">
                        <div class="flex items-center gap-1">
                            <i class="fa-solid fa-heart-pulse text-sm text-black"></i>
                            <span class="font-bold text-sm tracking-tight text-black">Pulse<span style="color: #00ff9d">Analyzer</span></span>
                        </div>
                        <div class="text-[8px] font-bold uppercase tracking-widest text-black">Pass 24h</div>
                    </div>
                `;
                return watermark;
            };

            const globalChartDiv = document.createElement('div');
            globalChartDiv.className = "border border-gray-200 rounded-lg p-2 relative"; // Added relative
            globalChartDiv.style.height = '400px';
            const globalCanvas = document.createElement('canvas');
            globalChartDiv.appendChild(globalCanvas);

            // INJECT WATERMARK IF 24H
            if (userPlan === '24h') {
                globalChartDiv.appendChild(createWatermark());
            }

            exportContainer.appendChild(globalChartDiv);

            // @ts-ignore
            const globalChart = new window.Chart(globalCanvas, {
                type: 'line',
                data: { datasets: JSON.parse(JSON.stringify(processedDatasets)) },
                options: {
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, labels: { color: '#000', font: { size: 12 } } },
                        title: { display: true, text: text.export.globalChart, color: '#000', font: { size: 16, weight: 'bold' } }
                    },
                    scales: {
                        x: { type: 'linear', max: trueMaxX, ticks: { color: '#000', callback: (v: number) => { const m = Math.floor(v / 60); const s = Math.floor(v % 60); return `${m}:${s < 10 ? '0' + s : s}`; } }, grid: { color: '#eee' } },
                        y: { ticks: { color: '#000' }, grid: { color: '#eee' }, title: { display: true, text: 'BPM', color: '#000' } }
                    }
                }
            });

            const refDsName = activeSession.datasets.find(d => d.id === activeSession.referenceDatasetId)?.name;
            const refDs = processedDatasets.find(d => d.label === refDsName);
            const tempCharts = [globalChart];

            if (refDs && processedDatasets.length > 1) {
                for (const ds of processedDatasets) {
                    if (ds.label === refDs.label) continue;

                    const duelDiv = document.createElement('div');
                    duelDiv.className = "border border-gray-200 rounded-lg p-2 relative"; // Added relative
                    duelDiv.style.height = '350px';
                    const duelCanvas = document.createElement('canvas');
                    duelDiv.appendChild(duelCanvas);

                    // INJECT WATERMARK IF 24H
                    if (userPlan === '24h') {
                        duelDiv.appendChild(createWatermark());
                    }

                    exportContainer.appendChild(duelDiv);

                    // @ts-ignore
                    const duelChart = new window.Chart(duelCanvas, {
                        type: 'line',
                        data: { datasets: [refDs, ds] },
                        options: {
                            animation: false,
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: true, labels: { color: '#000' } },
                                title: { display: true, text: `${refDs.label} (Ref) vs. ${ds.label}`, color: '#000', font: { size: 14, weight: 'bold' } }
                            },
                            scales: {
                                x: { type: 'linear', max: trueMaxX, ticks: { color: '#000', callback: (v: number) => { const m = Math.floor(v / 60); const s = Math.floor(v % 60); return `${m}:${s < 10 ? '0' + s : s}`; } }, grid: { color: '#eee' } },
                                y: { ticks: { color: '#000' }, grid: { color: '#eee' } }
                            }
                        }
                    });
                    tempCharts.push(duelChart);
                }
            }

            if (activeSession.analysisText && userPlan !== '24h') {
                const aiDiv = document.createElement('div');
                aiDiv.className = "mt-4 p-6 bg-gray-50 rounded-lg border-l-4 border-brand-500";
                aiDiv.innerHTML = formatAIResponse(activeSession.analysisText, true);
                exportContainer.appendChild(aiDiv);
            }



            await new Promise(r => setTimeout(r, 600));

            // @ts-ignore
            const canvas = await window.html2canvas(exportContainer, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            setExportImages([canvas.toDataURL('image/jpeg', 0.9)]);
            setExportModalOpen(true);

            tempCharts.forEach(c => c.destroy());

        } catch (e) {
            console.error("Export Error", e);
            alert("Erreur lors de l'export.");
        } finally {
            if (document.body.contains(exportContainer)) document.body.removeChild(exportContainer);
            setStatus(text.nav.statusReady);
            setIsProcessing(false);
        }
    };

    const exportDashboardToJPG = async () => {
        if (userPlan !== 'annual') {
            setUpgradeModalOpen(true);
            return;
        }

        if (!globalReport) return;

        setStatus("Génération du rapport...");
        setIsProcessing(true);

        const exportContainer = document.createElement('div');
        exportContainer.style.position = 'absolute';
        exportContainer.style.left = '-9999px';
        exportContainer.style.width = '1280px';
        exportContainer.style.backgroundColor = '#fff';
        exportContainer.style.padding = '40px';
        exportContainer.style.display = 'flex';
        exportContainer.style.flexDirection = 'column';
        exportContainer.style.gap = '30px';
        exportContainer.className = 'font-sans text-gray-900';
        document.body.appendChild(exportContainer);

        try {
            // 1. Logo Header
            const logoHeader = document.createElement('div');
            logoHeader.className = "flex items-center gap-3 mb-6 border-b border-gray-100 pb-4";
            logoHeader.innerHTML = `
                <i class="fa-solid fa-heart-pulse text-2xl" style="color: #00ff9d;"></i>
                <span class="font-bold text-xl tracking-tight text-gray-900">Pulse<span style="color: #00ff9d;">Analyzer</span></span>
            `;
            exportContainer.appendChild(logoHeader);

            // 2. Title
            const header = document.createElement('div');
            header.innerHTML = `
                <div class="mb-4">
                    <h1 class="text-3xl font-bold text-gray-900">${text.dashboard.title}</h1>
                    <p class="text-gray-600 text-sm">Rapport Global • ${new Date().toLocaleDateString()}</p>
                </div>
            `;
            exportContainer.appendChild(header);

            // 3. AI Analysis - Purple theme for Global AI
            if (globalAIText) {
                const aiDiv = document.createElement('div');
                aiDiv.className = "p-6 rounded-lg mb-6";
                aiDiv.style.cssText = "background: linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(139,92,246,0.05) 100%); border-left: 4px solid #a855f7;";
                aiDiv.innerHTML = `
                    <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: #9333ea;"><i class="fa-solid fa-wand-magic-sparkles"></i> ${text.dashboard.aiTitle}</h3>
                    <div class="text-sm leading-relaxed text-gray-700" style="line-height: 1.8;">${formatAIResponse(globalAIText, true)}</div>
                `;
                exportContainer.appendChild(aiDiv);
            }

            // 4. Global Leaderboard
            const tableDiv = document.createElement('div');
            tableDiv.className = "mb-6";
            let tableHtml = `
                <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 class="text-lg font-bold mb-4 text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2"><i class="fa-solid fa-trophy text-yellow-500"></i> ${text.dashboard.globalRanking}</h3>
                    <table class="w-full text-sm text-left">
                        <thead>
                            <tr class="bg-gradient-to-r from-gray-50 to-gray-100 uppercase text-xs text-gray-600 font-bold">
                                <th class="px-4 py-3 rounded-tl-lg">#</th>
                                <th class="px-4 py-3">${text.table.device}</th>
                                <th class="px-4 py-3 text-center">${text.dashboard.score}</th>
                                <th class="px-4 py-3 text-center">${text.dashboard.corr}</th>
                                <th class="px-4 py-3 text-center rounded-tr-lg">${text.dashboard.mae}</th>
                            </tr>
                        </thead>
                        <tbody>`;

            globalReport.global.forEach((item: any, idx: number) => {
                const rowBg = idx === 0 ? 'background: linear-gradient(90deg, rgba(0,255,157,0.1) 0%, rgba(0,255,157,0.02) 100%);' : '';
                tableHtml += `
                    <tr class="border-b border-gray-100 hover:bg-gray-50" style="${rowBg}">
                        <td class="px-4 py-3 font-mono ${idx === 0 ? 'text-brand-600 font-bold' : 'text-gray-400'}">${idx + 1}.</td>
                        <td class="px-4 py-3 font-bold ${idx === 0 ? 'text-brand-600' : 'text-gray-800'}">${item.device}</td>
                        <td class="px-4 py-3 text-center font-mono font-bold ${idx === 0 ? 'text-brand-600' : 'text-gray-800'}">${item.trustScore}</td>
                        <td class="px-4 py-3 text-center font-mono text-gray-700">${item.correlation}</td>
                        <td class="px-4 py-3 text-center font-mono text-gray-700">${item.mae}</td>
                    </tr>`;
            });
            tableHtml += `</tbody></table></div>`;
            tableDiv.innerHTML = tableHtml;
            exportContainer.appendChild(tableDiv);

            // 5. Activity Grid
            const gridContainer = document.createElement('div');
            gridContainer.className = "mb-6";
            gridContainer.innerHTML = `<h3 class="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2"><i class="fa-solid fa-chart-bar text-blue-500"></i> ${lang === 'fr' ? 'Classement par Activité' : 'Rankings by Activity'}</h3>`;

            const gridDiv = document.createElement('div');
            gridDiv.className = "grid grid-cols-2 gap-4";

            Object.entries(globalReport.byActivity).forEach(([activity, items]: any) => {
                let actHtml = `
                    <div class="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                        <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2 uppercase text-xs border-b border-gray-100 pb-2">
                            <i class="fa-solid ${activityIcons[activity] || 'fa-star'}" style="color: #00ff9d;"></i> ${text.activities[activity] || activity}
                        </h4>
                        <table class="w-full text-xs text-left">
                            <thead>
                                <tr class="bg-gray-50 uppercase font-bold text-gray-500">
                                    <th class="px-2 py-2 rounded-tl">${text.table.device}</th>
                                    <th class="px-2 py-2 text-center rounded-tr">${text.dashboard.score}</th>
                                </tr>
                            </thead>
                            <tbody>`;
                items.forEach((item: any, idx: number) => {
                    const rowBg = idx === 0 ? 'background: linear-gradient(90deg, rgba(0,255,157,0.08) 0%, transparent 100%);' : '';
                    actHtml += `
                        <tr class="border-b border-gray-50" style="${rowBg}">
                            <td class="px-2 py-2 font-semibold ${idx === 0 ? 'text-brand-600' : 'text-gray-700'}">${item.device}</td>
                            <td class="px-2 py-2 text-center font-mono ${idx === 0 ? 'text-brand-600 font-bold' : 'text-gray-600'}">${item.trustScore}</td>
                        </tr>`;
                });
                actHtml += `</tbody></table></div>`;
                gridDiv.innerHTML += actHtml;
            });
            gridContainer.appendChild(gridDiv);
            exportContainer.appendChild(gridContainer);

            await new Promise(r => setTimeout(r, 500));

            // @ts-ignore
            const canvas = await window.html2canvas(exportContainer, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            setExportImages([canvas.toDataURL('image/jpeg', 0.9)]);
            setExportModalOpen(true);

        } catch (e) {
            console.error("Dashboard Export Error", e);
            alert("Erreur export dashboard");
        } finally {
            if (document.body.contains(exportContainer)) document.body.removeChild(exportContainer);
            setStatus(text.nav.statusReady);
            setIsProcessing(false);
        }
    };

    const exportGlobalPDF = async () => {
        if (userPlan !== 'annual') {
            setUpgradeModalOpen(true);
            return;
        }

        if (!globalReport) return;

        setStatus("Génération du PDF Global...");
        setIsProcessing(true);

        const exportContainer = document.createElement('div');
        exportContainer.style.position = 'absolute';
        exportContainer.style.left = '-9999px';
        exportContainer.style.width = '1800px'; // Wide for landscape
        exportContainer.style.backgroundColor = '#fff';
        exportContainer.style.padding = '40px';
        exportContainer.style.display = 'flex';
        exportContainer.style.flexDirection = 'column';
        exportContainer.style.gap = '16px';
        exportContainer.className = 'font-sans text-gray-900';
        document.body.appendChild(exportContainer);

        try {
            // @ts-ignore
            const { jsPDF } = window.jspdf;
            // LANDSCAPE for dashboard page - more horizontal space
            const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 1700] });
            const landscapePageWidth = 1700;
            const landscapePageHeight = 1200;

            // --- PAGE 1: GLOBAL DASHBOARD ---

            // 1. Logo Header
            const logoHeader = document.createElement('div');
            logoHeader.className = "flex items-center gap-3 mb-6 border-b border-gray-100 pb-4";
            logoHeader.innerHTML = `
                <i class="fa-solid fa-heart-pulse text-2xl" style="color: #00ff9d;"></i>
                <span class="font-bold text-xl tracking-tight text-gray-900">Pulse<span style="color: #00ff9d;">Analyzer</span></span>
            `;
            exportContainer.innerHTML = ''; // Clear
            exportContainer.appendChild(logoHeader.cloneNode(true));

            // 2. Title
            const header = document.createElement('div');
            header.innerHTML = `
                <div class="mb-4">
                    <h1 class="text-3xl font-bold text-gray-900">${text.dashboard.title}</h1>
                    <p class="text-gray-600 text-sm">Rapport Global • ${new Date().toLocaleDateString()}</p>
                </div>
            `;
            exportContainer.appendChild(header);

            // 3. AI Analysis - Purple theme for Global AI
            if (globalAIText) {
                const aiDiv = document.createElement('div');
                aiDiv.className = "p-6 rounded-lg mb-6";
                aiDiv.style.cssText = "background: linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(139,92,246,0.05) 100%); border-left: 4px solid #a855f7;";
                aiDiv.innerHTML = `
                    <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: #9333ea;"><i class="fa-solid fa-wand-magic-sparkles"></i> ${text.dashboard.aiTitle}</h3>
                    <div class="text-sm leading-relaxed text-gray-700" style="line-height: 1.8;">${formatAIResponse(globalAIText, true)}</div>
                `;
                exportContainer.appendChild(aiDiv);
            }

            // 4. Global Leaderboard - ALL COLUMNS
            const tableDiv = document.createElement('div');
            tableDiv.className = "mb-4";
            let tableHtml = `
                <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <h3 class="text-base font-bold mb-3 text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2"><i class="fa-solid fa-trophy text-yellow-500"></i> ${text.dashboard.globalRanking}</h3>
                    <table class="w-full text-xs text-left">
                        <thead>
                            <tr class="bg-gradient-to-r from-gray-50 to-gray-100 uppercase text-[10px] text-gray-600 font-bold">
                                <th class="px-2 py-2 rounded-tl-lg">#</th>
                                <th class="px-2 py-2">${text.table.device}</th>
                                <th class="px-2 py-2 text-center">${text.dashboard.score}</th>
                                <th class="px-2 py-2 text-center">${text.dashboard.corr}</th>
                                <th class="px-2 py-2 text-center">${text.dashboard.bias || 'BIAIS'}</th>
                                <th class="px-2 py-2 text-center">${text.dashboard.mae}</th>
                                <th class="px-2 py-2 text-center">${text.dashboard.rmse || 'RMSE'}</th>
                                <th class="px-2 py-2 text-center">${text.dashboard.stability || 'STABILITÉ'}</th>
                                <th class="px-2 py-2 text-center rounded-tr-lg">${text.dashboard.count || 'SESSIONS'}</th>
                            </tr>
                        </thead>
                        <tbody>`;

            globalReport.global.forEach((item: any, idx: number) => {
                const rowBg = idx === 0 ? 'background: linear-gradient(90deg, rgba(0,255,157,0.1) 0%, rgba(0,255,157,0.02) 100%);' : '';
                tableHtml += `
                    <tr class="border-b border-gray-100" style="${rowBg}">
                        <td class="px-2 py-2 font-mono ${idx === 0 ? 'text-brand-600 font-bold' : 'text-gray-400'}">${idx + 1}.</td>
                        <td class="px-2 py-2 font-bold ${idx === 0 ? 'text-brand-600' : 'text-gray-800'}">${item.device}</td>
                        <td class="px-2 py-2 text-center font-mono font-bold ${idx === 0 ? 'text-brand-600' : 'text-gray-800'}">${item.trustScore}</td>
                        <td class="px-2 py-2 text-center font-mono text-gray-700">${item.correlation}</td>
                        <td class="px-2 py-2 text-center font-mono text-gray-700">${item.bias ?? '-'}</td>
                        <td class="px-2 py-2 text-center font-mono text-gray-700">${item.mae}</td>
                        <td class="px-2 py-2 text-center font-mono text-gray-700">${item.rmse ?? '-'}</td>
                        <td class="px-2 py-2 text-center font-mono text-gray-700">${item.stdDevError ?? '-'}</td>
                        <td class="px-2 py-2 text-center font-mono text-gray-700">${item.count ?? '-'}</td>
                    </tr>`;
            });
            tableHtml += `</tbody></table></div>`;
            tableDiv.innerHTML = tableHtml;
            exportContainer.appendChild(tableDiv);

            // 5. Activity Grid - Use 3 columns for landscape
            const gridContainer = document.createElement('div');
            gridContainer.className = "mb-4";
            gridContainer.innerHTML = `<h3 class="text-base font-bold mb-3 text-gray-800 flex items-center gap-2"><i class="fa-solid fa-chart-bar text-blue-500"></i> ${lang === 'fr' ? 'Classement par Activité' : 'Rankings by Activity'}</h3>`;

            const gridDiv = document.createElement('div');
            gridDiv.className = "grid grid-cols-3 gap-3";

            Object.entries(globalReport.byActivity).forEach(([activity, items]: any) => {
                let actHtml = `
                    <div class="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2 uppercase text-[10px] border-b border-gray-100 pb-1">
                            <i class="fa-solid ${activityIcons[activity] || 'fa-star'}" style="color: #00ff9d;"></i> ${text.activities[activity] || activity}
                        </h4>
                        <table class="w-full text-[10px] text-left">
                            <thead>
                                <tr class="bg-gray-50 uppercase font-bold text-gray-500">
                                    <th class="px-1 py-1 rounded-tl">${text.table.device}</th>
                                    <th class="px-1 py-1 text-center">${text.dashboard.score}</th>
                                    <th class="px-1 py-1 text-center">${text.dashboard.bias || 'BIAIS'}</th>
                                    <th class="px-1 py-1 text-center rounded-tr">${text.dashboard.mae}</th>
                                </tr>
                            </thead>
                            <tbody>`;
                items.forEach((item: any, idx: number) => {
                    const rowBg = idx === 0 ? 'background: linear-gradient(90deg, rgba(0,255,157,0.08) 0%, transparent 100%);' : '';
                    actHtml += `
                        <tr class="border-b border-gray-50" style="${rowBg}">
                            <td class="px-1 py-1 font-semibold ${idx === 0 ? 'text-brand-600' : 'text-gray-700'}">${item.device}</td>
                            <td class="px-1 py-1 text-center font-mono ${idx === 0 ? 'text-brand-600 font-bold' : 'text-gray-600'}">${item.trustScore}</td>
                            <td class="px-1 py-1 text-center font-mono text-gray-600">${item.bias ?? '-'}</td>
                            <td class="px-1 py-1 text-center font-mono text-gray-600">${item.mae ?? '-'}</td>
                        </tr>`;
                });
                actHtml += `</tbody></table></div>`;
                gridDiv.innerHTML += actHtml;
            });
            gridContainer.appendChild(gridDiv);
            exportContainer.appendChild(gridContainer);

            await new Promise(r => setTimeout(r, 500));

            // Capture at actual content height
            // @ts-ignore
            const canvasGlobal = await window.html2canvas(exportContainer, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowHeight: exportContainer.scrollHeight,
                height: exportContainer.scrollHeight
            });

            // Calculate aspect ratio to fit content on LANDSCAPE page
            const imgWidth = canvasGlobal.width;
            const imgHeight = canvasGlobal.height;
            const ratio = Math.min(landscapePageWidth / imgWidth, landscapePageHeight / imgHeight);
            const finalWidth = imgWidth * ratio;
            const finalHeight = imgHeight * ratio;

            // Center the image on the page if needed
            const xOffset = (landscapePageWidth - finalWidth) / 2;

            doc.addImage(canvasGlobal.toDataURL('image/jpeg', 0.95), 'JPEG', xOffset, 10, finalWidth, finalHeight);

            // --- PAGES 2+: INDIVIDUAL SESSIONS ---
            const sessionsToExport = selectedSessionIds.size > 0
                ? sessions.filter(s => selectedSessionIds.has(s.id))
                : sessions;

            for (const session of sessionsToExport) {
                if (!session.analysisResults || session.analysisResults.length === 0) continue;

                // Add page in PORTRAIT mode for sessions
                doc.addPage([1200, 1700], 'portrait');

                // Adjust container for portrait
                exportContainer.style.width = '1100px';
                exportContainer.innerHTML = ''; // Clear container
                exportContainer.appendChild(logoHeader.cloneNode(true)); // Add Logo

                const sessionHeader = document.createElement('div');
                sessionHeader.innerHTML = `
                    <div class="mb-4">
                        <h1 class="text-3xl font-bold text-gray-900">${text.export.reportTitle}: ${session.name}</h1>
                        <p class="text-gray-600 text-sm">${text.export.type}: ${session.type} • ${text.export.date}: ${new Date(session.date || session.createdAt || parseInt(session.id)).toLocaleDateString()}</p>
                    </div>
                `;
                exportContainer.appendChild(sessionHeader);

                // Stats Table
                let tableHtml = `
                <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <h3 class="text-lg font-bold mb-3 text-gray-800 border-b pb-2">${text.export.statsTitle}</h3>
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-50 uppercase text-xs text-gray-900 font-bold">
                            <tr>
                                <th class="px-4 py-2 text-gray-900">${text.table.device}</th>
                                <th class="px-4 py-2 text-center text-gray-900">${text.dashboard.score}</th>
                                <th class="px-4 py-2 text-center text-gray-900">${text.dashboard.corr}</th>
                                <th class="px-4 py-2 text-center text-gray-900">${text.dashboard.mae}</th>
                                <th class="px-4 py-2 text-center text-gray-900">${text.dashboard.rmse}</th>
                            </tr>
                        </thead>
                        <tbody>`;
                session.analysisResults.forEach((r: any) => {
                    const score = calculateTrustScore(r.correlation, r.mae, r.stdDevError).toFixed(0);
                    tableHtml += `
                        <tr class="border-b border-gray-100">
                            <td class="px-4 py-2 font-bold text-gray-900">${r.device}</td>
                            <td class="px-4 py-2 text-center font-mono font-bold text-gray-900">${score}</td>
                            <td class="px-4 py-2 text-center font-mono text-gray-900">${r.correlation.toFixed(3)}</td>
                            <td class="px-4 py-2 text-center font-mono text-gray-900">${r.mae.toFixed(2)}</td>
                            <td class="px-4 py-2 text-center font-mono text-gray-900">${r.rmse.toFixed(2)}</td>
                        </tr>`;
                });
                tableHtml += `</tbody></table></div>`;
                const tableDiv = document.createElement('div');
                tableDiv.innerHTML = tableHtml;
                exportContainer.appendChild(tableDiv);

                // AI Analysis
                if (session.analysisText) {
                    const aiDiv = document.createElement('div');
                    aiDiv.className = "mt-4 p-6 bg-gray-50 rounded-lg border-l-4 border-brand-500";
                    aiDiv.innerHTML = formatAIResponse(session.analysisText, true);
                    exportContainer.appendChild(aiDiv);
                }

                // Charts (Simplified for PDF speed - Just Global Chart)
                const visibleDatasets = session.datasets.filter(d => d.visible);
                if (visibleDatasets.length > 0) {
                    const globalStart = Math.min(...visibleDatasets.map(d => d.startTime));
                    const processedDatasets = visibleDatasets.map(ds => ({
                        ...processDataset(ds, globalStart, smoothing),
                        borderWidth: 2,
                        pointRadius: 0
                    }));

                    let trueMaxX = 0;
                    processedDatasets.forEach(ds => {
                        const max = ds.data.length > 0 ? Math.max(...ds.data.map(p => p.x)) : 0;
                        if (max > trueMaxX) trueMaxX = max;
                    });

                    const globalChartDiv = document.createElement('div');
                    globalChartDiv.className = "border border-gray-200 rounded-lg p-2 relative mt-4";
                    globalChartDiv.style.height = '400px';
                    const globalCanvas = document.createElement('canvas');
                    globalChartDiv.appendChild(globalCanvas);
                    exportContainer.appendChild(globalChartDiv);

                    // @ts-ignore
                    new window.Chart(globalCanvas, {
                        type: 'line',
                        data: { datasets: JSON.parse(JSON.stringify(processedDatasets)) },
                        options: {
                            animation: false,
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: true, labels: { color: '#000', font: { size: 12 } } },
                                title: { display: true, text: text.export.globalChart, color: '#000', font: { size: 16, weight: 'bold' } }
                            },
                            scales: {
                                x: { type: 'linear', max: trueMaxX, ticks: { color: '#000' }, grid: { color: '#eee' } },
                                y: { ticks: { color: '#000' }, grid: { color: '#eee' }, title: { display: true, text: 'BPM', color: '#000' } }
                            }
                        }
                    });
                }

                await new Promise(r => setTimeout(r, 500)); // Wait for render
                // @ts-ignore
                const canvasSession = await window.html2canvas(exportContainer, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    windowHeight: exportContainer.scrollHeight,
                    height: exportContainer.scrollHeight
                });

                // Portrait dimensions
                const portraitWidth = 1200;
                const portraitHeight = 1700;
                const sImgW = canvasSession.width;
                const sImgH = canvasSession.height;
                const sRatio = Math.min(portraitWidth / sImgW, portraitHeight / sImgH);
                const sFinalW = sImgW * sRatio;
                const sFinalH = sImgH * sRatio;
                const sXOffset = (portraitWidth - sFinalW) / 2;

                doc.addImage(canvasSession.toDataURL('image/jpeg', 0.9), 'JPEG', sXOffset, 10, sFinalW, sFinalH);
            }

            doc.save(`PulseAnalyzer_Global_Report_${new Date().toISOString().slice(0, 10)}.pdf`);

        } catch (e) {
            console.error("Global PDF Export Error", e);
            alert("Erreur export PDF Global");
        } finally {
            if (document.body.contains(exportContainer)) document.body.removeChild(exportContainer);
            setStatus(text.nav.statusReady);
            setIsProcessing(false);
        }
    };

    const runSessionAnalysis = async (sessionToAnalyze: Session) => {
        // GATE: Block AI regeneration in demo mode
        if (isDemoMode) {
            console.log("Demo mode: runSessionAnalysis blocked (read-only)");
            return;
        }
        // NOTE: We allow Basic Stats (Dropouts) for everyone. AI is gated below.


        if (!sessionToAnalyze) {
            setIsProcessing(false);
            return;
        }

        let refDs = sessionToAnalyze.datasets.find(d => d.id === sessionToAnalyze.referenceDatasetId);

        if (!refDs) {
            setIsProcessing(false);
            return;
        }

        setStatus(text.nav.statusProcessing);
        setIsProcessing(true);

        const stats = calculateSessionStats(sessionToAnalyze);
        if (!stats) {
            setIsProcessing(false);
            return;
        }

        const updatedSession = { ...sessionToAnalyze, analysisResults: stats.analysisResults };
        await saveSession(updatedSession);

        try {
            // GATE: Only run AI if > 1 dataset AND (Annual Plan OR 24h Pass)
            // Single file = No comparison = No AI needed (just stats)
            const canRunAI = (updatedSession.datasets.length > 1) && (userPlan === 'annual' || userPlan === '24h');

            if (canRunAI) {
                // Filter OUT the reference device itself from the AI prompt data to avoid "A vs A" comparison
                const aiData = stats.analysisResults.filter((r: any) => r.device !== refDs.name);
                const text = await fetchAIAnalysis(updatedSession, aiData, refDs, stats.refStats, lang);
                updatedSession.analysisText = text;
            }

            await saveSession(updatedSession);
        } catch (e) {
            console.error(e);
        } finally {
            setStatus(text.nav.statusReady);
            setIsProcessing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !activeSessionId) return;
        // Block file upload in demo mode
        if (isDemoMode) {
            alert(lang === 'fr' ? 'Ajout de fichiers non disponible en mode démo' : 'Adding files not available in demo mode');
            e.target.value = '';
            return;
        }
        const session = sessions.find(s => s.id === activeSessionId);
        if (!session) return;

        const newSession = { ...session, datasets: [...session.datasets] };

        setStatus(text.nav.statusProcessing);
        setIsProcessing(true);

        for (let i = 0; i < e.target.files.length; i++) {
            const file = e.target.files[i];
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const buffer = await file.arrayBuffer();
            let result;
            if (ext === 'fit') result = await parseFitFile(buffer, file.name);
            else {
                const text = new TextDecoder().decode(buffer);
                result = await parseTextFile(text, file.name, ext);
            }
            if (result) {
                const color = COLORS[newSession.datasets.length % COLORS.length];
                const cleanName = extractDeviceNameFromFilename(result.name);

                let finalName = cleanName;
                let counter = 2;
                while (newSession.datasets.some(d => d.name === finalName)) {
                    finalName = `${cleanName} ${counter}`;
                    counter++;
                }

                if (result.points.length > 0) {
                    const firstPointTs = result.points[0].ts;
                    if (firstPointTs > 0) {
                        newSession.date = firstPointTs;
                    }
                }

                newSession.datasets.push({
                    id: Date.now() + Math.random().toString(),
                    name: finalName,
                    data: result.points,
                    color: color,
                    offset: 0,
                    visible: true,
                    startTime: result.points[0].ts
                });

                // LIMIT CHECK FOR FREE PLAN
                if (userPlan === 'free' && newSession.datasets.length >= 3) {
                    alert("Limite atteinte : Le plan Gratuit est limité à 3 fichiers/dispositifs par session.");
                    break; // Stop processing further files
                }
            }
        }


        // Check if reference dataset exists in current datasets (not just if ID is set)
        const refExists = newSession.referenceDatasetId && newSession.datasets.some(d => d.id === newSession.referenceDatasetId);

        if (!refExists && newSession.datasets.length > 0) {
            const likelyRef = newSession.datasets.find(d => /h10|polar|garmin|chest|ceinture/i.test(d.name));
            if (likelyRef) {
                newSession.referenceDatasetId = likelyRef.id;
            } else {
                // FALLBACK: Auto-set the first dataset as reference if no specific name match
                newSession.referenceDatasetId = newSession.datasets[0].id;
            }
        }

        await saveSession(newSession);
        setStatus(text.nav.statusReady);

        setTimeout(async () => {
            if (newSession.referenceDatasetId && newSession.datasets.length > 0) {
                await runSessionAnalysis(newSession);
            } else {
                // No reference or no datasets - reset processing state
                setIsProcessing(false);
                setStatus(text.nav.statusReady);
            }
        }, 500);

        e.target.value = '';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
            {/* --- GLOBAL OVERLAYS (Can appear on ANY view) --- */}
            {isProcessing && !isDemoLoading && <LoadingOverlay message={status} />}
            {isLoadingSessions && !isDemoLoading && <LoadingOverlay message={text.nav.loadingSessions} />}

            {/* --- DEMO LOADING OVERLAY --- */}
            {isDemoLoading && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900">
                    {/* Animated background particles */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    </div>

                    {/* Logo and content */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                        {/* Pulsing heart icon */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(0,255,157,0.4)] animate-pulse">
                            <i className="fa-solid fa-heart-pulse text-4xl text-white"></i>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">
                            {lang === 'fr' ? 'Chargement de la démo' : 'Loading demo'}
                        </h2>
                        <p className="text-gray-400 mb-8">
                            {lang === 'fr' ? 'Préparation des données d\'exemple...' : 'Preparing sample data...'}
                        </p>

                        {/* Progress bar */}
                        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full animate-demo-loading"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUCCESS MODAL --- */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)}></div>
                    <div className="glass-panel w-full max-w-sm p-8 rounded-2xl border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.2)] z-10 relative bg-white dark:bg-[#121212] flex flex-col items-center text-center overflow-hidden">

                        {/* Confetti Background */}
                        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[url('https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/64/1f389.png')] bg-contain"></div>

                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-bounce z-10">
                            <i className="fa-solid fa-check text-4xl text-green-500"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 z-10">{text.modals.paymentSuccessTitle}</h3>
                        <p className="text-sm text-gray-500 mb-8 max-w-[240px] z-10">{text.modals.paymentSuccessDesc}</p>

                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full py-4 text-sm font-bold bg-green-500 text-white rounded-xl hover:bg-green-600 transition shadow-lg shadow-green-500/20 z-10"
                        >
                            {text.modals.paymentSuccessBtn}
                        </button>
                    </div>
                </div>
            )}

            {/* --- WELCOME MODAL (New Free Users) --- */}
            {showWelcomeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWelcomeModal(false)}></div>
                    <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-brand-500/30 shadow-[0_0_50px_rgba(0,255,157,0.15)] z-10 relative bg-white dark:bg-[#121212] flex flex-col items-center text-center overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2"></div>

                        <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center mb-6 relative z-10">
                            <i className="fa-solid fa-gift text-4xl text-brand-500"></i>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 relative z-10">
                            {lang === 'fr' ? 'Bienvenue sur Pulse Analyzer ! 🎉' : 'Welcome to Pulse Analyzer! 🎉'}
                        </h3>

                        <p className="text-sm text-gray-500 mb-6 leading-relaxed relative z-10">
                            {lang === 'fr'
                                ? 'Vous êtes en mode découverte. Explorez l\'application et créez votre première session !'
                                : 'You are in discovery mode. Explore the app and create your first session!'}
                        </p>

                        {/* Free plan features */}
                        <div className="w-full bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-6 text-left relative z-10">
                            <div className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                                {lang === 'fr' ? 'Mode Gratuit' : 'Free Mode'}
                            </div>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <li className="flex items-center gap-2">
                                    <i className="fa-solid fa-check text-brand-500 text-xs"></i>
                                    {lang === 'fr' ? '1 session de comparaison' : '1 comparison session'}
                                </li>
                                <li className="flex items-center gap-2">
                                    <i className="fa-solid fa-check text-brand-500 text-xs"></i>
                                    {lang === 'fr' ? 'Jusqu\'à 3 fichiers par session' : 'Up to 3 files per session'}
                                </li>
                                <li className="flex items-center gap-2">
                                    <i className="fa-solid fa-check text-brand-500 text-xs"></i>
                                    {lang === 'fr' ? 'Visualisation interactive' : 'Interactive visualization'}
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => setShowWelcomeModal(false)}
                            className="w-full py-4 text-sm font-bold bg-brand-500 text-black rounded-xl hover:bg-brand-400 transition shadow-lg shadow-brand-500/20 relative z-10 flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-rocket"></i>
                            {lang === 'fr' ? 'Commencer à explorer' : 'Start exploring'}
                        </button>

                        <button
                            onClick={() => { setShowWelcomeModal(false); setPlanOverviewModalOpen(true); }}
                            className="mt-4 text-xs text-gray-500 hover:text-brand-500 transition underline relative z-10"
                        >
                            {lang === 'fr' ? 'Voir les plans premium' : 'View premium plans'}
                        </button>
                    </div>
                </div>
            )}

            {/* --- FINISH PURCHASE MODAL (Post Login/Register) --- */}
            {showFinishPurchaseModal && pendingPaymentPriceId && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                    <div className="glass-panel w-full max-w-sm p-8 rounded-2xl border border-brand-500/30 shadow-[0_0_50px_rgba(0,255,157,0.2)] z-10 relative bg-white dark:bg-[#121212] flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mb-6 animate-pulse">
                            <i className="fa-solid fa-wallet text-3xl text-brand-500"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{text.modals.finishPurchaseTitle}</h3>
                        <p className="text-sm text-gray-500 mb-8 max-w-[240px]">{text.modals.finishPurchaseDesc}</p>

                        <button
                            onClick={() => {
                                setShowFinishPurchaseModal(false);
                                handleStripeCheckout(pendingPaymentPriceId);
                                setPendingPaymentPriceId(null);
                            }}
                            className="w-full py-4 text-sm font-bold bg-brand-500 text-black rounded-xl hover:bg-brand-400 transition shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 group"
                        >
                            {text.modals.finishPurchaseBtn} <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                        </button>

                        <button onClick={() => { setShowFinishPurchaseModal(false); setPendingPaymentPriceId(null); }} className="mt-4 text-xs text-gray-500 hover:text-white transition underline">
                            {text.modals.cancel}
                        </button>
                    </div>
                </div>
            )}

            {authModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAuthModalOpen(false)}></div>
                    <div className="glass-panel w-full max-w-sm p-8 rounded-xl border border-white/10 shadow-2xl z-10 relative bg-white dark:bg-[#121212]">
                        <button onClick={() => setAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                        <div className="text-center mb-6">
                            <i className="fa-solid fa-circle-user text-4xl text-brand-500 mb-2"></i>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{authMode === 'login' ? text.modals.authLogin : text.modals.authRegister}</h3>
                        </div>
                        <div className="space-y-4">
                            {/* Name field - only shown for registration */}
                            {authMode === 'register' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">{lang === 'fr' ? 'Nom complet' : 'Full name'} *</label>
                                    <input
                                        type="text"
                                        className="w-full mt-1 p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                                        value={userName}
                                        onChange={e => setUserName(e.target.value)}
                                        placeholder={lang === 'fr' ? 'Jean Dupont' : 'John Doe'}
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">{text.modals.email}</label>
                                <input type="email" className="w-full mt-1 p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">{text.modals.password}</label>
                                <input type="password" className="w-full mt-1 p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                            {authError && <p className="text-red-500 text-xs">{authError}</p>}
                            <button onClick={async () => {
                                try {
                                    setAuthError('');
                                    if (authMode === 'login') {
                                        await auth.signInWithEmailAndPassword(email, password);
                                    } else {
                                        // Registration: validate name
                                        if (!userName.trim()) {
                                            setAuthError(lang === 'fr' ? 'Le nom est obligatoire' : 'Name is required');
                                            return;
                                        }
                                        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                                        // Set displayName in Firebase Auth
                                        await userCredential.user?.updateProfile({ displayName: userName.trim() });
                                        // Also save to Firestore for easy querying (newsletters, etc.)
                                        if (userCredential.user) {
                                            await db.collection('users').doc(userCredential.user.uid).set({
                                                displayName: userName.trim(),
                                                email: email,
                                                createdAt: new Date().toISOString()
                                            }, { merge: true });
                                        }
                                        setUserName(''); // Reset
                                    }
                                    setAuthModalOpen(false);
                                    setView('app');
                                    if (authMode === 'register') {
                                        setShowWelcomeModal(true);
                                    }
                                } catch (e: any) { setAuthError(e.message); }
                            }} className="w-full py-3 text-sm font-bold bg-brand-500 text-brand-dark rounded-lg hover:bg-brand-600 transition shadow-lg shadow-brand-500/20">{text.modals.btnValidate}</button>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-gray-300 dark:border-white/10"></div>
                                <span className="flex-shrink-0 mx-4 text-xs text-gray-400">OU</span>
                                <div className="flex-grow border-t border-gray-300 dark:border-white/10"></div>
                            </div>

                            <button onClick={async () => {
                                try {
                                    setAuthError('');
                                    const provider = new firebase.auth.GoogleAuthProvider();
                                    await auth.signInWithPopup(provider);
                                    setAuthModalOpen(false);
                                    setView('app');
                                } catch (e: any) {
                                    console.error("Google Auth Error:", e);
                                    setAuthError(e.message);
                                }
                            }} className="w-full py-3 text-sm font-bold bg-white text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2">
                                <i className="fa-brands fa-google text-red-500"></i>
                                <span>Continuer avec Google</span>
                            </button>

                            <div className="text-center mt-4">
                                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-xs text-gray-500 hover:text-brand-500 underline transition">
                                    {authMode === 'login' ? text.modals.noAccount : text.modals.hasAccount}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {upgradeModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUpgradeModalOpen(false)}></div>
                    <div className="glass-panel w-full max-w-sm p-6 rounded-xl border border-yellow-500/30 shadow-2xl z-10 bg-white dark:bg-[#121212] animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                                <i className="fa-solid fa-lock text-3xl text-yellow-500"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{text.modals.upgradeTitle}</h3>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{text.modals.upgradeDesc}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {userPlan === '24h' ? (
                                <button onClick={() => handleStripeCheckout(STRIPE_PRICES.ANNUAL)} className="w-full py-3 text-sm font-bold bg-brand-500 text-black rounded-lg hover:bg-brand-400 transition shadow-lg shadow-brand-500/20">
                                    Passer en Annuel (19.99€/an)
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => handleStripeCheckout(STRIPE_PRICES.ANNUAL)} className="w-full py-3 text-sm font-bold bg-brand-500 text-black rounded-lg hover:bg-brand-400 transition shadow-lg shadow-brand-500/20">
                                        Expert Annuel (19.99€/an)
                                    </button>
                                    <button onClick={() => handleStripeCheckout(STRIPE_PRICES.DAY_PASS)} className="w-full py-3 text-sm font-bold bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/20 transition">
                                        Pass 24h (4.99€)
                                    </button>
                                </>
                            )}
                            <button onClick={() => { setUpgradeModalOpen(false); }} className="text-xs text-gray-400 hover:text-white underline">{text.modals.cancel}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PLAN OVERVIEW MODAL --- */}
            {planOverviewModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPlanOverviewModalOpen(false)}></div>
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl z-10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 animate-fade-in">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 text-center">
                            <h2 className="text-2xl font-bold text-white mb-1">
                                {lang === 'fr' ? 'Votre Espace' : 'Your Hub'}
                            </h2>
                            <p className="text-sm text-gray-400">
                                {lang === 'fr' ? 'Choisissez le plan adapté à vos besoins' : 'Choose the plan that fits your needs'}
                            </p>
                        </div>

                        {/* Plans Grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Free Plan */}
                            <div className={`rounded-xl border p-5 flex flex-col ${userPlan === 'free'
                                ? 'border-gray-500 bg-gray-500/10 ring-2 ring-gray-500/50'
                                : 'border-white/10 bg-white/5 opacity-60'}`}>
                                {userPlan === 'free' && (
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-check-circle"></i>
                                        {lang === 'fr' ? 'Plan Actuel' : 'Current Plan'}
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-gray-300 mb-1">{text.pricing.freePass}</h3>
                                <div className="text-3xl font-bold text-white mb-1">{text.pricing.freePassPrice}</div>
                                <p className="text-xs text-gray-500 mb-4 flex-grow">{text.pricing.freePassDesc}</p>
                                <ul className="space-y-2 text-xs text-gray-400 mb-4">
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-gray-500 w-4"></i> {text.pricing.features.sessions1}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-gray-500 w-4"></i> {text.pricing.features.filesLimited}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-gray-500 w-4"></i> {text.pricing.features.visualization}</li>
                                    <li className="flex items-center gap-2 opacity-50"><i className="fa-solid fa-xmark text-gray-600 w-4"></i> {text.pricing.features.aiAnalysis}</li>
                                    <li className="flex items-center gap-2 opacity-50"><i className="fa-solid fa-xmark text-gray-600 w-4"></i> {text.pricing.features.export}</li>
                                </ul>
                                {userPlan === 'free' && (
                                    <div className="text-center py-2 text-xs font-bold text-gray-500 bg-gray-500/20 rounded-lg">
                                        <i className="fa-solid fa-circle-check mr-1"></i>
                                        {lang === 'fr' ? 'Actif' : 'Active'}
                                    </div>
                                )}
                            </div>

                            {/* 24h Pass */}
                            <div className={`rounded-xl border p-5 flex flex-col ${userPlan === '24h'
                                ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50'
                                : 'border-white/10 bg-white/5 hover:border-blue-500/50 transition'}`}>
                                {userPlan === '24h' && (
                                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-check-circle"></i>
                                        {lang === 'fr' ? 'Plan Actuel' : 'Current Plan'}
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-white mb-1">{text.pricing.dayPass}</h3>
                                <div className="text-3xl font-bold text-white mb-1">{text.pricing.dayPassPrice}</div>
                                <p className="text-xs text-gray-400 mb-4 flex-grow">{text.pricing.dayPassDesc}</p>
                                <ul className="space-y-2 text-xs text-gray-300 mb-4">
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-blue-500 w-4"></i> {text.pricing.features.sessions5}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-blue-500 w-4"></i> {text.pricing.features.filesUnlim}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-blue-500 w-4"></i> {text.pricing.features.basicStats}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-blue-500 w-4"></i> {text.pricing.features.sessionExport}</li>
                                    <li className="flex items-center gap-2 opacity-50"><i className="fa-solid fa-xmark text-gray-600 w-4"></i> {text.pricing.features.aiAnalysis}</li>
                                </ul>
                                {userPlan === '24h' ? (
                                    <div className="text-center py-2 text-xs font-bold text-blue-400 bg-blue-500/20 rounded-lg">
                                        <i className="fa-solid fa-clock mr-1"></i>
                                        {expirationDate ? `${lang === 'fr' ? 'Expire le' : 'Expires'} ${new Date(expirationDate).toLocaleString()}` : (lang === 'fr' ? 'Actif' : 'Active')}
                                    </div>
                                ) : userPlan === 'free' ? (
                                    <button
                                        onClick={() => { setPlanOverviewModalOpen(false); handleStripeCheckout(STRIPE_PRICES.DAY_PASS); }}
                                        className="w-full py-2.5 text-sm font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition"
                                    >
                                        {text.pricing.ctaDay}
                                    </button>
                                ) : null}
                            </div>

                            {/* Annual Plan - Highlighted */}
                            <div className={`rounded-xl border p-5 flex flex-col relative ${userPlan === 'annual'
                                ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/50'
                                : 'border-brand-500/50 bg-gradient-to-b from-brand-500/10 to-transparent hover:border-brand-500 transition'}`}>
                                {/* Most Popular Badge */}
                                {userPlan !== 'annual' && (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-500 text-black text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-lg shadow-brand-500/30">
                                        {text.pricing.mostPopular}
                                    </div>
                                )}
                                {userPlan === 'annual' && (
                                    <div className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-crown"></i>
                                        {lang === 'fr' ? 'Plan Actuel' : 'Current Plan'}
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-brand-400 mb-1">{text.pricing.annualPass}</h3>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-lg text-gray-500 line-through">{text.pricing.annualPassOldPrice}</span>
                                    <span className="text-3xl font-bold text-white">{text.pricing.annualPassPrice}</span>
                                    <span className="text-gray-500 text-sm">{text.pricing.year}</span>
                                </div>
                                <span className="inline-block bg-gradient-to-r from-brand-500 to-brand-400 text-black text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 animate-pulse">
                                    🚀 {text.pricing.launchBadge}
                                </span>
                                <p className="text-xs text-gray-400 mb-4 flex-grow">{text.pricing.annualPassDesc}</p>
                                <ul className="space-y-2 text-xs text-gray-300 mb-4">
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-500 w-4"></i> {text.pricing.features.sessionsUnlim}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-500 w-4"></i> {text.pricing.features.filesUnlim}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-500 w-4"></i> {text.pricing.features.advancedStats}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-500 w-4"></i> {text.pricing.features.aiAnalysis}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-500 w-4"></i> {text.pricing.features.export}</li>
                                    <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-500 w-4"></i> {text.pricing.features.priority}</li>
                                </ul>
                                {userPlan === 'annual' ? (
                                    <div className="text-center py-2 text-xs font-bold text-brand-400 bg-brand-500/20 rounded-lg">
                                        <i className="fa-solid fa-crown mr-1"></i>
                                        {expirationDate ? `${lang === 'fr' ? 'Valide jusqu\'au' : 'Valid until'} ${new Date(expirationDate).toLocaleDateString()}` : (lang === 'fr' ? 'Actif' : 'Active')}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setPlanOverviewModalOpen(false); handleStripeCheckout(STRIPE_PRICES.ANNUAL); }}
                                        className="w-full py-2.5 text-sm font-bold bg-brand-500 text-black rounded-lg hover:bg-brand-400 transition shadow-lg shadow-brand-500/20"
                                    >
                                        {text.pricing.ctaAnnual}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 text-center">
                            <button
                                onClick={() => setPlanOverviewModalOpen(false)}
                                className="text-sm text-gray-400 hover:text-white transition"
                            >
                                {text.modals.close}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {limitModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLimitModalOpen(false)}></div>
                    <div className="glass-panel w-full max-w-sm p-6 rounded-xl border border-red-500/30 shadow-2xl z-10 bg-white dark:bg-[#121212] animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                                <i className="fa-solid fa-ban text-3xl text-red-500"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Limite Atteinte</h3>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                {userPlan === 'free'
                                    ? "Vous avez atteint la limite d'une session gratuite. Passez au Pass 24h pour en faire plus."
                                    : "Vous avez atteint la limite de 5 sessions avec le Pass 24h. Passez à l'offre Annuelle pour un accès illimité."}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => {
                                setLimitModalOpen(false);
                                handleStripeCheckout(userPlan === 'free' ? STRIPE_PRICES.DAY_PASS : STRIPE_PRICES.ANNUAL);
                            }} className="w-full py-3 text-sm font-bold bg-brand-500 text-black rounded-lg hover:bg-brand-400 transition shadow-lg shadow-brand-500/20">
                                {userPlan === 'free' ? "Prendre le Pass 24h (4.99€)" : "Passer en Illimité (Annuel)"}
                            </button>
                            <button onClick={() => setLimitModalOpen(false)} className="text-xs text-gray-400 hover:text-white underline">{text.modals.cancel}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Chart Modal */}
            {isChartFullscreen && activeSession && activeSession.datasets.length > 0 && (
                <div className="fixed inset-0 z-[9999] bg-black animate-fade-in">
                    {/* Apply rotation for portrait mobile */}
                    <div
                        className="w-full h-full"
                        style={isPortraitMobile ? {
                            transform: 'rotate(90deg)',
                            width: '100vh',
                            height: '100vw',
                            transformOrigin: 'center center',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginTop: '-50vw',
                            marginLeft: '-50vh'
                        } : {}}
                    >
                        <button
                            onClick={toggleFullscreen}
                            className="absolute top-2 right-2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg transition-transform hover:scale-110"
                        >
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                        <div className="w-full h-full bg-white dark:bg-gray-900">
                            <canvas id="fullscreenChart"></canvas>
                        </div>
                    </div>
                </div>
            )}

            {accountModalOpen && currentUser && (
                <AccountModal
                    user={currentUser}
                    plan={userPlan}
                    expirationDate={expirationDate}
                    onClose={() => setAccountModalOpen(false)}
                    onUpgradeAnnual={() => handleStripeCheckout(STRIPE_PRICES.ANNUAL)}
                    onUpgradeDay={() => handleStripeCheckout(STRIPE_PRICES.DAY_PASS)}
                    onManageSubscription={handleManageSubscription}
                    lang={lang}
                />
            )}

            {deleteModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)}></div>
                    <div className="glass-panel w-full max-w-sm p-6 rounded-xl border border-red-200 dark:border-red-500/30 shadow-2xl z-10 bg-white dark:bg-[#121212] animate-fade-in">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                                <i className="fa-solid fa-triangle-exclamation text-xl text-red-500"></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{text.modals.deleteTitle}</h3>
                            <p className="text-xs text-gray-500 mt-2">{text.modals.deleteDesc}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg">{text.modals.cancel}</button>
                            <button onClick={deleteSession} className="flex-1 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-lg shadow-red-500/20">{text.modals.deleteBtn}</button>
                        </div>
                    </div>
                </div>
            )}

            {sessionModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setSessionModalOpen(false)}></div>
                    <div className="glass-panel w-full max-w-lg p-8 rounded-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 bg-white/90 dark:bg-black/80 backdrop-blur-xl animate-fade-in transform transition-all">

                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                                    {activeSessionForm.id ? text.modals.editSession : text.modals.newSession}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configurez les détails de votre séance</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center">
                                <i className={`fa-solid ${activeSessionForm.id ? 'fa-pen' : 'fa-plus'} text-brand-500`}></i>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Name Input */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <i className="fa-solid fa-tag text-brand-500"></i> {text.modals.name}
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-medium placeholder-gray-400"
                                        placeholder="Ex: Sortie longue, Fractionné..."
                                        value={activeSessionForm.name}
                                        autoFocus
                                        onChange={e => setActiveSessionForm({ ...activeSessionForm, name: e.target.value })}
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                                        <i className="fa-regular fa-keyboard"></i>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Grid */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <i className="fa-solid fa-person-running text-brand-500"></i> {text.modals.type}
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {[
                                        { id: 'course', label: text.activities.course, icon: activityIcons['course'] },
                                        { id: 'velo', label: text.activities.velo, icon: activityIcons['velo'] },
                                        { id: 'natation', label: text.activities.natation, icon: activityIcons['natation'] },
                                        { id: 'musculation', label: text.activities.musculation, icon: activityIcons['musculation'] },
                                        { id: 'autre', label: text.activities.autre, icon: activityIcons['autre'] },
                                    ].map((activity) => (
                                        <button
                                            key={activity.id}
                                            onClick={() => setActiveSessionForm({ ...activeSessionForm, type: activity.id })}
                                            className={`
                                                relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 group
                                                ${activeSessionForm.type === activity.id
                                                    ? 'bg-brand-500/10 border-brand-500 shadow-[0_0_20px_rgba(0,255,157,0.15)]'
                                                    : 'bg-gray-50 dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-200 dark:hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <div className={`
                                                text-xl transition-transform duration-200 group-hover:scale-110
                                                ${activeSessionForm.type === activity.id ? 'text-brand-500' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
                                            `}>
                                                <i className={`fa-solid ${activity.icon}`}></i>
                                            </div>
                                            <span className={`
                                                text-[10px] font-bold uppercase tracking-tight
                                                ${activeSessionForm.type === activity.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500'}
                                            `}>
                                                {activity.label}
                                            </span>

                                            {/* Selection Indicator */}
                                            {activeSessionForm.type === activity.id && (
                                                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_5px_rgba(0,255,157,0.8)]"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-white/5">
                                <button
                                    onClick={() => setSessionModalOpen(false)}
                                    className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                                >
                                    {text.modals.cancel}
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!activeSessionForm.name) return;
                                        setStatus("Sauvegarde...");
                                        setIsProcessing(true);
                                        try {
                                            const s = activeSessionForm.id ? sessions.find(s => s.id === activeSessionForm.id) : null;
                                            const newSession = s ? { ...s, name: activeSessionForm.name, type: activeSessionForm.type } : {
                                                id: Date.now().toString(),
                                                createdAt: Date.now(),
                                                date: Date.now(),
                                                name: activeSessionForm.name,
                                                type: activeSessionForm.type,
                                                datasets: [], analysisResults: [], analysisText: '', referenceDatasetId: null, lastAnalysisSignature: ''
                                            };
                                            await saveSession(newSession as Session);
                                            if (!activeSessionForm.id) {
                                                setActiveSessionId(newSession.id);
                                                setActiveTab('session');
                                                setTimeout(() => {
                                                    fileInputRef.current?.click();
                                                }, 100);
                                            }
                                            setSessionModalOpen(false);
                                        } catch (e) { console.error(e) }
                                        finally { setIsProcessing(false); setStatus(text.nav.statusReady); }
                                    }}
                                    className={`
                                        pl-5 pr-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95
                                        ${!activeSessionForm.name ? 'bg-gray-300 dark:bg-none dark:bg-white/10 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500'}
                                    `}
                                    disabled={!activeSessionForm.name}
                                >
                                    <i className="fa-solid fa-check"></i> {text.modals.save}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {exportModalOpen && (
                <div className="fixed inset-0 z-[9999] flex flex-col bg-white overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-800">{text.modals.reportTitle}</h3>
                        <div className="flex gap-2">
                            {navigator.share && exportImages.length > 0 && (
                                <button onClick={async () => {
                                    try {
                                        const blob = await (await fetch(exportImages[0])).blob();
                                        const file = new File([blob], "pulse-report.jpg", { type: "image/jpeg" });
                                        await navigator.share({
                                            title: 'Pulse Analyzer Report',
                                            text: 'Mon rapport d\'analyse cardiaque',
                                            files: [file]
                                        });
                                    } catch (err) {
                                        console.error("Share failed", err);
                                    }
                                }} className="px-4 py-2 bg-brand-500 text-black rounded-lg font-bold hover:bg-brand-400 flex items-center gap-2">
                                    <i className="fa-solid fa-share-nodes"></i> Partager
                                </button>
                            )}
                            <button onClick={() => setExportModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300">{text.modals.close}</button>
                        </div>
                    </div>
                    <div className="bg-blue-50 p-3 text-center border-b border-blue-100">
                        <p className="text-sm text-blue-800 font-medium"><i className="fa-solid fa-circle-info mr-2"></i> {text.modals.saveImage}</p>
                    </div>
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-100 flex flex-col items-center">
                        {exportImages.map((src, i) => (
                            <div key={i} className="w-full max-w-[1280px] bg-white p-2 rounded shadow border border-gray-200">
                                <img src={src} className="w-full h-auto block" alt="Rapport" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- VIEW ROUTING --- */}

            {view === 'landing' && (
                <LandingPage
                    onEnterApp={() => setView('app')}
                    onEnterDemo={enterDemoMode}
                    onLogin={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                    onOpenHelp={() => setView('help')}
                    onBuyDayPass={() => handleStripeCheckout(STRIPE_PRICES.DAY_PASS)}
                    onBuyAnnualPass={() => handleStripeCheckout(STRIPE_PRICES.ANNUAL)}
                    lang={lang}
                    setLang={setLang}
                    userPlan={userPlan}
                    isLoggedIn={!!currentUser}
                    onUpgrade={() => setPlanOverviewModalOpen(true)}
                    onNavigate={(view) => setView(view)}
                />
            )}

            {view === 'help' && (
                <HelpPage lang={lang} onBack={() => setView('landing')} />
            )}

            {(view === 'privacy' || view === 'terms' || view === 'contact') && (
                <LegalPage view={view} onBack={() => setView('landing')} />
            )}

            {view === 'app' && (
                <>
                    {/* Demo Mode Banner */}
                    {isDemoMode && (
                        <div className="fixed w-full z-[60] top-0 bg-gradient-to-r from-purple-600 to-purple-500 text-white py-2 px-4 flex items-center justify-center gap-4 text-sm font-medium shadow-lg">
                            <i className="fa-solid fa-flask animate-pulse"></i>
                            <span>{lang === 'fr' ? 'Mode Démo - Données d\'exemple (lecture seule)' : 'Demo Mode - Sample data (read only)'}</span>
                            <button
                                onClick={exitDemoMode}
                                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition"
                            >
                                <i className="fa-solid fa-xmark mr-1"></i> {lang === 'fr' ? 'Quitter' : 'Exit'}
                            </button>
                            <button
                                onClick={() => { exitDemoMode(); setAuthMode('register'); setAuthModalOpen(true); }}
                                className="px-3 py-1 bg-white text-purple-600 hover:bg-gray-100 rounded-full text-xs font-bold transition"
                            >
                                <i className="fa-solid fa-user-plus mr-1"></i> {lang === 'fr' ? 'S\'inscrire' : 'Sign up'}
                            </button>
                        </div>
                    )}
                    {/* Header */}
                    <nav className={`fixed w-full z-50 ${isDemoMode ? 'top-12' : 'top-0'} border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-brand-dark/90 backdrop-blur-md`}>
                        <div className="max-w-7xl mx-auto px-2 sm:px-4 h-16 flex justify-between items-center">
                            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => setView('landing')}>
                                <i className="fa-solid fa-heart-pulse text-brand-500 text-xl sm:text-2xl"></i>
                                <span className="font-bold text-lg sm:text-xl tracking-tight">Pulse<span className="text-brand-500">Analyzer</span></span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4">
                                {/* Status Module */}
                                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-full">
                                    <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-brand-500'}`}></div>
                                    <span className="text-[10px] uppercase font-bold text-gray-500">{status}</span>
                                </div>

                                {currentUser ? (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="text-right hidden sm:block">
                                            <button onClick={() => setAccountModalOpen(true)} className="hover:opacity-80 transition group">
                                                <div className="text-[10px] font-bold text-gray-500 group-hover:text-brand-500 transition">{currentUser.email}</div>
                                                <div className="flex items-center justify-end gap-1">
                                                    <div className="text-[9px] text-brand-500 uppercase tracking-widest bg-brand-500/10 px-1 rounded inline-block">{text.nav.cloudSync}</div>
                                                    {userPlan === 'annual' && <div className="text-[9px] text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-1 rounded inline-block">PRO</div>}
                                                    {userPlan === '24h' && <div className="text-[9px] text-blue-500 uppercase tracking-widest bg-blue-500/10 px-1 rounded inline-block">24H</div>}
                                                </div>
                                            </button>
                                        </div>
                                        <button onClick={() => setAccountModalOpen(true)} className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-brand-500 transition">
                                            <i className="fa-solid fa-circle-user"></i>
                                        </button>
                                        <button onClick={() => auth.signOut()} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition">
                                            <i className="fa-solid fa-right-from-bracket"></i>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }} className="text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-brand-500 transition">{text.nav.login}</button>
                                        <button onClick={() => { setAuthMode('register'); setAuthModalOpen(true); }} className="px-3 py-1.5 text-xs font-bold bg-brand-500 text-black rounded hover:bg-brand-600 transition">{text.nav.register}</button>
                                    </div>
                                )}
                                <div className="h-6 w-[1px] bg-gray-300 dark:bg-gray-700 mx-1"></div>
                                <button
                                    onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                                    className="text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white transition uppercase w-6 text-center"
                                >
                                    {lang === 'fr' ? 'EN' : 'FR'}
                                </button>
                                <button onClick={() => {
                                    const isNowDark = document.documentElement.classList.toggle('dark');
                                    setIsDark(isNowDark);
                                    localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
                                }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition">
                                    <i className="fa-solid fa-circle-half-stroke"></i>
                                </button>
                            </div>
                        </div>
                    </nav>

                    <main className={`${isDemoMode ? 'pt-32' : 'pt-24'} pb-6 px-4 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-80px)]`}>

                        {/* Sidebar */}
                        <aside className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-hidden">

                            {/* NEW: Plan Widget */}
                            <div onClick={() => {
                                setPlanOverviewModalOpen(true);
                            }} className={`cursor-pointer rounded-xl border p-4 relative overflow-hidden group transition ${userPlan === 'annual' ? 'bg-brand-500/10 border-brand-500/30' :
                                userPlan === '24h' ? 'bg-blue-500/10 border-blue-500/30' :
                                    'bg-gray-100 dark:bg-white/5 border-transparent hover:border-brand-500/20'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">{text.sidebar.yourPlan}</span>
                                    <i className={`fa-solid ${userPlan === 'annual' ? 'fa-crown' : 'fa-circle-user'} opacity-50`}></i>
                                </div>
                                <div className="flex items-center justify-between">
                                    <h3 className={`font-bold ${userPlan === 'free' ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                        {userPlan === 'annual' ? text.account.status.annual : userPlan === '24h' ? text.account.status.dayPass : text.account.status.free}
                                    </h3>
                                    {/* SESSION COUNT DISPLAY */}
                                    <div className="text-[10px] font-mono mt-1 text-gray-500">
                                        {userPlan === 'annual' ? (
                                            <span className="text-brand-500 font-bold">Sessions Illimitées</span>
                                        ) : (
                                            <span>
                                                <span className={`font-bold ${(userPlan === '24h'
                                                    ? sessions.filter(s => s.date && s.date > (Date.now() - 24 * 60 * 60 * 1000)).length
                                                    : sessions.length) >= (userPlan === '24h' ? 5 : 1)
                                                    ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {userPlan === '24h'
                                                        ? sessions.filter(s => s.date && s.date > (Date.now() - 24 * 60 * 60 * 1000)).length
                                                        : sessions.length}
                                                </span>
                                                <span className="opacity-50"> / {userPlan === '24h' ? '5 (24h)' : '1'} Sessions</span>
                                            </span>
                                        )}
                                    </div>
                                    {userPlan === 'free' && (
                                        <span className="text-[10px] bg-brand-500 text-black px-2 py-1 rounded font-bold group-hover:scale-105 transition">UPGRADE</span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateSessionClick}
                                className="w-full p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-brand-500 hover:bg-brand-500/5 transition text-center group relative overflow-hidden"
                            >
                                <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition duration-300">
                                    <i className="fa-solid fa-plus text-xl text-brand-500"></i>
                                </div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-sm">{text.sidebar.newSession}</h3>
                            </button>

                            <div className="glass-panel flex-1 rounded-xl overflow-hidden flex flex-col min-h-0 border border-gray-200 dark:border-white/10">
                                <div className="flex flex-col gap-2 px-4 pb-2 pt-4 border-b border-gray-200 dark:border-white/10">
                                    <div className="flex justify-between items-end">
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            {text.sidebar.sessionsTitle}
                                            <span className={`text-[9px] px-1 rounded ${currentUser ? 'bg-brand-500/20 text-brand-500' : 'bg-gray-200 text-gray-500'}`}>{currentUser ? text.sidebar.cloud : text.sidebar.local}</span>
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-brand-500 font-mono bg-brand-500/10 px-1.5 py-0.5 rounded">{sessions.length}</span>
                                            {/* MOBILE TOGGLE BUTTON */}
                                            <button
                                                onClick={() => setShowSessionList(!showSessionList)}
                                                className="lg:hidden text-xs font-bold text-gray-500 hover:text-brand-500 transition"
                                            >
                                                <i className={`fa-solid fa-chevron-${showSessionList ? 'up' : 'down'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                    {/* SORTING CONTROLS */}
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-0.5">
                                            <button
                                                onClick={() => setSortBy('activity')}
                                                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${sortBy === 'activity' ? 'bg-white dark:bg-brand-500 text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Date Activité
                                            </button>
                                            <button
                                                onClick={() => setSortBy('import')}
                                                className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${sortBy === 'import' ? 'bg-white dark:bg-brand-500 text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Date Ajout
                                            </button>
                                        </div>
                                        <div className="flex gap-1">
                                            {selectedSessionIds.size > 0 && (
                                                <button onClick={() => {
                                                    if (confirm(`Supprimer ${selectedSessionIds.size} sessions ?`)) {
                                                        const newSessions = sessions.filter(s => !selectedSessionIds.has(s.id));
                                                        setSessions(newSessions);
                                                        setSelectedSessionIds(new Set());
                                                        if (!currentUser) localStorage.setItem('pulseAnalyzerSessions', JSON.stringify(newSessions));
                                                        else {
                                                            // Batch delete would be better but simple loop for now
                                                            selectedSessionIds.forEach(id => db.collection("users").doc(currentUser.uid).collection("sessions").doc(id).delete());
                                                        }
                                                    }
                                                }} className="text-[10px] font-bold text-red-500 hover:bg-red-500/10 px-2 py-1 rounded transition">
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            )}
                                            <button onClick={() => {
                                                if (selectedSessionIds.size === sessions.length) setSelectedSessionIds(new Set());
                                                else setSelectedSessionIds(new Set(sessions.map(s => s.id)));
                                            }} className="text-[10px] font-bold text-brand-500 hover:bg-brand-500/10 px-2 py-1 rounded transition">
                                                {selectedSessionIds.size === sessions.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* SESSION LIST CONTAINER - Flex-1 for PC, Limited height for Mobile */}
                                <div className={`flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 lg:max-h-none ${showSessionList ? 'block' : 'hidden lg:block'} ${!showAllSessions ? 'max-h-[400px] lg:max-h-none' : ''}`}>
                                    {(() => {
                                        const sortedSessions = [...sessions].sort((a, b) => {
                                            if (sortBy === 'activity') return (b.date || 0) - (a.date || 0);
                                            return (b.createdAt || parseInt(b.id)) - (a.createdAt || parseInt(a.id));
                                        });

                                        // On mobile (< 1024px), limit to 4 sessions unless showAllSessions is true
                                        const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024;
                                        const visibleSessions = (!showAllSessions && isMobileView && sortedSessions.length > 4)
                                            ? sortedSessions.slice(0, 4)
                                            : sortedSessions;
                                        const hasMoreSessions = sortedSessions.length > 4;

                                        return (
                                            <>
                                                {visibleSessions.map(session => (
                                                    <div
                                                        key={session.id}
                                                        onClick={() => {
                                                            setActiveSessionId(session.id);
                                                            setActiveTab('session');
                                                            // Auto-collapse on mobile
                                                            if (window.innerWidth < 1024) setShowSessionList(false);
                                                        }}
                                                        className={`p-3 rounded-lg cursor-pointer transition-all group relative ${activeSessionId === session.id ? 'bg-brand-500/20 border border-brand-500/30' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {/* CHECKBOX */}
                                                            <div onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newSet = new Set(selectedSessionIds);
                                                                if (newSet.has(session.id)) newSet.delete(session.id);
                                                                else newSet.add(session.id);
                                                                setSelectedSessionIds(newSet);
                                                            }} className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition ${selectedSessionIds.has(session.id) ? 'bg-brand-500 border-brand-500' : 'border-gray-300 hover:border-brand-500'}`}>
                                                                {selectedSessionIds.has(session.id) && <i className="fa-solid fa-check text-[10px] text-black"></i>}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <i className={`fa-solid ${activityIcons[session.type] || 'fa-star'} ${activeSessionId === session.id ? 'text-brand-500' : 'text-gray-400'}`}></i>
                                                                        <span className={`font-bold text-sm truncate ${activeSessionId === session.id ? 'text-brand-600 dark:text-brand-500' : 'text-gray-800 dark:text-white'}`}>{session.name}</span>
                                                                    </div>
                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={(e) => { e.stopPropagation(); setActiveSessionForm({ ...session }); setSessionModalOpen(true); }} className="w-6 h-6 rounded hover:bg-brand-500/10 text-gray-400 hover:text-brand-500 flex items-center justify-center"><i className="fa-solid fa-pen text-[10px]"></i></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); setSessionToDeleteId(session.id); setDeleteModalOpen(true); }} className="w-6 h-6 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-500 flex items-center justify-center"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between text-xs pl-0">
                                                                    <span className="text-gray-500">{session.datasets.length} {text.sidebar.files}</span>
                                                                    <span className="text-gray-400">
                                                                        {sortBy === 'activity'
                                                                            ? new Date(session.date || parseInt(session.id)).toLocaleDateString()
                                                                            : `Ajouté: ${new Date(session.createdAt || parseInt(session.id)).toLocaleDateString()}`
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Show More / Show Less Button - Only visible on mobile when there are more than 4 sessions */}
                                                {hasMoreSessions && (
                                                    <button
                                                        onClick={() => setShowAllSessions(!showAllSessions)}
                                                        className="lg:hidden w-full py-3 text-xs font-bold text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition flex items-center justify-center gap-2 mt-2"
                                                    >
                                                        {showAllSessions ? (
                                                            <>
                                                                <i className="fa-solid fa-chevron-up"></i>
                                                                {lang === 'fr' ? 'Réduire' : 'Show less'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fa-solid fa-chevron-down"></i>
                                                                {lang === 'fr' ? `Voir tout (${sortedSessions.length})` : `Show all (${sortedSessions.length})`}
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </aside>

                        {/* Main Content Area */}
                        <div className="lg:col-span-9 flex flex-col gap-6">
                            {/* Tabs */}
                            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10">
                                <button onClick={() => setActiveTab('session')} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${activeTab === 'session' ? 'border-brand-500 text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    <i className="fa-solid fa-chart-line mr-2"></i>{text.tabs.session}
                                </button>
                                {/* DASHBOARD TAB - GATED FOR ANNUAL ONLY */}
                                <button
                                    onClick={() => {
                                        if (userPlan === 'annual') {
                                            setActiveTab('dashboard');
                                        } else {
                                            setUpgradeModalOpen(true);
                                        }
                                    }}
                                    className={`relative px-6 py-2 text-sm font-bold border-b-2 -mb-px transition flex items-center justify-center gap-2 overflow-hidden group ${activeTab === 'dashboard'
                                        ? 'border-brand-500 text-brand-500'
                                        : userPlan !== 'annual'
                                            ? 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    {/* PRO BADGE BACKGROUND FOR NON-ANNUAL */}
                                    {userPlan !== 'annual' && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                    )}

                                    <i className={`fa-solid fa-chart-pie ${activeTab === 'dashboard' ? 'text-brand-500' : ''}`}></i>
                                    <span className={activeTab === 'dashboard' || userPlan !== 'annual' ? 'bg-clip-text text-transparent bg-gradient-to-r from-brand-500 to-blue-500' : ''}>
                                        {text.nav.dashboard}
                                    </span>
                                    {userPlan !== 'annual' && (
                                        <span className="ml-1 text-[9px] bg-brand-500 text-black px-1.5 py-0.5 rounded-full font-bold shadow-[0_0_10px_rgba(0,255,157,0.4)] animate-pulse">
                                            PRO
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* SESSION VIEW */}
                            {activeTab === 'session' && (
                                activeSession ? (
                                    <div className="animate-fade-in space-y-6">
                                        {/* Header Controls */}
                                        <div className="flex flex-wrap justify-between items-center">
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{activeSession.name} <span className="text-sm font-normal text-gray-500">({activeSession.type})</span></h2>
                                            <div className="flex gap-2">
                                                <label className="px-3 py-2 text-xs font-bold bg-gray-500/10 text-gray-500 dark:bg-white/5 dark:text-gray-400 border border-gray-500/20 dark:border-white/10 rounded cursor-pointer hover:bg-brand-500/10 hover:text-brand-500 transition flex items-center gap-2">
                                                    <i className="fa-solid fa-plus"></i> <span className="hidden sm:inline">{text.session.addFiles}</span>
                                                    <input ref={fileInputRef} type="file" multiple accept=".fit,.gpx,.tcx,.csv" className="hidden" onChange={handleFileUpload} />
                                                </label>
                                                <button onClick={exportChartsToJPG} className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 shadow-lg ${userPlan === 'free'
                                                    ? 'bg-gray-500/10 text-gray-500 border border-gray-500/20 hover:bg-gray-500/20'
                                                    : 'bg-gradient-to-r from-brand-500 to-blue-500 text-black hover:from-brand-400 hover:to-blue-400 shadow-brand-500/30 animate-pulse hover:animate-none'}`}>
                                                    {userPlan === 'free' ? <i className="fa-solid fa-lock"></i> : <i className="fa-solid fa-file-image"></i>}
                                                    <span>Export JPG</span>
                                                </button>
                                                <button onClick={() => {
                                                    const s = {
                                                        ...activeSession,
                                                        datasets: [],
                                                        analysisResults: [],
                                                        analysisText: '',
                                                        referenceDatasetId: null,
                                                        lastAnalysisSignature: ''
                                                    };
                                                    saveSession(s);
                                                }} className="px-3 py-2 text-xs font-bold bg-gray-500/10 text-gray-500 rounded hover:bg-yellow-500/10 hover:text-yellow-500 transition">
                                                    <i className="fa-solid fa-eraser"></i>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Controls Panel */}
                                        <div className="glass-panel p-4 rounded-xl border border-gray-200/80 dark:border-white/10 shadow-lg">
                                            <div className="flex gap-6 items-end flex-wrap">
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{text.session.smoothing}</h4>
                                                    <div className="flex items-center">
                                                        <input type="range" min="0" max="30" value={smoothing} onChange={(e) => setSmoothing(parseInt(e.target.value))} className="w-32 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none accent-brand-500" />
                                                        <span className="text-brand-500 font-mono text-xs font-bold ml-3 w-8">{smoothing}s</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{lang === 'fr' ? 'Remplissage' : 'Fill'}</h4>
                                                    <button
                                                        onClick={() => setChartFillEnabled(!chartFillEnabled)}
                                                        className={`text-xs flex items-center gap-2 px-3 py-1.5 rounded transition ${chartFillEnabled ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-brand-500'}`}
                                                    >
                                                        <i className={`fa-solid ${chartFillEnabled ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                                                        {chartFillEnabled ? 'ON' : 'OFF'}
                                                    </button>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{lang === 'fr' ? 'Coupures' : 'Gaps'}</h4>
                                                    <button
                                                        onClick={() => setConnectGaps(!connectGaps)}
                                                        title={lang === 'fr' ? 'Lisser les coupures de signal (interpolation)' : 'Smooth signal gaps (interpolation)'}
                                                        className={`text-xs flex items-center gap-2 px-3 py-1.5 rounded transition ${connectGaps ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-brand-500'}`}
                                                    >
                                                        <i className={`fa-solid ${connectGaps ? 'fa-link' : 'fa-link-slash'}`}></i>
                                                        {connectGaps ? (lang === 'fr' ? 'Lissées' : 'Smooth') : (lang === 'fr' ? 'Visibles' : 'Visible')}
                                                    </button>
                                                </div>
                                                <div>
                                                    <button onClick={resetZoom} className="text-xs flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-brand-500 px-3 py-1.5 rounded bg-gray-100 dark:bg-white/5 transition">
                                                        <i className="fa-solid fa-search-minus"></i> {text.session.resetZoom}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Missing Reference Warning */}
                                        {activeSession.datasets.length > 0 && !activeSession.referenceDatasetId && (
                                            <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r flex items-start gap-3 animate-fade-in">
                                                <i className="fa-solid fa-triangle-exclamation text-yellow-500 mt-0.5"></i>
                                                <div>
                                                    <h4 className="font-bold text-yellow-600 dark:text-yellow-400 text-sm">{text.session.missingRefTitle}</h4>
                                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">{text.session.missingRefDesc}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Dataset Toggle Panel */}
                                        {activeSession.datasets.length > 1 && (
                                            <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200/80 dark:border-white/10">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-2">
                                                    <i className="fa-solid fa-chart-line mr-1"></i>
                                                    {lang === 'fr' ? 'Courbes' : 'Curves'}
                                                </span>
                                                {activeSession.datasets.map((ds) => (
                                                    <button
                                                        key={ds.id}
                                                        onClick={() => {
                                                            const s = { ...activeSession };
                                                            const d = s.datasets.find(x => x.id === ds.id);
                                                            if (d) d.visible = !d.visible;
                                                            saveSession(s);
                                                        }}
                                                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${ds.visible
                                                            ? 'shadow-md hover:shadow-lg'
                                                            : 'opacity-50 hover:opacity-75'
                                                            }`}
                                                        style={{
                                                            backgroundColor: ds.visible ? ds.color + '20' : 'transparent',
                                                            border: `2px solid ${ds.color}`,
                                                            color: ds.visible ? ds.color : '#999'
                                                        }}
                                                        title={ds.visible ? (lang === 'fr' ? 'Cliquer pour masquer' : 'Click to hide') : (lang === 'fr' ? 'Cliquer pour afficher' : 'Click to show')}
                                                    >
                                                        <span
                                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: ds.color }}
                                                        ></span>
                                                        <span className={ds.visible ? '' : 'line-through'}>{ds.name}</span>
                                                        <i className={`fa-solid ${ds.visible ? 'fa-eye' : 'fa-eye-slash'} text-[10px] opacity-60 group-hover:opacity-100`}></i>
                                                    </button>
                                                ))}
                                                {activeSession.datasets.filter(d => !d.visible).length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            const s = { ...activeSession };
                                                            s.datasets.forEach(d => d.visible = true);
                                                            saveSession(s);
                                                        }}
                                                        className="text-xs text-brand-500 hover:text-brand-600 font-bold px-2 py-1 hover:bg-brand-500/10 rounded transition"
                                                    >
                                                        <i className="fa-solid fa-eye mr-1"></i>
                                                        {lang === 'fr' ? 'Tout afficher' : 'Show all'}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Chart Container */}
                                        <div className="glass-panel p-1 rounded-xl border border-gray-200/80 dark:border-white/10 shadow-2xl h-[60vh] relative group">
                                            {activeSession.datasets.length > 0 ? (
                                                <>
                                                    <div className="w-full h-full p-2">
                                                        <canvas ref={chartRef}></canvas>
                                                    </div>
                                                    <div className="absolute top-3 right-3 z-10 flex flex-row gap-2 opacity-100 transition-opacity">
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                onClick={toggleFullscreen}
                                                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-brand-500 text-black hover:bg-brand-400 text-sm font-bold shadow-lg shadow-brand-500/40 animate-pulse"
                                                                title={lang === 'fr' ? 'Plein écran' : 'Fullscreen'}
                                                            >
                                                                <i className="fa-solid fa-expand"></i>
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <button onClick={panLeft} className="w-7 h-7 flex items-center justify-center rounded bg-gray-100/80 dark:bg-black/50 text-gray-700 dark:text-gray-200 hover:bg-white text-xs shadow"><i className="fa-solid fa-chevron-left"></i></button>
                                                            <button onClick={panRight} className="w-7 h-7 flex items-center justify-center rounded bg-gray-100/80 dark:bg-black/50 text-gray-700 dark:text-gray-200 hover:bg-white text-xs shadow"><i className="fa-solid fa-chevron-right"></i></button>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <button onClick={zoomIn} className="w-7 h-7 flex items-center justify-center rounded bg-gray-100/80 dark:bg-black/50 text-gray-700 dark:text-gray-200 hover:bg-white text-xs shadow"><i className="fa-solid fa-plus"></i></button>
                                                            <button onClick={zoomOut} className="w-7 h-7 flex items-center justify-center rounded bg-gray-100/80 dark:bg-black/50 text-gray-700 dark:text-gray-200 hover:bg-white text-xs shadow"><i className="fa-solid fa-minus"></i></button>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                                                    <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-6 animate-pulse">
                                                        <i className="fa-solid fa-file-arrow-up text-3xl text-brand-500"></i>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{text.session.emptyTitle}</h3>
                                                    <p className="text-gray-500 mb-6 max-w-sm">{text.session.emptyDesc}</p>

                                                    <div className="mt-2 mb-8 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg max-w-md animate-fade-in">
                                                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                                                            <i className="fa-solid fa-circle-info"></i>
                                                            {text.modals.namingHint}
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="px-8 py-4 bg-brand-500 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:shadow-[0_0_30px_rgba(0,255,157,0.5)] hover:scale-105 transition-all duration-300 animate-bounce-slight"
                                                    >
                                                        <i className="fa-solid fa-plus mr-2"></i> {text.session.btnSelectFiles}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Signal Quality Report */}


                                        {/* AI Panel */}
                                        {activeSession.datasets.length > 0 && (
                                            // FORCE LOCKED STATE FOR 24H PASS (Hide any existing analysis/error)
                                            userPlan === '24h' ? (
                                                <div className="glass-panel p-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between animate-fade-in">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                                            <i className="fa-solid fa-lock text-yellow-500"></i>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 dark:text-white">Analyse IA Verrouillée</h4>
                                                            <p className="text-xs text-gray-500">L'analyse par Intelligence Artificielle est réservée aux membres Annuels.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleStripeCheckout(STRIPE_PRICES.ANNUAL)}
                                                        className="px-4 py-2 text-xs font-bold bg-brand-500 text-black rounded-lg hover:bg-brand-400 transition shadow-lg shadow-brand-500/20 flex items-center gap-2"
                                                    >
                                                        <i className="fa-solid fa-crown"></i> Passer en Annuel
                                                    </button>
                                                </div>
                                            ) : activeSession.analysisText ? (
                                                <div className="glass-panel p-6 rounded-xl border border-gray-200/80 dark:border-white/10 shadow-lg animate-fade-in">
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                                                        <i className="fa-solid fa-lightbulb text-yellow-400"></i> {text.session.aiTitle}
                                                    </h3>
                                                    <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatAIResponse(activeSession.analysisText) }}></div>

                                                    {/* AI CHAT INTERFACE */}
                                                    <AnalysisChat
                                                        key={activeSession.id + '_chat'}
                                                        initialAnalysis={activeSession.analysisText}
                                                        contextData={JSON.stringify(activeSession.analysisResults || {}, null, 2)}
                                                        lang={lang}
                                                    />
                                                </div>
                                            ) : (
                                                userPlan === '24h' ? (
                                                    <div className="glass-panel p-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between animate-fade-in">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                                                <i className="fa-solid fa-lock text-yellow-500"></i>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900 dark:text-white">Analyse IA Verrouillée</h4>
                                                                <p className="text-xs text-gray-500">L'analyse par Intelligence Artificielle est réservée aux membres Annuels.</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleStripeCheckout(STRIPE_PRICES.ANNUAL)}
                                                            className="px-4 py-2 text-xs font-bold bg-brand-500 text-black rounded-lg hover:bg-brand-400 transition shadow-lg shadow-brand-500/20 flex items-center gap-2"
                                                        >
                                                            <i className="fa-solid fa-crown"></i> Passer en Annuel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="glass-panel p-6 rounded-xl border border-gray-200/80 dark:border-white/10 flex items-center justify-between animate-fade-in">
                                                        <div className="flex items-center gap-3">
                                                            <i className="fa-solid fa-wand-magic-sparkles text-brand-500 text-xl"></i>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 dark:text-white">{text.session.aiAvailableTitle}</h4>
                                                                <p className="text-xs text-gray-500">{text.session.aiAvailableDesc}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => runSessionAnalysis(activeSession)}
                                                            disabled={!activeSession.referenceDatasetId}
                                                            className={`px-4 py-2 text-sm font-bold rounded-lg transition shadow-lg ${!activeSession.referenceDatasetId ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-brand-500 text-black hover:bg-brand-400 shadow-brand-500/20'}`}
                                                        >
                                                            {userPlan === 'free' && <i className="fa-solid fa-lock mr-2"></i>}
                                                            {text.session.btnRunAnalysis}
                                                        </button>
                                                    </div>
                                                )
                                            )
                                        )}

                                        {/* Stats Table */}
                                        {activeSession.datasets.length > 0 && (
                                            <div className="glass-panel rounded-xl overflow-hidden border border-gray-200/80 dark:border-white/10 animate-fade-in">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                                        <thead className="text-[10px] text-gray-500 uppercase bg-gray-500/10 font-bold tracking-wider">
                                                            <tr>
                                                                <th className="px-4 py-3 text-center">{text.table.vis}</th>
                                                                <th className="px-4 py-3">{text.table.device}</th>
                                                                <th className="px-4 py-3 text-center">Score</th>
                                                                <th className="px-4 py-3 text-center">Stabilité</th>
                                                                <th className="px-4 py-3 text-center">{text.table.avg}</th>
                                                                <th className="px-4 py-3 text-center">{text.table.max}</th>
                                                                <th className="px-4 py-3 text-center">{text.table.min}</th>
                                                                <th className="px-4 py-3 text-center">{text.table.offset}</th>
                                                                <th className="px-4 py-3 text-center">{text.table.actions}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                                            {activeSession.datasets.map(ds => {
                                                                const vals = ds.data.map(d => d.hr);
                                                                return (
                                                                    <React.Fragment key={ds.id}>
                                                                        <tr className="hover:bg-gray-500/5 transition group">
                                                                            <td className="px-4 py-3 text-center">
                                                                                <button onClick={() => {
                                                                                    const s = { ...activeSession };
                                                                                    const d = s.datasets.find(x => x.id === ds.id);
                                                                                    if (d) d.visible = !d.visible;
                                                                                    saveSession(s);
                                                                                }} className="text-gray-500 hover:text-brand-500">
                                                                                    <i className={`fa-solid ${ds.visible ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                                                                                </button>
                                                                            </td>
                                                                            <td className="px-4 py-3 font-medium flex items-center gap-2" style={{ color: ds.color }}>
                                                                                <input type="color" value={ds.color} onChange={(e) => {
                                                                                    const s = { ...activeSession };
                                                                                    const d = s.datasets.find(x => x.id === ds.id);
                                                                                    if (d) d.color = e.target.value;
                                                                                    saveSession(s);
                                                                                }} className="w-4 h-4 rounded-full overflow-hidden border-none p-0 cursor-pointer" />
                                                                                {ds.name}
                                                                            </td>

                                                                            {/* SCORE COLUMN */}
                                                                            <td className="px-4 py-3 text-center">
                                                                                {activeSession.referenceDatasetId !== ds.id && activeSession.analysisResults?.find(r => r.device === ds.name)?.score ? (
                                                                                    <span
                                                                                        className={`text-xs px-2 py-0.5 rounded-full font-bold cursor-help ${(activeSession.analysisResults.find(r => r.device === ds.name)?.score || 0) >= 80 ? 'text-green-500 bg-green-100 dark:bg-green-500/20' :
                                                                                            (activeSession.analysisResults.find(r => r.device === ds.name)?.score || 0) >= 50 ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-500/20' :
                                                                                                'text-red-500 bg-red-100 dark:bg-red-500/20'
                                                                                            }`}
                                                                                        title="Score Global = (Corrélation 50% + Précision 30% + Stabilité 20%) x Intégrité du Signal"
                                                                                    >
                                                                                        {activeSession.analysisResults.find(r => r.device === ds.name)?.score}/100
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-gray-300 text-xs">-</span>
                                                                                )}
                                                                            </td>

                                                                            {/* SIGNAL QUALITY / DROPOUTS */}
                                                                            <td className="px-4 py-3 text-center">
                                                                                {activeSession.analysisResults?.find(r => r.device === ds.name)?.dropouts ? (
                                                                                    <button
                                                                                        onClick={() => setExpandedDatasetId(expandedDatasetId === ds.id ? null : ds.id)}
                                                                                        className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 justify-center mx-auto transition-all ${expandedDatasetId === ds.id
                                                                                            ? 'bg-red-500 text-white shadow-md scale-105'
                                                                                            : 'text-red-500 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20'
                                                                                            }`}
                                                                                    >
                                                                                        <i className={`fa-solid ${expandedDatasetId === ds.id ? 'fa-chevron-up' : 'fa-triangle-exclamation'}`}></i>
                                                                                        {activeSession.analysisResults.find(r => r.device === ds.name)?.dropouts}
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="text-xs text-gray-400 font-bold flex items-center justify-center gap-1">
                                                                                        <i className="fa-solid fa-check text-green-500"></i> 0
                                                                                    </span>
                                                                                )}
                                                                            </td>

                                                                            <td className="px-4 py-3 text-center text-xs font-mono">{Math.round(calculateMean(vals))}</td>
                                                                            <td className="px-4 py-3 text-center text-xs font-mono">{Math.max(...vals)}</td>
                                                                            <td className="px-4 py-3 text-center text-xs font-mono">{Math.min(...vals)}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <div className="flex items-center justify-center gap-1 bg-gray-100 dark:bg-white/5 rounded p-1 inline-flex">
                                                                                    <button onClick={() => {
                                                                                        const s = { ...activeSession };
                                                                                        const d = s.datasets.find(x => x.id === ds.id);
                                                                                        if (d) d.offset -= 1;
                                                                                        saveSession(s);
                                                                                    }} className="w-5 h-5 flex items-center justify-center text-[10px] hover:bg-white/10 rounded"><i className="fa-solid fa-minus"></i></button>
                                                                                    <span className="w-8 text-center text-xs font-mono">{ds.offset}</span>
                                                                                    <button onClick={() => {
                                                                                        const s = { ...activeSession };
                                                                                        const d = s.datasets.find(x => x.id === ds.id);
                                                                                        if (d) d.offset += 1;
                                                                                        saveSession(s);
                                                                                    }} className="w-5 h-5 flex items-center justify-center text-[10px] hover:bg-white/10 rounded"><i className="fa-solid fa-plus"></i></button>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <div className="flex justify-center gap-2">
                                                                                    <button onClick={() => {
                                                                                        const s = { ...activeSession, referenceDatasetId: activeSession.referenceDatasetId === ds.id ? null : ds.id };
                                                                                        saveSession(s);
                                                                                    }} title="Définir comme référence" className={`w-6 h-6 flex items-center justify-center rounded hover:bg-yellow-500/10 ${activeSession.referenceDatasetId === ds.id ? 'text-yellow-500' : 'text-gray-400'}`}>
                                                                                        <i className={`${activeSession.referenceDatasetId === ds.id ? 'fa-solid' : 'fa-regular'} fa-star text-xs`}></i>
                                                                                    </button>
                                                                                    <button onClick={() => {
                                                                                        const s = { ...activeSession };
                                                                                        s.datasets = s.datasets.filter(x => x.id !== ds.id);
                                                                                        // Reset reference if we deleted the reference dataset
                                                                                        if (s.referenceDatasetId === ds.id) {
                                                                                            s.referenceDatasetId = s.datasets.length > 0 ? s.datasets[0].id : null;
                                                                                        }
                                                                                        // Clear analysis so it can re-run with new data
                                                                                        s.analysisResults = [];
                                                                                        s.analysisText = '';
                                                                                        s.lastAnalysisSignature = '';
                                                                                        // Reset processing state in case it was stuck
                                                                                        setIsProcessing(false);
                                                                                        saveSession(s);
                                                                                    }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/10 text-gray-400 hover:text-red-500">
                                                                                        <i className="fa-solid fa-trash-can text-xs"></i>
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                        {
                                                                            expandedDatasetId === ds.id && activeSession.analysisResults?.find(r => r.device === ds.name)?.dropoutDetails && (
                                                                                <tr className="bg-gray-50 dark:bg-white/5 animate-fade-in border-b border-gray-100 dark:border-white/5">
                                                                                    <td colSpan={9} className="px-4 py-3">
                                                                                        <div className="flex flex-col gap-2">
                                                                                            <div className="font-bold text-xs text-brand-500 flex items-center gap-2">
                                                                                                <i className="fa-solid fa-circle-exclamation"></i>
                                                                                                Détail des {activeSession.analysisResults.find(r => r.device === ds.name)?.dropouts} décrochages détectés (perte de signal) :
                                                                                            </div>
                                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                                                {activeSession.analysisResults.find(r => r.device === ds.name)?.dropoutDetails?.map((d, i) => (
                                                                                                    <div key={i} className="flex items-center justify-between text-xs bg-white dark:bg-black/20 p-2 rounded border border-gray-200 dark:border-white/10 shadow-sm hover:border-red-300 transition-colors">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <i className="fa-regular fa-clock text-gray-400"></i>
                                                                                                            <span className="font-mono text-gray-600 dark:text-gray-300">
                                                                                                                {Math.floor(d.start / 60)}:{(d.start % 60).toFixed(0).padStart(2, '0')} - {Math.floor(d.end / 60)}:{(d.end % 60).toFixed(0).padStart(2, '0')}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-1.5">
                                                                                                            <span className="text-[10px] uppercase text-gray-400 font-bold">Durée</span>
                                                                                                            <span className="font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-500/20">{d.duration}s</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )
                                                                        }
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[55vh] glass-panel rounded-xl border border-gray-200/80 dark:border-white/10 text-center p-8 bg-gray-100/50 dark:bg-brand-dark/50 backdrop-blur-sm">
                                        <div className="w-20 h-20 rounded-full bg-gray-500/10 dark:bg-white/5 flex items-center justify-center mb-4 animate-pulse">
                                            <i className="fa-solid fa-chart-area text-3xl text-gray-300 dark:text-white/20"></i>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{text.session.waitingTitle}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{text.session.waitingDesc}</p>
                                    </div>
                                )
                            )}

                            {/* DASHBOARD GLOBAL */}
                            {activeTab === 'dashboard' && (
                                <div className="animate-fade-in space-y-6">
                                    {globalReport ? (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{text.dashboard.title}</h3>
                                                <div className="flex gap-2">
                                                    <button onClick={() => runGlobalAnalysis(globalReport)} className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:from-purple-500/30 hover:to-violet-500/30 transition flex items-center gap-2">
                                                        <i className="fa-solid fa-wand-magic-sparkles"></i> {globalAIText ? text.dashboard.btnRegenerate : "Lancer l'analyse IA"}
                                                    </button>
                                                    <button onClick={exportDashboardToJPG} className="px-5 py-2 text-xs font-bold bg-blue-500/20 text-blue-500 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition flex items-center gap-2">
                                                        <i className="fa-solid fa-file-image"></i> JPG
                                                    </button>
                                                    <button onClick={exportGlobalPDF} className="px-5 py-2 text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition flex items-center gap-2">
                                                        <i className="fa-solid fa-file-pdf"></i> PDF Global
                                                    </button>
                                                </div>
                                            </div>

                                            {/* UPDATE AI POPUP */}
                                            {showUpdateAIPopup && (
                                                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r flex items-center justify-between animate-fade-in mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                            <i className="fa-solid fa-rotate text-blue-500"></i>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">Données modifiées</h4>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">De nouvelles sessions ont été ajoutées ou modifiées.</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setShowUpdateAIPopup(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Ignorer</button>
                                                        <button onClick={() => runGlobalAnalysis(globalReport)} className="px-3 py-1.5 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-lg shadow-blue-500/20">
                                                            Mettre à jour l'IA
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* AI Global Panel */}
                                            {globalAIText && (
                                                <div className="glass-panel p-6 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-violet-500/5 to-transparent shadow-lg animate-fade-in">
                                                    <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                                                        <i className="fa-solid fa-wand-magic-sparkles text-purple-400"></i> {text.dashboard.aiTitle}
                                                    </h3>
                                                    <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatAIResponse(globalAIText) }}></div>
                                                </div>
                                            )}

                                            {/* Global Table */}
                                            <div className="glass-panel p-6 rounded-xl border border-gray-200/80 dark:border-white/10">
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                                                    <i className="fa-solid fa-trophy text-yellow-400"></i> {text.dashboard.globalRanking}
                                                </h3>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                                        <thead className="text-[10px] text-gray-500 uppercase bg-gray-500/10 font-bold tracking-wider">
                                                            <tr>
                                                                <th className="px-4 py-3">#</th>
                                                                <th className="px-4 py-3">{text.table.device}</th>
                                                                <th className="px-4 py-3 text-center">{text.dashboard.score}</th>
                                                                <th className="px-4 py-3 text-center">{text.dashboard.corr}</th>
                                                                <th className="px-4 py-3 text-center">{text.dashboard.bias}</th>
                                                                <th className="px-4 py-3 text-center">{text.dashboard.mae}</th>
                                                                <th className="px-4 py-3 text-center">{text.dashboard.rmse}</th>
                                                                <th className="px-4 py-3 text-center">{text.dashboard.stability}</th>
                                                                <th className="px-4 py-3 text-center">{text.dashboard.count}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                                            {globalReport.global.map((item: any, idx: number) => (
                                                                <tr key={idx} className="hover:bg-gray-500/5">
                                                                    <td className={`px-4 py-3 text-center font-mono ${idx === 0 ? 'text-brand-500 font-bold' : 'text-gray-500'}`}>{idx + 1}.</td>
                                                                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{item.device}</td>
                                                                    <td className={`px-4 py-3 text-center font-mono text-lg ${idx === 0 ? 'text-brand-500 font-bold' : ''}`}>{item.trustScore}</td>
                                                                    <td className="px-4 py-3 text-center font-mono text-gray-700 dark:text-gray-300">{item.correlation}</td>
                                                                    <td className="px-4 py-3 text-center font-mono text-gray-700 dark:text-gray-300">{item.bias}</td>
                                                                    <td className="px-4 py-3 text-center font-mono text-gray-700 dark:text-gray-300">{item.mae}</td>
                                                                    <td className="px-4 py-3 text-center font-mono text-gray-700 dark:text-gray-300">{item.rmse}</td>
                                                                    <td className="px-4 py-3 text-center font-mono text-gray-700 dark:text-gray-300">{item.stdDevError}</td>
                                                                    <td className="px-4 py-3 text-center font-mono text-xs text-gray-500">{item.count}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Activity Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {Object.entries(globalReport.byActivity).map(([activity, items]: any) => (
                                                    <div key={activity} className="glass-panel p-6 rounded-xl border border-gray-200/80 dark:border-white/10">
                                                        <h4 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                                            <i className={`fa-solid ${activityIcons[activity] || 'fa-star'} text-brand-500`}></i>
                                                            {text.activities[activity as keyof typeof text.activities] || activity}
                                                        </h4>
                                                        <table className="w-full text-xs text-left">
                                                            <thead className="bg-gray-500/10 uppercase font-bold text-gray-500">
                                                                <tr>
                                                                    <th className="px-3 py-2">{text.table.device}</th>
                                                                    <th className="px-3 py-2 text-center">{text.dashboard.score}</th>
                                                                    <th className="px-3 py-2 text-center">{text.dashboard.bias}</th>
                                                                    <th className="px-3 py-2 text-center">{text.dashboard.mae}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                                                {items.map((item: any, idx: number) => (
                                                                    <tr key={idx}>
                                                                        <td className="px-3 py-2 font-semibold text-gray-800 dark:text-white">{item.device}</td>
                                                                        <td className={`px-3 py-2 text-center font-mono ${idx === 0 ? 'text-brand-500 font-bold' : ''}`}>{item.trustScore}</td>
                                                                        <td className="px-3 py-2 text-center text-gray-500">{item.bias}</td>
                                                                        <td className="px-3 py-2 text-center text-gray-500">{item.mae}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="glass-panel p-6 rounded-xl border border-gray-200/80 dark:border-white/10 text-center">
                                            <i className="fa-solid fa-database text-4xl text-gray-400 dark:text-gray-600 mb-3"></i>
                                            <h4 className="font-bold text-gray-800 dark:text-white">{text.dashboard.noDataTitle}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{text.dashboard.noDataDesc}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </>
            )
            }
        </div >
    );
};

export default App;
