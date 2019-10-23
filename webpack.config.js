const path = require("path")
const jjencode = require('./jjencode');
const Aaencode = require('./aaencode');
const JsEncodePlugin = require('./JsEncodePlugin');
const Base64 = require('./base64');
module.exports = {

    entry: path.join(__dirname, "./src/main.js"),

    output: {
        path: path.join(__dirname, "./dist"),

        filename: "bundle.js"
    },
    plugins: [
        // new Aaencode({
        //     global: '$',
        //     jsReg: /.*\.(?:vue|js)/,
        //     assetsPath: './aaencode/js'
        // }),
        new JsEncodePlugin({
            global: '$',
            jsReg: /.*\.(?:html|js)/,
            assetsPath: './jjencode/html'
        }),
        // new Base64({
        //     global: '$',
        //     jsReg: /.*\.(?:vue|js)/,
        //     assetsPath: './aaencode/js'
        // })
        

    ]
}
