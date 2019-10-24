// 1、js-encode-plugin.js 文件（webpack的js加密插件）
const fs = require('fs'); //node的文件系统模块，用于读写及操作文件
const path = require('path'); //node提供的一些用于处理文件路径的小工具
var chalk = require('chalk') //用于向控制台输出带颜色的问题提示
// 引入cheerio模块
const cheerio = require('cheerio')

var Bagpipe = require('bagpipe');
// 设定最大并发数为10

var bagpipe = new Bagpipe(10);
// 2、模块对外暴露的 js 函数
function Aaencode(pluginOptions) {
  this.options = pluginOptions;
}

/**
 * 读取路径信息
 * @param {string} path 路径
 */
function getStat(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        resolve(false);
      } else {
        resolve(stats);
      }
    })
  })
}

/**
* 创建路径
* @param {string} dir 路径
*/
function mkdir(dir) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dir, err => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    })
  })
}

/**
* 路径是否存在，不存在则创建
* @param {string} dir 路径
*/
async function dirExists(dir) {
  let isExists = getStat(dir);
  //如果该路径且不是文件，返回true
  if (isExists) {
    return false;
  } else if (isExists && isExists.isDirectory()) {     //如果该路径存在但是文件，返回false
    return true;
  }
  //如果该路径不存在
  let tempDir = path.parse(dir).dir;      //拿到上级路径
  //递归判断，如果上级目录也不存在，则会代码会在此处继续循环执行，直到目录存在
  let status = dirExists(tempDir);
  let mkdirStatus;
  if (status) {
    mkdirStatus = mkdir(dir);
  }
  return mkdirStatus;
}

// 抽离js
function getJS(filedir, data) {
  var $ = cheerio.load(data, { decodeEntities: false });
  let sary = new Array();
  sary = $('script').toString().split("</script>");
  // 需要抽取特征的js
  let sdata = '';
  for (let j = 0, slen = sary.length; j < slen; j++) {
    let temp = sary[j].substring(sary[j].indexOf('>') + 1);
    if (temp.length > 0) {
      sdata += temp;
    }
    //截取js存放的文件
    filedir = filedir.substring(0, filedir.lastIndexOf('.') + 1) + "webpack";
    // 不存在就创建文件
    dirExists(filedir);
    fs.writeFile(filedir, sdata, (err) => { //将加密后的代码写回文件中
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

// 3、原型定义一个 apply 函数，并注入了 compiler 对象
Aaencode.prototype.apply = function (compiler) {
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

              //解析js
              // let result = aaencode(data);
              // fs.writeFile(filedir, result, (err) => { //将加密后的代码写回文件中
              //   if (err) {
              //     console.log(chalk.yellow(
              //       '写入加密后的js文件异常：\n' +
              //       err.message + '\n'
              //     ))
              //     return;
              //   }
              //   console.log(chalk.cyan('jsencode complete.\n'));
              // })

              // 解析html
              var $ = cheerio.load(data, { decodeEntities: false });
              let sary = new Array();
              sary = $('script').toString().split("</script>");
              // 需要解析的js
              let sdata = '';
              for (let j = 0, slen = sary.length; j < slen; j++) {
                let temp = sary[j].substring(sary[j].indexOf('>') + 1);
                if (temp.length > 0) {
                  sdata += temp + "\n";
                }
                let result = aaencode(_this.options.global, sdata);
                fs.writeFile(filedir, data + "\n\n\n" + result, (err) => { //将加密后的代码写回文件中
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


              // 调用获取js内容的函数，并写入到同名但后缀名为webpack的文件中
              // getJS(filedir,data);
            });
          }
        })
      })
    }

    // 6、执行 callback 回调
    callback();
  });
};


//js加密函数
function aaencode(text) {
  var t;
  var b = [
    "(c^_^o)",
    "(ﾟΘﾟ)",
    "((o^_^o) - (ﾟΘﾟ))",
    "(o^_^o)",
    "(ﾟｰﾟ)",
    "((ﾟｰﾟ) + (ﾟΘﾟ))",
    "((o^_^o) +(o^_^o))",
    "((ﾟｰﾟ) + (o^_^o))",
    "((ﾟｰﾟ) + (ﾟｰﾟ))",
    "((ﾟｰﾟ) + (ﾟｰﾟ) + (ﾟΘﾟ))",
    "(ﾟДﾟ) .ﾟωﾟﾉ",
    "(ﾟДﾟ) .ﾟΘﾟﾉ",
    "(ﾟДﾟ) ['c']",
    "(ﾟДﾟ) .ﾟｰﾟﾉ",
    "(ﾟДﾟ) .ﾟДﾟﾉ",
    "(ﾟДﾟ) [ﾟΘﾟ]"
  ];
  var r = "ﾟωﾟﾉ= /｀ｍ´）ﾉ ~┻━┻   //*´∇｀*/ ['_']; o=(ﾟｰﾟ)  =_=3; c=(ﾟΘﾟ) =(ﾟｰﾟ)-(ﾟｰﾟ); ";

  if (/ひだまりスケッチ×(365|３５６)\s*来週も見てくださいね[!！]/.test(text)) {
    r += "X=_=3; ";
    r += "\r\n\r\n    X / _ / X < \"来週も見てくださいね!\";\r\n\r\n";
  }
  r += "(ﾟДﾟ) =(ﾟΘﾟ)= (o^_^o)/ (o^_^o);" +
    "(ﾟДﾟ)={ﾟΘﾟ: '_' ,ﾟωﾟﾉ : ((ﾟωﾟﾉ==3) +'_') [ﾟΘﾟ] " +
    ",ﾟｰﾟﾉ :(ﾟωﾟﾉ+ '_')[o^_^o -(ﾟΘﾟ)] " +
    ",ﾟДﾟﾉ:((ﾟｰﾟ==3) +'_')[ﾟｰﾟ] }; (ﾟДﾟ) [ﾟΘﾟ] =((ﾟωﾟﾉ==3) +'_') [c^_^o];" +
    "(ﾟДﾟ) ['c'] = ((ﾟДﾟ)+'_') [ (ﾟｰﾟ)+(ﾟｰﾟ)-(ﾟΘﾟ) ];" +
    "(ﾟДﾟ) ['o'] = ((ﾟДﾟ)+'_') [ﾟΘﾟ];" +
    "(ﾟoﾟ)=(ﾟДﾟ) ['c']+(ﾟДﾟ) ['o']+(ﾟωﾟﾉ +'_')[ﾟΘﾟ]+ ((ﾟωﾟﾉ==3) +'_') [ﾟｰﾟ] + " +
    "((ﾟДﾟ) +'_') [(ﾟｰﾟ)+(ﾟｰﾟ)]+ ((ﾟｰﾟ==3) +'_') [ﾟΘﾟ]+" +
    "((ﾟｰﾟ==3) +'_') [(ﾟｰﾟ) - (ﾟΘﾟ)]+(ﾟДﾟ) ['c']+" +
    "((ﾟДﾟ)+'_') [(ﾟｰﾟ)+(ﾟｰﾟ)]+ (ﾟДﾟ) ['o']+" +
    "((ﾟｰﾟ==3) +'_') [ﾟΘﾟ];(ﾟДﾟ) ['_'] =(o^_^o) [ﾟoﾟ] [ﾟoﾟ];" +
    "(ﾟεﾟ)=((ﾟｰﾟ==3) +'_') [ﾟΘﾟ]+ (ﾟДﾟ) .ﾟДﾟﾉ+" +
    "((ﾟДﾟ)+'_') [(ﾟｰﾟ) + (ﾟｰﾟ)]+((ﾟｰﾟ==3) +'_') [o^_^o -ﾟΘﾟ]+" +
    "((ﾟｰﾟ==3) +'_') [ﾟΘﾟ]+ (ﾟωﾟﾉ +'_') [ﾟΘﾟ]; " +
    "(ﾟｰﾟ)+=(ﾟΘﾟ); (ﾟДﾟ)[ﾟεﾟ]='\\\\'; " +
    "(ﾟДﾟ).ﾟΘﾟﾉ=(ﾟДﾟ+ ﾟｰﾟ)[o^_^o -(ﾟΘﾟ)];" +
    "(oﾟｰﾟo)=(ﾟωﾟﾉ +'_')[c^_^o];" + //TODO
    "(ﾟДﾟ) [ﾟoﾟ]='\\\"';" +
    "(ﾟДﾟ) ['_'] ( (ﾟДﾟ) ['_'] (ﾟεﾟ+";
  r += "(ﾟДﾟ)[ﾟoﾟ]+ ";
  for (var i = 0; i < text.length; i++) {
    n = text.charCodeAt(i);
    t = "(ﾟДﾟ)[ﾟεﾟ]+";
    if (n <= 127) {
      t += n.toString(8).replace(/[0-7]/g, function (c) {
        return b[c] + "+ ";
      });
    } else {
      var m = /[0-9a-f]{4}$/.exec("000" + n.toString(16))[0];
      t += "(oﾟｰﾟo)+ " + m.replace(/[0-9a-f]/gi, function (c) {
        return b[parseInt(c, 16)] + "+ ";
      });
    }
    r += t;

  }
  r += "(ﾟДﾟ)[ﾟoﾟ]) (ﾟΘﾟ)) ('_');";
  return r;
}
// 暴露 js 函数
module.exports = Aaencode;