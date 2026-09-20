console.log("AIP444 Fall 2026 - Lab 01");
console.log("git-cm: Developed by: Tyler Yeh - 148354236");
console.log("Run Date: September 20, 2026");


const OpenAI = require("openai");
const { exec } = require("child_process");
// Give the path to the `.env` file in the root of the repo, relative to this file.
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

//creative mode
const is_creative = process.argv.includes('--creative');

const temp = is_creative ? 1.0 : 0.1;


const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error("❌ Missing API Key: OPENROUTER_API_KEY");
  throw new Error(
    "API key not configured! Please set the OPENROUTER_API_KEY environment variable"
  );
}

const baseUrl = "https://openrouter.ai/api/v1";

// Helper: get staged git diff
function getStagedDiff() {
  return new Promise((resolve, reject) => {
    exec("git diff --staged", (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) return reject(new Error(stderr));
      resolve(stdout.trim());
    });
  });
}

async function main() {
  try {
    const diff = await getStagedDiff();

    if (!diff) {
      console.log("❌ No staged changes found");
      return;
    }

    console.log(`✅ Diff found: ${diff.length} characters`);

    // Create OpenAI client for OpenRouter
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: OPENROUTER_API_KEY,
      });

    // System prompt instructing the LLM to generate a commit message
    const systemPrompt = is_creative ? `
You are a 17th Century Pirate. Use Gitmoji and write the commit message in pirate slang. 
Output ONLY the commit message using the Conventional Commits standard format (e.g., 'feat: add logging').
Respond in plain text suitable for pasting into git commit -m '...'.
Do not include explanations or Markdown.
` : `
You are an LLM running in a CLI tool, which writes semantic commit messages for the user. 
You will be given a git diff. 
You must output ONLY the commit message using the Conventional Commits standard format (e.g., 'feat: add logging').
Respond in plain text suitable for pasting into git commit -m '...your commit message...';
just the plain text commit message with no Markdown, no rationale about why you chose it, etc.
`;

    // Call the OpenRouter chat completion API
    const response = await openai.chat.completions.create({
      model: "google/gemma-4-31b-it:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: diff },
      ],
      temperature: temp,
    });

    const commitMessage = response.choices[0]?.message?.content?.trim();

    if (!commitMessage) {
      console.log("LLM did not return a commit message");
      return;
    }

    console.log("\n Suggested commit message:");
    console.log(commitMessage);

    //token usage
    const { usage } = response;
    console.log("\nUsage:", usage);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();