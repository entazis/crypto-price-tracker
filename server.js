'use strict'

require('dotenv').config();
const RPC = require('@hyperswarm/rpc')
const HyperStore = require('./HyperStore');

const coinGeckoService = require('./CoinGeckoService');
coinGeckoService.ping().then((res) => {
    console.log(res.data);
}).catch(console.error);

const main = async () => {
    const hyperStore = new HyperStore('./db/rpc-server');
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
    console.log('rpc server started listening on public key:', rpcServer.publicKey.toString('hex'))
    // rpc server started listening on public key: 763cdd329d29dc35326865c4fa9bd33a45fdc2d8d2564b11978ca0d022a44a19

    // bind handlers to rpc server
    rpcServer.respond('ping', async (reqRaw) => {
        console.log('ping request:', reqRaw.toString('utf-8'))
        // reqRaw is Buffer, we need to parse it
        const req = JSON.parse(reqRaw.toString('utf-8'))

        const resp = { nonce: req.nonce + 1 }

        // we also need to return buffer response
        const respRaw = Buffer.from(JSON.stringify(resp), 'utf-8')
        return respRaw
    });

    rpcServer.respond('getLatestPrices', async (reqRaw) => {
        const req = JSON.parse(reqRaw.toString('utf-8'));

        //TODO call get latest prices from coingecko
        const resp = null;

        return Buffer.from(JSON.stringify(resp), 'utf-8');
    })

    rpcServer.respond('getHistoricalPrices', async (reqRaw) => {
        const req = JSON.parse(reqRaw.toString('utf-8'));

        //TODO call get historical prices from coingecko
        const resp = null;

        return Buffer.from(JSON.stringify(resp), 'utf-8');
    })
}

main().catch(console.error)
