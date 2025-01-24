'use strict'

require('dotenv').config();
const RPC = require('@hyperswarm/rpc')
const HyperStore = require('./services/HyperStoreService');

//TODO move to separate file, env
const hypercoreDbPath = './db/rpc-server';

const main = async () => {
    const hyperStore = new HyperStore(hypercoreDbPath);
    const rpcOptions = await hyperStore.init();

    //TODO refactor into a separate file
    const rpc = new RPC(rpcOptions);
    const rpcServer = rpc.createServer()
    rpcServer.on('connection', (conn) => {
        console.log('New connection received')
        conn.on('error', (err) => console.error('Connection error:', err))
    })
    rpcServer.on('error', (err) => console.error('Server error:', err))
    await rpcServer.listen()
    console.log('rpc server started listening on public key:', rpcServer.publicKey.toString('hex'));

    //TODO missin request, response data types

    rpcServer.respond('ping', async (reqRaw) => {
        //TODO move utf-8 to constant, set it from env
        console.log('ping request:', reqRaw.toString('utf-8'))
        const req = JSON.parse(reqRaw.toString('utf-8'))
        const resp = { nonce: req.nonce + 1 }
        const respRaw = Buffer.from(JSON.stringify(resp), 'utf-8')
        return respRaw
    });

    rpcServer.respond('getLatestPrices', async (reqRaw) => {
        const { coinIds } = JSON.parse(reqRaw.toString('utf-8'));
        const resp = await hyperStore.getLatestPrices(coinIds);
        return Buffer.from(JSON.stringify(resp), 'utf-8');
    });

    rpcServer.respond('getHistoricalPrices', async (reqRaw) => {
        const { coinIds, from, to } = JSON.parse(reqRaw.toString('utf-8'));
        const resp = await hyperStore.getHistoricalPrices(coinIds, from, to);
        return Buffer.from(JSON.stringify(resp), 'utf-8');
    });
}

main().catch(console.error)
