import axios from "axios";
import * as cheerio from "cheerio";

async function WebScraper(url) {
  if (!url) {
    console.error("URL is required");
    return;
  }

  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const pageBody = $("body").html();
  const pageHead = $("head").html();

  const links = [];
  $("a").each((i, link) => {
    const href = $(link).attr("href");
    if (!href || href == "/" || href.includes("@") || href == "#") {
      return;
    }
    links.push(href);
  });

  const internalLinks = links.filter((link) => !link.startsWith("https://"));
  const externalLinks = links.filter((link) => link.startsWith("https://"));

  return { pageBody, pageHead, internalLinks, externalLinks, links };
}

async function main() {
  const urls = ["https://altafshaikh.vercel.app/"];

  for (const url of urls) {
    const { pageBody, pageHead, internalLinks } = await WebScraper(url);
    console.log(internalLinks);
  }
}

main();
