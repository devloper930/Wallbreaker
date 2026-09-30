# Base Node.js LTS image (Node 22 required for latest Supabase SDK)
FROM node:22-alpine

WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Environment build arguments for Vite bundle
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Build the frontend production bundle (dist/)
RUN npm run build

# Environment settings
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start the unified production server
CMD ["node", "src/server/server.js"]
