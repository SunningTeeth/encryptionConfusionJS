package test;

import java.io.File;
import java.util.TreeSet;

import jdk.nashorn.api.tree.ArrayAccessTree;
import jdk.nashorn.api.tree.ArrayLiteralTree;
import jdk.nashorn.api.tree.AssignmentTree;
import jdk.nashorn.api.tree.BinaryTree;
import jdk.nashorn.api.tree.BlockTree;
import jdk.nashorn.api.tree.CatchTree;
import jdk.nashorn.api.tree.CompilationUnitTree;
import jdk.nashorn.api.tree.CompoundAssignmentTree;
import jdk.nashorn.api.tree.ExpressionStatementTree;
import jdk.nashorn.api.tree.ForInLoopTree;
import jdk.nashorn.api.tree.ForLoopTree;
import jdk.nashorn.api.tree.FunctionCallTree;
import jdk.nashorn.api.tree.FunctionDeclarationTree;
import jdk.nashorn.api.tree.FunctionExpressionTree;
import jdk.nashorn.api.tree.IdentifierTree;
import jdk.nashorn.api.tree.IfTree;
import jdk.nashorn.api.tree.LiteralTree;
import jdk.nashorn.api.tree.MemberSelectTree;
import jdk.nashorn.api.tree.NewTree;
import jdk.nashorn.api.tree.ObjectLiteralTree;
import jdk.nashorn.api.tree.Parser;
import jdk.nashorn.api.tree.PropertyTree;
import jdk.nashorn.api.tree.ReturnTree;
import jdk.nashorn.api.tree.Tree;
import jdk.nashorn.api.tree.Tree.Kind;
import jdk.nashorn.api.tree.TryTree;
import jdk.nashorn.api.tree.VariableTree;

/**
 * 使用JDK 11的Javascript engine nashorm 解析javascript代码, 并释放函数名, 变量名称
 */
@SuppressWarnings("deprecation")
public class JavaScriptASTExtractor {

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
                this.stringConstants.add(value.toString());
            }
        }
    }

    public static void main(String[] args) throws Throwable {
        File file = new File(args[0]);
        Result result = extract(file);
        System.out.println("Variables: "+result.variables);
        System.out.println("Functions: "+result.functions);
        System.out.println("String constants: "+result.stringConstants);
    }

    private static Result extract(File file) throws Exception {
        Result result = new Result();

        Parser parser = Parser.create();
        CompilationUnitTree tree = parser.parse(file, null);
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
        case FOR_IN_LOOP:{
            ForInLoopTree t0 = (ForInLoopTree)t;
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
        case CATCH:{
            CatchTree t0 = (CatchTree)t;
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
        case ARRAY_ACCESS:{
            ArrayAccessTree t0 = (ArrayAccessTree)t;
            extractIdentifier(t0.getExpression(), result, 1);
        }
        break;
        case ARRAY_LITERAL:{
            ArrayLiteralTree t0 = (ArrayLiteralTree)t;
            for(Tree tn:t0.getElements()) {
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
        case NULL_LITERAL:
        case BOOLEAN_LITERAL:
        case NUMBER_LITERAL:
        case DEBUGGER:
            break;
        default:
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
