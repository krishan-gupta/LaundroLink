FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy all source code
COPY . .

# Build the application
RUN pnpm run build

# Hugging Face Spaces expects the app to run on port 7860 by default
ENV PORT=7860
EXPOSE 7860

# Start the server
CMD ["pnpm", "run", "start"]
