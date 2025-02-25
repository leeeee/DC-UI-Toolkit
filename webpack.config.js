const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => ({
  mode: argv.mode === 'production' ? 'production' : 'development',
  
  // 入口文件
  entry: {
    ui: './ui.js',
    code: './code.js',
  },
  
  // 输出配置
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  
  // 模块解析
  module: {
    rules: [
      // JavaScript 文件处理
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      // CSS 文件处理
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  
  // 解析扩展名
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  
  // 插件配置
  plugins: [
    new HtmlWebpackPlugin({
      template: './ui.html',
      filename: 'ui.html',
      chunks: ['ui'],
      inject: 'body'
    }),
  ],
  
  // 开发工具配置
  devtool: argv.mode === 'production' ? false : 'inline-source-map',
  
  // 开发服务器配置
  devServer: {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  }
}); 