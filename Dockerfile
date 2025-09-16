# Start from a Node.js base image. We'll use a version
# that's compatible and will allow us to install packages.
FROM node:20-bookworm

# Install the system dependencies for Playwright.
# Note the change: we are now using `libasound2t64` instead of `libasound2`.
# This is the new, correct package name for Ubuntu 24.04 (noble).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    # Install dependencies required by Playwright, with fixes for newer Ubuntu
    ca-certificates \
    fonts-liberation \
    libasound2t64 \
    libnss3 \
    libnspr4 \
    libxss1 \
    libappindicator3-1 \
    libindicator3-7 \
    libsecret-1-0 \
    libgbm-dev \
    libgtk-3-0 \
    # Clean up APT when done
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json to leverage
# Docker's build cache.
COPY package*.json ./

# Install project dependencies.
# This will also install Playwright, but since the system dependencies
# are already installed, it will not attempt to install them again.
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# Command to run your application
CMD ["npm", "start"]