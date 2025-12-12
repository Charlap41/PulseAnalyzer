
import { useState, useEffect } from 'react';
import { Session } from '../types';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export const useSessions = (user: firebase.User | null, isDemoMode: boolean) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        if (isDemoMode) return; // Demo mode handles its own data loading

        const load = async () => {
            setLoading(true);
            let loaded: Session[] = [];

            if (!user) {
                // Local Storage
                const local = localStorage.getItem('pulseAnalyzerSessions');
                if (local) loaded = JSON.parse(local);
            } else {
                // Firestore
                try {
                    if (firebase.apps.length) {
                        const db = firebase.firestore();
                        const snap = await db.collection("users").doc(user.uid).collection("sessions").get();
                        snap.forEach(doc => loaded.push(doc.data() as Session));
                    }
                } catch (e) {
                    console.error("Error loading sessions", e);
                }
            }

            // Sort
            loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setSessions(loaded);

            // Restore active session
            const lastId = localStorage.getItem('pulseAnalyzerLastSession');
            if (lastId && loaded.find(s => s.id === lastId)) {
                setActiveSessionId(lastId);
            } else if (loaded.length > 0) {
                setActiveSessionId(loaded[0].id);
            }
            setLoading(false);
        };

        load();
    }, [user, isDemoMode]);

    // Save
    const saveSession = async (session: Session) => {
        if (isDemoMode) return;

        const newSessions = [...sessions];
        const index = newSessions.findIndex(s => s.id === session.id);
        if (index >= 0) newSessions[index] = session;
        else newSessions.unshift(session);

        // Sort
        newSessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setSessions(newSessions);

        if (!user) {
            localStorage.setItem('pulseAnalyzerSessions', JSON.stringify(newSessions));
        } else {
            const db = firebase.firestore();
            await db.collection("users").doc(user.uid).collection("sessions").doc(session.id).set(session);
        }
    };

    // Delete
    const deleteSession = async (id: string) => {
        if (isDemoMode) return;

        const newSessions = sessions.filter(s => s.id !== id);
        setSessions(newSessions);

        if (!user) {
            localStorage.setItem('pulseAnalyzerSessions', JSON.stringify(newSessions));
        } else {
            const db = firebase.firestore();
            await db.collection("users").doc(user.uid).collection("sessions").doc(id).delete();
        }

        if (activeSessionId === id) setActiveSessionId(null);
    };

    return { sessions, setSessions, loading, activeSessionId, setActiveSessionId, saveSession, deleteSession };
};
