import OpenAI from "openai";

// If the key is not provided, this will fall back to returning a mock score.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock-key",
});

export async function scoreSignal(description: string, source: string): Promise<number> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert VC associate. Evaluate this founder signal from 1 to 10 on how likely it means the founder is starting a new venture or raising money. Reply ONLY with a number." },
          { role: "user", content: `Source: ${source}\nDescription: ${description}` }
        ],
        temperature: 0,
      });
      const score = parseInt(response.choices[0].message.content || "5", 10);
      return isNaN(score) ? 5 : score;
    } catch (e) {
      console.error("OpenAI scoring failed", e);
      return 5;
    }
  } else {
    // Mock logic: if it mentions 'stealth' or 'left', score 8, else 5
    const text = description.toLowerCase();
    if (text.includes("stealth") || text.includes("left") || text.includes("raised")) {
      return 8;
    }
    return 5;
  }
}
