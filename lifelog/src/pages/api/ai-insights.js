import OpenAI from "openai";

export default async function handler(req, res) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an AI journaling assistant giving 3 brief daily insights or suggestions to help self-improvement.",
        },
      ],
      max_tokens: 150,
    });

    const text = response.choices[0].message.content;
    const insights = text.split("\n").filter((line) => line.trim().length > 0);

    res.status(200).json({ insights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ insights: [] });
  }
}
