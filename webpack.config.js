const path = require('path');
const glob = require('glob');
const loadConfig = require('load-config-file');
const yaml = require('js-yaml');
const portfinder = require('portfinder');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const FixStyleOnlyEntriesPlugin = require('webpack-fix-style-only-entries');
const WriteFilePlugin = require('write-file-webpack-plugin');
const BuildNotifierPlugin = require('webpack-build-notifier');

const pugDataMapper = require('./pugDataMapper');
const { resolve } = require('./webpack.config.resolve');

loadConfig.register(['yaml', 'yml'], yaml.safeLoad);
loadConfig.register('json', JSON.parse);

const dirConfig = {
  src: path.join(__dirname, 'src'),
  dest: path.join(__dirname, 'public'),
};

const extensionConfig = {
  scss: 'css',
  js: 'js',
};

const serverConfig = {
  host: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 3000,
};

const pugConst = loadConfig.loadSync(`${dirConfig.src}/pug/constants.yml`);
const projectConst = loadConfig.loadSync(
  path.resolve(__dirname, 'package.json')
);

// create src => dir mapping
const extensionPattern = Object.keys(extensionConfig).join('|');
const entry = glob
  .sync(`**/*.+(${extensionPattern})`, {
    cwd: dirConfig.src,
    ignore: [`**/_*`, 'js/*/*.js'],
  })
  .reduce((acc, filename) => {
    const dest = filename
      .replace(/^pug\//, '')
      .replace(/^scss\//, 'css/')
      .replace(/\.\S+$/, '');

    acc[dest] = path.join(dirConfig.src, filename);

    return acc;
  }, {});

const pugLoader = [
  {
    loader: 'pug-loader',
    options: {
      root: path.resolve(`${dirConfig.src}/pug/`),
      pretty: true,
    },
  },
];

const sassLoader = [
  MiniCssExtractPlugin.loader,
  'css-loader',
  'postcss-loader',
  'resolve-url-loader',
  'sass-loader',
  'import-glob-loader',
];

const fontLoader = [
  {
    loader: 'file-loader',
    options: {
      name: '[name].[ext]',
      outputPath: 'webfonts/',
      publicPath: '../webfonts',
    },
  },
];

const isProduction = process.env.NODE_ENV === 'production';
const config = {
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? '' : 'source-map',
  context: dirConfig.src,
  entry,
  output: {
    filename: '[name].js',
    path: dirConfig.dest,
  },
  stats: {
    entrypoints: false,
    children: false,
  },
  module: {
    rules: [
      {
        test: /\.pug$/,
        use: pugLoader,
      },
      {
        test: /\.scss$/,
        oneOf: [
          {
            resourceQuery: /inline/,
            use: sassLoader,
          },
          {
            use: sassLoader,
          },
        ],
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          compact: true,
          cacheDirectory: true,
        },
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: fontLoader,
      },
    ],
  },
  devServer: {
    host: serverConfig.host,
    port: serverConfig.port,
    contentBase: dirConfig.dest,
    watchContentBase: true,
    openPage: path.relative('/', pugConst.dir.base),
    stats: {
      assets: true,
      children: false,
      chunks: false,
      chunkModules: false,
      entrypoints: false,
      hash: false,
      modules: false,
      timings: false,
      version: false,
    },
  },
  cache: true,
  plugins: [
    ...pugDataMapper,
    new FixStyleOnlyEntriesPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyPlugin({
      patterns: [
        {
          from: `${dirConfig.src}/(img|fonts)/**/*`,
          to: dirConfig.dest,
        },
      ],
    }),
    new BuildNotifierPlugin({
      title: projectConst.name || 'Webpack Build',
      logo: path.join(__dirname, 'icons/icon.png'),
      successIcon: path.join(__dirname, 'icons/success.png'),
      warningIcon: path.join(__dirname, 'icons/warning.png'),
      failureIcon: path.join(__dirname, 'icons/failure.png'),
      activateTerminalOnError: true,
    }),
    new WriteFilePlugin(),
  ],
  resolve,
};

portfinder.basePort = config.devServer.port;

module.exports = portfinder
  .getPortPromise()
  .then((port) => {
    config.devServer.port = port;

    return config;
  })
  .catch((err) => err);
