# Semantic Property Search Application

A modern web application for searching real estate properties using natural language queries, powered by OpenAI embeddings and Pinecone vector database. This prototype was built for an AI Engineer position at Savills to demonstrate the potential of semantic search in real estate.

## 🏠 Overview

This application allows users to search for property listings using natural language instead of rigid filters. For example, users can search for "modern apartments with river view" or "affordable cozy homes with garden view in Richmond" and get semantically relevant results.

The application is designed to make property search more intuitive and contextual compared to traditional filter-based search systems. It understands the semantic meaning behind user queries and finds properties that match the intent, not just the keywords.

### Streamlit vs. React Implementation Comparison

This React implementation improves upon the original Streamlit prototype in several key areas:

| Feature | Streamlit Prototype | React Implementation |
|---------|-------------------|---------------------|
| Performance | Slower due to Python backend | Faster with optimized Node.js/Express backend |
| UI Responsiveness | Limited by Streamlit framework | Highly responsive with React components |
| Deployment | More complex deployment | Simpler deployment to Vercel |
| Error Handling | Basic error handling | Robust error handling with fallback mechanisms |
| Code Structure | Monolithic application | Modular client-server architecture |
| Scalability | Limited by Streamlit's architecture | More scalable with separate frontend/backend |
| Search Algorithm | Basic vector search | Hybrid search with attribute extraction |
| Filter UX | Static Streamlit widgets | Dynamic, user-friendly filters |

### Features

- **Natural Language Search**: Find properties using conversational queries like "modern flat with river view in Chelsea"
- **Semantic Understanding**: Matches property features based on meaning, not just keywords
- **Hybrid Search Algorithm**: Combines vector similarity with attribute matching for better results
- **Real-time Filtering**: Filter results by property type, style, location, price range, and more
- **Attribute Extraction**: Automatically extracts and understands property attributes from queries
- **Location-aware Search**: Understands proximity queries ("near", "close to") and factors distance into results
- **Price Range Interpretation**: Handles price queries like "under £500k", "around £1 million"
- **SVG Property Thumbnails**: Visual representation of property characteristics
- **Fallback Search Mechanism**: Maintains functionality even when API rate limits are hit
- **Relevance Scoring**: Results are ranked by similarity to your query with boosting for exact matches
- **Responsive UI**: Clean, modern interface that works on all devices
- **Error Resilience**: Graceful degradation when external services are unavailable

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

## 🏗️ Architecture

### System Architecture Diagram
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │◄────┤  Express Server │◄────┤  Pinecone DB    │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │                       ▲
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │                 │              │
         └────────────►│   User Query     │──────────────┘
                        │                 │
                        └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │                 │
                        │    OpenAI API   │
                        │                 │
                        └─────────────────┘
```

### Data Flow Diagram
```
┌─────────────────────────────┐
│                             │
│ 1. User enters search query │
│                             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│                             │
│ 2. Extract query attributes │
│    (bedrooms, location, etc)│
│                             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│                             │
│ 3. Convert query to vector  │
│    embedding via OpenAI     │
│                             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│                             │
│ 4. Search vector database   │
│    (Pinecone) for matches   │
│                             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│                             │
│ 5. Apply attribute filters  │
│    & boost relevance scores │
│                             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│                             │
│ 6. Return ranked results    │
│    to the user              │
│                             │
└─────────────────────────────┘
```

### Hybrid Search Algorithm

The application uses a hybrid search approach:

1. **Vector Search**: Uses OpenAI embeddings to find semantically similar properties
2. **Attribute Matching**: Boosts scores for properties that match specific attributes extracted from the query
3. **Price Proximity**: Adjusts scores based on how close a property's price is to the target price
4. **Location Distance**: Calculates and factors in physical distance for location-based queries
5. **Fallback Mechanism**: Uses text-based search when vector search is unavailable (API rate limits, etc.)

### Error Handling & Resilience

- Graceful degradation when OpenAI API hits rate limits
- Fallback to text search when vector search is unavailable
- Comprehensive error handling for API failures
- User-friendly error messages

## 📝 API Endpoints

- `GET /api/property/filters` - Get all available filter options
- `POST /api/property/search` - Search properties using natural language
- `GET /api/property/image/:id` - Check if a property image exists
- `POST /api/property/image/:id` - Generate a property image

## 🚀 Future Enhancements

1. **Advanced Query Parsing**: Implement more sophisticated NLP for understanding complex queries
2. **User Profiles**: Allow users to save preferences and search history
3. **Interactive Map**: Display property locations on an interactive map
4. **Real-time Updates**: Integrate with property listing APIs for real-time data
5. **Multi-modal Search**: Enable searching by both text and image references
6. **Recommendation Engine**: Suggest properties based on user behavior and preferences

## 📄 License

[MIT License](LICENSE)