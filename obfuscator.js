const fs = require('fs'); //node的文件系统模块，用于读写及操作文件
const path = require('path'); //node提供的一些用于处理文件路径的小工具
const chalk = require('chalk'); //用于向控制台输出带颜色的问题提示
const mkdir = require('./mkdir'); // 用于创建文件夹
const cheerio = require('cheerio');// 引入cheerio模块，解析html
const Bagpipe = require('bagpipe');// 防止文件too many open files
const bagpipe = new Bagpipe(10);// 设定最大并发数为10

// 1、js-encode-plugin.js 文件（webpack的js加密插件）
const ObfuscatorT = require('javascript-obfuscator');

//定义全局变量
const PHP_ERROR = '\nObfuscator--php语法格式有误!\n';
const JS_ERROR = '\nObfuscator--js语法格式有误!\n';

const window_separator='\\';
const linux_separator='/';

// 2、模块对外暴露的 js 函数
function Obfuscator(pluginOptions) {
  this.options = pluginOptions;
}

// 3、原型定义一个 apply 函数，并注入了 compiler 对象
Obfuscator.prototype.apply = function (compiler) {
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

              const options = {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 1,
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 1,
                debugProtection: true,
                debugProtectionInterval: true,
                disableConsoleOutput: true,
                identifierNamesGenerator: 'hexadecimal',
                log: false,
                renameGlobals: false,
                rotateStringArray: true,
                selfDefending: true,
                stringArray: true,
                stringArrayEncoding: 'rc4',
                stringArrayThreshold: 1,
                transformObjectKeys: true,
                unicodeEscapeSequence: false
              };

              // 调用解析JS函数
              // parseJS(filedir, data, options);

              // 调用解析html函数
              parseHTML(filedir, data, options);

              // 调用获取js内容的函数，并写入到同名但后缀名为webpack的文件中,朱window和Linux分隔符的区别
              // getJS(filedir, data);
            });
          }
        })
      })
    }

    // 6、执行 callback 回调
    callback();

    // 抽离js，到指定目录
    function getJS(filedir, data) {

      //截取js存放的文件
      let filename = filedir.substring(0, filedir.lastIndexOf('.') + 1) + 'txt';
      const fpath = filename.substring(0, filename.lastIndexOf(linux_separator) + 1) + "parse";
      // 不存在就创建文件夹
      mkdir(fpath);
      var $ = cheerio.load(data, { decodeEntities: false });
      let sary = new Array();
      sary = $('script').toString().split("</script>");
      // 需要抽取特征的js
      let sdata = '';
      for (let j = 0, slen = sary.length; j < slen; j++) {
        let temp = sary[j].substring(sary[j].indexOf('>') + 1);
        if (temp.length > 0 && temp.replace(/\s*/g, "").indexOf("<?php") < 0) {
          sdata += temp;
        }
      }
      if (sdata.replace(/\s*/g, "") != '' && sdata.replace(/\s*/g, "").length > 0) {
        let p = fpath + filename.substring(filename.lastIndexOf(linux_separator));
        fs.writeFile(p, sdata, (err) => { //将加密后的代码写回文件中
          if (err) {
            console.log(chalk.yellow(
              '写入加密后的js文件异常：\n' +
              err.message + '\n'
            ))
            return;
          }
          console.log(chalk.cyan('jsencode complete.\n'));
        })
      }

    }

    // 解析js
    function parseJS(filedir, data, options) {
      let result;
      try {
        //由于obfuscate()对js语法要求高，所以当无法加密混淆时，将原来的值（data）写回文件即可
        result = ObfuscatorT.obfuscate(data, options);
      } catch (error) {
        result = data + JS_ERROR;
      }

      fs.writeFile(filedir, result, (err) => { //将加密后的代码写回文件中
        if (err) {
          console.log(chalk.yellow(
            '写入加密后的js文件异常：\n' +
            err.message + '\n'
          ))
          return;
        }
        console.log(chalk.cyan('jsencode complete.\n'));
      })
    }

    // 解析html(html中可能含有js,可能含有php)，并写回到指定文件
    function parseHTML(filedir, data, options) {

      //1. 返回页面中的js
      var $ = cheerio.load(data, { decodeEntities: false });
      let sary = new Array();
      sary = $('script').toString().split("</script>");
      //需要解析的js
      let sdata = '';
      for (let j = 0, slen = sary.length; j < slen; j++) {
        let temp = (sary[j].substring(sary[j].indexOf('>') + 1));
        // 由于php代码可能写在<script></script>,需要过滤掉
        if (temp.length > 0 && temp.replace(/\s*/g, "").indexOf("<?php") < 0) {
          sdata += temp + "\n";
        }
      }

      //2. 返回页面中的php
      let html = $.html().toString();
      let ary = html.split('<?php');//按照php可以分分割
      let pdata = "";
      for (let a = 0, plen = ary.length; a < plen; a++) {
        let ptemp = (ary[a].substring(0, ary[a].indexOf('?>')));
        if (ptemp.length > 0) {//过滤掉无用的php代码
          pdata += ptemp + "\n";
        }
      }

      let result = new Array('', '');
      if (sdata.replace(/\s*/g, "") != '' && sdata.replace(/\s*/g, "").length > 0) {
        try {
          // 加密js
          result[0] = ObfuscatorT.obfuscate(sdata, options);
          result[0] = '\n\njs加密混淆内容如下:\n' + result[0] + "\n\n--lanysecjs\n";
        } catch (error) {
          result[0] = JS_ERROR;
        }
      }

      if (pdata.replace(/\s*/g, "") != '' && pdata.replace(/\s*/g, "").length > 0) {
        try {
          // 加密php
          result[1] = ObfuscatorT.obfuscate(pdata, options);
          result[1] = '\n\nphp加密混淆内容如下:\n' + result[1] + "\n\n--lanysecphp\n";
        } catch (error) {
          result[1] = PHP_ERROR;
        }
      }

      let res = data + result[0] + result[1];

      fs.writeFile(filedir, res, (err) => { //将加密后的代码写回文件中
        if (err) {
          console.log(chalk.yellow(
            '写入加密后的js文件异常：\n' +
            err.message + '\n'
          ))
          return;
        }
        console.log(chalk.cyan('jsencode complete.\n'));
      })

    }



  });
};

// 暴露 js 函数
module.exports = Obfuscator;