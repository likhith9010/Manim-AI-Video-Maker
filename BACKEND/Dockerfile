# Multi-stage build for Node.js + Python backend
FROM python:3.11-slim AS python-base

# Install system dependencies for Manim
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    pkg-config \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    texlive \
    texlive-latex-extra \
    texlive-fonts-extra \
    texlive-science \
    && rm -rf /var/lib/apt/lists/*

# Install Manim
RUN pip install --no-cache-dir manim

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create media directories
RUN mkdir -p media/audio media/videos media/codes

# Expose port (Cloud Run will override this)
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
