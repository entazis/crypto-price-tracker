const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');

class HyperStore {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.core = new Hypercore(dbPath);
        this.db = new Hyperbee(this.core, {
            keyEncoding: 'utf-8',
            valueEncoding: 'json'
        });
    }

    async storePrice(coinId, priceData) {
        const key = `price:${coinId}:${priceData.timestamp}`;
        await this.db.put(key, priceData);
    }
    
    async getLatestPrices(coinIds) {
        const prices = {};
        for (const coinId of coinIds) {
            const { value } = await this.db.get(`price:${coinId}:`);
            prices[coinId] = value;
        }
        return prices;
    }
    //TODO implement a scheduling mechanism to run the data pipeline at regular intervals e.g.every 30s
    //TODO ensure the pipeline can be executed both on - demand and as a scheduled task
    //TODO processed / stored data should be exposed via[Hypersawrm RPC](https://www.npmjs.com/package/@hyperswarm/rpc)
    //TODO implement getLatestPrices(pairs: string[])
    //TODO implement getHistoricalPrices(pairs: string[], from: number, to: number)
}