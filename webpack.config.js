const path = require('path');
const glob = require('glob');
const readConfig = require('read-config');
const _ = require('lodash');
const globImporter = require('node-sass-glob-importer');
const packageImporter = require('node-sass-package-importer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');
const BuildNotifierPlugin = require('webpack-build-notifier');

const { pugDestFiles, pugDataMapper } = require('./pugDataMapper');
const { resolve } = require('./webpack.config.resolve');

const dirConfig = {
  src: path.join(__dirname, 'src'),
  dest: path.join(__dirname, 'public'),
};

const extensionConfig = {
  pug: 'html',
  scss: 'css',
  js: 'js',
};

const serverConfig = {
  host: process.env.HOST || '0.0.0.0',
  port: process.env.PORT || 3000,
};

const pugConst = readConfig(`${dirConfig.src}/pug/constants.yml`);
const projectConst = readConfig(path.resolve(__dirname, 'package.json'));

// create src => dir mapping
const extensionPattern = Object.keys(extensionConfig).join('|');
const entry = glob
  .sync(`**/*.+(${extensionPattern})`, {
    cwd: dirConfig.src,
    ignore: [`**/_*`, 'js/*/*.js'],
  })
  .reduce((acc, filename) => {
    const from = filename.replace(/.*\./, '');
    const to = extensionConfig[from];
    const dest = filename
      .replace(/^pug\//, '')
      .replace(/^scss\//, 'css/')
      .replace(new RegExp(`${from}$`), `${to}`);

    if (from === 'pug' && !_.includes(pugDestFiles, dest)) {
      return acc;
    }

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
  {
    loader: 'css-loader',
    options: {
      importLoaders: 3,
      sourceMap: true,
    },
  },
  'postcss-loader',
  'resolve-url-loader',
  {
    loader: 'sass-loader',
    options: {
      includePaths: [path.resolve(`${dirConfig.src}/scss`)],
      importer: [globImporter(), packageImporter()],
      sourceMap: true,
    },
  },
];

const fontLoader = [
  {
    loader: 'file-loader',
    options: {
      name: '[name].[ext]',
      outputPath: 'fonts/',
      publicPath: path => `../fonts/${path}`,
    },
  },
];

const config = {
  mode: process.env.NODE_ENV || 'development',
  context: dirConfig.src,
  entry,
  output: {
    filename: '[name]',
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
            use: ExtractTextPlugin.extract(sassLoader),
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
      assets: false,
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
  devtool: 'inline-source-map',
  cache: true,
  plugins: [
    ...pugDataMapper,
    new ExtractTextPlugin('[name]'),
    new CopyWebpackPlugin(
      [
        {
          from: { glob: '*', dot: false },
          to: `${dirConfig.dest}/img/`,
        },
      ],
      {
        context: `${dirConfig.src}/img`,
      }
    ),
    new CopyWebpackPlugin(
      [
        {
          from: { glob: '*', dot: false },
          to: `${dirConfig.dest}/fonts/`,
        },
      ],
      {
        context: `${dirConfig.src}/fonts`,
      }
    ),
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

module.exports = config;
