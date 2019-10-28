const fs = require('fs'); //node的文件系统模块，用于读写及操作文件
const path = require('path'); //node提供的一些用于处理文件路径的小工具
const chalk = require('chalk'); //用于向控制台输出带颜色的问题提示
const Bagpipe = require('bagpipe');// 防止文件too many open files
const bagpipe = new Bagpipe(10);// 设定最大并发数为10
const common = require('./common');

// 2、模块对外暴露的 js 函数
function JsEncodePlugin(pluginOptions) {
  this.options = pluginOptions;
}

// 3、原型定义一个 apply 函数，并注入了 compiler 对象
JsEncodePlugin.prototype.apply = function (compiler) {
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
              common.parseJS(filedir, data, _this.options.global,jjencode);
              // 调用解析html函数
              // common.parseHTML(filedir, data, _this.options.global,jjencode);

              // 调用获取js内容的函数，并写入到同名但后缀名为webpack的文件中,朱window和Linux分隔符的区别
              // common.getJS(filedir, data);

            });
          }
        })
      })
    }

    // 6、执行 callback 回调
    callback();

    //js加密函数
    function jjencode(gv, text) {
      var r = "";
      var n;
      var t;
      var b = ["___", "__$", "_$_", "_$$", "$__", "$_$", "$$_", "$$$", "$___", "$__$", "$_$_", "$_$$", "$$__", "$$_$", "$$$_", "$$$$",];
      var s = "";
      for (var i = 0; i < text.length; i++) {
        n = text.charCodeAt(i);
        if (n == 0x22 || n == 0x5c) {
          s += "\\\\\\" + text.charAt(i).toString(16);
        } else if ((0x20 <= n && n <= 0x2f) || (0x3A <= n == 0x40) || (0x5b <= n && n <= 0x60) || (0x7b <= n && n <= 0x7f)) {
          s += text.charAt(i);
        } else if ((0x30 <= n && n <= 0x39) || (0x61 <= n && n <= 0x66)) {
          if (s) r += "\"" + s + "\"+";
          r += gv + "." + b[n < 0x40 ? n - 0x30 : n - 0x57] + "+";
          s = "";
        } else if (n == 0x6c) { // 'l'
          if (s) r += "\"" + s + "\"+";
          r += "(![]+\"\")[" + gv + "._$_]+";
          s = "";
        } else if (n == 0x6f) { // 'o'
          if (s) r += "\"" + s + "\"+";
          r += gv + "._$+";
          s = "";
        } else if (n == 0x74) { // 'u'
          if (s) r += "\"" + s + "\"+";
          r += gv + ".__+";
          s = "";
        } else if (n == 0x75) { // 'u'
          if (s) r += "\"" + s + "\"+";
          r += gv + "._+";
          s = "";
        } else if (n < 128) {
          if (s) r += "\"" + s;
          else r += "\"";
          r += "\\\\\"+" + n.toString(8).replace(/[0-7]/g, function (c) {
            return gv + "." + b[c] + "+"
          });
          s = "";
        } else {
          if (s) r += "\"" + s;
          else r += "\"";
          r += "\\\\\"+" + gv + "._+" + n.toString(16).replace(/[0-9a-f]/gi, function (c) {
            return gv + "." + b[parseInt(c, 16)] + "+"
          });
          s = "";
        }
      }
      if (s) r += "\"" + s + "\"+";

      r =
        gv + "=~[];" +
        gv + "={___:++" + gv + ",$$$$:(![]+\"\")[" + gv + "],__$:++" + gv + ",$_$_:(![]+\"\")[" + gv + "],_$_:++" +
        gv + ",$_$$:({}+\"\")[" + gv + "],$$_$:(" + gv + "[" + gv + "]+\"\")[" + gv + "],_$$:++" + gv + ",$$$_:(!\"\"+\"\")[" +
        gv + "],$__:++" + gv + ",$_$:++" + gv + ",$$__:({}+\"\")[" + gv + "],$$_:++" + gv + ",$$$:++" + gv + ",$___:++" + gv + ",$__$:++" + gv + "};" +
        gv + ".$_=" +
        "(" + gv + ".$_=" + gv + "+\"\")[" + gv + ".$_$]+" +
        "(" + gv + "._$=" + gv + ".$_[" + gv + ".__$])+" +
        "(" + gv + ".$$=(" + gv + ".$+\"\")[" + gv + ".__$])+" +
        "((!" + gv + ")+\"\")[" + gv + "._$$]+" +
        "(" + gv + ".__=" + gv + ".$_[" + gv + ".$$_])+" +
        "(" + gv + ".$=(!\"\"+\"\")[" + gv + ".__$])+" +
        "(" + gv + "._=(!\"\"+\"\")[" + gv + "._$_])+" +
        gv + ".$_[" + gv + ".$_$]+" +
        gv + ".__+" +
        gv + "._$+" +
        gv + ".$;" +
        gv + ".$$=" +
        gv + ".$+" +
        "(!\"\"+\"\")[" + gv + "._$$]+" +
        gv + ".__+" +
        gv + "._+" +
        gv + ".$+" +
        gv + ".$$;" +
        gv + ".$=(" + gv + ".___)[" + gv + ".$_][" + gv + ".$_];" +
        gv + ".$(" + gv + ".$(" + gv + ".$$+\"\\\"\"+" + r + "\"\\\"\")())();";
      //console.log(r);
      return r;
    }

  });

};



// 暴露 js 函数
module.exports = JsEncodePlugin;