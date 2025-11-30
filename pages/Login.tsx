import React, { useEffect } from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { VITE_CLERK_PUBLISHABLE_KEY } from '../constants';
import { Icons } from '../components/Icons';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useUser();

  const isClerkConfigured =
    Boolean(VITE_CLERK_PUBLISHABLE_KEY) &&
    !VITE_CLERK_PUBLISHABLE_KEY.includes('YOUR_CLERK');

  // If already authenticated, bounce away from login
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  const handleGuestLogin = () => {
    localStorage.setItem('guest_mode', 'true');
    navigate('/', { replace: true });
  };

  // Initial loading state while Clerk checks session
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // When signed in, effect above will redirect; render nothing here
  if (isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50 dark:bg-gray-900 p-6 transition-colors">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-emerald-800 dark:text-emerald-400 font-sans mb-2">
          Madhumeh Mitra
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Your daily companion for diabetes management.
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        {isClerkConfigured ? (
          <>
            {/* Embedded Clerk SignIn (includes its own Sign up link) */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-4 w-full">
              <SignIn
                appearance={{
                  elements: {
                    card: 'shadow-none border-0 rounded-2xl',
                    formButtonPrimary:
                      'bg-emerald-600 hover:bg-emerald-700 text-sm normal-case',
                    footerActionLink:
                      'text-emerald-600 hover:text-emerald-700',
                  },
                }}
              />
            </div>

            {/* Guest option */}
            <div className="mt-6 text-center w-full">
              <div className="flex items-center mb-4">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700" />
                <span className="mx-4 text-gray-400 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700" />
              </div>

              <button
                type="button"
                onClick={handleGuestLogin}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-200 dark:shadow-none"
              >
                Continue as Guest
              </button>
            </div>
          </>
        ) : (
          // Fallback when Clerk is not configured
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full text-center border-dashed border-2 border-gray-300 dark:border-gray-700">
            <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
              <Icons.Activity size={24} />
            </div>
            <h3 className="text-gray-800 dark:text-white font-bold mb-2">
              Login Disabled
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The authentication service is not configured yet.
            </p>
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-200 dark:shadow-none"
            >
              Continue as Guest
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
