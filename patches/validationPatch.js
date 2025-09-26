import traverse from '@babel/traverse';
import * as t from '@babel/types';

// 注入函数：输入AST，返回修改后的AST
export function patchASTWithValidation(ast, targetString = 'Model name cannot be empty') {
    let wasModified = false;

    traverse(ast, {
        StringLiteral(path) {
            if (path.node.value === targetString) {
                console.log(`Found target string: "${targetString}"`);

                const functionParentPath = path.getFunctionParent();

                if (functionParentPath && functionParentPath.isFunction()) {
                    const functionName = functionParentPath.node.id ? functionParentPath.node.id.name : '[Anonymous Function]';
                    console.log(`Located in function "${functionName}". Patching...`);

                    // 创建新的函数体: { return { valid: true }; }
                    const returnStatement = t.returnStatement(
                        t.objectExpression([
                            t.objectProperty(t.identifier('valid'), t.booleanLiteral(true))
                        ])
                    );
                    const newBody = t.blockStatement([returnStatement]);

                    // 替换函数体
                    functionParentPath.get('body').replaceWith(newBody);

                    wasModified = true;
                    console.log('Patch applied successfully.');
                    path.stop(); // 停止遍历
                }
            }
        }
    });

    return { ast, wasModified };
}