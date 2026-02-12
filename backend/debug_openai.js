
import OpenAI from "openai";
import "./config/env.js"; 

const key = process.env.OPENAI_API_KEY;
console.log("Loaded Key Prefix:", key ? key.substring(0, 15) + "..." : "UNDEFINED");

const openai = new OpenAI({
  apiKey: key,
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: "Hello" }],
      model: "gpt-3.5-turbo",
    });

    console.log("Success:", completion.choices[0].message);
  } catch (error) {
    console.log("ERROR_TYPE:", error.type);
    console.log("ERROR_CODE:", error.code);
    console.log("ERROR_MSG:", error.message);
  }
}

main();
