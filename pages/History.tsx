
import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '../context/AuthContext'; // Updated Import
import { getWeeklyHistory } from '../services/dataService';
import { DailyLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Icons } from '../components/Icons';
import { useTheme } from '../context/ThemeContext';

const History: React.FC = () => {
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const isGuest = localStorage.getItem('guest_mode') === 'true';

    if (isGuest) {
        getWeeklyHistory(null).then(data => {
            setHistory(data);
            setLoading(false);
        });
    } else if (isSignedIn && user) {
        getWeeklyHistory(user).then(data => {
            setHistory(data);
            setLoading(false);
        });
    } else {
        setLoading(false);
    }
  }, [isSignedIn, user]);

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 h-screen flex items-center justify-center">Loading history...</div>;

  // Prepare data for chart (shorten dates)
  const chartData = history.map(log => ({
    name: new Date(log.date).toLocaleDateString('en-IN', { weekday: 'short' }),
    Calories: log.totalCaloriesIn,
    Burned: log.totalCaloriesBurned,
    Water: log.waterGlasses * 10 // Scale up for visibility
  }));

  return (
    <div className="pb-24 min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100 transition-colors">
       <div className="bg-white dark:bg-gray-900 p-6 sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Weekly Tracker</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days performance</p>
       </div>

       <div className="p-4 space-y-6">
            {/* Chart Section */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-72 transition-colors">
                {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#374151" : "#f3f4f6"} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#4b5563'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#4b5563'}} />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                    color: isDarkMode ? '#fff' : '#000',
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                                }}
                            />
                            <Legend wrapperStyle={{paddingTop: '10px'}} />
                            <Bar dataKey="Calories" fill="#f97316" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Burned" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                     <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        No data available for chart
                     </div>
                )}
            </div>

            {/* Detailed List */}
            <div className="space-y-3">
                <h2 className="font-bold text-gray-700 dark:text-gray-200 text-lg">Daily Breakdown</h2>
                {history.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">No logs found for the past week.</p> : history.map((log) => (
                    <div key={log.date} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-100 dark:bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-xs flex-col leading-tight">
                                <span>{new Date(log.date).getDate()}</span>
                                <span>{new Date(log.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(log.date).toLocaleDateString('en-IN', { weekday: 'long' })}</div>
                                <div className="flex gap-3 text-xs mt-1 font-medium">
                                    <span className="text-orange-600 dark:text-orange-400">{log.totalCaloriesIn} Cal</span>
                                    <span className="text-blue-600 dark:text-blue-400">{log.waterGlasses} Water</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-1">
                            <Icons.Burn size={14} />
                            {log.totalCaloriesBurned}
                        </div>
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};

export default History;
