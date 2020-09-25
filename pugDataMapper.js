const path = require('path');
const glob = require('glob');
const loadConfig = require('load-config-file');
const yaml = require('js-yaml');
const _ = require('lodash');
const HtmlWebpackPlugin = require('html-webpack-plugin');

loadConfig.register(['yaml', 'yml'], yaml.safeLoad);

const srcDir = path.join(__dirname, 'src');
const meta = loadConfig.loadSync(`${srcDir}/pug/meta.yml`);
const constants = loadConfig.loadSync(`${srcDir}/pug/constants.yml`);

function createProduction(template, dest = null, params = null) {
  const filename = dest
    ? template.replace(/^pug\//, '').replace(/[^/]*\.pug$/, '') +
      dest.replace(/(\.pug)?$/, '.html')
    : template.replace(/^pug\//, '').replace(/\.pug$/, '.html');
  const pageId = template.replace(/^pug\//, '').replace('.pug', '');
  const local = params ? params || {} : constants.params[pageId] || {};

  return new HtmlWebpackPlugin({
    template,
    filename,
    templateParameters: Object.assign({}, constants, { meta }, { local }),
    inject: false,
    hash: true,
    cache: true,
  });
}

module.exports = _.flatten(
  glob
    .sync('**/*.pug', {
      cwd: srcDir,
      ignore: ['**/_*.pug'],
    })
    .map((template) => {
      const pageId = template.replace(/^pug\//, '').replace('.pug', '');
      const local = constants.params[pageId] || {};

      // for single source to mass production
      if (local.productions && Array.isArray(local.productions)) {
        return local.productions.map((production) =>
          createProduction(template, production.filename, production.params)
        );
      }

      return createProduction(template);
    })
);
