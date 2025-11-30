import React, { useEffect } from 'react';
import { SignUp, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (isSignedIn) return null;

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

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-4">
          <SignUp
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
      </div>
    </div>
  );
};

export default Signup;
