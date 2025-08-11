import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import dotenv from "dotenv";
import { ChromaClient } from "chromadb";

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

  console.info(`🔗 Internal links: ${internalLinks}`);

  const headEmbedding = await generateVectorEmbeddings(pageHead);
  await insertPage(headEmbedding, url, "", pageHead);

  for (const chunk of chunkText(pageBody, 500)) {
    const embedding = await generateVectorEmbeddings(chunk);
    await insertPage(embedding, url, chunk, pageHead, pageBody);
  }

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
    if (!href || href.includes("@") || href == "#" || href.startsWith("#")) {
      return;
    }
    uniqueLinks.add(href);
  });
  const links = Array.from(uniqueLinks);

  const internalLinks = links.filter((link) => !link.startsWith("https://"));
  const externalLinks = links.filter((link) => link.startsWith("https://"));

  return { pageBody, pageHead, internalLinks, externalLinks, links };
}

async function main() {
  const urls = ["https://altafshaikh.vercel.app/"];

  for (const url of urls) {
    await injestPage(url);
  }
}

main();
