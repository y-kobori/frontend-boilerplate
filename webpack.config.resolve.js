const path = require('path');

module.exports = {
  resolve: {
    extensions: ['.js', '.json', '*'],
    alias: {
      _root: path.resolve(__dirname, 'src/js'),
      _modules: path.resolve(__dirname, 'src/js/modules'),
    },
  },
};
