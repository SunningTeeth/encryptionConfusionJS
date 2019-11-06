import jdk.nashorn.api.tree.*;

import java.io.*;
import java.util.*;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.TreeSet;

import jdk.nashorn.api.tree.Tree.Kind;
import org.json.JSONObject;

/**
 * 使用JDK 11的Javascript engine nashorm 解析javascript代码, 可抽取函数名, 变量名称，字符串等特征
 */

public class JavaScriptASTExtractor {

    private static JSONObject ASTExtractor = new JSONObject();
    private static final String FILE_PATH = "filePath";
    private static final String VARIABLES = "variables";
    private static final String FUNCTIONS = "functions";
    private static final String STRING_CONSTANTS = "stringConstants";
    private static final String NON_PARSE_CODE = "nonParseCode";
    private static final String LOCATE_PATH = "D:/js加密混淆/encryptionConfusionJS/uglifyjs/html/parse/src";

    public static class Result {
        public TreeSet<String> variables = new TreeSet<>();
        public TreeSet<String> functions = new TreeSet<>();
        public TreeSet<String> stringConstants = new TreeSet<>();

        public void addVariable(IdentifierTree t) {
            if (t != null) {
                variables.add(t.getName());
            }
        }

        public void addVariable(String ident) {
            if (ident != null) {
                variables.add(ident);
            }
        }

        public void addFunction(IdentifierTree t) {
            if (t != null) {
                functions.add(t.getName());
            }
        }

        public void addConstant(Object value) {
            if (value != null && value instanceof String) {
                stringConstants.add(value.toString());
            }
        }
    }

    private static List<String> readDirectory(String filepath) {
        List<String> filename = new ArrayList<String>();
        try {
            File file = new File(filepath);
            if (file.isDirectory()) {//文件夹
                String[] fileList = file.list();
                for (int i = 0; i < fileList.length; i++) {
                    File readFile = new File(filepath + "\\" + fileList[i]);
                    if (!readFile.isDirectory()) {
                        filename.add(readFile.getAbsolutePath());
                    }
                    /*else if (readFile.isDirectory()) {
                        readDirectory(filepath + "\\" + fileList[i]);
                    }*/
                }

            } else if (!file.isDirectory()) {// 文件
                System.out.println("path=" + file.getPath());
                System.out.println("absolutepath=" + file.getAbsolutePath());
                System.out.println("name=" + file.getName());
            }

        } catch (Exception e) {
        }
        return filename;
    }

    private static String readFile(String filepath) {
        try {
            InputStream is = new FileInputStream(filepath);
            int iAvail = is.available();
            byte[] bytes = new byte[iAvail];
            is.read(bytes);
            is.close();
            return new String(bytes);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return "";
    }

    private static void writeFile(File file) {
        try {
            String content = ASTExtractor.toString();
            if (!file.exists()) {
                file.createNewFile();
            }
            String fp = file.getAbsolutePath();
            String fp1 = fp.substring(0, fp.lastIndexOf("\\") + 1);
            String fp2 = fp.substring(fp.lastIndexOf("\\") + 1, fp.lastIndexOf("."));
            String directory = fp1 + "ASTParse\\";
            File jFile = new File(directory);
            if (!jFile.exists()) {
                jFile.mkdirs();
            }
            String filepath = jFile.getAbsoluteFile() + "\\" + fp2 + ".symbol";
            FileWriter fileWriter = new FileWriter(filepath);
            BufferedWriter bw = new BufferedWriter(fileWriter);
            bw.write(content);
            bw.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        String content = "";
        List<String> filePath = new ArrayList<>();
        if (LOCATE_PATH.indexOf(".") > 0) {
            content = readFile(LOCATE_PATH);
        } else {
            filePath = readDirectory(LOCATE_PATH);
        }
        if (!filePath.isEmpty()) {
            for (String fp : filePath) {
                File file = new File(fp);
                System.out.println(fp+"####");
                Result result = extract(file);
                if(result != null){
                    ASTExtractor.put(FILE_PATH, file);
                    ASTExtractor.put(VARIABLES, result.variables);
                    ASTExtractor.put(FUNCTIONS, result.functions);
                    ASTExtractor.put(STRING_CONSTANTS, result.stringConstants);
                }

                if (!ASTExtractor.has(NON_PARSE_CODE)) {
                    ASTExtractor.put(NON_PARSE_CODE, "");
                }
                writeFile(file);
            }
        }
        if (!content.isEmpty()) {
            writeFile(new File(LOCATE_PATH));
        }
        System.out.println("finished .....");
    }

    private static Result extract(File file) {
        Result result = new Result();

        Parser parser = Parser.create();
        CompilationUnitTree tree = null;
        try {
            tree = parser.parse(file, null);
        } catch (Exception e) {
//      e.printStackTrace();
            return null;

        }
        for (Tree t : tree.getSourceElements()) {
            extract(t, result);
        }
        return result;
    }

    private static void extract(Tree t, Result result) {
        if (t == null) {
            return;
        }
        System.out.println(t.getKind());
        switch (t.getKind()) {
            case ASSIGNMENT: {
                AssignmentTree t0 = (AssignmentTree) t;
                extractIdentifier(t0.getVariable(), result, 1);
                extractIdentifier(t0.getExpression(), result, 1);
            }
            break;
            case IDENTIFIER: {
                IdentifierTree t0 = (IdentifierTree) t;
                result.addVariable(t0);
            }
            break;
            case MEMBER_SELECT: {
                MemberSelectTree t0 = (MemberSelectTree) t;
                result.addVariable(t0.getIdentifier());
                extractIdentifier(t0.getExpression(), result, 1);
            }
            break;
            case VARIABLE: {
                VariableTree t0 = (VariableTree) t;
                extractIdentifier(t0.getBinding(), result, 1);
                extract(t0.getInitializer(), result);
            }
            break;
            case EXPRESSION_STATEMENT: {
                ExpressionStatementTree t0 = (ExpressionStatementTree) t;
                extract(t0.getExpression(), result);
            }
            break;
            case FUNCTION_EXPRESSION: {
                FunctionExpressionTree t0 = (FunctionExpressionTree) t;
                result.addFunction(t0.getName());
                extract(t0.getBody(), result);
            }
            break;
            case BLOCK: {
                BlockTree t0 = (BlockTree) t;
                for (Tree tn : t0.getStatements()) {
                    extract(tn, result);
                }
            }
            break;
            case FUNCTION: {
                FunctionDeclarationTree t0 = (FunctionDeclarationTree) t;
                result.addFunction(t0.getName());
                extract(t0.getBody(), result);
            }
            break;
            case NEW: {
                NewTree t0 = (NewTree) t;
                extract(t0.getConstructorExpression(), result);
            }
            break;
            case FUNCTION_INVOCATION: {
                FunctionCallTree t0 = (FunctionCallTree) t;
                extractIdentifier(t0.getFunctionSelect(), result, 2);
            }
            break;
            case IF: {
                IfTree t0 = (IfTree) t;
                extractIdentifier(t0.getCondition(), result, 1);
                extract(t0.getThenStatement(), result);
                extract(t0.getElseStatement(), result);
            }
            break;
            case FOR_LOOP: {
                ForLoopTree t0 = (ForLoopTree) t;
                extract(t0.getCondition(), result);
                extract(t0.getStatement(), result);
            }
            break;
            case FOR_IN_LOOP: {
                ForInLoopTree t0 = (ForInLoopTree) t;
                extractIdentifier(t0.getVariable(), result, 1);
                extract(t0.getExpression(), result);
                extract(t0.getStatement(), result);
            }
            break;
            case RETURN: {
                ReturnTree t0 = (ReturnTree) t;
                extractIdentifier(t0.getExpression(), result, 1);
            }
            break;
            case TRY: {
                TryTree t0 = (TryTree) t;
                extract(t0.getBlock(), result);
                extract(t0.getFinallyBlock(), result);
                for (Tree tn : t0.getCatches()) {
                    extract(tn, result);
                }
            }
            break;
            case CATCH: {
                CatchTree t0 = (CatchTree) t;
                extract(t0.getBlock(), result);
            }
            break;
            case OBJECT_LITERAL: {
                ObjectLiteralTree t0 = (ObjectLiteralTree) t;
                for (Tree tn : t0.getProperties()) {
                    extractIdentifier(tn, result, 1);
                }
            }
            break;
            case ARRAY_ACCESS: {
                ArrayAccessTree t0 = (ArrayAccessTree) t;
                extractIdentifier(t0.getExpression(), result, 1);
            }
            break;
            case ARRAY_LITERAL: {
                ArrayLiteralTree t0 = (ArrayLiteralTree) t;
                for (Tree tn : t0.getElements()) {
                    extract(tn, result);
                }
            }
            break;
            case STRING_LITERAL: {
                LiteralTree t0 = (LiteralTree) t;
                result.addConstant(t0.getValue());
            }
            break;
            case PROPERTY: {
                PropertyTree t0 = (PropertyTree) t;
                extractIdentifier(t0.getKey(), result, 1);
                extractIdentifier(t0.getValue(), result, 1);
            }
            break;
            case PLUS_ASSIGNMENT:
            case MINUS_ASSIGNMENT:
            case AND_ASSIGNMENT:
            case OR_ASSIGNMENT:
            case XOR_ASSIGNMENT:
            case DIVIDE_ASSIGNMENT: {
                CompoundAssignmentTree t0 = (CompoundAssignmentTree) t;
                extractIdentifier(t0.getVariable(), result, 1);
                extractIdentifier(t0.getExpression(), result, 1);
            }
            break;
            case AND:
            case REMAINDER:
            case DIVIDE:
            case MULTIPLY:
            case PLUS:
            case MINUS:
            case LEFT_SHIFT:
            case RIGHT_SHIFT:
            case UNSIGNED_RIGHT_SHIFT:
            case IN:
            case EQUAL_TO:
            case NOT_EQUAL_TO:
            case STRICT_EQUAL_TO:
            case STRICT_NOT_EQUAL_TO:
            case XOR:
            case LESS_THAN:
            case LESS_THAN_EQUAL:
            case GREATER_THAN:
            case GREATER_THAN_EQUAL:

            case CONDITIONAL_AND:
            case CONDITIONAL_OR:
            case COMMA: {
                BinaryTree t0 = (BinaryTree) t;
                extractIdentifier(t0.getLeftOperand(), result, 1);
                extractIdentifier(t0.getRightOperand(), result, 1);
            }
            break;
            case MULTIPLY_ASSIGNMENT:{
                CompoundAssignmentTree t0 = (CompoundAssignmentTree) t;
                extractIdentifier(t0.getVariable(),result,1);
                extractIdentifier(t0.getExpression(),result,1);
            }
            break;
            case NULL_LITERAL:
            case BOOLEAN_LITERAL:
            case NUMBER_LITERAL:
            case DEBUGGER:
                break;
            case WHILE_LOOP: {
                WhileLoopTree t0 = (WhileLoopTree) t;
                extract(t0.getStatement(), result);
            }
            break;
            case DO_WHILE_LOOP: {
                DoWhileLoopTree t0 = (DoWhileLoopTree) t;
                extract(t0.getStatement(), result);
            }
            break;
            case POSTFIX_INCREMENT:
            case POSTFIX_DECREMENT:
            case PREFIX_INCREMENT:
            case PREFIX_DECREMENT:
            case UNARY_PLUS:
            case UNARY_MINUS:
            case BITWISE_COMPLEMENT:
            case LOGICAL_COMPLEMENT:
            case DELETE:
            case TYPEOF:
            case VOID:
                break;
            case CONDITIONAL_EXPRESSION: {
                ConditionalExpressionTree t0 = (ConditionalExpressionTree) t;//三元表达式
                extract(t0.getCondition(), result);
            }
            break;
            default:
                ASTExtractor.put("nonParseCode", t.getKind());//没有解析的code
//        throw new RuntimeException("Unsupported AST tree: " + t);
        }
    }

    private static void extractIdentifier(Tree t, Result result, int purpose) {
        if (t == null) {
            return;
        }
        if (t.getKind() == Kind.IDENTIFIER) {
            if (purpose == 1) {
                result.addVariable((IdentifierTree) t);
            } else if (purpose == 2) {
                result.addFunction((IdentifierTree) t);
            }
        } else {
            extract(t, result);
        }
    }
}

