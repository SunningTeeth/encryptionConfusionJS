

java -jar AST.jar arg1 ... argn

1. 可以传递多个文件 arg1 ... 为文件名   最后一个参数为python脚本位置 
2. 两个参数  第一个为文件夹  第二个为python脚本位置

eg : 
方式一：  java -jar AST.jar  /etc/csp/1.js  /etc/csp/2.js   /usr/local/Daily/hello.py

方式二：  java -jar AST.jar  /etc/csp/  /usr/local/Daily/hello.py