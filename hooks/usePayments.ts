
import { useState, useEffect } from 'react';
import { STRIPE_PRICES } from '../utils/stripe';
import firebase from 'firebase/compat/app';

export type SubscriptionPlan = 'free' | 'annual' | '24h';

export const usePayments = (user: firebase.User | null) => {
    const [plan, setPlan] = useState<SubscriptionPlan>('free');
    const [expirationDate, setExpirationDate] = useState<number | null>(null);

    // Internal resolution states
    const [hasAnnual, setHasAnnual] = useState(false);
    const [annualExpiry, setAnnualExpiry] = useState<number | null>(null);
    const [hasDayPass, setHasDayPass] = useState(false);
    const [dayPassExpiry, setDayPassExpiry] = useState<number | null>(null);

    // Listen for Annual Subscription
    useEffect(() => {
        if (!user) {
            setHasAnnual(false);
            return;
        }

        if (!firebase.apps.length) {
            console.warn("usePayments: Firebase not initialized");
            return;
        }

        console.log("usePayments: Listening for subscriptions for user:", user.uid);

        const db = firebase.firestore();
        const unsubscribe = db.collection("customers").doc(user.uid).collection("subscriptions")
            .onSnapshot(snapshot => {
                console.log("usePayments: Subscriptions snapshot received, docs:", snapshot.size);
                let active = false;
                let expiry = null;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log("usePayments: Subscription doc:", doc.id, "status:", data.status);
                    if (data.status === 'active' || data.status === 'trialing') {
                        active = true;
                        if (data.current_period_end) {
                            expiry = data.current_period_end.seconds * 1000;
                        }
                    }
                });
                console.log("usePayments: hasAnnual =", active);
                setHasAnnual(active);
                setAnnualExpiry(expiry);
            }, error => {
                console.error("usePayments: Subscription listener error:", error);
            });

        return () => unsubscribe();
    }, [user]);

    // Listen for Day Pass
    useEffect(() => {
        if (!user) {
            setHasDayPass(false);
            return;
        }

        if (!firebase.apps.length) {
            console.warn("usePayments: Firebase not initialized for day pass");
            return;
        }

        console.log("usePayments: Listening for payments for user:", user.uid);

        const db = firebase.firestore();
        const unsubscribe = db.collection("customers").doc(user.uid).collection("payments")
            .onSnapshot(snapshot => {
                console.log("usePayments: Payments snapshot received, docs:", snapshot.size);
                const now = Date.now() / 1000;
                let active = false;
                let expiry = null;

                // Filter and sort manually
                const validDocs = snapshot.docs
                    .map(d => d.data())
                    .filter((d: any) => d.status === 'succeeded')
                    .sort((a: any, b: any) => (b.created?.seconds || 0) - (a.created?.seconds || 0));

                console.log("usePayments: Valid succeeded payments:", validDocs.length);

                for (const d of validDocs) {
                    const created = d.created?.seconds || d.created;
                    console.log("usePayments: Payment created:", created, "now:", now, "diff:", now - created);
                    if (created && (now - created) < 86400) { // 24h
                        active = true;
                        expiry = (created + 86400) * 1000;
                        break;
                    }
                }
                console.log("usePayments: hasDayPass =", active);
                setHasDayPass(active);
                setDayPassExpiry(expiry);
            }, error => {
                console.error("usePayments: Payments listener error:", error);
            });

        return () => unsubscribe();
    }, [user]);

    // Resolve Plan
    useEffect(() => {
        if (hasAnnual) {
            setPlan('annual');
            setExpirationDate(annualExpiry);
        } else if (hasDayPass) {
            setPlan('24h');
            setExpirationDate(dayPassExpiry);
        } else {
            setPlan('free');
            setExpirationDate(null);
        }
    }, [hasAnnual, hasDayPass, annualExpiry, dayPassExpiry]);

    return { plan, expirationDate };
};
