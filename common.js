/**
 * 封装一些通用的函数
 */

// 用于创建文件夹
const mkdir = require('./mkdir');
// 引入cheerio模块，解析html
const cheerio = require('cheerio');
//node的文件系统模块，用于读写及操作文件
const fs = require('fs');
//node提供的一些用于处理文件路径的小工具
const path = require('path');
//用于向控制台输出带颜色的问题提示
const chalk = require('chalk');
//定义全局变量
const PHP_ERROR = '--php语法格式有误!\n';
const JS_ERROR = '--js语法格式有误!\n';

// 1、js-encode-plugin.js 文件（webpack的js加密插件）

const window_separator = '\\';
const linux_separator = '/';

module.exports = {

    // 判断是否为json
    isJSON: function isJSON(str) {
        if (typeof str == 'string') {
            try {
                let obj = JSON.parse(str);
                if (typeof obj == 'object' && obj) {
                    return true;
                } else {
                    return false;
                }
            } catch (e) {
                return false;
            }
        }
    },
    // 抽离js，到指定目录,过滤php和json
    getJS: function getJS(filedir, data) {

        //截取js存放的文件
        let filename = filedir.substring(0, filedir.lastIndexOf('.') + 1) + 'txt';
        const fpath = filename.substring(0, filename.lastIndexOf(window_separator) + 1) + "parse";
        // 不存在就创建文件夹
        mkdir(fpath);
        var $ = cheerio.load(data, { decodeEntities: false });
        let sary = new Array();
        sary = $('script').toString().split("</script>");
        // 需要抽取特征的js
        let sdata = '';
        for (let j = 0, slen = sary.length; j < slen; j++) {
            let temp = sary[j].substring(sary[j].indexOf('>') + 1);
            let isJson = this.isJSON(temp);//判断是否是json
            if (temp.length > 0 && temp.replace(/\s*/g, "").indexOf("<?php") < 0 && !isJson) {
                sdata += temp;
            }
        }
        if (sdata.replace(/\s*/g, "") != '' && sdata.replace(/\s*/g, "").length > 0) {
            let p = fpath + filename.substring(filename.lastIndexOf(window_separator));
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

    },
    // 解析js
    parseJS: function parseJS(filedir, data, global, functionName) {
        let result;
        try {
            result = functionName(data);
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
    },
    // 解析html(html中可能含有js,可能含有php)，并写回到指定文件
    parseHTML: function parseHTML(filedir, data, global, functionName) {

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
                result[0] = functionName(data);
                result[0] = '\n\njs加密混淆内容如下:\n' + result[0] + "\n\n--lanysecjs\n";
            } catch (error) {
                result[0] = JS_ERROR;
            }
        }

        if (pdata.replace(/\s*/g, "") != '' && pdata.replace(/\s*/g, "").length > 0) {
            try {
                // 加密php
                result[1] = functionName(data);
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



}



 //js加密函数
//  function aaencode(text) {
//     var t;
//     var b = [
//       "(c^_^o)",
//       "(ﾟΘﾟ)",
//       "((o^_^o) - (ﾟΘﾟ))",
//       "(o^_^o)",
//       "(ﾟｰﾟ)",
//       "((ﾟｰﾟ) + (ﾟΘﾟ))",
//       "((o^_^o) +(o^_^o))",
//       "((ﾟｰﾟ) + (o^_^o))",
//       "((ﾟｰﾟ) + (ﾟｰﾟ))",
//       "((ﾟｰﾟ) + (ﾟｰﾟ) + (ﾟΘﾟ))",
//       "(ﾟДﾟ) .ﾟωﾟﾉ",
//       "(ﾟДﾟ) .ﾟΘﾟﾉ",
//       "(ﾟДﾟ) ['c']",
//       "(ﾟДﾟ) .ﾟｰﾟﾉ",
//       "(ﾟДﾟ) .ﾟДﾟﾉ",
//       "(ﾟДﾟ) [ﾟΘﾟ]"
//     ];
//     var r = "ﾟωﾟﾉ= /｀ｍ´）ﾉ ~┻━┻   //*´∇｀*/ ['_']; o=(ﾟｰﾟ)  =_=3; c=(ﾟΘﾟ) =(ﾟｰﾟ)-(ﾟｰﾟ); ";

//     if (/ひだまりスケッチ×(365|３５６)\s*来週も見てくださいね[!！]/.test(text)) {
//       r += "X=_=3; ";
//       r += "\r\n\r\n    X / _ / X < \"来週も見てくださいね!\";\r\n\r\n";
//     }
//     r += "(ﾟДﾟ) =(ﾟΘﾟ)= (o^_^o)/ (o^_^o);" +
//       "(ﾟДﾟ)={ﾟΘﾟ: '_' ,ﾟωﾟﾉ : ((ﾟωﾟﾉ==3) +'_') [ﾟΘﾟ] " +
//       ",ﾟｰﾟﾉ :(ﾟωﾟﾉ+ '_')[o^_^o -(ﾟΘﾟ)] " +
//       ",ﾟДﾟﾉ:((ﾟｰﾟ==3) +'_')[ﾟｰﾟ] }; (ﾟДﾟ) [ﾟΘﾟ] =((ﾟωﾟﾉ==3) +'_') [c^_^o];" +
//       "(ﾟДﾟ) ['c'] = ((ﾟДﾟ)+'_') [ (ﾟｰﾟ)+(ﾟｰﾟ)-(ﾟΘﾟ) ];" +
//       "(ﾟДﾟ) ['o'] = ((ﾟДﾟ)+'_') [ﾟΘﾟ];" +
//       "(ﾟoﾟ)=(ﾟДﾟ) ['c']+(ﾟДﾟ) ['o']+(ﾟωﾟﾉ +'_')[ﾟΘﾟ]+ ((ﾟωﾟﾉ==3) +'_') [ﾟｰﾟ] + " +
//       "((ﾟДﾟ) +'_') [(ﾟｰﾟ)+(ﾟｰﾟ)]+ ((ﾟｰﾟ==3) +'_') [ﾟΘﾟ]+" +
//       "((ﾟｰﾟ==3) +'_') [(ﾟｰﾟ) - (ﾟΘﾟ)]+(ﾟДﾟ) ['c']+" +
//       "((ﾟДﾟ)+'_') [(ﾟｰﾟ)+(ﾟｰﾟ)]+ (ﾟДﾟ) ['o']+" +
//       "((ﾟｰﾟ==3) +'_') [ﾟΘﾟ];(ﾟДﾟ) ['_'] =(o^_^o) [ﾟoﾟ] [ﾟoﾟ];" +
//       "(ﾟεﾟ)=((ﾟｰﾟ==3) +'_') [ﾟΘﾟ]+ (ﾟДﾟ) .ﾟДﾟﾉ+" +
//       "((ﾟДﾟ)+'_') [(ﾟｰﾟ) + (ﾟｰﾟ)]+((ﾟｰﾟ==3) +'_') [o^_^o -ﾟΘﾟ]+" +
//       "((ﾟｰﾟ==3) +'_') [ﾟΘﾟ]+ (ﾟωﾟﾉ +'_') [ﾟΘﾟ]; " +
//       "(ﾟｰﾟ)+=(ﾟΘﾟ); (ﾟДﾟ)[ﾟεﾟ]='\\\\'; " +
//       "(ﾟДﾟ).ﾟΘﾟﾉ=(ﾟДﾟ+ ﾟｰﾟ)[o^_^o -(ﾟΘﾟ)];" +
//       "(oﾟｰﾟo)=(ﾟωﾟﾉ +'_')[c^_^o];" + //TODO
//       "(ﾟДﾟ) [ﾟoﾟ]='\\\"';" +
//       "(ﾟДﾟ) ['_'] ( (ﾟДﾟ) ['_'] (ﾟεﾟ+";
//     r += "(ﾟДﾟ)[ﾟoﾟ]+ ";
//     for (var i = 0; i < text.length; i++) {
//       n = text.charCodeAt(i);
//       t = "(ﾟДﾟ)[ﾟεﾟ]+";
//       if (n <= 127) {
//         t += n.toString(8).replace(/[0-7]/g, function (c) {
//           return b[c] + "+ ";
//         });
//       } else {
//         var m = /[0-9a-f]{4}$/.exec("000" + n.toString(16))[0];
//         t += "(oﾟｰﾟo)+ " + m.replace(/[0-9a-f]/gi, function (c) {
//           return b[parseInt(c, 16)] + "+ ";
//         });
//       }
//       r += t;

//     }
//     r += "(ﾟДﾟ)[ﾟoﾟ]) (ﾟΘﾟ)) ('_');";
//     return r;
//   }