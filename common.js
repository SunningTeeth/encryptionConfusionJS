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
// 防止文件too many open files
const Bagpipe = require('bagpipe');
// 设定最大并发数为10
const bagpipe = new Bagpipe(10);

//定义全局变量
const PHP_ERROR = '--php语法格式有误!\n';
const JS_ERROR = '--js语法格式有误!\n';

// 1、js-encode-plugin.js 文件（webpack的js加密插件）

const window_separator = '\\';
const linux_separator = '/';

const common = {

    filterFile: function filterFile(fp, _this, functionName, opt) {
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
                        // 调用解析JS函数this
                        // common.parseJS(filedir, data, _this.options.global, functionName, opt);
                        // 调用解析html函数
                        // common.parseHTML(filedir, data, _this.options.global,functionName,opt);
                        // 调用获取js内容的函数，并写入到同名但后缀名为webpack的文件中,朱window和Linux分隔符的区别
                        // common.getJS(filedir, data);
                    });
                }
            })
        })
    },
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
    parseJS: function parseJS(filedir, data, global, functionName, opt) {
        let result;
        try {
            if (opt != null) {
                result = functionName(data, opt);
            } else {
                result = functionName(data);
            }

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
    parseHTML: function parseHTML(filedir, data, global, functionName, opt) {
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
                if (opt != null) {
                    console.log("=====" + functionName)
                    result[0] = functionName(data, opt);
                } else {
                    result[0] = functionName(data);
                }
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

module.exports = common;