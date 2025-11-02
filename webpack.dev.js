const path = require('path');
const common = require('./webpack.common.js');
const { merge } = require('webpack-merge');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              insert: 'head'
            }
          },
          'css-loader',
        ],
      },
    ],
  },
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    port: 9000,
    host: 'localhost',
    allowedHosts: 'all',
    client: {
      logging: 'none',
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    webSocketServer: false, // Menonaktifkan WebSocket server
    hot: false,
    liveReload: false, // Disable live reload
    watchFiles: { // Disable file watching
      paths: [],
    },
  },
});
