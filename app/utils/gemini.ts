import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock responses for development
const mockResponses: { [key: string]: { frequency: number, unit: string, description: string } } = {
  'Monstera Deliciosa': { frequency: 7, unit: 'days', description: 'Water every 1-2 weeks, allowing the top inch of soil to dry between waterings.' },
  'Snake Plant': { frequency: 14, unit: 'days', description: 'Water every 2-3 weeks, as they are drought-tolerant and prefer dry conditions.' },
  'Peace Lily': { frequency: 7, unit: 'days', description: 'Water once a week, keeping the soil consistently moist but not soggy.' },
  'Monstera Adansonii': { frequency: 7, unit: 'days', description: 'Water every 1-2 weeks, allowing the top inch of soil to dry between waterings.' },
  'default': { frequency: 7, unit: 'days', description: 'Water when the top inch of soil feels dry to the touch.' }
};

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface WateringInfo {
  frequency: number;
  unit: string;
  description: string;
}

export async function getWateringRecommendation(plantName: string): Promise<WateringInfo> {
  // If no API key is present, use mock responses
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.debug('Using mock response - add your API key to .env.local for real recommendations');
    return mockResponses[plantName] || mockResponses.default;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `For a ${plantName}, provide watering information in the following JSON format. DO NOT use markdown formatting or code blocks. Return ONLY the raw JSON object:

{
  "frequency": number, // How often to water (in days)
  "unit": "days", // The unit of frequency (always "days")
  "description": "string" // A brief description of watering needs
}

Example: For a Monstera Deliciosa, the response should be exactly:
{
  "frequency": 7,
  "unit": "days",
  "description": "Water every 1-2 weeks, allowing the top inch of soil to dry between waterings."
}

Remember: Return ONLY the raw JSON object, no markdown formatting, no code blocks, no additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Remove any markdown code block formatting if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Error getting watering recommendation:', error);
    return mockResponses[plantName] || mockResponses.default;
  }
} 