# Base Node.js LTS image
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend production bundle (dist/)
RUN npm run build

# Environment settings
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start the unified production server
CMD ["node", "src/server/server.js"]
