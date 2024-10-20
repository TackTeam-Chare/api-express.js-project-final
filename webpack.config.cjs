const path = require('path');

module.exports = {
  entry: './src/app.js', // เส้นทางไปยังไฟล์ app.js
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  target: 'node',
  resolve: {
    fallback: {
      "bufferutil": false,
      "utf-8-validate": false,
    }
  },
};
