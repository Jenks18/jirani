#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Jirani deployment process...${NC}"

# Check for required tools
echo -e "\n${YELLOW}Checking prerequisites...${NC}"
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting." >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is required but not installed. Aborting." >&2; exit 1; }

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm install

# Run type check
echo -e "\n${YELLOW}Running type check...${NC}"
npm run type-check || { echo "Type check failed. Please fix the errors and try again."; exit 1; }

# Run linter
echo -e "\n${YELLOW}Running linter...${NC}"
npm run lint || { echo "Linting failed. Please fix the errors and try again."; exit 1; }

# Build the project
echo -e "\n${YELLOW}Building project...${NC}"
npm run build || { echo "Build failed. Please check the errors above."; exit 1; }

# Check for environment variables
echo -e "\n${YELLOW}Checking environment variables...${NC}"
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local file not found"
    echo "Please make sure to set up the following environment variables in your deployment platform:"
    echo "- NEXT_PUBLIC_SUPABASE_URL"
    echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "- NEXT_PUBLIC_MAPBOX_TOKEN"
fi

echo -e "\n${GREEN}✅ Pre-deployment checks completed${NC}"
echo -e "\nNext steps:"
echo "1. Push your changes to GitHub"
echo "2. Deploy to Vercel using the Vercel CLI or GitHub integration"
echo "3. Set up your environment variables in the Vercel dashboard"
