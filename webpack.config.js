const path = require("path")
const Aaencode = require('./aaencode');
const JsEncodePlugin = require('./jsEncodePlugin');
const Base64 = require('./base64');
const Obfuscator = require('./obfuscator');
const UglifyJs = require('./uglifyJs');
module.exports = {

    entry: path.join(__dirname, "./src/main.js"),

    output: {
        path: path.join(__dirname, "./dist"),

        filename: "bundle.js"
    },
    plugins: [
        // new Aaencode({
        //     global: '$',
        //     jsReg: /.*\.(?:html|js)/,
        //     assetsPath: './aaencode/js'
        // }),
        new Obfuscator({
            global: '$',
            jsReg: /.*\.(?:html|js)/,
            assetsPath: './obfuscator/meduim/js'
        }),
        // new Base64({
        //     global: '$',
        //     jsReg: /.*\.(?:html|js)/,
        //     assetsPath: './base64/js'
        // }),
        // new JsEncodePlugin({
        //     global: '$',
        //     jsReg: /.*\.(?:html|js)/,
        //     assetsPath: './jjencode/js'
        // }),
        // new UglifyJs({
        //     global: '$',
        //     jsReg: /.*\.(?:html|js)/,
        //     assetsPath: './uglifyjs/js'
        // })
    ]
}
