const path = require('path')

module.exports = {
    entry: path.join(__dirname, 'src/js', 'index.js'), // Our frontend will be inside the src folder
    output: {
       path: path.join(__dirname, 'dist'),
       filename: 'build.js' // The final file will be created in dist/build.js
    },
    module: {
       rules: [{
          test: /.css$/, // To load the css in react
          use: ['style-loader', 'css-loader'],
          include: /src/,
          //I added the below
          include: /node_modules/,
       }, {
          test: /.jsx?$/, // To load the js and jsx files
          loader: 'babel-loader',
          exclude: /node_modules/,
          query: {
             presets: ["@babel/preset-env","@babel/preset-react"],
             plugins: ["@babel/plugin-proposal-class-properties"]
          }
       }, {
          test: /.json$/, // To load the json files
          loader: 'json-loader'
       }]
    }
 }