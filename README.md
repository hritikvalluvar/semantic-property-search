# Semantic Property Search Application

A modern web application for searching real estate properties using natural language queries, powered by OpenAI embeddings and Pinecone vector database. This prototype demonstrates the potential of semantic search in real estate.

## 🏠 Overview

This application allows users to search for property listings using natural language instead of rigid filters. For example, users can search for "modern apartments with river view" or "affordable cozy homes with garden view in Richmond" and get semantically relevant results.

The application makes property search more intuitive and contextual compared to traditional filter-based search systems. It understands the semantic meaning behind user queries and finds properties that match the intent, not just the keywords.

### Key Improvements

This modern React implementation includes several key improvements:

| Feature | Description |
|---------|------------|
| Performance | Fast response times with optimized Node.js/Express backend |
| Resilient Search | Fallback search mechanism when API rate limits are hit |
| UI Responsiveness | Highly responsive with React components and Shadcn UI |
| Error Handling | Robust error handling with informative user feedback |
| Architecture | Modular client-server architecture with clear separation of concerns |
| Scalability | Separate frontend/backend for better scaling options |
| Search Algorithm | Sophisticated hybrid search with attribute extraction and fallback capability |
| Filter UX | Dynamic, user-friendly filters with real-time updates |
| Deployment | Optimized for deployment on Replit with proper port configuration |

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

This application requires the following environment variables:

```
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
```

### Installation and Running Locally

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

## 🌐 Deployment on Replit

The application is optimized for deployment on Replit.

### Deployment Features

- **Automatic Port Configuration**: Properly listens on the port assigned by Replit
- **Health Check Endpoint**: Available at `/api/healthcheck` for Replit deployment monitoring
- **Non-blocking Data Loading**: CSV data is loaded without blocking server startup
- **API Rate Limit Handling**: Fallback search mechanism when OpenAI API limits are reached
- **SVG Thumbnails**: All properties have pre-generated SVG images to reduce API costs

### Troubleshooting Replit Deployment

If you encounter issues with the deployment on Replit:

1. **API Keys**: 
   - Make sure both `OPENAI_API_KEY` and `PINECONE_API_KEY` are correctly set in Replit Secrets
   - These keys are essential for the application to connect to external services

2. **OpenAI Rate Limits**: 
   - The free tier of OpenAI has a limit of 2000 requests per day
   - The application includes a fallback text-based search when rate limits are hit
   
3. **Server Port Issues**:
   - If you see "address already in use" errors, restart the Replit environment
   - The application is configured to listen on port 5000 with proper host settings

4. **CSV Loading Issues**:
   - Check that the CSV file is loading properly by monitoring server logs
   - The application should show "Loaded X properties from CSV" in the logs

5. **Performance Optimization**:
   - For better performance, reduce the number of properties or optimize the embedding process
   - The application is designed to handle 125 properties efficiently on Replit

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

### Primary Search Flow
1. Property listings are loaded from the CSV file during server startup
2. Text embeddings are generated for each property using OpenAI's embedding model
3. Embeddings are stored in Pinecone's vector database for quick retrieval
4. When a user submits a search query, the system attempts to convert it to an embedding
5. Pinecone performs a similarity search to find semantically matching properties
6. Results are processed with attribute filtering and score boosting
7. Final results are ranked and returned to the user's interface

### Fallback Search Mechanism
If OpenAI API rate limits are reached:
1. The system detects the rate limit error (HTTP 429)
2. It automatically switches to the text-based search algorithm
3. The query is broken down into individual terms and matched against property attributes
4. Properties are scored based on matches across title, type, style, view, location, etc.
5. Exact word matches are given higher scores than partial matches
6. Additional attribute filtering (bedrooms, price range, etc.) is still applied
7. Results are sorted by relevance score and returned to the user

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

1. **Enhanced Fallback Algorithm**: Further improve the text-based search for even better results when OpenAI API is unavailable
2. **Caching System**: Implement query caching to reduce API calls and improve response time
3. **User Profiles**: Allow users to save preferences and search history for personalized results
4. **Interactive Map**: Display property locations on an interactive map with proximity search
5. **Multi-modal Search**: Enable searching by both text descriptions and reference images
6. **Property Comparison**: Add ability to compare multiple properties side by side
7. **Mobile Application**: Develop a dedicated mobile app with offline capabilities

## 📄 License

[MIT License](LICENSE)