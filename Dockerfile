# Start from the official Playwright Docker image.
# We'll use the version you found in the documentation.
FROM mcr.microsoft.com/playwright:v1.55.0-noble

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to leverage
# Docker's build cache.
COPY package*.json ./

# Install your Node.js dependencies, including the Playwright package.
# The base image does not include the Playwright library itself.
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# Command to run your application
CMD ["npm", "start"]