import traverse from '@babel/traverse';
import * as t from '@babel/types';

// 注入函数：输入AST，返回修改后的AST，移除"Context low"相关显示
export function patchASTWithContextLowRemoval(ast) {
    let wasModified = false;
    const targetString = 'Context low · Run /compact to compact & continue';
    const functionMarkerString = 'Context left until auto-compact: ';

    traverse(ast, {
        StringLiteral(path) {
            // 保持原有逻辑：替换目标字符串
            if (path.node.value === targetString) {
                console.log(`Found target string: "${targetString}"`);
                path.replaceWith(t.stringLiteral(''));
                wasModified = true;
                console.log('Context low string removed successfully.');
            }

            // 新功能：通过标记字符串定位函数并修改
            if (path.node.value === functionMarkerString) {
                console.log(`Found function marker string: "${functionMarkerString}"`);

                const functionParentPath = path.getFunctionParent();
                if (functionParentPath && functionParentPath.isFunction()) {
                    const functionName = functionParentPath.node.id ? functionParentPath.node.id.name : '[Anonymous Function]';
                    console.log(`Located function "${functionName}". Patching to return null...`);

                    // 创建新的函数体: { return null; }
                    const returnStatement = t.returnStatement(t.nullLiteral());
                    const newBody = t.blockStatement([returnStatement]);

                    // 替换函数体
                    functionParentPath.get('body').replaceWith(newBody);
                    wasModified = true;
                    console.log('Function patched to return null.');
                    path.stop(); // 停止遍历
                }
            }
        }
    });

    return { ast, wasModified };
}