let cp = require('child_process');
const sp = cp.spawn('/usr/local/bin/node',['./index.js'],{
    detached: true,
});

sp.unref();
process.exit(1)
