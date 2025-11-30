import { DailyLog, UserMetadata } from "../types";

// Helper to get today's ID
export const getTodayDateId = () => new Date().toISOString().split('T')[0];

// Helper to create an initial empty log
const createEmptyLog = (date: string): DailyLog => ({
  date,
  waterGlasses: 0,
  meals: [],
  workouts: [],
  totalCaloriesIn: 0,
  totalCarbs: 0,
  totalCaloriesBurned: 0,
});

// Get Log for a specific date from Clerk User Metadata or LocalStorage
export const getDailyLog = async (user: any, date: string = getTodayDateId()): Promise<DailyLog> => {
  // Guest Mode
  if (!user) {
    const stored = localStorage.getItem(`guest_log_${date}`);
    return stored ? JSON.parse(stored) : createEmptyLog(date);
  }

  // Clerk User Mode
  try {
    const meta = user.unsafeMetadata as unknown as UserMetadata;
    const logs = meta.logs || {};
    
    if (logs[date]) {
        return logs[date];
    }
    return createEmptyLog(date);

  } catch (error) {
    console.warn("Error fetching log from metadata:", error);
    return createEmptyLog(date);
  }
};

// Save/Update log to Clerk User Metadata or LocalStorage
export const saveDailyLog = async (user: any, log: DailyLog): Promise<void> => {
  // Guest Mode
  if (!user) {
    localStorage.setItem(`guest_log_${log.date}`, JSON.stringify(log));
    return;
  }

  // Clerk User Mode
  try {
    const meta = user.unsafeMetadata as unknown as UserMetadata;
    const currentLogs = meta.logs || {};
    
    // Safety: Prevent metadata from exceeding limits by keeping only last 30 entries
    // Convert keys to array, sort, and slice if needed
    const sortedDates = Object.keys(currentLogs).sort();
    if (sortedDates.length > 30) {
        // Remove oldest
        delete currentLogs[sortedDates[0]];
    }

    const updatedLogs = {
        ...currentLogs,
        [log.date]: log
    };

    await user.update({
        unsafeMetadata: {
            ...meta,
            logs: updatedLogs
        }
    });
  } catch (error) {
    console.error("Error saving to Clerk metadata:", error);
    // Fallback to local storage if API fails
    localStorage.setItem(`backup_log_${log.date}`, JSON.stringify(log));
  }
};

// Get last 7 days history
export const getWeeklyHistory = async (user: any): Promise<DailyLog[]> => {
  const logs: DailyLog[] = [];
  
  for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      let log: DailyLog;
      
      if (!user) {
           const stored = localStorage.getItem(`guest_log_${dateStr}`);
           log = stored ? JSON.parse(stored) : createEmptyLog(dateStr);
      } else {
           const meta = user.unsafeMetadata as unknown as UserMetadata;
           const userLogs = meta.logs || {};
           log = userLogs[dateStr] || createEmptyLog(dateStr);
      }
      
      // Only push if it has some data or is today
      if (log.totalCaloriesIn > 0 || log.waterGlasses > 0 || i === 0) {
          logs.push(log);
      }
  }
  
  return logs.reverse();
};

// Helper to recalculate totals
export const recalculateTotals = (log: DailyLog): DailyLog => {
  const totalCaloriesIn = log.meals.reduce((acc, m) => acc + m.calories, 0);
  const totalCarbs = log.meals.reduce((acc, m) => acc + m.carbs, 0);
  const totalCaloriesBurned = log.workouts.reduce((acc, w) => acc + w.caloriesBurned, 0);

  return {
    ...log,
    totalCaloriesIn,
    totalCarbs,
    totalCaloriesBurned
  };
};
