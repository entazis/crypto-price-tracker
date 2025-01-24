const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const DHT = require('hyperdht')
const crypto = require('crypto')

module.exports = class HyperStore {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.core = new Hypercore(dbPath);
        this.db = new Hyperbee(this.core, {
            keyEncoding: 'utf-8',
            valueEncoding: 'binary'
        });
    }

    async init() {
        await this.db.ready();
        let dhtSeed = (await this.get('dht-seed'))?.value;
        if (!dhtSeed) {
            dhtSeed = crypto.randomBytes(32)
            await this.set('dht-seed', dhtSeed)
        }
        const dht = new DHT({
            port: 40001,
            keyPair: DHT.keyPair(dhtSeed),
            bootstrap: [{ host: '127.0.0.1', port: 30001 }] // note boostrap points to dht that is started via cli
        });
        await dht.ready();
        let rpcSeed = (await this.get('rpc-seed'))?.value
        if (!rpcSeed) {
            rpcSeed = crypto.randomBytes(32)
            await hbee.put('rpc-seed', rpcSeed)
        }
        return { seed: rpcSeed, dht };
    }

    async get(key, opts) {
        return this.db.get(key, opts);
    }

    async set(key, value) {
        return this.db.put(key, value);
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

    async getHistoricalPrices(coinIds, from, to) {
        const prices = {};
        for (const coinId of coinIds) {
            const { value } = await this.db.get(`price:${coinId}:`, {
                gte: `price:${coinId}:${from}`,
                lte: `price:${coinId}:${to}`
            });
            prices[coinId] = value;
        }
        return prices;
    }

    //TODO implement a scheduling mechanism to run the data pipeline at regular intervals e.g.every 30s
    //TODO ensure the pipeline can be executed both on - demand and as a scheduled task
    //TODO processed / stored data should be exposed via[Hypersawrm RPC](https://www.npmjs.com/package/@hyperswarm/rpc)
}