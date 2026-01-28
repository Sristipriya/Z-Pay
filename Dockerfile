# 1. Use official Node.js image
FROM node:18-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package.json & lock file
COPY package.json package-lock.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy all app code
COPY . .

# 6. Build the Next.js app
RUN npm run build

# 7. Expose port
EXPOSE 3000

# 8. Start the app
CMD ["npm", "run", "start"]
