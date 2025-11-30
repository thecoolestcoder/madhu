
import React, { createContext, useContext, ReactNode } from 'react';
import { ClerkProvider, useAuth as useClerkAuth, useUser as useClerkUser, useClerk as useClerkInstance } from '@clerk/clerk-react';
import { VITE_CLERK_PUBLISHABLE_KEY } from '../constants';

// --- Types ---
interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  userId: string | null | undefined;
  sessionId: string | null | undefined;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

interface UserContextType {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  user: any | null | undefined; // We use 'any' to accommodate the complex Clerk user object for mocking
}

// --- Contexts ---
const AuthCtx = createContext<AuthContextType | null>(null);
const UserCtx = createContext<UserContextType | null>(null);

// --- Hooks ---
export const useAuth = () => {
  const context = useContext(AuthCtx);
  if (context) return context;
  // Fallback if used outside provider (shouldn't happen) or if real Clerk is active
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkAuth();
};

export const useUser = () => {
  const context = useContext(UserCtx);
  if (context) return context;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkUser();
};

export const useClerk = () => {
    // If we are in mock mode, we return a mock clerk object
    const auth = useContext(AuthCtx);
    if (auth) {
        return { signOut: auth.signOut, openSignIn: () => {} };
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useClerkInstance();
}

// --- Providers ---

// 1. Mock Provider (Used when API Key is missing)
const MockAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const mockAuth: AuthContextType = {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    sessionId: null,
    getToken: async () => null,
    signOut: async () => {
        window.location.href = '#/login';
    },
  };

  const mockUser: UserContextType = {
    isLoaded: true,
    isSignedIn: false,
    user: null,
  };

  return (
    <AuthCtx.Provider value={mockAuth}>
      <UserCtx.Provider value={mockUser}>
        {children}
      </UserCtx.Provider>
    </AuthCtx.Provider>
  );
};

// 2. Real Provider Wrapper
const RealAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // We don't need to provide context values here because the hooks will fall back 
    // to the real Clerk hooks when the custom context is null.
    // This wrapper exists just to render children inside ClerkProvider.
    return <>{children}</>;
}

// 3. Main Switcher
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isKeyValid = VITE_CLERK_PUBLISHABLE_KEY && !VITE_CLERK_PUBLISHABLE_KEY.includes('YOUR_CLERK');

  if (!isKeyValid) {
    console.warn("Clerk API Key is missing or invalid. Running in Offline/Guest Mode.");
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }

  return (
    <ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>
      <RealAuthProvider>{children}</RealAuthProvider>
    </ClerkProvider>
  );
};
