'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')

const main = async () => {
    const publicKey = Buffer.from(process.argv[2], 'hex');
    if (!publicKey) {
        console.error('Usage: node client.js <server-public-key>');
        process.exit(1);
    } else {
        console.log('public key:', publicKey.toString('hex'));
    }

    // hyperbee db
    const hcore = new Hypercore('./db/rpc-client')
    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    await hbee.ready()

    // resolved distributed hash table seed for key pair
    let dhtSeed = (await hbee.get('dht-seed'))?.value
    if (!dhtSeed) {
        // not found, generate and store in db
        dhtSeed = crypto.randomBytes(32)
        await hbee.put('dht-seed', dhtSeed)
    }

    // start distributed hash table, it is used for rpc service discovery
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
        // Wait for DHT peer discovery
        console.log('Waiting for peer discovery...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        console.log('Attempting to connect to server...')
        console.log('Server public key:', publicKey.toString('hex'))

        const payload = { nonce: 126 }
        const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8')

        console.log('Sending request...')
        const respRaw = await Promise.race([
            rpc.request(publicKey, 'ping', payloadRaw),
            timeout(15000)
        ])
        
        const resp = JSON.parse(respRaw.toString('utf-8'))
        console.log('Response:', resp)
    } catch (err) {
        console.error('Error:', err)
    } finally {
        console.log('Cleaning up...')
        await rpc.destroy()
        await dht.destroy()
    }
}

main().catch(console.error)