import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import dotenv from "dotenv";
import { ChromaClient } from "chromadb";
import readline from "readline";

dotenv.config();

const chromaClient = new ChromaClient({
  url: "http://localhost:8000",
});

const heartbeat = chromaClient.heartbeat();
console.info(heartbeat);

const collectionName = "WebPages";

const llmClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const llmModel = "text-embedding-3-small";

async function insertPage(embeddings, url, body = "", head = "") {
  const pageCollection = await chromaClient.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: null,
  });
  // Note: Using OpenAI embeddings directly

  await pageCollection.add({
    ids: [url],
    embeddings: [embeddings],
    metadatas: [{ url, body, head }],
  });
}

function chunkText(text, chunkSize = 1000) {
  const chunks = [];
  const words = text.split(" ");

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    chunks.push(chunk);
  }

  return chunks;
}

async function generateVectorEmbeddings(text) {
  const vector = await llmClient.embeddings.create({
    model: llmModel,
    input: text,
    encoding_format: "float",
  });
  return vector.data[0].embedding;
}

async function injestPage(url) {
  console.info(`🚧 Injesting page started for: ${url}`);

  const { pageBody, pageHead, internalLinks, externalLinks, links } =
    await WebScraper(url);

  console.info(`🔗 Internal links: ${internalLinks || []}`);

  for (const chunk of chunkText(pageBody, 1000)) {
    const embedding = await generateVectorEmbeddings(chunk);
    await insertPage(embedding, url, chunk, pageHead, pageBody);
  }

  const headEmbedding = await generateVectorEmbeddings(pageHead);
  await insertPage(headEmbedding, url, "", pageHead);

  // Do not injest internal links recursively for now
  //   for (const link of internalLinks) {
  //     const _url = `${url}${link}`;
  //     await injestPage(_url);
  //   }

  console.info(`🚀 Injesting page completed for: ${url}`);

  return {
    pageBody,
    pageHead,
    internalLinks,
    externalLinks,
    links,
  };
}

async function WebScraper(url) {
  if (!url) {
    console.error("URL is required");
    return;
  }

  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const pageBody = $("body").html();
  const pageHead = $("head").html();

  const uniqueLinks = new Set();
  $("a").each((i, link) => {
    const href = $(link).attr("href");
    if (
      !href ||
      href.includes("@") ||
      href == "#" ||
      href.startsWith("#") ||
      href == "/"
    ) {
      return;
    }
    uniqueLinks.add(href);
  });
  const links = Array.from(uniqueLinks);

  const internalLinks = links.filter((link) => !link.startsWith("https://"));
  const externalLinks = links.filter((link) => link.startsWith("https://"));

  return { pageBody, pageHead, internalLinks, externalLinks, links };
}

async function chat(query = "") {
  const queryEmbedding = await generateVectorEmbeddings(query);

  const pageCollection = await chromaClient.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: null,
  });

  const results = await pageCollection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 1,
  });

  const body = results.metadatas[0]
    .map((metadata) => metadata.body)
    .filter((e) => e.trim() !== "" && !!e);
  const head = results.metadatas[0]
    .map((metadata) => metadata.head)
    .filter((e) => e.trim() !== "" && !!e);
  const url = results.metadatas[0]
    .map((metadata) => metadata.url)
    .filter((e) => e.trim() !== "" && !!e);

  const reply = await llmClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a helpful AI Support Agent that can answer questions about given webpage`,
      },
      {
        role: "user",
        content: `
        Question: ${query}\n\n
        Webpage: ${body.join(", ")}
        URL: ${url.join(", ")} 
        Head: ${head.join(", ")}
        `,
      },
    ],
  });

  console.log("🤖", reply.choices[0].message.content);
  return reply.choices[0].message.content;
}

const userInput = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  // Example Usage for injesting vector embeddings: node index.js true
  const isInjest = process.argv.slice(2)[0] !== "false";
  if (isInjest) {
    const urls = ["https://altafshaikh.vercel.app/"];

    for (const url of urls) {
      await injestPage(url);
    }
    console.info("🤖: Goodbye!");
    process.exit(0);
  } else {
    // Example Usage for querying: node index.js false
    userInput.question("🤖: How can I help you? \n>> ", async (query) => {
      await chat(query);
      return userInput.close();
    });
  }
}

main();
