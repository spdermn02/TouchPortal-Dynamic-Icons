const path = require('path');
const nodeExternals = require('webpack-node-externals');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  mode:"production",
  target: 'node',
  node: {
    __dirname:false
  },
  // externals: [nodeExternals()], // removes node_modules from your final bundle
  entry: './dist/index.js', // make sure this matches the main root of your code
  output: {
    path: path.join(__dirname, 'bundle'), // this can be any path and directory you want
    filename: 'TPDynamicIcons.js',
  },
  optimization: {
    minimizer: [new UglifyJsPlugin()], // enabling this reduces file size and readability
  },
   module: {
    rules: [
      {
        test: /\.node$/,
        loader: "node-loader",
      },
    ],
  },
};
