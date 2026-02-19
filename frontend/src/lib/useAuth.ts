import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export interface AppUser extends User {
  role?: string;
  company_id?: string;
  name?: string;
  photo_url?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user data from Firestore
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            console.log("Found user profile:", userDoc.data());
            const userData = userDoc.data();
            // Mutate the object to preserve prototype methods like getIdToken()
            const appUser = firebaseUser as AppUser;
            appUser.role = userData.role || "employee";
            appUser.company_id = userData.company_id;
            appUser.name = userData.name;
            appUser.photo_url = userData.photo_url;

            setUser(appUser);
          } else {
            console.warn("No user profile found in Firestore for UID:", firebaseUser.uid);
            // Basic user without profile
            setUser(firebaseUser);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { user, loading };
}

