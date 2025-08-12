# Webpage Support AI Agent

An AI-powered agent that scrapes webpages, stores content in a vector database, and answers questions about the scraped content using OpenAI's GPT models.

## Features

- 🕷️ **Web Scraping**: Extract content from any webpage
- 🧠 **AI Embeddings**: Generate vector embeddings using OpenAI
- 💾 **Vector Storage**: Store embeddings in ChromaDB
- 💬 **AI Chat**: Ask questions about scraped content
- 🔗 **Link Extraction**: Separate internal and external links

## Prerequisites

- Node.js 18+ (recommended 20+)
- Docker (for ChromaDB)
- OpenAI API Key

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/altafshaikh/webpage-support-ai-agent.git
cd webpage-support-ai-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start ChromaDB

```bash
docker-compose up -d
```

### 4. Environment variables

Create a `.env` file:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

### Ingest a webpage (scrape and store)

```bash
node index.js true
```

### Ask questions about scraped content

```bash
node index.js false
>> "What is page about?"
```

## Project Structure

```
├── index.js           # Main application file
├── docker-compose.yml # ChromaDB configuration
├── package.json       # Dependencies
├── .env              # Environment variables
└── README.md         # This file
```

## How it works

1. **Web Scraping**: Uses axios and cheerio to fetch and parse HTML
2. **Text Chunking**: Breaks content into manageable chunks
3. **Embeddings**: Generates vector embeddings using OpenAI
4. **Storage**: Stores embeddings in ChromaDB vector database
5. **Query**: Searches similar content and generates AI responses

## API Reference

### Main Functions

- `WebScraper(url)` - Scrapes webpage content
- `chunkText(text, size)` - Splits text into chunks
- `generateVectorEmbeddings(text)` - Creates embeddings
- `insertPage(embeddings, url, body, head)` - Stores in ChromaDB
- `chat(query)` - Answers questions about stored content

## Dependencies

- `axios` - HTTP client for web scraping
- `cheerio` - Server-side HTML parsing
- `openai` - OpenAI API client
- `chromadb` - Vector database client
- `dotenv` - Environment variable management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Author

Altaf Shaikh - [@ialtafshaikh](https://github.com/altafshaikh)
