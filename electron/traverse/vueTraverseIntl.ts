/*
 * @Author: junyang.le@hand-china.com
 * @Date: 2022-05-24 20:53:09
 * @LastEditTime: 2022-05-24 22:49:01
 * @LastEditors: junyang.le@hand-china.com
 * @Description: your description
 * @FilePath: \tool\electron\traverse\vueTraverseIntl.ts
 */
import { AST } from 'vue-eslint-parser';
import { parseVueFile } from '../parse';
import { getVueIntlTraverseVisitor } from './visitor';
import { ProcessFile } from '../types';

const { traverseNodes } = AST;

export function traverseVueIntl(file: ProcessFile) {
  parseVueFile(file);
  if (file.parseError) return;
  // 遍历vue的template
  traverseNodes(file.vueParseResult.templateBody, getVueIntlTraverseVisitor(file, { l2: 'intl', l3: 'd' }));
  // 遍历vue的script
  file.vueParseResult.body.forEach(node =>
    traverseNodes(node, getVueIntlTraverseVisitor(file, { l1: 'this', l2: 'intl', l3: 'd' }))
  );
}
