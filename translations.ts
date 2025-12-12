
import React from 'react';
import { Language } from './types';

export const t = (lang: Language) => {
    const dict = {
        fr: {
            landing: {
                title: React.createElement(React.Fragment, null, "Libérez vos ", React.createElement("br", null), React.createElement("span", { className: "text-brand-500" }, "Données Cardiaques")),
                subtitle: "L'outil ultime pour les athlètes et data scientists. Comparez plusieurs moniteurs de fréquence cardiaque avec précision, visualisez les écarts et obtenez des rapports de fiabilité IA instantanément.",
                ctaApp: "Lancer l'App",
                ctaDemo: "Voir la Démo",
                feature1Title: "Multi-Formats",
                feature1Desc: "Importez FIT, GPX, TCX et CSV sans effort. Alignement automatique inclus.",
                feature2Title: "Analyse par IA",
                feature2Desc: "Utilisez notre moteur propriétaire pour générer des rapports de fiabilité détaillés et des comparaisons d'appareils automatiquement.",
                featureAutoSyncTitle: "Synchro Automatique",
                featureAutoSyncDesc: "Fini le calage manuel. Notre algorithme aligne parfaitement vos courbes, même si les départs sont décalés. Importez, c'est calé.",
                featureChatTitle: "Assistant Chat IA",
                featureChatDesc: "Posez des questions à votre analyste personnel : 'Pourquoi ma montre décroche à la 10ème minute ?' ou 'Analyse ce pic de fréquence'.",
                featureAlgoTitle: "Algorithme Propriétaire",
                featureAlgoDesc: "Un score de fiabilité ultra-précis calculé via une fusion de Corrélation, MAE et Stabilité. L'IA valide ensuite le verdict.",
                feature3Title: "Métriques Avancées",
                feature3Desc: "Graphiques Bland-Altman, RMSE, MAE et coefficients de corrélation calculés en temps réel.",
                exportFeatureTitle: "Exports Pro & Partageables",
                exportFeatureDesc: "Générez un rapport complet (JPG + PDF) comprenant : Vue d'ensemble, Duels 1vs1 et Verdict de l'Expert. Parfait pour partager sur Instagram ou avec vos athlètes.",
                viewExample: "Comprendre les Exports",
                privacyTitle: "Confidentialité Totale",
                privacyDesc: "Vos données sont traitées localement dans votre navigateur.",
                privacyTag: "CHIFFRÉ",
                howItWorks: "Comment ça marche ?",
                footer: "Pulse Analyzer. Tous droits réservés.",
                login: "Connexion"
            },
            pricing: {
                title: "Nos Offres",
                subtitle: "Choisissez le plan adapté à vos besoins d'analyse.",
                mostPopular: "Le Plus Populaire",
                freePass: "Découverte",
                freePassPrice: "Gratuit",
                freePassDesc: "Pour tester l'outil sur une seule session.",
                dayPass: "Pass 24h",
                dayPassPrice: "4.99€",
                dayPassDesc: "Accès illimité à toutes les fonctionnalités pendant 24h.",
                annualPass: "Expert Annuel",
                annualPassPrice: "19.99€",
                annualPassDesc: "Pour les coachs, testeurs et passionnés de data.",
                year: "/an",
                features: {
                    sessions1: "1 Session Unique",
                    sessions5: "5 Sessions / 24h",
                    sessionsUnlim: "Sessions Illimitées",
                    filesLimited: "Max 3 fichiers par session",
                    filesUnlim: "Fichiers par session illimités",
                    visualization: "Visualisation (Graphiques)",
                    basicStats: "Statistiques de base",
                    advancedStats: "Statistiques Avancées (Dashboard)",
                    aiAnalysis: "Analyse IA (Sessions & Global)",
                    aiChat: "Assistant Chat IA Illimité",
                    sessionExport: "Exports JPG (Sessions)",
                    export: "Exports (JPG + PDF Global)",
                    priority: "Support Prioritaire"
                },
                ctaFree: "Commencer Gratuitement",
                ctaDay: "Prendre le Pass 24h",
                ctaAnnual: "S'abonner à l'Année"
            },
            help: {
                title: "Comprendre Pulse Analyzer",
                subtitle: "Ce n'est pas un tracker d'entraînement classique. C'est un laboratoire de comparaison.",
                conceptTitle: "Le Concept : Comparaison Intra-Session",
                conceptDesc: "Contrairement à Strava ou Garmin Connect qui suivent votre évolution au fil des mois, Pulse Analyzer est conçu pour comparer la précision de plusieurs appareils enregistrant LA MÊME séance simultanément.",
                howTitle: "Comment l'utiliser ?",
                step1: "Enregistrez une activité avec plusieurs appareils (ex: une ceinture thoracique H10 + une montre Garmin + une Apple Watch).",
                step2: "Exportez les fichiers (FIT, GPX, TCX) de chaque plateforme.",
                step3: "Importez-les dans une session Pulse Analyzer.",
                step4: "Définissez l'appareil le plus fiable (souvent la ceinture) comme 'Référence' (étoile).",
                step5: "L'IA analyse les écarts, les délais et la fiabilité de chaque capteur par rapport à la référence.",
                back: "Retour"
            },
            nav: {
                statusLoading: "Chargement...",
                statusReady: "Prêt",
                statusProcessing: "Traitement...",
                loadingSessions: "Chargement...",
                cloudSync: "Cloud Sync",
                login: "Connexion",
                register: "Créer un compte",
                myAccount: "Mon Compte",
                dashboard: "Tableau de Bord"
            },
            sidebar: {
                newSession: "Nouvelle Session",
                sessionsTitle: "Sessions",
                local: "LOCAL",
                cloud: "CLOUD",
                files: "fichier(s)",
                yourPlan: "Votre Plan"
            },
            tabs: {
                session: "Analyse de Session",
                dashboard: "Tableau de Bord Global"
            },
            session: {
                addFiles: "Fichiers",
                report: "Rapport",
                smoothing: "Lissage",
                resetZoom: "Reset Zoom",
                emptyTitle: "Ajouter vos fichiers",
                emptyDesc: "Importez vos fichiers FIT, GPX ou TCX pour commencer l'analyse.",
                btnSelectFiles: "Sélectionner des Fichiers",
                aiTitle: "Analyse de Fiabilité (IA)",
                aiAvailableTitle: "Analyse IA",
                aiAvailableDesc: "Générez un rapport détaillé sur la fiabilité.",
                btnRunAnalysis: "Lancer l'Analyse",
                waitingTitle: "En attente de données",
                waitingDesc: "Analysez une nouvelle activité pour commencer.",
                missingRefTitle: "Appareil de référence manquant",
                missingRefDesc: "Veuillez sélectionner l'appareil de référence (étoile) dans le tableau ci-dessous pour activer l'analyse."
            },
            table: {
                vis: "Vis.",
                device: "Appareil",
                avg: "Moy",
                max: "Max",
                min: "Min",
                offset: "Décalage (s)",
                actions: "Actions"
            },
            dashboard: {
                title: "Rapport de Fiabilité Global",
                btnRegenerate: "Régénérer Rapport (IA)",
                aiTitle: "Rapport Global (IA)",
                globalRanking: "Classement Global",
                noDataTitle: "Pas encore de données",
                noDataDesc: "Analysez des sessions pour alimenter ce tableau de bord.",
                score: "Score",
                corr: "Corr",
                bias: "Biais",
                mae: "MAE",
                rmse: "RMSE",
                stability: "Dropouts",
                count: "Sessions",
                lockedTitle: "Tableau de Bord PRO",
                lockedDesc: "Comparez la fiabilité de vos appareils sur l'ensemble de vos sessions (Course vs Musculation, etc.) et obtenez un score de confiance global."
            },
            account: {
                title: "Mon Espace",
                currentPlan: "Plan Actuel",
                validUntil: "Valable jusqu'au",
                renewsOn: "Renouvellement le",
                manageSub: "Gérer l'abonnement",
                cancelSub: "Résilier / Factures",
                upgradeToAnnual: "Devenir Expert (Annuel)",
                upgradeToDay: "Pass 24h (4.99€)",
                status: {
                    free: "Découverte",
                    dayPass: "Pass 24h",
                    annual: "Expert Annuel"
                },
                featuresList: "Fonctionnalités :",
                feat: {
                    sessions: "Sessions simultanées",
                    ai: "Analyse Intelligence Artificielle",
                    aiChat: "Assistant Chat IA",
                    export: "Exports JPG HD",
                    dashboard: "Tableau de Bord Global"
                },
                noActivePlan: "Mode Découverte limité.",
                dayPassActive: "Pass 24h actif. Profitez de l'analyse illimitée.",
                annualActive: "Abonnement Expert actif. Merci de votre soutien !",
                loadingPortal: "Ouverture du portail Stripe..."
            },
            modals: {
                authLogin: "Connexion",
                authRegister: "Inscription",
                email: "Email",
                password: "Mot de passe",
                btnValidate: "Valider",
                noAccount: "Pas de compte ? Créer un compte",
                hasAccount: "Déjà un compte ? Se connecter",
                newSession: "Nouvelle Session",
                editSession: "Modifier Session",
                name: "Nom",
                type: "Type",
                cancel: "Annuler",
                save: "Enregistrer",
                deleteTitle: "Supprimer la session ?",
                deleteDesc: "Cette action est irréversible.",
                deleteBtn: "Supprimer",
                reportTitle: "Rapport Complet",
                close: "Fermer",
                saveImage: "Clic droit > Enregistrer l'image sous...",
                namingHint: "Astuce : Nommez vos fichiers 'NomDispositif_date.fit' pour que nous puissions identifier l'appareil automatiquement.",
                upgradeTitle: "Fonctionnalité PRO",
                upgradeDesc: "Cette fonctionnalité (IA, Export, Dashboard ou + de 1 session) nécessite un Pass.",
                upgradeBtn: "Voir les offres",
                simulatePay: "Simuler Paiement (Dev)",
                paymentReady: "Paiement Prêt",
                paymentReadyDesc: "Votre lien de paiement sécurisé a été généré.",
                payNow: "Payer maintenant",
                paymentSuccessTitle: "Paiement Réussi !",
                paymentSuccessDesc: "Votre compte a été mis à niveau avec succès. Profitez de toutes les fonctionnalités.",
                paymentSuccessBtn: "C'est parti !",
                finishPurchaseTitle: "Finaliser l'achat",
                finishPurchaseDesc: "Vous êtes connecté. Cliquez ci-dessous pour procéder au paiement sécurisé.",
                finishPurchaseBtn: "Payer et activer",
                popupBlocked: "Le navigateur a bloqué la fenêtre de paiement. Veuillez autoriser les popups."
            },
            activities: {
                course: "Course à pied",
                velo: "Vélo",
                musculation: "Musculation",
                natation: "Natation",
                autre: "Autre"
            },
            export: {
                reportTitle: "Analysis Report",
                date: "Date",
                type: "Type",
                statsTitle: "Reliability Statistics",
                globalChart: "Overview",
                infoModal: {
                    title: "Structure des Rapports JPG",
                    intro: "Pulse Analyzer génère des images haute résolution prêtes à être partagées. Voici leur structure :",
                    session: {
                        title: "1. Rapport de Session",
                        desc: "Généré depuis une session spécifique. Il contient :",
                        items: [
                            "En-tête : Nom, date et type d'activité.",
                            "Tableau : Scores de confiance et métriques (MAE, RMSE).",
                            "Charts: Overview + 'Duels' (Ref vs Others).",
                            "AI Verdict: Automatically generated text analysis."
                        ]
                    },
                    global: {
                        title: "2. Tableau de Bord Global",
                        desc: "Généré depuis l'onglet 'Tableau de Bord'. Il résume :",
                        items: [
                            "Classement général des appareils par 'Score'.",
                            "Performance détaillée par type d'activité.",
                            "Synthèse IA des tendances globales."
                        ]
                    },
                    why: {
                        title: "Pourquoi exporter ?",
                        desc: "Idéal pour envoyer un bilan technique à un coach, prouver la fiabilité d'un capteur sur les réseaux sociaux, ou archiver vos tests matériel."
                    },
                    close: "Fermer"
                }
            }
        },
        en: {
            landing: {
                title: React.createElement(React.Fragment, null, "Unleash your ", React.createElement("br", null), React.createElement("span", { className: "text-brand-500" }, "Heart Data")),
                subtitle: "The ultimate tool for athletes and data scientists. Compare multiple heart rate monitors with precision, visualize offsets, and get instant AI reliability reports.",
                ctaApp: "Launch App",
                ctaDemo: "View Demo",
                feature1Title: "Multi-Format",
                feature1Desc: "Import FIT, GPX, TCX, and CSV effortlessly. Automatic alignment included.",
                feature2Title: "AI Analysis",
                feature2Desc: "Use our proprietary engine to generate detailed reliability reports and device comparisons automatically.",
                featureAutoSyncTitle: "Auto-Synchronization",
                featureAutoSyncDesc: "No more manual adjustments. Our algorithm perfectly aligns your curves, even if start times differ. Just import, and it's synced.",
                featureChatTitle: "AI Chat Assistant",
                featureChatDesc: "Ask your personal analyst anything: 'Why did my watch fail at minute 10?' or 'Analyze this HR spike'. AI explores your current session data.",
                featureAlgoTitle: "Proprietary Algorithm",
                featureAlgoDesc: "An ultra-precise reliability score calculated via a fusion of Correlation, MAE, and Stability metrics. AI then validates the verdict.",
                feature3Title: "Advanced Metrics",
                feature3Desc: "Bland-Altman plots, RMSE, MAE, and correlation coefficients calculated in real-time.",
                exportFeatureTitle: "Pro & Shareable Exports",
                exportFeatureDesc: "Generate a comprehensive report (JPG + PDF) including: Overview, 1v1 Duels, and AI Expert Verdict. Ready for Instagram or your clients.",
                viewExample: "Understand Exports",
                privacyTitle: "Privacy First",
                privacyDesc: "Your data is processed locally in your browser.",
                privacyTag: "ENCRYPTED",
                howItWorks: "How it works?",
                footer: "Pulse Analyzer. All rights reserved.",
                login: "Login"
            },
            pricing: {
                title: "Pricing Plans",
                subtitle: "Choose the plan that fits your analysis needs.",
                mostPopular: "Most Popular",
                freePass: "Discovery",
                freePassPrice: "Free",
                freePassDesc: "Test the tool with a single session.",
                dayPass: "24h Pass",
                dayPassPrice: "€4.99",
                dayPassDesc: "Unlimited access to all features for 24h.",
                annualPass: "Annual Expert",
                annualPassPrice: "€19.99",
                annualPassDesc: "For coaches, reviewers, and data geeks.",
                year: "/year",
                features: {
                    sessions1: "1 Single Session",
                    sessions5: "5 Sessions / 24h",
                    sessionsUnlim: "Unlimited Sessions",
                    filesLimited: "Max 3 files per session",
                    filesUnlim: "Unlimited files per session",
                    visualization: "Visualization (Charts)",
                    basicStats: "Basic Statistics",
                    advancedStats: "Advanced Stats (Dashboard)",
                    aiAnalysis: "AI Analysis (Sessions & Global)",
                    aiChat: "Unlimited AI Chat Assistant",
                    sessionExport: "JPG Exports (Sessions)",
                    export: "Exports (JPG + Global PDF)",
                    priority: "Priority Support"
                },
                ctaFree: "Start for Free",
                ctaDay: "Get 24h Pass",
                ctaAnnual: "Subscribe Annually"
            },
            help: {
                title: "Understanding Pulse Analyzer",
                subtitle: "This isn't a standard fitness tracker. It's a comparison lab.",
                conceptTitle: "The Concept: Intra-Session Comparison",
                conceptDesc: "Unlike Strava or Garmin Connect which track your progress over months, Pulse Analyzer is designed to compare the accuracy of multiple devices recording THE SAME session simultaneously.",
                howTitle: "How to use it?",
                step1: "Record an activity with multiple devices (e.g., H10 chest strap + Garmin watch + Apple Watch).",
                step2: "Export files (FIT, GPX, TCX) from each platform.",
                step3: "Import them into a Pulse Analyzer session.",
                step4: "Set the most reliable device (usually the chest strap) as 'Reference' (star icon).",
                step5: "AI analyzes offsets, delays, and sensor reliability against the reference.",
                back: "Back"
            },
            nav: {
                statusLoading: "Loading...",
                statusReady: "Ready",
                statusProcessing: "Processing...",
                loadingSessions: "Loading sessions...",
                cloudSync: "Cloud Sync",
                login: "Login",
                register: "Register",
                myAccount: "My Account",
                dashboard: "Dashboard"
            },
            sidebar: {
                newSession: "New Session",
                sessionsTitle: "Sessions",
                local: "LOCAL",
                cloud: "CLOUD",
                files: "file(s)",
                yourPlan: "Your Plan"
            },
            tabs: {
                session: "Session Analysis",
                dashboard: "Global Dashboard"
            },
            session: {
                addFiles: "Files",
                report: "Report",
                smoothing: "Smoothing",
                resetZoom: "Reset Zoom",
                emptyTitle: "Add your files",
                emptyDesc: "Import FIT, GPX, or TCX files to start analysis.",
                btnSelectFiles: "Select Files",
                aiTitle: "Reliability Analysis (AI)",
                aiAvailableTitle: "AI Analysis",
                aiAvailableDesc: "Generate a detailed report on sensor reliability.",
                btnRunAnalysis: "Run Analysis",
                waitingTitle: "Waiting for data",
                waitingDesc: "Analyze a new activity to get started.",
                missingRefTitle: "Reference device missing",
                missingRefDesc: "Please select a reference device (star icon) in the table below to enable analysis."
            },
            table: {
                vis: "Vis.",
                device: "Device",
                avg: "Avg",
                max: "Max",
                min: "Min",
                offset: "Offset (s)",
                actions: "Actions"
            },
            dashboard: {
                title: "Global Reliability Report",
                btnRegenerate: "Regenerate Report (AI)",
                aiTitle: "Global Report (AI)",
                globalRanking: "Global Ranking",
                noDataTitle: "No data yet",
                noDataDesc: "Analyze sessions to populate this dashboard.",
                score: "Score",
                corr: "Corr",
                bias: "Bias",
                mae: "MAE",
                rmse: "RMSE",
                stability: "Stability",
                count: "Sessions",
                lockedTitle: "PRO Dashboard",
                lockedDesc: "Compare device reliability across all your sessions (Running vs Lifting, etc.) and get a global trust score."
            },
            account: {
                title: "My Hub",
                currentPlan: "Current Plan",
                validUntil: "Valid until",
                renewsOn: "Renews on",
                manageSub: "Manage Subscription",
                cancelSub: "Cancel / Invoices",
                upgradeToAnnual: "Go Expert (Annual)",
                upgradeToDay: "24h Pass (€4.99)",
                status: {
                    free: "Discovery",
                    dayPass: "24h Pass",
                    annual: "Annual Expert"
                },
                featuresList: "Features:",
                feat: {
                    sessions: "Concurrent Sessions",
                    ai: "AI Analysis",
                    aiChat: "AI Chat Assistant",
                    export: "HD JPG Exports",
                    dashboard: "Global Dashboard"
                },
                noActivePlan: "Discovery mode. Limited features.",
                dayPassActive: "24h Pass active. Enjoy unlimited analysis.",
                annualActive: "Annual subscription active. Thanks for your support!",
                loadingPortal: "Opening Stripe Portal..."
            },
            modals: {
                authLogin: "Login",
                authRegister: "Register",
                email: "Email",
                password: "Password",
                btnValidate: "Submit",
                noAccount: "No account? Create one",
                hasAccount: "Already have an account? Login",
                newSession: "New Session",
                editSession: "Edit Session",
                name: "Name",
                type: "Type",
                cancel: "Cancel",
                save: "Save",
                deleteTitle: "Delete Session?",
                deleteDesc: "This action is irreversible.",
                deleteBtn: "Delete",
                reportTitle: "Full Report",
                close: "Close",
                saveImage: "Right click > Save image as...",
                namingHint: "Tip: Name your files 'DeviceName_date.fit' so we can identify the device automatically.",
                upgradeTitle: "PRO Feature",
                upgradeDesc: "This feature (AI, Export, Dashboard or >1 session) requires a Pass.",
                upgradeBtn: "View Plans",
                simulatePay: "Simulate Payment (Dev)",
                paymentReady: "Payment Ready",
                paymentReadyDesc: "Your secure payment link has been generated.",
                payNow: "Pay Now",
                paymentSuccessTitle: "Payment Successful!",
                paymentSuccessDesc: "Your account has been upgraded successfully. Enjoy all features.",
                paymentSuccessBtn: "Let's go!",
                finishPurchaseTitle: "Complete Purchase",
                finishPurchaseDesc: "You are logged in. Click below to proceed to secure payment.",
                finishPurchaseBtn: "Pay & Activate",
                popupBlocked: "The browser blocked the payment window. Please allow popups."
            },
            activities: {
                course: "Running",
                velo: "Cycling",
                musculation: "Weightlifting",
                natation: "Swimming",
                autre: "Other"
            },
            export: {
                reportTitle: "Analysis Report",
                date: "Date",
                type: "Type",
                statsTitle: "Reliability Statistics",
                globalChart: "Overview",
                infoModal: {
                    title: "JPG Reports Structure",
                    intro: "Pulse Analyzer generates high-res images ready for sharing. Here is the structure:",
                    session: {
                        title: "1. Session Report",
                        desc: "Generated from a specific session. Contains:",
                        items: [
                            "Header: Name, date, and activity type.",
                            "Table: Trust scores and metrics (MAE, RMSE).",
                            "Charts: Overview + 'Duels' (Ref vs Others).",
                            "AI Verdict: Automatically generated text analysis."
                        ]
                    },
                    global: {
                        title: "2. Global Dashboard",
                        desc: "Generated from the 'Dashboard' tab. Summarizes:",
                        items: [
                            "Overall device ranking by 'Score'.",
                            "Detailed performance by activity type.",
                            "AI Summary of global trends."
                        ]
                    },
                    why: {
                        title: "Why export?",
                        desc: "Perfect for sending a technical review to a coach, proving sensor reliability on social media, or archiving your gear tests."
                    },
                    close: "Close"
                }
            }
        }
    };
    return dict[lang];
};
