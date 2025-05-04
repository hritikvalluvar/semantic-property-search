#!/bin/bash

# Run the standard build
npm run build

# Make sure the CSV data file is available to the serverless function
mkdir -p api/data
cp semantic_property_listings.csv api/data/

# Ensure the api directory and its contents are included in the build
cp -r api dist/