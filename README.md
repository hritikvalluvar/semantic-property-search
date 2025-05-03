# Semantic Property Search Application

A modern web application for searching real estate properties using natural language queries, powered by OpenAI embeddings and Pinecone vector database.

## 🏠 Overview

This application allows users to search for property listings using natural language instead of rigid filters. For example, users can search for "modern apartments with river view" or "affordable cozy homes with garden view in Richmond" and get semantically relevant results.

### Features

- **Natural Language Search**: Find properties using conversational queries
- **Semantic Understanding**: Matches property features based on meaning, not just keywords
- **Real-time Filtering**: Filter results by property type, style, location, price range, and more
- **Relevance Scoring**: Results are ranked by similarity to your query
- **Responsive UI**: Clean, modern interface that works on all devices

## 🛠️ Technology Stack

### Frontend
- React with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI components
- Tailwind CSS for styling

### Backend
- Express.js server
- OpenAI API for generating text embeddings
- Pinecone vector database for similarity search
- CSV data import functionality

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key
- Pinecone API key
- Pinecone index named 'property-listings-index' (or update the INDEX_NAME in `server/services/pinecone.ts`)

### Environment Variables

Create a `.env` file in the root directory with:

```
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=property-listings-index
```

### Installation

1. Clone this repository
   ```bash
   git clone https://github.com/yourusername/property-search-app.git
   cd property-search-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to http://localhost:5000

## 📊 Data Structure

The application uses a property listings CSV with the following fields:
- id
- title
- description
- type (Studio, Flat, Bungalow, etc.)
- style (Modern, Victorian, Contemporary, etc.)
- location
- bedrooms
- bathrooms
- price
- view (River View, Garden View, Park View, etc.)
- furnishing (Furnished, Unfurnished, Part-Furnished)

## 🔍 How It Works

1. Property listings are loaded from the CSV file
2. Text embeddings are generated for each property using OpenAI's embedding model
3. Embeddings are stored in Pinecone's vector database
4. When a user submits a search query, the query is converted to an embedding
5. Pinecone performs a similarity search to find the closest matching properties
6. Results are returned with relevance scores and displayed to the user

## 📝 API Endpoints

- `GET /api/property/filters` - Get all available filter options
- `POST /api/property/search` - Search properties using natural language

## 📄 License

[MIT License](LICENSE)