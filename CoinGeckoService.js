const axios = require('axios');

//TODO refactor, move into sub-directory
module.exports = class CoinGeckoService {
    apiUrl = process.env.COINGECKO_API_URL;
    apiKey = process.env.COINGECKO_API_KEY;
    apiKeyQuery = `x_cg_demo_api_key=${this.apiKey}`;
    vsCurrencyQuery = 'vs_currency=usd';
    orderQuery = 'order=market_cap_desc';
    getPerPageQuery = (count) => `per_page=${count}`;
    getCoinIdsQuery = (coinIds) => `coin_ids=${coinIds.join(',')}`;

    //TODO create a coingecko account and get an API key
    async ping() {
        return (await axios.get(`${this.apiUrl}/ping?${this.apiKeyQuery}`));
    }

    async getTopExchangeIds(count) {
        const exchanges = (await axios.get(`${this.apiUrl}/exchanges?${this.apiKeyQuery}`)).data;
        exchanges.sort((a, b) => b.trade_volume_24h_btc - a.trade_volume_24h_btc);
        return exchanges.slice(0, count).map(exchange => exchange.id);
    }

    async getTopCryptoIds(count) {
        const cryptos = (await axios.get(`${this.apiUrl}/coins/markets?${this.vsCurrencyQuery}&${this.orderQuery}&${this.getPerPageQuery(count)}&${this.apiKeyQuery}`)).data;
        return cryptos.map(crypto => crypto.id);
    }

    async fetchTopCryptoPrices(cryptCnt = 5, exchangeCnt = 3) {
        const exchangeIds = await this.getTopExchangeIds(exchangeCnt);
        const cryptoIds = await this.getTopCryptoIds(cryptCnt);
        const prices = {};

        //TODO optimize runtime by fetching prices for all cryptos from an exchange in a single request
        //TODO ensure you store minimal data considering that dataset might grow large
        //TODO make sure you store necessary info about exchanges from which price is calculated
        //TODO handle data quality issues
        for (const cryptoId of cryptoIds) {
            prices[cryptoId] = [];

            for (const exchangeId of exchangeIds) {
                try {
                    const response = (await axios.get(
                        `${this.apiUrl}/exchanges/${exchangeId}/tickers?${this.getCoinIdsQuery([cryptoId])}&${this.apiKeyQuery}`
                    )).data;

                    const usdtTicker = response.tickers?.find(ticker =>
                        ticker.target === 'USDT' || ticker.target === 'UST'
                    );

                    if (usdtTicker) {
                        prices[cryptoId].push({
                            exchange: exchangeId,
                            price: usdtTicker.last
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching price for ${cryptoId} from ${exchangeId}:`, error.message);
                }
            }
        }

        return {
            timestamp: Date.now(),
            prices: Object.fromEntries(
                Object.entries(prices).map(([cryptoId, exchangePrices]) => [
                    cryptoId,
                    {
                        averagePrice: exchangePrices.reduce((acc, curr) => acc + curr.price, 0) / exchangePrices.length,
                        exchanges: exchangePrices
                    }
                ])
            )
        };
    }
}