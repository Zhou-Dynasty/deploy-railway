import { GoogleGenerativeAI } from '@google/generative-ai';
import { Language } from '../translations';

// Mock responses for development
const mockResponses: { [key: string]: { [key in Language]: { frequency: number, unit: string, description: string } } } = {
  'Monstera Deliciosa': {
    en: { frequency: 7, unit: 'days', description: 'Water every 1-2 weeks, allowing the top inch of soil to dry between waterings.' },
    zh: { frequency: 7, unit: 'days', description: '每1-2周浇水一次，让土壤表层干燥后再浇水。' }
  },
  'Snake Plant': {
    en: { frequency: 14, unit: 'days', description: 'Water every 2-3 weeks, as they are drought-tolerant and prefer dry conditions.' },
    zh: { frequency: 14, unit: 'days', description: '每2-3周浇水一次，因为它们耐旱且喜欢干燥的环境。' }
  },
  'Peace Lily': {
    en: { frequency: 7, unit: 'days', description: 'Water once a week, keeping the soil consistently moist but not soggy.' },
    zh: { frequency: 7, unit: 'days', description: '每周浇水一次，保持土壤湿润但不积水。' }
  },
  'Monstera Adansonii': {
    en: { frequency: 7, unit: 'days', description: 'Water every 1-2 weeks, allowing the top inch of soil to dry between waterings.' },
    zh: { frequency: 7, unit: 'days', description: '每1-2周浇水一次，让土壤表层干燥后再浇水。' }
  },
  'default': {
    en: { frequency: 7, unit: 'days', description: 'Water when the top inch of soil feels dry to the touch.' },
    zh: { frequency: 7, unit: 'days', description: '当土壤表层感觉干燥时浇水。' }
  }
};

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface WateringInfo {
  frequency: number;
  unit: string;
  description: string;
}

export async function getWateringRecommendation(plantName: string, language: Language = 'en'): Promise<WateringInfo> {
  // If no API key is present, use mock responses
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    // console.debug('Using mock response - add your API key to .env.local for real recommendations');
    return mockResponses[plantName]?.[language] || mockResponses.default[language];
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `For a ${plantName}, provide watering information in the following JSON format. ${language === 'zh' ? 'Please provide the description in Chinese.' : 'Please provide the description in English.'} DO NOT use markdown formatting or code blocks. Return ONLY the raw JSON object:

{
  "frequency": number, // How often to water (in days)
  "unit": "days", // The unit of frequency (always "days")
  "description": "string" // A brief description of watering needs
}

Example: For a Monstera Deliciosa, the response should be exactly:
${language === 'zh' ? 
`{
  "frequency": 7,
  "unit": "days",
  "description": "每1-2周浇水一次，让土壤表层干燥后再浇水。"
}` :
`{
  "frequency": 7,
  "unit": "days",
  "description": "Water every 1-2 weeks, allowing the top inch of soil to dry between waterings."
}`}

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
    return mockResponses[plantName]?.[language] || mockResponses.default[language];
  }
} 