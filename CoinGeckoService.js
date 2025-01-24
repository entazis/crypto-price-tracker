const axios = require('axios');

class CoinGeckoService {
    apiUrl = process.env.COINGECKO_API_URL;
    apiKey = process.env.COINGECKO_API_KEY;
    apiKeyQuery = `x_cg_demo_api_key=${this.apiKey}`;
    vsCurrencyQuery = 'vs_currency=usd';
    orderQuery = 'order=market_cap_desc';
    getPerPageQuery = (count) => `per_page=${count}`;

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

    //TODO check the coingecko API for the correct endpoint, fetch data
    //TODO data should include prices for top 5 crypto currencies(determined by coingecko) against USDt
    //TODO prices should be fetched from top 3 exchanges(determined by coingecko) and should calculate average price

    //TODO ensure you store minimal data considering that dataset might grow large
    //TODO make sure you store necessary info about exchanges from which price is calculated
    //TODO handle data quality issues

    //TODO the data should be stored using[Hypercore / Hyperbee databases](https://docs.pears.com/building-blocks/hypercore)
    //TODO implement a scheduling mechanism to run the data pipeline at regular intervals e.g.every 30s
    //TODO ensure the pipeline can be executed both on - demand and as a scheduled task
    //TODO processed / stored data should be exposed via[Hypersawrm RPC](https://www.npmjs.com/package/@hyperswarm/rpc)
    //TODO implement getLatestPrices(pairs: string[])
    //TODO implement getHistoricalPrices(pairs: string[], from: number, to: number)


}

module.exports = new CoinGeckoService;
