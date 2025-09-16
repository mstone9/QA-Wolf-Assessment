# Start from a Node.js base image
FROM node:20-bookworm

# Install the system dependencies for Playwright, tailored for Debian "Bookworm".
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    # Core dependencies for Chromium
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libnss3 \
    libnspr4 \
    libxss1 \
    libappindicator3-1 \
    libsecret-1-0 \
    libgbm-dev \
    libgtk-3-0 \
    # Clean up APT cache to reduce image size
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to leverage
# Docker's build cache.
COPY package*.json ./

# Install project dependencies.
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# Command to run your application
CMD ["npm", "start"]