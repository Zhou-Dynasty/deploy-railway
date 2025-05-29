import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock responses for development
const mockResponses: { [key: string]: string } = {
  'Monstera Deliciosa': 'Water every 1-2 weeks, allowing the top inch of soil to dry between waterings.',
  'Snake Plant': 'Water every 2-3 weeks, as they are drought-tolerant and prefer dry conditions.',
  'Peace Lily': 'Water once a week, keeping the soil consistently moist but not soggy.',
  'Monstera Adansonii': 'Water every 1-2 weeks, allowing the top inch of soil to dry between waterings.',
  'default': 'Water when the top inch of soil feels dry to the touch.'
};

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');


export async function getWateringRecommendation(plantName: string): Promise<string> {
  // If no API key is present, use mock responses
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.log('Using mock response - add your API key to .env.local for real recommendations');
    return mockResponses[plantName] || mockResponses.default;
  }

  try {
    // Try different model names
    const modelNames = ['gemini-2.0-flash'];
    
    for (const modelName of modelNames) {
      try {
        console.log(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = `How often should you water a ${plantName}? Please provide a brief, concise answer focusing on the watering frequency.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log(`Successfully used model: ${modelName}`);
        return text;
      } catch (modelError: any) {
        console.log(`Model ${modelName} not available:`, modelError);
        // If we hit a rate limit, wait before trying the next model
        if (modelError.message?.includes('429')) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
        continue;
      }
    }
    
    throw new Error('No available models found');
  } catch (error) {
    console.error('Error getting watering recommendation:', error);
    // If there's an API error, fall back to mock responses
    return mockResponses[plantName] || mockResponses.default;
  }
} 