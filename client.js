'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')

//TODO missing ; at the end of the line
//TODO move to separate file, env
const dhtSeedKey = 'dht-seed'
const hypercoreDbPath = './db/rpc-client';

const main = async () => {
    const publicKey = Buffer.from(process.argv[2], 'hex');
    if (!publicKey) {
        console.error('Usage: node client.js <server-public-key>');
        process.exit(1);
    } else {
        console.log('public key:', publicKey.toString('hex'));
    }

    //TODO move opts to constant, set from env
    const hcore = new Hypercore(hypercoreDbPath)
    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    await hbee.ready()

    let dhtSeed = (await hbee.get(dhtSeedKey))?.value
    if (!dhtSeed) {
        dhtSeed = crypto.randomBytes(32)
        await hbee.put(dhtSeedKey, dhtSeed)
    }

    const dht = new DHT({
        port: 50001,
        keyPair: DHT.keyPair(dhtSeed),
        bootstrap: [{ host: '127.0.0.1', port: 30001 }] // note boostrap points to dht that is started via cli
    })
    await dht.ready()

    console.log('DHT is ready, creating RPC client...')
    const rpc = new RPC({
        dht,
        timeout: 30000
    })

    const timeout = (ms) => new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), ms)
    })

    try {
        console.log('Waiting for peer discovery...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        console.log('Attempting to connect to server...')
        console.log('Server public key:', publicKey.toString('hex'))

        console.log('Sending ping request...')
        const pingRespRaw = await Promise.race([
            rpc.request(publicKey, 'ping', Buffer.from(JSON.stringify({ nonce: 126 }), 'utf-8')),
            timeout(15000)
        ])
        console.log('Response:', JSON.parse(pingRespRaw.toString('utf-8')))

        console.log('Sending getLatestPrices request...')
        const getLatestPricesRaw = await Promise.race([
            rpc.request(publicKey, 'getLatestPrices', Buffer.from(JSON.stringify({ coinIds: ['bitcoin', 'ethereum'] }), 'utf-8')),
            timeout(15000)
        ])
        const latestPrices = JSON.parse(getLatestPricesRaw.toString('utf-8'))
        console.log('Response:', latestPrices)

        console.log('Sending getHistoricalPrices request...')
        const getHistoricalPricesRaw = await Promise.race([
            rpc.request(publicKey, 'getHistoricalPrices', Buffer.from(JSON.stringify({ coinIds: ['bitcoin', 'ethereum'], from: 0, to: Date.now() }))),
            timeout(15000)
        ])
        const historicalPrices = JSON.parse(getHistoricalPricesRaw.toString('utf-8'))
        console.log('Response:', historicalPrices)
    } catch (err) {
        console.error('Error:', err)
    } finally {
        console.log('Cleaning up...')
        await rpc.destroy()
        await dht.destroy()
    }
}

main().catch(console.error)