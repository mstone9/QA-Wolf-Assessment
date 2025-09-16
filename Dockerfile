# Start from a base Node.js image that includes a lot of
# common tools and dependencies. We use a version that's
# compatible with your project, for example, Node.js 18.
FROM node:18-bullseye-slim

# Install system dependencies for Playwright.
# This list is from the Playwright documentation and covers
# the common dependencies needed to run Chromium.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    # Install dependencies required by Playwright
    ca-certificates \
    fonts-liberation \
    libasound2 \
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
# Docker's build cache. This installs dependencies before
# copying the rest of your app code.
COPY package*.json ./

# Install project dependencies, including dev dependencies,
# as Playwright and its browsers are typically dev dependencies.
RUN npm install

# Install the Playwright browsers after the npm install.
# This is a more robust way to ensure they are available.
# The `--with-deps` is not needed here because we installed
# them manually above with `apt-get`.
RUN npx playwright install chromium

# Copy the rest of your application code
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# Command to run your application
CMD ["npm", "start"]