
import React, { useState } from 'react';
import { Language } from '../types';
import { t } from '../translations';

interface LandingPageProps {
    onEnterApp: () => void;
    onEnterDemo: () => void;
    onLogin: () => void;
    onOpenHelp: () => void;
    onBuyDayPass: () => void;
    onBuyAnnualPass: () => void;
    lang: Language;
    setLang: (l: Language) => void;
    userPlan: string;
    isLoggedIn: boolean;
    onUpgrade: () => void;
    onNavigate: (view: any) => void;
}

// Visual component representing the report (replaces static image)
const MockReport = () => (
    <div className="bg-white w-full h-full flex flex-col p-4 md:p-5 text-[9px] md:text-[10px] leading-tight select-none overflow-hidden relative font-sans shadow-inner">
        {/* Watermark/Background decoration */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-gray-50 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 relative z-10 border-b border-gray-100 pb-3">
            <div className="w-6 h-6 rounded-lg bg-brand-500 flex items-center justify-center text-black text-[10px] shadow-sm"><i className="fa-solid fa-heart-pulse"></i></div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">Pulse<span className="text-brand-500">Analyzer</span></span>
            <div className="ml-auto text-gray-400 text-[8px] font-mono">28/11/2025</div>
        </div>

        {/* Title */}
        <div className="mb-4 relative z-10">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Rapport d'Analyse: Fractionné</h2>
            <p className="text-gray-500 text-[9px]">Type: course • Durée: 47:53</p>
        </div>

        {/* Table Mockup */}
        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm relative z-10">
            <div className="grid grid-cols-5 bg-gray-50 p-1.5 font-bold text-gray-600 border-b border-gray-200 uppercase tracking-wider text-[8px]">
                <div className="col-span-2">Appareil</div>
                <div className="text-center">Score</div>
                <div className="text-center">Corr</div>
                <div className="text-center">MAE</div>
            </div>
            <div className="divide-y divide-gray-100 text-gray-700">
                <div className="p-1.5 grid grid-cols-5 items-center bg-brand-50/30">
                    <div className="col-span-2 font-bold text-gray-900 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> AirpodsPro3</div>
                    <div className="text-center font-bold text-brand-600 bg-white/50 rounded">94</div>
                    <div className="text-center font-mono text-[8px]">0.999</div>
                    <div className="text-center font-mono text-[8px]">0.46</div>
                </div>
                <div className="p-1.5 grid grid-cols-5 items-center">
                    <div className="col-span-2 font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> Coroshrm</div>
                    <div className="text-center font-bold text-gray-600">87</div>
                    <div className="text-center font-mono text-[8px]">0.995</div>
                    <div className="text-center font-mono text-[8px]">0.88</div>
                </div>
                <div className="p-1.5 grid grid-cols-5 items-center">
                    <div className="col-span-2 font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div> Galaxywatch4</div>
                    <div className="text-center font-bold text-yellow-600">78</div>
                    <div className="text-center font-mono text-[8px]">0.989</div>
                    <div className="text-center font-mono text-[8px]">1.64</div>
                </div>
            </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 bg-gray-50/30 border border-gray-100 rounded-lg mb-4 relative min-h-[60px] overflow-hidden">
            <div className="absolute top-1 left-2 text-[7px] text-gray-400 font-bold uppercase z-10">Vue d'ensemble</div>
            <svg className="absolute inset-0 w-full h-full p-2 pt-4" viewBox="0 0 100 40" preserveAspectRatio="none">
                {/* Grid */}
                <path d="M0,10 L100,10 M0,20 L100,20 M0,30 L100,30" stroke="#f0f0f0" strokeWidth="0.5" />

                {/* Reference (Blue) */}
                <path d="M0,35 L10,10 L20,12 L30,30 L40,32 L50,10 L60,12 L70,35 L80,35 L90,10 L100,12" fill="none" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                {/* Airpods (Red) matches Ref */}
                <path d="M0,35 L10,10 L20,12 L30,30 L40,32 L50,10 L60,12 L70,35 L80,35 L90,10 L100,12" fill="none" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, -0.5)" />
                {/* Galaxy (Cyan) Deviates */}
                <path d="M0,36 L10,12 L20,15 L30,28 L40,30 L50,15 L60,18 L70,36 L80,38 L90,12 L100,15" fill="none" stroke="#06b6d4" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>
        </div>

        {/* Verdict */}
        <div className="bg-brand-50/50 rounded-r-lg border-l-[3px] border-brand-500 pl-3 pr-2 py-2">
            <h3 className="font-bold text-brand-600 mb-1 text-[9px] uppercase flex items-center gap-1.5"><i className="fa-solid fa-check-circle"></i> Expert Verdict</h3>
            <p className="text-gray-600 text-[8px] leading-relaxed">
                The <strong>AirpodsPro3</strong> is overwhelmingly the most reliable device, closely matching the Polarh10 reference across all critical metrics.
            </p>
        </div>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onEnterDemo, onLogin, onOpenHelp, onBuyDayPass, onBuyAnnualPass, lang, setLang, userPlan, isLoggedIn, onUpgrade, onNavigate }) => {
    const text = t(lang).landing;
    const pricing = t(lang).pricing;
    const exportInfo = t(lang).export.infoModal;
    const [showExportInfo, setShowExportInfo] = useState(false);

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-500 selection:text-black overflow-x-hidden relative flex flex-col font-sans">

            {/* --- Background FX --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Noise Grain */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

                {/* Glowing Orbs */}
                <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>

                {/* Grid Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>

            {/* --- Navbar --- */}
            <nav className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <div className="absolute inset-0 bg-brand-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <i className="fa-solid fa-heart-pulse text-brand-500 text-2xl relative z-10"></i>
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">Pulse<span className="text-brand-500">Analyzer</span></span>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                        className="text-xs font-bold text-gray-400 hover:text-white transition uppercase tracking-widest"
                    >
                        {lang === 'fr' ? 'EN' : 'FR'}
                    </button>
                    {!isLoggedIn && (
                        <button
                            onClick={onLogin}
                            className="text-sm font-medium text-gray-300 hover:text-white transition"
                        >
                            {text.login}
                        </button>
                    )}
                    <button
                        onClick={onEnterApp}
                        className="hidden sm:block px-5 py-2 text-sm font-bold bg-white text-black rounded-full hover:bg-gray-200 transition shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                        {text.ctaApp}
                    </button>
                    {/* Persistent Upgrade Button for Free/24h users when logged in */}
                    {isLoggedIn && userPlan !== 'annual' && (
                        <button
                            onClick={onUpgrade}
                            className="hidden sm:block px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-brand-500 to-brand-400 text-black rounded-full hover:scale-105 transition shadow-[0_0_15px_rgba(0,255,157,0.4)] animate-pulse"
                        >
                            <i className="fa-solid fa-crown mr-1"></i> UPGRADE
                        </button>
                    )}
                </div>
            </nav>

            {/* --- Hero Section --- */}
            <main className="relative z-10 flex flex-col items-center justify-center flex-grow px-4 mt-16 mb-24">

                <div className="relative max-w-5xl mx-auto text-center">
                    {/* Animated Pulse Line SVG */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[300px] -z-10 opacity-30 pointer-events-none">
                        <svg viewBox="0 0 1200 200" className="w-full h-full stroke-brand-500 fill-none stroke-[2px]">
                            <path d="M0,100 L400,100 L420,100 L440,40 L460,160 L480,100 L500,100 L520,100 L540,100 L1200,100" strokeDasharray="1200" strokeDashoffset="1200" className="animate-[dash_3s_ease-in-out_infinite]">
                                <animate attributeName="stroke-dashoffset" from="1200" to="0" dur="3s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
                            </path>
                        </svg>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-600 animate-fade-in leading-[0.9]">
                        {lang === 'fr' ? (
                            <>Libérez vos <br /><span className="text-brand-500">Données Cardiaques</span></>
                        ) : (
                            <>Unleash your <br /><span className="text-brand-500">Heart Data</span></>
                        )}
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-in leading-relaxed font-light" style={{ animationDelay: '0.1s' }}>
                        {text.subtitle}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        <button
                            onClick={onEnterApp}
                            className="w-full sm:w-auto px-8 py-4 bg-brand-500 text-black font-bold rounded-xl hover:bg-brand-400 transition-all hover:scale-105 shadow-[0_0_40px_rgba(0,255,157,0.3)] flex items-center justify-center gap-2"
                        >
                            {text.ctaApp} <i className="fa-solid fa-arrow-right"></i>
                        </button>
                        <button
                            onClick={onEnterDemo}
                            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold rounded-xl hover:from-purple-500 hover:to-purple-400 transition-all hover:scale-105 shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-play"></i> {text.ctaDemo}
                        </button>
                    </div>
                </div >

                {/* --- Bento Grid Features --- */}
                < div className="max-w-6xl mx-auto mt-32 w-full animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* 1. Auto-Sync (Large - 2 cols) */}
                        <div className="md:col-span-2 p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 hover:border-brand-500/30 transition-colors group relative overflow-hidden flex flex-col items-center justify-center text-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-20 h-20 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 mb-6 group-hover:scale-110 transition-transform duration-500">
                                <i className="fa-solid fa-rotate text-3xl"></i>
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white">{text.featureAutoSyncTitle}</h3>
                            <p className="text-gray-400 leading-relaxed max-w-lg">{text.featureAutoSyncDesc}</p>
                        </div>

                        {/* 2. Proprietary Algo (Tall/Square - 1 col) */}
                        <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 hover:border-blue-500/30 transition-colors group relative overflow-hidden flex flex-col items-center justify-center text-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                                <i className="fa-solid fa-microchip text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">{text.featureAlgoTitle}</h3>
                            <p className="text-sm text-gray-400">{text.featureAlgoDesc}</p>
                        </div>

                        {/* NEW. AI Chat (Small - 1 col) */}
                        <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 hover:border-indigo-500/30 transition-colors group relative overflow-hidden flex flex-col items-center justify-center text-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                                <i className="fa-solid fa-comments text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">{text.featureChatTitle}</h3>
                            <p className="text-sm text-gray-400">{text.featureChatDesc}</p>
                        </div>

                        {/* 3. AI Analysis (Large - 2 cols) */}
                        <div className="md:col-span-2 p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 hover:border-purple-500/30 transition-colors group relative overflow-hidden flex flex-col items-center justify-center text-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                                <i className="fa-solid fa-wand-magic-sparkles text-3xl"></i>
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white">{text.feature2Title}</h3>
                            <p className="text-gray-400 leading-relaxed max-w-lg">{text.feature2Desc}</p>
                        </div>

                        {/* 4. Multi-Format (Large - 2 cols) */}
                        <div className="md:col-span-2 p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 hover:border-green-500/30 transition-colors group relative overflow-hidden flex flex-col items-center justify-center text-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform duration-500">
                                <i className="fa-solid fa-file-csv text-3xl"></i>
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white">{text.feature1Title}</h3>
                            <p className="text-gray-400 leading-relaxed max-w-lg">{text.feature1Desc}</p>
                        </div>

                        {/* 5. Advanced Metrics (Tall/Square - 1 col) */}
                        <div className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 hover:border-pink-500/30 transition-colors group relative overflow-hidden flex flex-col items-center justify-center text-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                                <i className="fa-solid fa-chart-area text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">{text.feature3Title}</h3>
                            <p className="text-sm text-gray-400">{text.feature3Desc}</p>
                        </div>

                        {/* 4. Pro Exports (Large - 3 cols - FULL WIDTH) */}
                        <div className="md:col-span-3 p-0 rounded-3xl bg-[#0a0a0a] border border-white/10 hover:border-orange-500/30 transition-colors group relative overflow-hidden flex flex-col md:flex-row">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                            <div className="flex-1 z-10 flex flex-col items-center md:items-start justify-center p-8">
                                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <i className="fa-solid fa-file-image text-2xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-white">{text.exportFeatureTitle}</h3>
                                <p className="text-gray-400 leading-relaxed mb-6">{text.exportFeatureDesc}</p>
                                <button
                                    onClick={() => setShowExportInfo(true)}
                                    className="px-6 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg hover:bg-orange-500 hover:text-white transition flex items-center gap-2 text-sm font-bold group/btn"
                                >
                                    <i className="fa-solid fa-circle-info group-hover/btn:scale-110 transition-transform"></i> {text.viewExample}
                                </button>
                            </div>

                            {/* Visual Preview 3D Container */}
                            <div className="relative w-full md:w-1/2 h-64 md:h-auto min-h-[300px] bg-gradient-to-b from-gray-900/50 to-black/50 flex items-center justify-center p-8 perspective-container cursor-pointer overflow-hidden" onClick={() => setShowExportInfo(true)}>

                                {/* Background Decorative Elements */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-500/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                {/* The Floating Card */}
                                <div className="report-card-3d relative w-[220px] md:w-[260px] aspect-[0.7] bg-white rounded-lg shadow-2xl z-10 group-hover:shadow-orange-500/20 overflow-hidden">
                                    {/* MOCK COMPONENT INSTANCE */}
                                    <MockReport />

                                    {/* Glossy Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent z-20 pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity duration-500"></div>

                                    {/* Badge - MOVED INSIDE TO PREVENT CLIPPING */}
                                    <div className="absolute bottom-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-2 z-30">
                                        <i className="fa-solid fa-share-nodes"></i> Share
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Privacy First (Full Width - 3 cols) */}
                        <div className="md:col-span-3 p-8 rounded-3xl bg-gradient-to-r from-[#0a0a0a] to-[#111] border border-white/10 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-brand-500/10 to-transparent skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                            <div className="text-center md:text-left relative z-10 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-lock text-gray-400"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-0.5">{text.privacyTitle}</h3>
                                    <p className="text-sm text-gray-500">{text.privacyDesc}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-xs text-green-500 font-mono">{text.privacyTag}</span>
                            </div>
                        </div>
                    </div>
                </div >

                {/* --- Pricing Section --- */}
                < div className="mt-32 w-full max-w-5xl mx-auto px-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">{pricing.title}</h2>
                        <p className="text-gray-400">{pricing.subtitle}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        {/* Free Pass */}
                        <div className="p-1 rounded-3xl bg-gradient-to-b from-white/5 to-transparent">
                            <div className="h-full bg-[#050505] rounded-[22px] p-8 relative overflow-hidden text-center flex flex-col items-center">
                                <h3 className="text-xl font-bold text-gray-400 mb-2">{pricing.freePass}</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-6">
                                    <span className="text-4xl font-bold text-white">{pricing.freePassPrice}</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-8 border-b border-white/5 pb-8 w-full">{pricing.freePassDesc}</p>

                                <ul className="space-y-4 text-sm text-gray-400 mb-8 text-left w-full pl-4">
                                    <li className="flex items-center gap-3"><i className="fa-solid fa-check text-gray-500 w-5"></i> {pricing.features.sessions1}</li>
                                    <li className="flex items-center gap-3"><i className="fa-solid fa-check text-gray-500 w-5"></i> {pricing.features.filesLimited}</li>
                                    <li className="flex items-center gap-3"><i className="fa-solid fa-check text-gray-500 w-5"></i> {pricing.features.visualization}</li>
                                    <li className="flex items-center gap-3 text-gray-600"><i className="fa-solid fa-xmark w-5 text-center"></i> {pricing.features.basicStats}</li>
                                    <li className="flex items-center gap-3 text-gray-600"><i className="fa-solid fa-xmark w-5 text-center"></i> {pricing.features.aiAnalysis}</li>
                                    <li className="flex items-center gap-3 text-gray-600"><i className="fa-solid fa-xmark w-5 text-center"></i> {pricing.features.export}</li>
                                </ul>

                                <button onClick={onEnterApp} className="w-full py-3 rounded-xl border border-white/10 font-bold text-gray-300 hover:bg-white/10 transition block mt-auto cursor-pointer relative z-20">
                                    {pricing.ctaFree}
                                </button>
                            </div>
                        </div>

                        {/* 24h Pass */}
                        <div className="p-1 rounded-3xl bg-gradient-to-b from-white/20 to-transparent">
                            <div className="h-full bg-[#050505] rounded-[22px] p-8 relative overflow-hidden text-center flex flex-col items-center">
                                <h3 className="text-xl font-bold text-white mb-2">{pricing.dayPass}</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-6">
                                    <span className="text-4xl font-bold text-white">{pricing.dayPassPrice}</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-8 border-b border-white/5 pb-8 w-full">{pricing.dayPassDesc}</p>

                                <ul className="space-y-4 text-sm text-gray-300 mb-8 text-left w-full pl-4">
                                    <li className="flex items-center gap-3"><i className="fa-solid fa-check text-brand-500 w-5"></i> {pricing.features.sessions5}</li>
                                    <li className="flex items-center gap-3"><i className="fa-solid fa-check text-brand-500 w-5"></i> {pricing.features.filesUnlim}</li>
                                    <li className="flex items-center gap-3"><i className="fa-solid fa-check text-brand-500 w-5"></i> {pricing.features.basicStats}</li>
                                    <li className="flex items-center gap-3"><i className="fa-solid fa-check text-brand-500 w-5"></i> {pricing.features.sessionExport}</li>
                                    <li className="flex items-center gap-3 text-gray-600"><i className="fa-solid fa-xmark w-5 text-center"></i> {pricing.features.aiAnalysis}</li>
                                </ul>

                                <button onClick={onBuyDayPass} className="w-full py-3 rounded-xl border border-white/20 font-bold hover:bg-white hover:text-black transition block mt-auto cursor-pointer relative z-20">
                                    {pricing.ctaDay}
                                </button>
                            </div>
                        </div>

                        {/* Annual Pass */}
                        <div className="p-1 rounded-3xl bg-gradient-to-b from-brand-500 to-transparent shadow-[0_0_50px_rgba(0,255,157,0.15)] relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest z-20 shadow-[0_0_20px_rgba(0,255,157,0.5)]">{pricing.mostPopular}</div>

                            <div className="h-full bg-[#050505] rounded-[22px] p-8 relative overflow-hidden text-center flex flex-col items-center">
                                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>

                                <h3 className="text-xl font-bold text-brand-400 mb-2">{pricing.annualPass}</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-6">
                                    <span className="text-4xl font-bold text-white">{pricing.annualPassPrice}</span>
                                    <span className="text-gray-500">{pricing.year}</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-8 border-b border-white/5 pb-8 w-full">{pricing.annualPassDesc}</p>

                                <ul className="space-y-4 text-sm text-white mb-8 relative z-10 text-left w-full pl-4">
                                    <li className="flex items-center gap-3"><div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs shrink-0"><i className="fa-solid fa-check"></i></div> {pricing.features.sessionsUnlim}</li>
                                    <li className="flex items-center gap-3"><div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs shrink-0"><i className="fa-solid fa-check"></i></div> {pricing.features.filesUnlim}</li>
                                    <li className="flex items-center gap-3"><div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs shrink-0"><i className="fa-solid fa-check"></i></div> {pricing.features.advancedStats}</li>
                                    <li className="flex items-center gap-3"><div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs shrink-0"><i className="fa-solid fa-check"></i></div> {pricing.features.aiAnalysis}</li>
                                    <li className="flex items-center gap-3"><div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs shrink-0"><i className="fa-solid fa-check"></i></div> <strong>{pricing.features.aiChat}</strong></li>
                                    <li className="flex items-center gap-3"><div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs shrink-0"><i className="fa-solid fa-check"></i></div> {pricing.features.export}</li>
                                    <li className="flex items-center gap-3"><div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs shrink-0"><i className="fa-solid fa-check"></i></div> {pricing.features.priority}</li>
                                </ul>

                                <button onClick={onBuyAnnualPass} className="w-full py-3 rounded-xl bg-brand-500 text-black font-bold hover:bg-brand-400 transition shadow-lg shadow-brand-500/20 relative z-20 block mt-auto cursor-pointer">
                                    {pricing.ctaAnnual}
                                </button>
                            </div>
                        </div>

                    </div>
                </div >

                <footer className="w-full max-w-7xl mx-auto border-t border-white/5 mt-32 py-12 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center"><i className="fa-solid fa-heart-pulse text-brand-500"></i></div>
                        <span>Pulse Analyzer &copy; {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex gap-6">
                        <button onClick={() => onNavigate('privacy')} className="hover:text-white transition">Privacy</button>
                        <button onClick={() => onNavigate('terms')} className="hover:text-white transition">Terms</button>
                        <button onClick={() => onNavigate('contact')} className="hover:text-white transition">Contact</button>
                    </div>
                </footer>
            </main >

            {/* Export Info Modal (Replaced Image Lightbox) */}
            {
                showExportInfo && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
                        onClick={() => setShowExportInfo(false)}
                    >
                        <div className="glass-panel max-w-2xl w-full rounded-2xl border border-white/10 bg-[#0a0a0a] relative overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>

                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                        <i className="fa-solid fa-file-image text-2xl"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{exportInfo.title}</h3>
                                        <p className="text-sm text-gray-400">{exportInfo.intro}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowExportInfo(false)} className="text-gray-500 hover:text-white transition">
                                    <i className="fa-solid fa-xmark text-xl"></i>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8">

                                {/* Section 1: Session */}
                                <div className="flex gap-4">
                                    <div className="flex-col items-center gap-2 hidden sm:flex">
                                        <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-sm">1</div>
                                        <div className="w-0.5 flex-grow bg-white/10"></div>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-brand-500 mb-2">{exportInfo.session.title}</h4>
                                        <p className="text-sm text-gray-400 mb-3">{exportInfo.session.desc}</p>
                                        <ul className="space-y-2">
                                            {exportInfo.session.items.map((item: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-300 bg-white/5 p-2 rounded-lg">
                                                    <i className="fa-solid fa-check text-green-500 mt-1"></i> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Section 2: Global */}
                                <div className="flex gap-4">
                                    <div className="flex-col items-center gap-2 hidden sm:flex">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-sm">2</div>
                                        <div className="w-0.5 flex-grow bg-white/10"></div>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-blue-500 mb-2">{exportInfo.global.title}</h4>
                                        <p className="text-sm text-gray-400 mb-3">{exportInfo.global.desc}</p>
                                        <ul className="space-y-2">
                                            {exportInfo.global.items.map((item: string, i: number) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-300 bg-white/5 p-2 rounded-lg">
                                                    <i className="fa-solid fa-check text-green-500 mt-1"></i> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Section 3: Why */}
                                <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl border border-white/5">
                                    <h4 className="font-bold text-white mb-1"><i className="fa-solid fa-star text-yellow-500 mr-2"></i>{exportInfo.why.title}</h4>
                                    <p className="text-sm text-gray-400">{exportInfo.why.desc}</p>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/10 bg-[#050505] flex justify-end">
                                <button onClick={() => setShowExportInfo(false)} className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">
                                    {exportInfo.close}
                                </button>
                            </div>

                        </div>
                    </div>
                )
            }

            <style>{`
                @keyframes dash {
                  to { stroke-dashoffset: 0; }
                }
                .perspective-container {
                    perspective: 1200px;
                }
                .report-card-3d {
                    transform-style: preserve-3d;
                    transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    transform: rotateY(0) rotateX(0);
                }
                .group:hover .report-card-3d {
                    transform: rotateY(-12deg) rotateX(8deg) scale(1.05) translateX(10px);
                }
            `}</style>
        </div >
    );
};
