const fs = require('fs'); //node的文件系统模块，用于读写及操作文件
const path = require('path'); //node提供的一些用于处理文件路径的小工具
const chalk = require('chalk'); //用于向控制台输出带颜色的问题提示
const Bagpipe = require('bagpipe');// 防止文件too many open files
const bagpipe = new Bagpipe(10);// 设定最大并发数为10
const common = require('./common');

// 1、js-encode-plugin.js 文件（webpack的js加密插件）
const Base64T = require('js-base64').Base64;

// 2、模块对外暴露的 js 函数
function Base64(pluginOptions) {
  this.options = pluginOptions;
}

// 3、原型定义一个 apply 函数，并注入了 compiler 对象
Base64.prototype.apply = function (compiler) {
  const _this = this;
  // 4、挂载 webpack 事件钩子（这里挂载的是 after-emit 事件,在将内存中 assets 内容写到磁盘文件夹之后触发的webpack生命周期钩子）
  compiler.plugin('after-emit', function (compilation, callback) {
    // ... 内部进行自定义的编译操作
    // 5、操作 compilation 对象的内部数据
    console.log(chalk.cyan('\n jsencode start.\n'))
    var filePath = path.resolve(__dirname, _this.options.assetsPath); //设置需要加密的js文件路径，_this.options.assetsPath为插件配置中传过来的需要加密的js文件路径
    filterFile(filePath);
    function filterFile(fp) {
      fs.readdir(fp, (err, files) => { //读取该文件路径
        if (err) {
          console.log(chalk.yellow(
            '读取js文件夹异常魔鬼：\n' +
            err.message + '\n'
          ))
          return;
        }
        files.forEach((filename) => { //遍历该路径下所有文件
          if (_this.options.jsReg.test(filename)) { //利用正则匹配我们要加密的文件,_this.options.jsReg为插件中传过来的需要加密的js文件正则，用以筛选出我们需要加密的js文件。
            var filedir = path.resolve(fp, filename);
            bagpipe.push(fs.readFile, filedir, 'utf-8', function (err, data) {
              if (err) {
                console.log(chalk.yellow(
                  '读取js文件异常：\n' +
                  err.message + '\n'
                ))
                return;
              }

              // 调用解析JS函数
              common.parseJS(filedir, data, _this.options.global,Base64T.encode);
              // 调用解析html函数
              // common.parseHTML(filedir, data, _this.options.global,Base64T.encode);
              // 调用获取js内容的函数，并写入到同名但后缀名为webpack的文件中,朱window和Linux分隔符的区别
              // common.getJS(filedir, data);
            });
          }
        })
      })
    }

    // 6、执行 callback 回调
    callback();
  });
};



// 暴露 js 函数
module.exports = Base64;