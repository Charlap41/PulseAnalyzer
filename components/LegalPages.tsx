import React from 'react';
import { ViewState } from '../types';

interface LegalPageProps {
    onBack: () => void;
    view: ViewState;
}

export const LegalPage: React.FC<LegalPageProps> = ({ onBack, view }) => {
    const renderContent = () => {
        switch (view) {
            case 'privacy':
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Politique de Confidentialité</h1>
                        <p className="text-gray-600 dark:text-gray-400">Dernière mise à jour : 03 Décembre 2025</p>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">1. Confidentialité des Données ("Privacy First")</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Pulse Analyzer est conçu avec une approche "Privacy First".
                                <strong> Vos fichiers de données (FIT, GPX, TCX, CSV) sont traités exclusivement en local dans votre navigateur.</strong>
                                Ils ne sont jamais envoyés sur nos serveurs pour analyse.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">2. Données Collectées</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Nous collectons uniquement les données nécessaires au fonctionnement de votre compte et des paiements :
                            </p>
                            <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-1">
                                <li>Adresse email (pour l'authentification).</li>
                                <li>Informations de paiement (traitées de manière sécurisée par Stripe).</li>
                                <li>Métadonnées de session (nom, date, type d'activité) si vous utilisez la synchronisation Cloud (optionnelle).</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">3. Cookies</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Nous utilisons uniquement des cookies techniques essentiels pour maintenir votre session active et mémoriser vos préférences (langue, thème).
                            </p>
                        </section>
                    </div>
                );
            case 'terms':
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conditions Générales d'Utilisation</h1>
                        <p className="text-gray-600 dark:text-gray-400">Dernière mise à jour : 03 Décembre 2025</p>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">1. Acceptation</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                En utilisant Pulse Analyzer, vous acceptez ces conditions. L'outil est fourni "tel quel" pour l'analyse de données sportives.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">2. Abonnements</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                <strong>Pass 24h :</strong> Donne accès à toutes les fonctionnalités pendant 24 heures consécutives à partir du moment de l'achat. Non renouvelable automatiquement.<br />
                                <strong>Abonnement Annuel :</strong> Donne un accès illimité pendant 1 an. Renouvellement automatique sauf résiliation.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">3. Responsabilité</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Pulse Analyzer est un outil d'analyse et ne constitue pas un avis médical. Les données de fréquence cardiaque peuvent contenir des erreurs inhérentes aux capteurs utilisés.
                            </p>
                        </section>
                    </div>
                );
            case 'contact':
                return (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contactez-nous</h1>
                        <p className="text-gray-600 dark:text-gray-400">Une question ? Un bug à signaler ?</p>

                        <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/10">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Support Technique</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Pour toute demande d'assistance, veuillez nous écrire à :
                            </p>
                            <a href="mailto:support@pulseanalyzer.com" className="text-brand-500 hover:underline text-lg font-bold">support@pulseanalyzer.com</a>
                            <p className="text-sm text-gray-500 mt-4">
                                Nous nous efforçons de répondre sous 24h ouvrées.
                            </p>
                        </div>

                        <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/10">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Réseaux Sociaux</h3>
                            <div className="flex gap-4">
                                <a href="#" className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-brand-500 hover:text-black transition">
                                    <i className="fa-brands fa-twitter"></i>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-brand-500 hover:text-black transition">
                                    <i className="fa-brands fa-instagram"></i>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-brand-500 hover:text-black transition">
                                    <i className="fa-brands fa-linkedin"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col pt-24 pb-12 px-4">
            <div className="max-w-3xl mx-auto w-full">
                <button
                    onClick={onBack}
                    className="mb-8 flex items-center gap-2 text-gray-500 hover:text-brand-500 transition font-bold text-sm"
                >
                    <i className="fa-solid fa-arrow-left"></i> Retour à l'accueil
                </button>

                <div className="bg-white dark:bg-[#121212] p-8 md:p-12 rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl animate-fade-in">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
