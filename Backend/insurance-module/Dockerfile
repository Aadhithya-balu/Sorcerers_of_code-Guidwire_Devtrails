FROM node:20-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
