
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '../context/AuthContext'; // Updated Import
import { Icons } from '../components/Icons';
import { UserMetadata } from '../types';

const Onboarding: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { userId } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: 35,
    gender: 'male',
    height: 170, // cm
    weight: 70, // kg
    activityLevel: 'light',
  });
  const [loading, setLoading] = useState(false);

  // If mocked, userId might be null, but isLoaded is true.
  if (!isLoaded) return null;

  const calculateStats = () => {
    // 1. BMI
    const heightM = formData.height / 100;
    const bmi = parseFloat((formData.weight / (heightM * heightM)).toFixed(1));

    // 2. BMR (Mifflin-St Jeor Equation)
    // Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
    // Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
    let bmr = (10 * formData.weight) + (6.25 * formData.height) - (5 * formData.age);
    if (formData.gender === 'male') {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    // 3. TDEE / Target Calories
    const multipliers: Record<string, number> = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725
    };
    const tdee = bmr * (multipliers[formData.activityLevel] || 1.2);
    
    // Default to TDEE for maintenance (Diabetic friendly - steady blood sugar)
    const targetCalories = Math.round(tdee);
    
    // Water target (approx weight / 30 * 2 for glasses roughly, simplistic)
    const targetWater = Math.max(8, Math.round((formData.weight * 2.2 * 0.5) / 8)); // 8 glasses min

    return { bmi, bmr: Math.round(bmr), targetCalories, targetWater };
  };

  const handleFinish = async () => {
    setLoading(true);
    const stats = calculateStats();

    const metadata: UserMetadata = {
        onboardingCompleted: true,
        age: formData.age,
        gender: formData.gender as 'male' | 'female',
        height: formData.height,
        weight: formData.weight,
        activityLevel: formData.activityLevel as any,
        bmi: stats.bmi,
        bmr: stats.bmr,
        targetCalories: stats.targetCalories,
        targetWater: stats.targetWater,
        customFoods: [], // Initialize empty custom food list
        logs: {} // Initialize empty logs
    };

    try {
        if (user) {
            await user.update({
                // Cast to Record<string, any> to satisfy Clerk's type requirement
                unsafeMetadata: metadata as unknown as Record<string, any>
            });
        } else {
            // Guest Mode: We don't save profile to local storage in this simple version, 
            // but we could. For now, just redirect.
            console.log("Guest mode onboarding calculated:", stats);
        }
        navigate('/');
    } catch (err) {
        console.error("Failed to save metadata", err);
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden p-8">
        <div className="text-center mb-8">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                <Icons.User size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Let's get to know you</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">We'll use this to calculate your BMI and personalized calorie targets.</p>
        </div>

        <div className="space-y-6">
            {/* Gender & Age */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                        {['male', 'female'].map(g => (
                            <button
                                key={g}
                                onClick={() => setFormData({...formData, gender: g})}
                                className={`flex-1 py-2 text-sm font-medium capitalize rounded-lg transition-all ${
                                    formData.gender === g 
                                    ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-300 shadow-sm' 
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age</label>
                    <input 
                        type="number" 
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || 0})}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center font-bold text-gray-800 dark:text-white"
                    />
                </div>
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Height (cm)</label>
                    <input 
                        type="number" 
                        value={formData.height}
                        onChange={(e) => setFormData({...formData, height: parseInt(e.target.value) || 0})}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center font-bold text-gray-800 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (kg)</label>
                    <input 
                        type="number" 
                        value={formData.weight}
                        onChange={(e) => setFormData({...formData, weight: parseInt(e.target.value) || 0})}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center font-bold text-gray-800 dark:text-white"
                    />
                </div>
            </div>

            {/* Activity Level */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Activity Level</label>
                <select
                    value={formData.activityLevel}
                    onChange={(e) => setFormData({...formData, activityLevel: e.target.value})}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-gray-800 dark:text-white"
                >
                    <option value="sedentary">Sedentary (Little to no exercise)</option>
                    <option value="light">Light (Exercise 1-3 days/week)</option>
                    <option value="moderate">Moderate (Exercise 3-5 days/week)</option>
                    <option value="active">Active (Exercise 6-7 days/week)</option>
                </select>
            </div>

            <button 
                onClick={handleFinish}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none active:scale-95 transition-all mt-4"
            >
                {loading ? 'Calculating...' : 'Calculate & Start'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
