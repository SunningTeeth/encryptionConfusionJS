// 1、js-encode-plugin.js 文件（webpack的js加密插件）
const fs = require('fs'); //node的文件系统模块，用于读写及操作文件
const path = require('path'); //node提供的一些用于处理文件路径的小工具
var chalk = require('chalk') //用于向控制台输出带颜色的问题提示
// 引入cheerio模块
const cheerio = require('cheerio')
// 2、模块对外暴露的 js 函数
function JsEncodePlugin(pluginOptions) {
  this.options = pluginOptions;
}
/**  只解析 js代码  -- 开始 */


// 解析内容存放数组
let ary = new Array();
// 不解析内容存放数组
let notary = new Array();
let cnt = 1;
var flag = false;
// script 内容标签
let parseScriptData = '';
// 非js 内容不解析
let notParseScriptData = '';

function getScriptMethod(data) {
  // 只想 解析 js内容（若是一个人html文件：只解析js部分）
  if (data.indexOf('<script') > 0) {
    while (!flag) {
      let temp = data.substring(data.indexOf('<script'), data.indexOf('</script>'));
      // 获取 <script></script>标签间内容长度，判断是否为引用的外部外部js文件，若为引用js文件则长度为0
      parseScriptData = temp.substring(temp.indexOf('>') + 1);
      // 大于0 ，此时需要解析的内容在<script></script>之间
      if (parseScriptData.length > 0) {
        // console.log('parseScriptData +++++++++++++++:' + parseScriptData);
        // 获取 <script> 标签前不需要解析的内容
        let tempNotJSData = data.substring(0, data.indexOf('</script>'));
        // 第一个不要需要解析<script>之前的内容 
        // notParseScriptData = tempNotJSData.substring(0, tempNotJSData.indexOf('<script'));
        notParseScriptData = notParseScriptData + tempNotJSData.substring(0, tempNotJSData.indexOf('<script'));
        // console.log(chalk.red("notParseScriptData=============:" + notParseScriptData));
        // console.log(chalk.yellow("parseScriptData=============:" + parseScriptData))
        // 存入不需要解析的内容  ,前面所有
        //  notary.push(notParseScriptData);
        // 存入需要解析的内容
        ary.push(parseScriptData);
        // 获取第一个<script></script> 之后的内容
        let callData = data.substring(data.indexOf('</script>') + 9);
        // 判断是否还含有<script></script> 标签，若有继续解析，没有，将其之后的内容存入到不需要解析数组
        if (callData.indexOf('<script') > 0) {
          // let parseData = data.substring(0,)
          flag = false;
          getScriptMethod(callData);
        } else {
          // 获取 </script> 标签后不需要解析的内容
          notary.push(notParseScriptData);
          notary.push(callData);


          flag = true;
        }

      } else { // 小于0 ,不用解析的内容

        notParseScriptData = notParseScriptData + data.substring(0, data.indexOf('</script>') + 9);
        var tdata = data.substring(data.indexOf('</script>') + 9);
        // console.log('第一次tdata ： ===== ' + tdata);
        // console.log('第一次 notParseScriptData ===== ' + notParseScriptData);

        if (tdata.indexOf('<script') > 0) {
          flag = false;
          getScriptMethod(tdata);
        } else {
          // console.log('最后一次notParseScriptData ： ' + notParseScriptData);
          notary.push(notParseScriptData);
          // 获取 </script> 标签后不需要解析的内容，最好一次
          notary.push(tdata);
          flag = true;
        }


      }
    }

    if (flag) {
      let array = new Array();
      if (ary.length > 0) {
        array.push(ary);
      } else {
        array.push('NAN')
      }

      array.push(notary);
      return array;
    }

  } else {
    return data;
  }
}
/**  只解析 js代码  -- 结束 */


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
        for (let a = 0, flen = files.length; a < flen; a++) {
          // files.forEach((filename) => { //遍历该路径下所有文件
          if (_this.options.jsReg.test(files[a])) { //利用正则匹配我们要加密的文件,_this.options.jsReg为插件中传过来的需要加密的js文件正则，用以筛选出我们需要加密的js文件。
            var filedir = path.resolve(fp, files[a]);
            fs.readFile(filedir, 'utf-8', (err, data) => { //读取文件源码
              if (err) {
                console.log(chalk.yellow(
                  '读取js文件异常：\n' +
                  err.message + '\n'
                ))
                return;
              }
              var $ = cheerio.load(data,{decodeEntities: false});
              // 获取所有的script标签内容
              console.log(chalk.cyan($('script')));

              // fs.writeFile('c:/ey.js',$('script'), (err) => {  
              //     if (err) {
              //       console.log(chalk.yellow(
              //         '写入加密后的js文件异常：\n' +
              //         err.message + '\n'
              //       ))
              //       return;
              //     }
              //     console.log(chalk.cyan('  jsencode complete.\n'));
              //   })
              // let jsdata = new Array();
              // let notjsdata = new Array();
              // array = getScriptMethod(data);
              // console.log('所有数据array：' + array);
              // jsdata = array[0];
              // notjsdata = array[1];
              // 存放解析之后的js数据
              // let jsDataAfter = new Array();
              // console.log(chalk.cyan('  jsencode parseing......\n'));
              // console.log(chalk.red('jsdata:' + jsdata));
              // console.log(chalk.yellow('notjsdata1 :' + notjsdata[0]));
              // console.log(chalk.yellow('notjsdata2 :' + notjsdata[1]));

              // var finalData = '';
              // if (jsdata == 'NAN') {
              //   finalData = notjsdata[0].toString() + notjsdata[1].toString();
              // } else {
              //   // console.log('长度：' + jsdata.length)
              //   for (let i = 0; i < jsdata.length; i++) {
              //     // console.log('jsdata' + i + ': ' + jsdata[i]);
              //     //调用jjencode函数对源码进行jjencode加密，_this.options.global为插件配置中传过来的加密使用的全局变量名，将在jjencode函数中作为第一个参数传入
              //     let result = jjencode(_this.options.global, jsdata[i].replace(/\s*/g, ""));
              //     jsDataAfter.push(result);
              //   }
              //   //   // console.log('jsDataAfter : *****************' + jsDataAfter.toString());
              //   finalData = notjsdata[0] + jsDataAfter.toString() + notjsdata[1];
              // }
              // console.log('finalData :&&&&&&&&&&' + finalData);
              // let result = jjencode(_this.options.global, finalData);
              // fs.writeFile(filedir, finalData, (err) => { //将加密后的代码写回文件中
              //   if (err) {
              //     console.log(chalk.yellow(
              //       '写入加密后的js文件异常：\n' +
              //       err.message + '\n'
              //     ))
              //     return;
              //   }
              //   console.log(chalk.cyan('  jsencode complete.\n'));
              //   // fs.close(fs, function () {});
              // })
            })
          }
        }
    })
}

// 6、执行 callback 回调
callback();
  });
};

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

// 暴露 js 函数
module.exports = JsEncodePlugin;