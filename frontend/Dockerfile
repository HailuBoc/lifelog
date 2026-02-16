# Frontend Dockerfile for LifeLog Next.js App
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the production server
CMD ["npm", "start"]
