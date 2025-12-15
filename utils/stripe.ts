
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// --- CONFIGURATION STRIPE ---
export const STRIPE_PRICES = {
    // ID du PRIX pour le Pass 24h (LIVE)
    DAY_PASS: import.meta.env.VITE_STRIPE_PRICE_DAY_PASS || "price_1SeZJiHTJAkamQTSVTCaPPI4",
    // ID du PRIX pour l'Expert Annuel (LIVE)
    ANNUAL: import.meta.env.VITE_STRIPE_PRICE_ANNUAL || "price_1SeZKhHTJAkamQTSW7xgovLR"
};

export const createCheckoutSession = async (priceId: string): Promise<string> => {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const user = auth.currentUser;

    if (!user) throw new Error("Vous devez être connecté pour souscrire.");

    console.log("Initialisation session Stripe pour:", priceId);

    // Timeout de sécurité 60s
    const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Délai d'attente dépassé (60s).")), 60000)
    );

    const sessionPromise = new Promise<string>(async (resolve, reject) => {
        try {
            const rawUrl = window.location.href;
            const hostname = window.location.hostname;
            let successUrl = "";
            let cancelUrl = "";

            // DETECTION ROBUSTE ENVIRONNEMENT PREVIEW
            // Les environnements AI Studio, Cloud Run ou Blob ne supportent pas le redirect Stripe (Erreur XML AccessDenied)
            const isPreviewEnvironment =
                rawUrl.startsWith('blob:') ||
                hostname.includes('googleusercontent') ||
                hostname.includes('scf') ||
                hostname.includes('run.app') ||
                hostname.includes('web.app') === false && hostname.includes('firebaseapp') === false && hostname !== 'localhost';

            if (isPreviewEnvironment) {
                console.warn("Environnement Preview/Cloud détecté. Redirection vers Google pour éviter l'erreur XML AccessDenied.");
                // On redirige vers une page publique neutre (Google) car on ne peut pas revenir sur l'URL signée de la preview.
                // L'utilisateur devra fermer l'onglet et revenir sur l'app qui aura reçu le Webhook.
                successUrl = "https://www.google.com";
                cancelUrl = "https://www.google.com";
            } else {
                // Environnement Standard (Production Firebase Hosting / Localhost)
                // On nettoie l'URL de base pour avoir une URL absolue propre
                const cleanUrl = rawUrl.split('?')[0].split('#')[0];

                // Vérification de sécurité pour s'assurer qu'on a bien du HTTP(S)
                if (cleanUrl.startsWith('http')) {
                    const planType = priceId === STRIPE_PRICES.ANNUAL ? 'annual' : 'day_pass';
                    successUrl = `${cleanUrl}#payment_success&plan=${planType}`;
                    cancelUrl = cleanUrl;
                } else {
                    // Fallback ultime
                    successUrl = "https://pulseanalyzer.web.app/#payment_success";
                    cancelUrl = "https://pulseanalyzer.web.app/";
                }
            }

            console.log("URL Succès configurée:", successUrl);

            const sessionPayload = {
                line_items: [
                    {
                        price: priceId,
                        quantity: 1
                    }
                ],
                success_url: successUrl,
                cancel_url: cancelUrl,
                mode: priceId === STRIPE_PRICES.ANNUAL ? 'subscription' : 'payment',
                // Pas de metadata complexes pour éviter les erreurs de validation
            };

            const checkoutSessionRef = await db.collection("customers").doc(user.uid).collection("checkout_sessions").add(sessionPayload);

            console.log("Document créé dans Firestore:", checkoutSessionRef.id);
            console.log("En attente de la réponse de l'extension Stripe...");

            const unsubscribe = db.collection("customers").doc(user.uid).collection("checkout_sessions").doc(checkoutSessionRef.id)
                .onSnapshot((doc) => {
                    const data = doc.data();
                    if (!data) return;

                    if (data.error) {
                        console.error("Erreur renvoyée par Stripe:", data.error.message);
                        unsubscribe();
                        reject(new Error(`Stripe: ${data.error.message}`));
                    }

                    if (data.url) {
                        console.log("URL de paiement reçue:", data.url);
                        unsubscribe();
                        resolve(data.url);
                    }
                }, (error) => {
                    console.error("Erreur écouteur Stripe:", error);
                    reject(error);
                });
        } catch (e: any) {
            console.error("Erreur création document:", e);
            reject(e);
        }
    });

    return Promise.race([sessionPromise, timeoutPromise]);
};

// Fonction helper pour ouvrir le portail client (gestion abonnement)
export const createPortalSession = async (): Promise<void> => {
    alert("Pour gérer l'abonnement en mode test, utilisez le Dashboard Stripe ou contactez le support.");
    return Promise.resolve();
};
