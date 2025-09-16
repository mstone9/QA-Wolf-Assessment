# Use the official Playwright Docker image as the base.
# This image comes with Node.js and all the necessary
# system dependencies for Playwright to run.
FROM mcr.microsoft.com/playwright/node:18

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to leverage
# Docker's build cache. This installs dependencies before
# copying the rest of your app code.
COPY package*.json ./

# Install project dependencies. The browsers are already
# installed in the base image, so we don't need a
# separate step for npx playwright install.
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# Command to run your application
CMD ["npm", "start"]