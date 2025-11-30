import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '../context/AuthContext';
import { Icons } from '../components/Icons';
import { getDailyLog, saveDailyLog, recalculateTotals } from '../services/dataService';
import { generateDailyInsight, analyzeFoodItem } from '../services/geminiService';
import { DailyLog, FoodItem, MealTime, UserMetadata } from '../types';
import { INDIAN_FOOD_DATABASE, DEFAULT_CALORIE_TARGET, DEFAULT_WATER_TARGET } from '../constants';
import LogModal from '../components/LogModal';

const ACTIVITY_TYPES = [
  { id: 'walk', name: 'Walk', icon: Icons.Steps, calsPerMin: 4 },
  { id: 'run', name: 'Run', icon: Icons.Activity, calsPerMin: 11 },
  { id: 'cycle', name: 'Cycle', icon: Icons.Bike, calsPerMin: 8 },
  { id: 'yoga', name: 'Yoga', icon: Icons.User, calsPerMin: 3 },
  { id: 'gym', name: 'Gym', icon: Icons.Gym, calsPerMin: 6 },
  { id: 'home', name: 'Chores', icon: Icons.Home, calsPerMin: 3 },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [aiTip, setAiTip] = useState<string>("Loading daily tip...");
  const [calorieTarget, setCalorieTarget] = useState(DEFAULT_CALORIE_TARGET);
  const [waterTarget, setWaterTarget] = useState(DEFAULT_WATER_TARGET);
  
  // Modal States
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  // Form States
  const [selectedMealTime, setSelectedMealTime] = useState<MealTime>(MealTime.BREAKFAST);
  const [pendingFoods, setPendingFoods] = useState<FoodItem[]>([]); 
  const [activityDuration, setActivityDuration] = useState<number>(30);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('walk');

  // Search & AI States
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Food List Management
  const [combinedFoodList, setCombinedFoodList] = useState<FoodItem[]>(INDIAN_FOOD_DATABASE);

  // Long Press State
  const [longPressItem, setLongPressItem] = useState<FoodItem | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check Auth & Onboarding
  useEffect(() => {
    const checkUser = async () => {
        const isGuest = localStorage.getItem('guest_mode') === 'true';

        if (isGuest) {
            const log = await getDailyLog(null);
            setDailyLog(log);
            setAiTip(log.aiInsight || "Welcome Guest! Start logging to see insights.");
            setLoading(false);
        } else if (isLoaded) {
            if (isSignedIn && user) {
                const meta = user.unsafeMetadata as unknown as UserMetadata;
                if (!meta?.onboardingCompleted) {
                    navigate('/onboarding');
                    return;
                }

                setCalorieTarget(meta.targetCalories || DEFAULT_CALORIE_TARGET);
                setWaterTarget(meta.targetWater || DEFAULT_WATER_TARGET);
                
                if (meta.customFoods && Array.isArray(meta.customFoods)) {
                    setCombinedFoodList([...INDIAN_FOOD_DATABASE, ...meta.customFoods]);
                }

                const log = await getDailyLog(user);
                setDailyLog(log);
                setAiTip(log.aiInsight || "Stay consistent with your meals!");
                setLoading(false);
            } else {
                navigate('/login');
            }
        }
    };

    checkUser();
  }, [isLoaded, isSignedIn, userId, navigate, user]);

  // Update Persistence Helper
  const updateLog = async (newLog: DailyLog) => {
    setDailyLog(newLog);
    await saveDailyLog(user || null, newLog);
  };

  // --- Handlers ---

  const handleAddWater = async () => {
    if (!dailyLog) return;
    const newLog = { ...dailyLog, waterGlasses: dailyLog.waterGlasses + 1 };
    await updateLog(newLog);
  };

  const handleRemoveWater = async () => {
    if (!dailyLog || dailyLog.waterGlasses <= 0) return;
    const newLog = { ...dailyLog, waterGlasses: dailyLog.waterGlasses - 1 };
    await updateLog(newLog);
  };

  // --- Food Modal Handlers ---
  
  const openFoodModal = () => {
    setPendingFoods([]);
    setFoodSearchQuery("");
    setShowFoodModal(true);
  };

  const handleAddPendingFood = (food: FoodItem) => {
    setPendingFoods(prev => [...prev, food]);
    setFoodSearchQuery(""); 
  };

  const handleRemovePendingFood = (foodId: string) => {
    setPendingFoods(prev => {
        const index = prev.findIndex(f => f.id === foodId);
        if (index === -1) return prev;
        const newArr = [...prev];
        newArr.splice(index, 1);
        return newArr;
    });
  };

  const handleAiSearch = async () => {
    if (!foodSearchQuery.trim()) return;
    setIsAnalyzing(true);
    
    const result = await analyzeFoodItem(foodSearchQuery);
    
    if (result) {
        handleAddPendingFood(result);

        if (isSignedIn && user) {
             const meta = user.unsafeMetadata as unknown as UserMetadata;
             const currentCustomFoods = meta.customFoods || [];
             
             const exists = currentCustomFoods.find(f => f.name === result.name);
             if (!exists) {
                 const newCustomFoods = [...currentCustomFoods, result];
                 await user.update({
                     unsafeMetadata: {
                         ...meta,
                         customFoods: newCustomFoods
                     }
                 });
                 setCombinedFoodList([...INDIAN_FOOD_DATABASE, ...newCustomFoods]);
             }
        }
    }
    setIsAnalyzing(false);
  };

  const getPendingCount = (foodId: string) => pendingFoods.filter(f => f.id === foodId).length;

  const handleSaveMeal = async () => {
    if (!dailyLog || pendingFoods.length === 0) return;
    
    const newMeals = pendingFoods.map((food, i) => ({
      id: `${Date.now()}-${i}`,
      name: food.name,
      calories: food.calories,
      carbs: food.carbs,
      time: selectedMealTime,
      timestamp: Date.now()
    }));
    
    const updatedLog = recalculateTotals({
      ...dailyLog,
      meals: [...dailyLog.meals, ...newMeals]
    });
    
    await updateLog(updatedLog);
    setShowFoodModal(false);
  };

  const filteredFoods = foodSearchQuery 
    ? combinedFoodList.filter(f => f.name.toLowerCase().includes(foodSearchQuery.toLowerCase()))
    : combinedFoodList.slice(0, 5);

  const alreadyLoggedForTime = dailyLog?.meals.filter(m => m.time === selectedMealTime) || [];

  // --- Long Press Logic ---
  const handleTouchStart = (item: FoodItem) => {
      longPressTimer.current = setTimeout(() => {
          setLongPressItem(item);
      }, 600);
  };

  const handleTouchEnd = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
      }
  };

  // --- Activity Handlers ---

  const handleAddActivity = async () => {
    if (!dailyLog) return;
    const activity = ACTIVITY_TYPES.find(a => a.id === selectedActivityId) || ACTIVITY_TYPES[0];
    const burned = activityDuration * activity.calsPerMin;
    
    const newWorkout = {
      id: Date.now().toString(),
      type: activity.name,
      durationMinutes: activityDuration,
      caloriesBurned: burned,
      timestamp: Date.now()
    };

    const updatedLog = recalculateTotals({
      ...dailyLog,
      workouts: [...dailyLog.workouts, newWorkout]
    });

    await updateLog(updatedLog);
    setShowActivityModal(false);
  };

  const requestAiAnalysis = async () => {
      if(!dailyLog) return;
      setAiTip("Asking Gemini...");
      const insight = await generateDailyInsight(dailyLog);
      setAiTip(insight);
      await updateLog({...dailyLog, aiInsight: insight});
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-emerald-600">Loading your health data...</div>;
  }

  if (!dailyLog) return null;

  const calProgress = Math.min((dailyLog.totalCaloriesIn / calorieTarget) * 100, 100);
  const waterProgress = Math.min((dailyLog.waterGlasses / waterTarget) * 100, 100);
  
  const selectedActivity = ACTIVITY_TYPES.find(a => a.id === selectedActivityId) || ACTIVITY_TYPES[0];

  const userName = (!user && !isSignedIn) ? 'Guest' : (user?.firstName || 'Friend');

  return (
    <div className="pb-24 bg-gray-50 dark:bg-gray-950 min-h-screen font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200 select-none">
      {/* Header */}
      <header className="bg-emerald-700 dark:bg-emerald-900 text-white p-6 rounded-b-[2rem] shadow-lg transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold font-sans">Namaste, {userName}</h1>
            <p className="text-emerald-100 text-sm">Let's keep your sugar in check today.</p>
          </div>
          <button onClick={requestAiAnalysis} className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition">
            <Icons.Trend size={20} className="text-white" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="mt-6 flex gap-4">
          <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20">
            <div className="text-3xl font-bold">{dailyLog.totalCaloriesIn}</div>
            <div className="text-xs text-emerald-100 uppercase tracking-wide">Calories In</div>
            <div className="text-xs text-emerald-200 mt-1">Target: {calorieTarget}</div>
          </div>
           <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/20">
            <div className="text-3xl font-bold">{dailyLog.totalCaloriesBurned}</div>
            <div className="text-xs text-emerald-100 uppercase tracking-wide">Burned</div>
            <div className="text-xs text-emerald-200 mt-1">Activity</div>
          </div>
        </div>
      </header>

      {/* AI Insight */}
      <div className="mx-4 -mt-4 relative z-10">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-start gap-3 border-l-4 border-amber-400 dark:border-amber-500 transition-colors">
            <div className="mt-1 text-amber-500 shrink-0">
                <Icons.Activity size={20} />
            </div>
            <div>
                <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 uppercase">Daily Insight</h3>
                <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">{aiTip}</p>
            </div>
        </div>
      </div>

      {/* Main Actions Grid */}
      <div className="p-4 grid grid-cols-2 gap-4 mt-2">
        {/* Water Tracker */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Icons.Water size={24} />
                <span className="font-bold text-lg">Water Intake</span>
            </div>
            <span className="text-2xl font-black text-gray-800 dark:text-white">{dailyLog.waterGlasses}<span className="text-sm text-gray-400 font-normal">/{waterTarget}</span></span>
          </div>
          
          <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${waterProgress}%` }}></div>
          </div>

          <div className="flex gap-3">
             <button onClick={handleRemoveWater} className="flex-1 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition">-</button>
             <button onClick={handleAddWater} className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-blue-200 dark:shadow-none shadow-lg active:scale-95 transition">
                + Add Glass
             </button>
          </div>
        </div>

        {/* Food Logger Trigger */}
        <button 
            onClick={openFoodModal}
            className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors group"
        >
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                <Icons.Food size={28} />
            </div>
            <span className="font-semibold text-gray-700 dark:text-gray-200">Log Meal</span>
            <span className="text-xs text-gray-400">{dailyLog.meals.length} logged today</span>
        </button>

        {/* Activity Logger Trigger */}
        <button 
            onClick={() => setShowActivityModal(true)}
            className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-green-50 dark:hover:bg-emerald-900/10 transition-colors group"
        >
            <div className="bg-green-100 dark:bg-emerald-900/30 p-3 rounded-full text-green-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Icons.Activity size={28} />
            </div>
            <span className="font-semibold text-gray-700 dark:text-gray-200">Add Activity</span>
            <span className="text-xs text-gray-400">{dailyLog.workouts.length} sessions</span>
        </button>
      </div>

      {/* Today's Log List */}
      <div className="px-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-lg">Today's Log</h3>
        {dailyLog.meals.length === 0 && dailyLog.workouts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                No activities recorded yet.
            </div>
        ) : (
            <div className="space-y-3">
                {dailyLog.meals.map((meal, idx) => (
                    <div key={`meal-${idx}`} className="bg-white dark:bg-gray-800 p-4 rounded-xl flex justify-between items-center shadow-sm border-l-4 border-orange-400 dark:border-orange-500 transition-colors">
                        <div>
                            <p className="font-bold text-gray-800 dark:text-gray-100">{meal.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{meal.time}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-orange-600 dark:text-orange-400">{meal.calories} cal</p>
                            <p className="text-xs text-gray-400">{meal.carbs}g carbs</p>
                        </div>
                    </div>
                ))}
                 {dailyLog.workouts.map((workout, idx) => (
                    <div key={`work-${idx}`} className="bg-white dark:bg-gray-800 p-4 rounded-xl flex justify-between items-center shadow-sm border-l-4 border-green-400 dark:border-emerald-500 transition-colors">
                        <div>
                            <p className="font-bold text-gray-800 dark:text-gray-100">{workout.type}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{workout.durationMinutes} mins</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-green-600 dark:text-emerald-400">-{workout.caloriesBurned} cal</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* ---- MODALS ---- */}

      {/* Detail Popover (Long Press) */}
 {/* Detail Popover (Long Press) - Higher z-index */}
<div className={`${longPressItem ? 'fixed' : 'hidden'} inset-0 z-[60] flex items-center justify-center bg-black/50`} onClick={() => setLongPressItem(null)}>
  {longPressItem && (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 m-4 max-w-md w-full max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="text-center mb-4">
              <div className="bg-orange-100 dark:bg-orange-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600">
                  <Icons.Food size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{longPressItem.name}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-orange-500">{longPressItem.calories}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Calories</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-emerald-500">{longPressItem.carbs}g</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Carbs</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-blue-500">{longPressItem.protein || 0}g</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Protein</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-yellow-500">{longPressItem.fat || 0}g</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Fat</span>
              </div>
          </div>
          <button 
              onClick={() => setLongPressItem(null)} 
              className="w-full py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
              Close
          </button>
      </div>
  )}
</div>




      {/* Food Modal */}
      <LogModal 
        isOpen={showFoodModal} 
        onClose={() => setShowFoodModal(false)} 
        title="Add Meal"
      >
        <div className="flex flex-col h-full max-h-[80vh]">
             {/* Time Selection */}
             <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4 shrink-0">
                {Object.values(MealTime).map(time => (
                    <button
                        key={time}
                        onClick={() => setSelectedMealTime(time)}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                            selectedMealTime === time 
                            ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        {time}
                    </button>
                ))}
             </div>

             <div className="flex-1 overflow-y-auto pb-20">
                {/* Already Logged Section */}
                {alreadyLoggedForTime.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Logged for {selectedMealTime}</h4>
                        <div className="space-y-2">
                            {alreadyLoggedForTime.map((meal) => (
                                <div key={meal.id} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-lg flex justify-between items-center">
                                    <span className="text-emerald-900 dark:text-emerald-300 font-medium">{meal.name}</span>
                                    <span className="text-emerald-700 dark:text-emerald-500 text-sm font-bold">{meal.calories} cal</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icons.Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition"
                        placeholder="Search for food (e.g., Poha, Roti)"
                        value={foodSearchQuery}
                        onChange={(e) => setFoodSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {foodSearchQuery ? 'Search Results' : 'Quick Suggestions'}
                    </h4>
                    {!foodSearchQuery && <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Long press item for details</span>}
                </div>
                
                <div className="space-y-2">
                    {/* AI Action Item */}
                    {foodSearchQuery && filteredFoods.length === 0 && !isAnalyzing && (
                         <button 
                            onClick={handleAiSearch}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white dark:bg-indigo-900 p-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                    <Icons.Sparkles className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <span className="font-bold text-indigo-900 dark:text-indigo-300 block">Analyze "{foodSearchQuery}"</span>
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400">Use AI to estimate calories & macros</span>
                                </div>
                            </div>
                            <Icons.Right className="text-indigo-400" size={20} />
                        </button>
                    )}

                    {isAnalyzing && (
                        <div className="p-4 text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl animate-pulse">
                            Analyzing food data...
                        </div>
                    )}

                    {filteredFoods.map(food => {
                        const count = getPendingCount(food.id);
                        return (
                            <div 
                                key={food.id}
                                onTouchStart={() => handleTouchStart(food)}
                                onTouchEnd={handleTouchEnd}
                                onMouseDown={() => handleTouchStart(food)}
                                onMouseUp={handleTouchEnd}
                                onMouseLeave={handleTouchEnd}
                                className={`flex justify-between items-center p-3 border rounded-lg transition-colors select-none ${
                                    count > 0 
                                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-700'
                                }`}
                            >
                                <div>
                                    <span className="font-medium text-gray-800 dark:text-gray-200 block">{food.name}</span>
                                    <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{food.calories} cal</span>
                                        <span>•</span>
                                        <span>{food.carbs}g carbs</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {count > 0 && (
                                        <>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRemovePendingFood(food.id); }}
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shadow-sm active:scale-95 transition"
                                            >
                                                <Icons.Minus size={16} />
                                            </button>
                                            <span className="font-bold text-lg w-4 text-center text-gray-800 dark:text-gray-200">{count}</span>
                                        </>
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleAddPendingFood(food); }}
                                        className={`w-8 h-8 flex items-center justify-center rounded-full shadow-sm active:scale-95 transition ${
                                            count > 0 
                                            ? 'bg-orange-600 text-white' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900/50'
                                        }`}
                                    >
                                        <Icons.Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {pendingFoods.filter(p => !filteredFoods.find(f => f.id === p.id)).map(food => (
                         <div key={food.id} className="flex justify-between items-center p-3 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <div>
                                <span className="font-medium text-gray-800 dark:text-gray-200 block">{food.name} <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">(New)</span></span>
                                <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{food.calories} cal</span>
                                    <span>•</span>
                                    <span>{food.carbs}g carbs</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleRemovePendingFood(food.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shadow-sm active:scale-95 transition"
                                >
                                    <Icons.Minus size={16} />
                                </button>
                                <span className="font-bold text-lg w-4 text-center text-gray-800 dark:text-gray-200">1</span>
                                <button 
                                    onClick={() => handleAddPendingFood(food)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full shadow-sm active:scale-95 transition bg-orange-600 text-white"
                                >
                                    <Icons.Plus size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* Bottom Save Button - Absolute positioning */}
             <div className="absolute bottom-0 left-0 right-0 pt-3 pb-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                <button 
                    onClick={handleSaveMeal}
                    disabled={pendingFoods.length === 0}
                    className={`w-full py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                        pendingFoods.length > 0 
                        ? 'bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none shadow-lg active:scale-95' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                >
                    <span>Save {pendingFoods.length > 0 ? `(${pendingFoods.length} items)` : 'Meal'}</span>
                    {pendingFoods.length > 0 && (
                        <span className="bg-emerald-800/30 px-2 py-0.5 rounded text-sm">
                            {pendingFoods.reduce((acc, f) => acc + f.calories, 0)} cal
                        </span>
                    )}
                </button>
             </div>
        </div>
      </LogModal>

      {/* Activity Modal */}
  {/* Activity Modal - Centered */}
<LogModal 
  isOpen={showActivityModal} 
  onClose={() => setShowActivityModal(false)} 
  title="Track Activity"
  centered={true}
>
   <div className="space-y-4">
      {/* Activity Type Selector */}
      <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_TYPES.map(act => (
              <button
                  key={act.id}
                  onClick={() => setSelectedActivityId(act.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      selectedActivityId === act.id
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-200 dark:hover:border-emerald-800'
                  }`}
              >
                  <act.icon size={22} className="mb-1" />
                  <span className="text-xs font-medium">{act.name}</span>
              </button>
          ))}
      </div>

      <div className="text-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Duration (Minutes)</label>
          <div className="flex items-center justify-center gap-3">
              <button onClick={() => setActivityDuration(Math.max(5, activityDuration - 5))} className="p-2.5 rounded-full bg-white dark:bg-gray-700 shadow-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                  <Icons.Minus size={18} />
              </button>
              <span className="text-3xl font-bold w-20 text-gray-800 dark:text-white">{activityDuration}</span>
              <button onClick={() => setActivityDuration(activityDuration + 5)} className="p-2.5 rounded-full bg-white dark:bg-gray-700 shadow-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                  <Icons.Plus size={18} />
              </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-emerald-600 dark:text-emerald-400">
              <Icons.Burn size={14} />
              <p className="text-xs font-medium">Est. ~{activityDuration * selectedActivity.calsPerMin} cal burned</p>
          </div>
      </div>

      <button 
          onClick={handleAddActivity}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-base shadow-emerald-200 dark:shadow-none shadow-lg active:scale-95 transition"
      >
          Log Activity
      </button>
   </div>
</LogModal>




    </div>
  );
};

export default Dashboard;
