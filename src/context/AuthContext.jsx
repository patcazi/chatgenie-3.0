import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, onDisconnect } from 'firebase/database';
import { auth, db, rtdb } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

const logUserOnline = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    displayName: user.displayName || user.email,
    isOnline: true,
    lastActive: serverTimestamp(),
  }, { merge: true });

  // Set up disconnect handler in Realtime Database
  const userStatusRef = ref(rtdb, `status/${user.uid}`);
  onDisconnect(userStatusRef).remove().then(() => {
    // When disconnect triggers, update Firestore
    const userDocRef = doc(db, 'users', user.uid);
    updateDoc(userDocRef, {
      isOnline: false,
      lastActive: serverTimestamp()
    });
  });
};

const logUserOffline = async (userId) => {
  if (!userId) return;
  
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    isOnline: false,
    lastActive: serverTimestamp()
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register function with name
  const register = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update the user's profile with their name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      // Set user as online
      await logUserOnline(userCredential.user);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Set user as online after successful login
      await logUserOnline(userCredential.user);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Set user as offline before signing out
      if (user) {
        await logUserOffline(user.uid);
      }
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      // Clean up by setting user offline if they were logged in
      if (user) {
        logUserOffline(user.uid);
      }
    };
  }, []);

  const value = {
    user,
    loading,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 