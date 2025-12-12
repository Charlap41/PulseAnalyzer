
import { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

export const useAuth = () => {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: firebase.Unsubscribe | undefined;
        try {
            if (firebase.apps.length) {
                unsubscribe = firebase.auth().onAuthStateChanged((u) => {
                    setUser(u);
                    setLoading(false);
                }, (error) => {
                    console.error("Auth Error:", error);
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Firebase not initialized or Auth error:", error);
            setLoading(false);
        }
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        return firebase.auth().signInWithEmailAndPassword(email, password);
    };

    const register = async (email, password) => {
        return firebase.auth().createUserWithEmailAndPassword(email, password);
    };

    const logout = async () => {
        return firebase.auth().signOut();
    };

    return { user, loading, login, register, logout };
};
