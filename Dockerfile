# 1. Start from official Node image
FROM node:20-alpine

# 2. Create working directory inside container
WORKDIR /app

# 3. Copy package files first
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of your project files
COPY . .

# 6. Tell Docker this container listens on port 3000
EXPOSE 3000

# 7. Command to run when container starts
CMD ["node", "server.js"]