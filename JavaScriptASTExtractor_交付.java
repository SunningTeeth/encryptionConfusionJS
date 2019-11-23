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

  private static final String SYS_SEPARATOR = File.separator;
  private static final String AST_SUFFIX = ".symbol";
  private static final String NOT_AST_SUFFIX = ".txt";
  private static final String FILE_PATH = "filePath";
  private static final String VARIABLES = "variables";
  private static final String FUNCTIONS = "functions";
  private static final String STRING_CONSTANTS = "stringConstants";

  public static void main(String[] args) {

    if (args.length == 0 || args[0].trim().isEmpty()) {
      throw new RuntimeException("please print AST directory !!!");
    }

    for (int i = 0, len = args.length - 1; i < len; i++) {

      String ASTDir = args[i];
      String content = "";
      JSONObject ASTExtractor = new JSONObject();
      List<String> filePath = new ArrayList<>();

      if (ASTDir.indexOf(".") > 0) {//文件
        content = readFile(ASTDir);
      } else {//文件夹
        filePath = readDirectory(ASTDir);
      }

      if (!filePath.isEmpty()) {
        for (String fp : filePath) {
          preParse(ASTExtractor, fp);
        }
      }

      if (!content.isEmpty()) {
        preParse(ASTExtractor, ASTDir);
      }
    }

    String exe = "python";
    String command = args[args.length - 1];
    String[] cmdArr = new String[]{exe, command};
    Process process = null;
    try {
      process = Runtime.getRuntime().exec(cmdArr);
      InputStream is = process.getInputStream();
      int iAvail = is.available();
      byte[] bytes = new byte[iAvail];
      is.read(bytes);
      is.close();
      System.out.println("python read content : " + new String(bytes));
    } catch (Exception e) {
      e.printStackTrace();
    }

    System.out.println("finished .....");
  }

  private static void preParse(JSONObject ASTExtractor, String filepathOrDirectoryPath) {
    File file = new File(filepathOrDirectoryPath);
    Result result = extract(file);
    System.out.println("result:  " + result);
    if (result != null) {
      ASTExtractor.put(FILE_PATH, file);
      ASTExtractor.put(VARIABLES, result.variables);
      ASTExtractor.put(FUNCTIONS, result.functions);
      ASTExtractor.put(STRING_CONSTANTS, result.stringConstants);
      writeFile(file, true, ASTExtractor);
    } else if (result == null) {
      writeFile(file, false, ASTExtractor);
    }
  }

  private static List<String> readDirectory(String filepath) {
    List<String> filename = new ArrayList<>();
    File file = new File(filepath);
    if (!file.exists()) {
      throw new RuntimeException(file.getName() + " is not exists !!!");
    }

    String[] fileList = file.list();
    if (fileList.length < 1) {
      throw new RuntimeException(file.getName() + " is null directory !!!");
    }

    for (int i = 0, len = fileList.length; i < len; i++) {
      String path = filepath + SYS_SEPARATOR + fileList[i];
      File readFile = new File(path);
      if (!readFile.isDirectory()) {
        filename.add(readFile.getAbsolutePath());
      }
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

  private static void writeFile(File file, Boolean isParseSuccess, JSONObject ASTExtractor) {
    try {

      String path = file.getParent() + SYS_SEPARATOR;
      StringBuffer outputDir = new StringBuffer(path);
      String fileName = file.getName().substring(0, file.getName().lastIndexOf("."));
      if (isParseSuccess) {
        outputDir.append("AST" + SYS_SEPARATOR);
      } else {
        outputDir.append("noAST" + SYS_SEPARATOR);
      }

      File jFile = new File(outputDir.toString());
      if (!jFile.exists()) {
        jFile.mkdirs();
      }
      String content = "";
      if (isParseSuccess) {
        outputDir.append(fileName).append(AST_SUFFIX);
        content = ASTExtractor.toString();
      } else {
        outputDir.append(fileName).append(NOT_AST_SUFFIX);
        content = readFile(file.getAbsolutePath());
      }

      FileWriter fileWriter = new FileWriter(outputDir.toString());
      BufferedWriter bw = new BufferedWriter(fileWriter);
      bw.write(content);
      bw.close();
    } catch (IOException e) {
      e.printStackTrace();
    }
  }

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

  private static Result extract(File file) {
    Result result = new Result();

    Parser parser = Parser.create();
    CompilationUnitTree tree = null;
    try {
      tree = parser.parse(file, null);
    } catch (Exception e) {
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
      case MULTIPLY_ASSIGNMENT: {
        CompoundAssignmentTree t0 = (CompoundAssignmentTree) t;
        extractIdentifier(t0.getVariable(), result, 1);
        extractIdentifier(t0.getExpression(), result, 1);
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
//        ASTExtractor.put("nonParseCode", t.getKind());//没有解析的code
        throw new RuntimeException("Unsupported AST tree: " + t);
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

