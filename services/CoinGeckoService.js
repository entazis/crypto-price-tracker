const axios = require('axios');

module.exports = class CoinGeckoService {
    apiUrl = process.env.COINGECKO_API_URL;
    apiKey = process.env.COINGECKO_API_KEY;
    apiKeyQuery = `x_cg_demo_api_key=${this.apiKey}`;
    vsCurrencyQuery = 'vs_currency=usd';
    orderQuery = 'order=market_cap_desc';
    getPerPageQuery = (count) => `per_page=${count}`;
    getCoinIdsQuery = (coinIds) => `coin_ids=${coinIds.join(',')}`;

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
        const coinIds = await this.getTopCryptoIds(cryptCnt);
        const prices = {};

        for (const exchangeId of exchangeIds) {
            try {
                const response = (await axios.get(
                    `${this.apiUrl}/exchanges/${exchangeId}/tickers?${this.getCoinIdsQuery(coinIds)}&${this.apiKeyQuery}`
                )).data;

                response.tickers?.filter(ticker =>
                    ticker.target === 'USDT' && coinIds.includes(ticker.coin_id)
                ).map(ticker => ({
                    coinId: ticker.coin_id,
                    exchange: exchangeId,
                    price: ticker.last
                })).forEach(result => {
                    if (!prices[result.coinId]) {
                        prices[result.coinId] = [];
                    }
                    prices[result.coinId].push({
                        exchange: result.exchange,
                        price: result.price
                    });
                });
            } catch (error) {
                console.error(`Error fetching price for from ${exchangeId}:`, error.message);
            }
        }

        return {
            timestamp: Date.now(),
            prices
        };
    }
}
