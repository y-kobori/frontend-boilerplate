const path = require('path');
const glob = require('glob');
const readConfig = require('read-config');
const _ = require('lodash');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const srcDir = path.join(__dirname, 'src');
const meta = readConfig(`${srcDir}/pug/meta.yml`);
const constants = readConfig(`${srcDir}/pug/constants.yml`);
const pugDestFiles = [];

function createProduction(template, dest = null, params = null) {
  const filename = dest
    ? template.replace(/^pug\//, '').replace(/[^/]*\.pug$/, '') + dest.replace(/(\.pug)?$/, '.html')
    : template.replace(/^pug\//, '').replace(/\.pug$/, '.html');
  const pageId = template.replace(/^pug\//, '').replace('\.pug', '');
  const local = params
    ? params || {}
    : constants.params[pageId] || {};

  pugDestFiles.push(filename);

  return new HtmlWebpackPlugin({
    template,
    filename,
    templateParameters: Object.assign(
      {},
      constants,
      { meta },
      { local }
    ),
    inject: false,
    hash: true,
    cache: true
  });
}

const pugDataMapper = _.flatten(glob.sync(
  '**/*.pug',
  {
    cwd: srcDir,
    ignore: [
      '**/_*.pug'
    ]
  }
).map(template => {
  const pageId = template.replace(/^pug\//, '').replace('\.pug', '');
  const local = constants.params[pageId] || {};

  // for single source to mass production
  if (local.productions && Array.isArray(local.productions)) {
    return local.productions.map(production => createProduction(template, production.filename, production.params));
  }

  return createProduction(template);
}));

module.exports = {
  pugDestFiles,
  pugDataMapper
};
