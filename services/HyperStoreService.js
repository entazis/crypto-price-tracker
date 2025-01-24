const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const DHT = require('hyperdht')
const crypto = require('crypto')
const CoinGeckoService = require('./CoinGeckoService');
const cron = require('cron');

//TODO move to separate file, move to env, parse
const hyperbeeOpts = {
    keyEncoding: 'utf-8',
    valueEncoding: 'binary'
};
const getDHTOpts = (dhtSeed) => ({
    port: 40001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: '127.0.0.1', port: 30001 }] // note boostrap points to dht that is started via cli
});
const dhtSeedKey = 'dht-seed';
const rpcSeedKey = 'rpc-seed';

module.exports = class HyperStoreService {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.core = new Hypercore(dbPath);
        this.db = new Hyperbee(this.core, hyperbeeOpts);
        this.coinGeckoService = new CoinGeckoService();
        this.coinGeckoService.ping().then((res) => {
            console.log(res.data);
        }).catch(console.error);
        this.cron = new cron.CronJob(process.env.CRON_EXPRESSION, this.fetchPrices.bind(this));
    }

    async init() {
        await this.db.ready();
        let dhtSeed = (await this.get(dhtSeedKey))?.value;
        if (!dhtSeed) {
            dhtSeed = crypto.randomBytes(32);
            await this.set(dhtSeedKey, dhtSeed);
        }
        const dht = new DHT(getDHTOpts(dhtSeed));
        await dht.ready();
        let rpcSeed = (await this.get(rpcSeedKey))?.value
        if (!rpcSeed) {
            rpcSeed = crypto.randomBytes(32)
            await this.db.put(rpcSeedKey, rpcSeed)
        }

        this.fetchPrices();
        this.cron.start();

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
                prices: prices[coinId]
            };
            await this.storePrice(coinId, { timestamp, prices });
        }
    }

    async storePrice(coinId, priceData) {
        //TODO set key prefix from env
        const key = `price:${coinId}:${priceData.timestamp}`;
        await this.db.put(key, JSON.stringify(priceData));
    }

    async getLatestPrices(coinIds) {
        const prices = {};
        //TODO get the latest price for each coin
        for (const coinId of coinIds) {
            //TODO set key prefix from env
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
            //TODO set key prefix from env
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
}