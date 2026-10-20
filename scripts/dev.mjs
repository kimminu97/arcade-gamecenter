import{spawn}from'node:child_process';
const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','watch','server/index.ts'],{stdio:'inherit',env:{...process.env,NODE_ENV:'development'}});child.on('exit',code=>process.exit(code??0));
