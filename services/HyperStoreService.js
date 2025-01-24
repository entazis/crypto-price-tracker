const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const DHT = require('hyperdht')
const crypto = require('crypto')
const CoinGeckoService = require('./CoinGeckoService');

module.exports = class HyperStoreService {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.core = new Hypercore(dbPath);
        this.db = new Hyperbee(this.core, {
            keyEncoding: 'utf-8',
            valueEncoding: 'binary'
        });
        this.coinGeckoService = new CoinGeckoService();
        this.coinGeckoService.ping().then((res) => {
            console.log(res.data);
        }).catch(console.error);
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
            await this.db.put('rpc-seed', rpcSeed)
        }

        this.fetchPrices();

        return { seed: rpcSeed, dht };
    }

    async get(key, opts) {
        return this.db.get(key, opts);
    }

    async set(key, value) {
        return this.db.put(key, value);
    }

    async fetchPrices() {
        const { timestamp, prices } = await this.coinGeckoService.fetchTopCryptoPrices();
        for (const coinId in prices) {
            const priceData = {
                timestamp,
                ...prices[coinId]
            };
            await this.storePrice(coinId, priceData);
        }
    }

    async storePrice(coinId, priceData) {
        const key = `price:${coinId}:${priceData.timestamp}`;
        await this.db.put(key, JSON.stringify(priceData));
    }

    async getLatestPrices(coinIds) {
        const prices = {};
        //TODO is there an efficient way to fetch prices for multiple coins in a single request?
        //TODO get the latest price for each coin
        for (const coinId of coinIds) {
            const stream = this.db.createReadStream({
                gte: `price:${coinId}:`,
                limit: 1
            });

            for await (const { value } of stream) {
                prices[coinId] = JSON.parse(value.toString());
            }
        }
        return prices;
    }

    async getHistoricalPrices(coinIds, from, to) {
        const prices = {};
        for (const coinId of coinIds) {
            prices[coinId] = [];
            const stream = this.db.createReadStream({
                gte: `price:${coinId}:${from}`,
                lte: `price:${coinId}:${to}`
            });

            for await (const { value } of stream) {
                prices[coinId].push(JSON.parse(value.toString()));
            }
        }
        return prices;
    }

    //TODO implement a scheduling mechanism to run the data pipeline at regular intervals e.g.every 30s
    //TODO ensure the pipeline can be executed both on - demand and as a scheduled task
}