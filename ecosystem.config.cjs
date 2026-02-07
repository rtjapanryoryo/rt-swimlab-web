/** pm2 用設定。ターミナルを閉じてもアプリを常時起動させる */
module.exports = {
  apps: [
    {
      name: 'rt-swimlab-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev',
      cwd: __dirname,
      interpreter: 'node',
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'development' },
    },
  ],
};
