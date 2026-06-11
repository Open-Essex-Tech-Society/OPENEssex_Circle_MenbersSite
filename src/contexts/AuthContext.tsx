import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  userName: string;
  userAvatar: string;
  updateLocalProfile: (name: string, avatar: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  userName: '',
  userAvatar: '',
  updateLocalProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbName, setDbName] = useState<string>('');
  const [dbAvatar, setDbAvatar] = useState<string>('');

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);

      if (currentUser) {
        // Load custom profile info from localStorage first for fast rendering
        const cachedName = localStorage.getItem(`profile_name_${currentUser.uid}`);
        const cachedAvatar = localStorage.getItem(`profile_avatar_${currentUser.uid}`);
        if (cachedName) setDbName(cachedName);
        if (cachedAvatar) setDbAvatar(cachedAvatar);

        const cacheKey = `profile_registered_${currentUser.uid}`;
        if (!localStorage.getItem(cacheKey) || !cachedName) {
          try {
            const res = await fetch(`/api/profiles/${currentUser.uid}`);
            if (!res.ok) {
              const defaultName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
              const defaultAvatar = currentUser.photoURL || '';
              await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uid: currentUser.uid,
                  display_name: defaultName,
                  email: currentUser.email || '',
                  avatar_url: defaultAvatar,
                }),
              });
              setDbName(defaultName);
              setDbAvatar(defaultAvatar);
              localStorage.setItem(`profile_name_${currentUser.uid}`, defaultName);
              localStorage.setItem(`profile_avatar_${currentUser.uid}`, defaultAvatar);
            } else {
              const data = await res.json();
              if (data) {
                setDbName(data.display_name || '');
                setDbAvatar(data.avatar_url || '');
                localStorage.setItem(`profile_name_${currentUser.uid}`, data.display_name || '');
                localStorage.setItem(`profile_avatar_${currentUser.uid}`, data.avatar_url || '');
              }
            }
            localStorage.setItem(cacheKey, String(Date.now()));
          } catch (err) {
            console.error('Auto-register profile failed:', err);
          }
        }
      } else {
        setDbName('');
        setDbAvatar('');
      }
    });

    // Heartbeat for online status
    const heartbeatInterval = setInterval(async () => {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        try {
          await fetch('/api/profiles', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: currentUser.uid }),
          });
        } catch (err) {
          console.error('Heartbeat failed:', err);
        }
      }
    }, 60000); // Every 60 seconds

    return () => {
      unsubscribe();
      clearInterval(heartbeatInterval);
    };
  }, []);

  const updateLocalProfile = (name: string, avatar: string) => {
    setDbName(name);
    setDbAvatar(avatar);
    if (user) {
      localStorage.setItem(`profile_name_${user.uid}`, name);
      localStorage.setItem(`profile_avatar_${user.uid}`, avatar);
    }
  };

  const userName = dbName || user?.displayName || user?.email?.split('@')[0] || '';
  const userAvatar = dbAvatar || user?.photoURL || '';

  return (
    <AuthContext.Provider value={{ user, isLoading, userName, userAvatar, updateLocalProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
