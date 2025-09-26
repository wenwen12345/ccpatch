import traverse from '@babel/traverse';
import * as t from '@babel/types';

// 注入函数：输入AST，返回修改后的AST，移除或修改"esc to interrupt"相关显示
export function patchASTWithEscInterruptRemoval(ast) {
    let wasModified = false;
    const targetStrings = ['esc', 'to interrupt'];

    traverse(ast, {
        CallExpression(path) {
            // 查找 createElement 调用
            if (path.node.callee &&
                path.node.callee.type === 'MemberExpression' &&
                path.node.callee.property &&
                path.node.callee.property.name === 'createElement') {

                const args = path.node.arguments;
                if (args && args.length >= 3) {
                    // 检查第三个参数开始的所有参数
                    let hasEscOrInterrupt = false;

                    for (let i = 2; i < args.length; i++) {
                        if (args[i] && args[i].type === 'StringLiteral' &&
                            targetStrings.includes(args[i].value)) {
                            hasEscOrInterrupt = true;
                            console.log(`Found "${args[i].value}" in createElement call`);
                            break;
                        }
                    }

                    // 如果找到了 esc 或 to interrupt，移除整个 createElement 调用
                    if (hasEscOrInterrupt) {
                        console.log('Removing entire createElement call with esc/interrupt content');

                        // 查找父级数组表达式
                        let arrayParent = path.findParent(p => p.isArrayExpression());
                        if (arrayParent) {
                            // 从数组中移除这个元素
                            const elements = arrayParent.node.elements;
                            const index = elements.indexOf(path.node);
                            if (index !== -1) {
                                elements.splice(index, 1);
                                wasModified = true;
                                console.log('Removed createElement from array');
                                path.skip();
                                return;
                            }
                        }

                        // 如果不在数组中，直接替换为 null
                        path.replaceWith(t.nullLiteral());
                        wasModified = true;
                        console.log('Replaced createElement with null');
                    }
                }
            }
        },

        // 处理条件表达式中的数组
        ConditionalExpression(path) {
            // 查找形如 i1 ? [createElement(...)] : [] 的模式
            if (path.node.consequent && path.node.consequent.type === 'ArrayExpression') {
                const elements = path.node.consequent.elements;
                let shouldRemoveArray = false;

                elements.forEach(element => {
                    if (element && element.type === 'CallExpression' &&
                        element.callee && element.callee.type === 'MemberExpression' &&
                        element.callee.property && element.callee.property.name === 'createElement') {

                        const args = element.arguments;
                        if (args && args.length >= 3) {
                            for (let i = 2; i < args.length; i++) {
                                if (args[i] && args[i].type === 'StringLiteral' &&
                                    targetStrings.includes(args[i].value)) {
                                    shouldRemoveArray = true;
                                    console.log(`Found conditional expression with "${args[i].value}"`);
                                    break;
                                }
                            }
                        }
                    }
                });

                if (shouldRemoveArray) {
                    // 将整个条件表达式替换为空数组
                    path.replaceWith(t.arrayExpression([]));
                    wasModified = true;
                    console.log('Replaced conditional expression with empty array');
                }
            }
        }
    });

    return { ast, wasModified };
}