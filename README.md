# Crypto Price Tracker

A Node.js application that gathers cryptocurrency price data using Hyperswarm RPC and Hypercores.

## Features

- Fetches real-time crypto prices from CoinGecko API
- Stores price data in a Hyperbee database
- Provides RPC endpoints for retrieving latest and historical prices
- Automatically updates prices every 30 seconds

## Prerequisites

- Node.js
- npm
- A CoinGecko API key

## Installation

1. Clone the repository:
```
git clone https://github.com/entazis/nodejs-tether-challenge.git
cd nodejs-tether-challenge
```

2. Install dependencies:
```
npm install
```

3. Create .env file from template:
```
cp .env.example .env
```

4. Configure your environment variables in .env:
```
COINGECKO_API_URL=https://api.coingecko.com/api/v3/
COINGECKO_API_KEY=your-api-key-here
CRON_EXPRESSION="*/30 * * * * *"
```
Usage

1. Start the server:
```
npm run server
```

2. Start the client (in a separate terminal):
```
npm run client <server-public-key>
```
Replace <server-public-key> with the public key displayed when starting the server.

API
The server provides three RPC endpoints:

* ping: Basic connectivity test
* getLatestPrices: Retrieves latest prices for specified cryptocurrencies
* getHistoricalPrices: Retrieves historical price data within a time range

Project Structure
* server.js - Main server application
* client.js - RPC client implementation
* CoinGeckoService.js - Handles CoinGecko API interactions
* HyperStoreService.js - Manages data storage and retrieval

License:
This project is licensed under the MIT License - see the LICENSE file for details.
