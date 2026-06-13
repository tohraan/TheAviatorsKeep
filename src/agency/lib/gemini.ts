import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

if (!apiKey) {
  console.warn('VITE_GEMINI_API_KEY is missing. Agency AI tools will not function correctly.')
}

// Singleton instance
export const genAI = new GoogleGenerativeAI(apiKey || 'missing-key')

// Helper to get the standard model used across the agency
export const getAgencyModel = () => {
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: "application/json",
    }
  })
}
