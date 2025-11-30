import { GoogleGenAI } from "@google/genai";
import { DailyLog, FoodItem } from "../types";

// Initialize Gemini Client
// Uses process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDailyInsight = async (log: DailyLog): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Stay active and hydrated! (Add API_KEY to env to see AI insights)";
  }

  try {
    const prompt = `
    You are a kind and knowledgeable health assistant for an Indian adult with Type 2 Diabetes.
    Here is their summary for today:
    - Calories: ${log.totalCaloriesIn}
    - Carbs: ${log.totalCarbs}g
    - Water: ${log.waterGlasses} glasses
    - Activity: ${log.totalCaloriesBurned} calories burned
    - Meals: ${log.meals.map(m => m.name).join(', ')}

    Provide one single, short sentence (max 20 words) of encouraging feedback or advice tailored to Indian diet/lifestyle. Do not use markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Stay active and hydrated!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Great job tracking your health today!";
  }
};

export const analyzeFoodItem = async (foodName: string): Promise<FoodItem | null> => {
  if (!process.env.API_KEY) return null;

  try {
    const prompt = `
      Analyze the food item: "${foodName}".
      Estimate the calories, carbohydrates, protein, and fat for a standard Indian serving size.
      Return ONLY a JSON object with these keys: "name" (string), "calories" (number), "carbs" (number), "protein" (number), "fat" (number).
      Example: {"name": "Poha (1 plate)", "calories": 250, "carbs": 40, "protein": 4, "fat": 8}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);
    return {
      id: `ai_${Date.now()}`,
      name: data.name,
      calories: data.calories,
      carbs: data.carbs,
      protein: data.protein || 0,
      fat: data.fat || 0
    };

  } catch (error) {
    console.error("Gemini Food Analysis Error:", error);
    return null;
  }
};