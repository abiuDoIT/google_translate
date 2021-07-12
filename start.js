let cp = require('child_process');
const sp = cp.spawn('/Users/abiu/.nvm/versions/node/v11.10.0/bin/node',['./index.js'],{
    detached: true,
});

sp.unref();
process.exit(1)
