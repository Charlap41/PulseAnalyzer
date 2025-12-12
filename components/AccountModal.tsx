
import React from 'react';
import { Language, SubscriptionPlan } from '../types';
import { t } from '../translations';
import firebase from 'firebase/compat/app';

interface AccountModalProps {
    user: firebase.User;
    plan: SubscriptionPlan;
    expirationDate: number | null;
    onClose: () => void;
    onUpgradeAnnual: () => void;
    onUpgradeDay: () => void;
    onManageSubscription: () => void;
    onDebugCheck: () => void;
    lang: Language;
}

export const AccountModal: React.FC<AccountModalProps> = ({
    user,
    plan,
    expirationDate,
    onClose,
    onUpgradeAnnual,
    onUpgradeDay,
    onManageSubscription,
    onDebugCheck,
    lang
}) => {
    const text = t(lang).account;

    const formatDate = (ts: number | null) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const FeatureItem = ({ label, included }: { label: string, included: boolean }) => (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
            <span className={`text-sm ${included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>{label}</span>
            {included ? (
                <i className="fa-solid fa-check text-green-500"></i>
            ) : (
                <i className="fa-solid fa-lock text-gray-300 dark:text-gray-700"></i>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="glass-panel w-full max-w-md rounded-2xl border border-white/10 shadow-2xl z-10 bg-white dark:bg-[#121212] animate-fade-in relative overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition w-8 h-8 rounded-full hover:bg-black/10 flex items-center justify-center">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                            <i className="fa-solid fa-id-card text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{text.title}</h3>
                            <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Current Plan Badge */}
                    <div className={`p-5 rounded-xl border mb-6 relative overflow-hidden ${plan === 'annual' ? 'bg-brand-500/10 border-brand-500/30' :
                        plan === '24h' ? 'bg-blue-500/10 border-blue-500/30' :
                            'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'
                        }`}>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{text.currentPlan}</span>
                                {plan === 'annual' && <span className="bg-brand-500 text-black text-[10px] font-bold px-2 py-0.5 rounded">PRO</span>}
                                {plan === '24h' && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">24H</span>}
                            </div>
                            <h4 className={`text-2xl font-bold ${plan === 'annual' ? 'text-brand-600 dark:text-brand-500' :
                                plan === '24h' ? 'text-blue-600 dark:text-blue-500' :
                                    'text-gray-700 dark:text-gray-300'
                                }`}>
                                {plan === 'annual' ? text.status.annual :
                                    plan === '24h' ? text.status.dayPass :
                                        text.status.free}
                            </h4>
                            {plan !== 'free' && expirationDate && (
                                <p className="text-xs opacity-70 mt-1">
                                    {plan === 'annual' ? text.renewsOn : text.validUntil}: {formatDate(expirationDate)}
                                </p>
                            )}
                        </div>
                        {plan === 'annual' && <div className="absolute -right-4 -bottom-4 text-9xl text-brand-500/10 rotate-12"><i className="fa-solid fa-crown"></i></div>}
                    </div>

                    {/* Features Comparison */}
                    <div className="mb-6">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{text.featuresList}</h5>
                        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                            <FeatureItem label={text.feat.sessions} included={true} />
                            {/* Specific override for sessions label in free tier */}
                            {plan === 'free' && <p className="text-[10px] text-orange-500 text-right font-bold -mt-2 mb-2">Max: 1</p>}

                            <FeatureItem label={text.feat.ai} included={plan === 'annual'} />
                            <FeatureItem label={text.feat.aiChat} included={plan === 'annual'} />
                            <FeatureItem label={text.feat.export} included={plan !== 'free'} />
                            <FeatureItem label={text.feat.dashboard} included={plan === 'annual'} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        {plan === 'annual' ? (
                            <button
                                onClick={onManageSubscription}
                                className="w-full py-4 text-sm font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-gear"></i> {text.cancelSub}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onUpgradeAnnual}
                                    className="w-full py-4 text-sm font-bold bg-brand-500 text-black rounded-xl hover:bg-brand-400 transition shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 group"
                                >
                                    <span>{text.upgradeToAnnual}</span>
                                    <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                </button>
                                {plan === 'free' && (
                                    <button
                                        onClick={onUpgradeDay}
                                        className="w-full py-3 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-brand-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                                    >
                                        {text.upgradeToDay}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
