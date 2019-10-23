// 1、js-encode-plugin.js 文件（webpack的js加密插件）
const fs = require('fs'); //node的文件系统模块，用于读写及操作文件
const path = require('path'); //node提供的一些用于处理文件路径的小工具
var chalk = require('chalk') //用于向控制台输出带颜色的问题提示

function Base64(pluginOptions) {
    this.options = pluginOptions;
}



Base64.prototype.apply = function (compiler) {
    const _this = this;
    var substring = 'substring',
            split = 'split',
            reverse = 'reverse',
            join = 'join',
            toString = 'toString',
            substr = 'substr',
            replace = 'replace',
            fn = {
                getHex: function (str) {//获取前4位标记数字
                    return {
                        str: str[substring](4),//排除前4位字符串
                        hex: str[substring](0, 4)[split]("")[reverse]()[join]("")//前4位倒序
                    }
                },
                getDec: function (str) {//获取混淆字符位置坐标
                    str = parseInt(str, 16)[toString]();//前4位倒序的16进制
                    //str[substring](0, 2)[split]("");
                    return {
                        pre: str[substring](0, 2)[split](""),//前面坐标
                        tail: str[substring](2)[split]("")//后面坐标
                    }
                },
                delStr: function (str, pos) {//混淆的字符抽取
                    var s = str[substring](0, pos[0]),
                        del = str[substr](pos[0], pos[1]);//需替换的字符
                    return s + str[substring](pos[0])[replace](del, "");//返回替换完成后的base64字符串
                },
                getPos: function (str, pos) {
                    return [str.length - pos[0] - pos[1], pos[1]];
                },
                decode: function (str) {//解密
                    var sh = this.getHex(str),//获取前4位标记数字
                        pos = this.getDec(sh.hex),//获取混淆位置坐标
                        d = this.delStr(sh.str, pos.pre);//前面混淆的字符抽取
                    d = this.delStr(d, this.getPos(d, pos.tail));
                    return decodeURIComponent(escape(this.atob(d)));//base64转成utf-8(兼容中文)  atob
                },
                encode: function (str) {//加密
                    var base64 = this.btoa(unescape(encodeURIComponent(str))),//转换成base64格式
                        random = this.getRanNum(base64),//获取16进制是4位数的随机字符
                        pos = this.getDec(random);//获取混淆位置坐标
                    base64 = this.addStr(base64, pos);//插入混淆字符
                    //console.log(random,pos)
                    return random[toString]()[split]("")[reverse]()[join]("") + base64;
                },
                addStr: function (str, pos) {//混淆的字符插入
                    var r1 = this.getRanStr(pos.pre[1]),//获取随机字符串(前)
                        r2 = this.getRanStr(pos.tail[1]),//获取随机字符串(后)
                        pre = this.insertStr(str, r1, pos.pre[0]),//插入随机字符串(前)
                        tail = pre.length - pos.tail[0];
                    str = this.insertStr(pre, r2, tail);//插入随机字符串(后)
                    return str;
                },
                atob: function (src) {//解密
                    //用一个数组来存放解码后的字符。
                    var str = new Array();
                    var ch1, ch2, ch3, ch4;
                    var pos = 0;
                    //过滤非法字符，并去掉'='。
                    src = src.replace(/[^A-Za-z0-9\+\/]/g, '');
                    //decode the source string in partition of per four characters.
                    while (pos + 4 <= src.length) {
                        ch1 = this.deKey[src.charCodeAt(pos++)];
                        ch2 = this.deKey[src.charCodeAt(pos++)];
                        ch3 = this.deKey[src.charCodeAt(pos++)];
                        ch4 = this.deKey[src.charCodeAt(pos++)];
                        str.push(String.fromCharCode(
                            (ch1 << 2 & 0xff) + (ch2 >> 4), (ch2 << 4 & 0xff) + (ch3 >> 2), (ch3 << 6 & 0xff) + ch4));
                    }
                    //给剩下的字符进行解码。
                    if (pos + 1 < src.length) {
                        ch1 = this.deKey[src.charCodeAt(pos++)];
                        ch2 = this.deKey[src.charCodeAt(pos++)];
                        if (pos < src.length) {
                            ch3 = this.deKey[src.charCodeAt(pos)];
                            str.push(String.fromCharCode((ch1 << 2 & 0xff) + (ch2 >> 4), (ch2 << 4 & 0xff) + (ch3 >> 2)));
                        } else {
                            str.push(String.fromCharCode((ch1 << 2 & 0xff) + (ch2 >> 4)));
                        }
                    }
                    //组合各解码后的字符，连成一个字符串。
                    return str.join('');
                },
                btoa: function (src) {//加密
                    //用一个数组来存放编码后的字符，效率比用字符串相加高很多。
                    var str = new Array();
                    var ch1, ch2, ch3;
                    var pos = 0;
                    //每三个字符进行编码。
                    while (pos + 3 <= src.length) {
                        ch1 = src.charCodeAt(pos++);
                        ch2 = src.charCodeAt(pos++);
                        ch3 = src.charCodeAt(pos++);
                        str.push(this.enKey.charAt(ch1 >> 2), this.enKey.charAt(((ch1 << 4) + (ch2 >> 4)) & 0x3f));
                        str.push(this.enKey.charAt(((ch2 << 2) + (ch3 >> 6)) & 0x3f), this.enKey.charAt(ch3 & 0x3f));
                    }
                    //给剩下的字符进行编码。
                    if (pos < src.length) {
                        ch1 = src.charCodeAt(pos++);
                        str.push(this.enKey.charAt(ch1 >> 2));
                        if (pos < src.length) {
                            ch2 = src.charCodeAt(pos);
                            str.push(this.enKey.charAt(((ch1 << 4) + (ch2 >> 4)) & 0x3f));
                            str.push(this.enKey.charAt(ch2 << 2 & 0x3f), '=');
                        } else {
                            str.push(this.enKey.charAt(ch1 << 4 & 0x3f), '==');
                        }
                    }
                    //组合各编码后的字符，连成一个字符串。
                    return str.join('');
                },
                insertStr: function (str, addstr, pos) {//往指定位置插入字符串
                    return str[substring](0, pos) + addstr + str[substring](pos);
                },
                getRanNum: function (str) {//获取16进制是4位数的4位随机字符
                    var ranArr = [];
                    ; (function () {
                        var n = '',
                            length = str.length;
                        /** 4101开始16进制是4位数 **/
                        for (var i = 4101; i <= 9999; i++) {//找出所有符合要求的16进制4位数
                            n = i[toString](16);//10转成16
                            if (length >= 8 && !(Math.floor(i / 100) % 10 === 0 || i % 10 === 0) && n.length === 4) {
                                //正常的base64编码长度大于8才前后加混淆字符
                                //console.log(i,n);
                                if (Math.floor(i / 1000) <= length / 2 && Math.floor(i % 100 / 10) <= length / 2) {//混淆位置不能大于长度一半
                                    ranArr.push(n);
                                }
                            } else if (i % 100 === 0 && n.length === 4) {//只在前面插入混淆字符
                                if (Math.floor(i / 1000) <= length) {//混淆位置不能大于长度
                                    ranArr.push(n);
                                }
                            }
                        }
                    }());
                    var length = ranArr.length,
                        ran = Math.round(Math.random() * (length - 1));
                    return ranArr[ran];
                },
                enKey: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
                deKey: new Array(
                    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
                    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
                    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
                    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
                    -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
                    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
                    -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
                    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
                ),
                getRanStr: function (num) {//获取指定个数随机字符串
                    var key = this.enKey.split("");
                    length = key.length,
                        res = "";
                    for (; num--;) {
                        var id = Math.round(Math.random() * (length - 1));
                        res += key[id];
                    }
                    return res;
                }
            }
            // compiler.tranCode = fn;
        // window.compiler = compiler;
    // 4、挂载 webpack 事件钩子（这里挂载的是 after-emit 事件,在将内存中 assets 内容写到磁盘文件夹之后触发的webpack生命周期钩子）
    compiler.plugin('after-emit', function (compilation, callback) {

        

        // ... 内部进行自定义的编译操作
        // 5、操作 compilation 对象的内部数据
        var filePath = path.resolve(__dirname, _this.options.assetsPath); //设置需要加密的js文件路径，_this.options.assetsPath为插件配置中传过来的需要加密的js文件路径
        filterFile(filePath);
        console.log(chalk.yellow(filePath, '\n filePath filePath.\n'))

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
                        fs.readFile(filedir, 'utf-8', (err, data) => { //读取文件源码
                            if (err) {
                                console.log(chalk.yellow(
                                    '读取js文件异常：\n' +
                                    err.message + '\n'
                                ))
                                return;
                            }

                            let result =fn.encode(data);
                            fs.writeFile(filedir, result, (err) => { //将加密后的代码写回文件中
                                if (err) {
                                    console.log(chalk.yellow(
                                        '写入加密后的js文件异常：\n' +
                                        err.message + '\n'
                                    ))
                                    return;
                                }
                                console.log(chalk.cyan('  jsencode complete.\n'));
                            })
                        })
                    }
                })
            })
        }

        callback();
    })
}

    // (function (base64) {
    //     var substring = 'substring',
    //         split = 'split',
    //         reverse = 'reverse',
    //         join = 'join',
    //         toString = 'toString',
    //         substr = 'substr',
    //         replace = 'replace',
    //         fn = {
    //             getHex: function (str) {//获取前4位标记数字
    //                 return {
    //                     str: str[substring](4),//排除前4位字符串
    //                     hex: str[substring](0, 4)[split]("")[reverse]()[join]("")//前4位倒序
    //                 }
    //             },
    //             getDec: function (str) {//获取混淆字符位置坐标
    //                 str = parseInt(str, 16)[toString]();//前4位倒序的16进制
    //                 //str[substring](0, 2)[split]("");
    //                 return {
    //                     pre: str[substring](0, 2)[split](""),//前面坐标
    //                     tail: str[substring](2)[split]("")//后面坐标
    //                 }
    //             },
    //             delStr: function (str, pos) {//混淆的字符抽取
    //                 var s = str[substring](0, pos[0]),
    //                     del = str[substr](pos[0], pos[1]);//需替换的字符
    //                 return s + str[substring](pos[0])[replace](del, "");//返回替换完成后的base64字符串
    //             },
    //             getPos: function (str, pos) {
    //                 return [str.length - pos[0] - pos[1], pos[1]];
    //             },
    //             decode: function (str) {//解密
    //                 var sh = this.getHex(str),//获取前4位标记数字
    //                     pos = this.getDec(sh.hex),//获取混淆位置坐标
    //                     d = this.delStr(sh.str, pos.pre);//前面混淆的字符抽取
    //                 d = this.delStr(d, this.getPos(d, pos.tail));
    //                 return decodeURIComponent(escape(this.atob(d)));//base64转成utf-8(兼容中文)  atob
    //             },
    //             encode: function (str) {//加密
    //                 var base64 = this.btoa(unescape(encodeURIComponent(str))),//转换成base64格式
    //                     random = this.getRanNum(base64),//获取16进制是4位数的随机字符
    //                     pos = this.getDec(random);//获取混淆位置坐标
    //                 base64 = this.addStr(base64, pos);//插入混淆字符
    //                 //console.log(random,pos)
    //                 return random[toString]()[split]("")[reverse]()[join]("") + base64;
    //             },
    //             addStr: function (str, pos) {//混淆的字符插入
    //                 var r1 = this.getRanStr(pos.pre[1]),//获取随机字符串(前)
    //                     r2 = this.getRanStr(pos.tail[1]),//获取随机字符串(后)
    //                     pre = this.insertStr(str, r1, pos.pre[0]),//插入随机字符串(前)
    //                     tail = pre.length - pos.tail[0];
    //                 str = this.insertStr(pre, r2, tail);//插入随机字符串(后)
    //                 return str;
    //             },
    //             atob: function (src) {//解密
    //                 //用一个数组来存放解码后的字符。
    //                 var str = new Array();
    //                 var ch1, ch2, ch3, ch4;
    //                 var pos = 0;
    //                 //过滤非法字符，并去掉'='。
    //                 src = src.replace(/[^A-Za-z0-9\+\/]/g, '');
    //                 //decode the source string in partition of per four characters.
    //                 while (pos + 4 <= src.length) {
    //                     ch1 = this.deKey[src.charCodeAt(pos++)];
    //                     ch2 = this.deKey[src.charCodeAt(pos++)];
    //                     ch3 = this.deKey[src.charCodeAt(pos++)];
    //                     ch4 = this.deKey[src.charCodeAt(pos++)];
    //                     str.push(String.fromCharCode(
    //                         (ch1 << 2 & 0xff) + (ch2 >> 4), (ch2 << 4 & 0xff) + (ch3 >> 2), (ch3 << 6 & 0xff) + ch4));
    //                 }
    //                 //给剩下的字符进行解码。
    //                 if (pos + 1 < src.length) {
    //                     ch1 = this.deKey[src.charCodeAt(pos++)];
    //                     ch2 = this.deKey[src.charCodeAt(pos++)];
    //                     if (pos < src.length) {
    //                         ch3 = this.deKey[src.charCodeAt(pos)];
    //                         str.push(String.fromCharCode((ch1 << 2 & 0xff) + (ch2 >> 4), (ch2 << 4 & 0xff) + (ch3 >> 2)));
    //                     } else {
    //                         str.push(String.fromCharCode((ch1 << 2 & 0xff) + (ch2 >> 4)));
    //                     }
    //                 }
    //                 //组合各解码后的字符，连成一个字符串。
    //                 return str.join('');
    //             },
    //             btoa: function (src) {//加密
    //                 //用一个数组来存放编码后的字符，效率比用字符串相加高很多。
    //                 var str = new Array();
    //                 var ch1, ch2, ch3;
    //                 var pos = 0;
    //                 //每三个字符进行编码。
    //                 while (pos + 3 <= src.length) {
    //                     ch1 = src.charCodeAt(pos++);
    //                     ch2 = src.charCodeAt(pos++);
    //                     ch3 = src.charCodeAt(pos++);
    //                     str.push(this.enKey.charAt(ch1 >> 2), this.enKey.charAt(((ch1 << 4) + (ch2 >> 4)) & 0x3f));
    //                     str.push(this.enKey.charAt(((ch2 << 2) + (ch3 >> 6)) & 0x3f), this.enKey.charAt(ch3 & 0x3f));
    //                 }
    //                 //给剩下的字符进行编码。
    //                 if (pos < src.length) {
    //                     ch1 = src.charCodeAt(pos++);
    //                     str.push(this.enKey.charAt(ch1 >> 2));
    //                     if (pos < src.length) {
    //                         ch2 = src.charCodeAt(pos);
    //                         str.push(this.enKey.charAt(((ch1 << 4) + (ch2 >> 4)) & 0x3f));
    //                         str.push(this.enKey.charAt(ch2 << 2 & 0x3f), '=');
    //                     } else {
    //                         str.push(this.enKey.charAt(ch1 << 4 & 0x3f), '==');
    //                     }
    //                 }
    //                 //组合各编码后的字符，连成一个字符串。
    //                 return str.join('');
    //             },
    //             insertStr: function (str, addstr, pos) {//往指定位置插入字符串
    //                 return str[substring](0, pos) + addstr + str[substring](pos);
    //             },
    //             getRanNum: function (str) {//获取16进制是4位数的4位随机字符
    //                 var ranArr = [];
    //                 ; (function () {
    //                     var n = '',
    //                         length = str.length;
    //                     /** 4101开始16进制是4位数 **/
    //                     for (var i = 4101; i <= 9999; i++) {//找出所有符合要求的16进制4位数
    //                         n = i[toString](16);//10转成16
    //                         if (length >= 8 && !(Math.floor(i / 100) % 10 === 0 || i % 10 === 0) && n.length === 4) {
    //                             //正常的base64编码长度大于8才前后加混淆字符
    //                             //console.log(i,n);
    //                             if (Math.floor(i / 1000) <= length / 2 && Math.floor(i % 100 / 10) <= length / 2) {//混淆位置不能大于长度一半
    //                                 ranArr.push(n);
    //                             }
    //                         } else if (i % 100 === 0 && n.length === 4) {//只在前面插入混淆字符
    //                             if (Math.floor(i / 1000) <= length) {//混淆位置不能大于长度
    //                                 ranArr.push(n);
    //                             }
    //                         }
    //                     }
    //                 }());
    //                 var length = ranArr.length,
    //                     ran = Math.round(Math.random() * (length - 1));
    //                 return ranArr[ran];
    //             },
    //             enKey: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    //             deKey: new Array(
    //                 -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    //                 -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    //                 -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
    //                 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
    //                 -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    //                 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
    //                 -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    //                 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
    //             ),
    //             getRanStr: function (num) {//获取指定个数随机字符串
    //                 var key = this.enKey.split("");
    //                 length = key.length,
    //                     res = "";
    //                 for (; num--;) {
    //                     var id = Math.round(Math.random() * (length - 1));
    //                     res += key[id];
    //                 }
    //                 return res;
    //             }
    //         }
    //     base64.tranCode = fn;
    //     window.base64 = base64;
    // }(window.base64 || {}));

    // 暴露 js 函数
module.exports = Base64;