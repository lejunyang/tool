/*
 * @Author: junyang.le@hand-china.com
 * @Date: 2022-01-17 15:27:23
 * @LastEditTime: 2022-05-25 12:10:01
 * @LastEditors: junyang.le@hand-china.com
 * @Description: your description
 * @FilePath: \tool\electron\traverse\traverseIntl.ts
 */
import traverse from '@babel/traverse';
import { parseJSFile } from '../parse';
import { getIntlTraverseVisitor } from './visitor';
import { State, ProcessFile, IntlOptions } from '../types';

export function traverseIntl(file: ProcessFile, options: IntlOptions) {
  parseJSFile(file);
  if (file.parseError) return;
  traverse<State>(file.parseResult, getIntlTraverseVisitor(options), undefined, file);
}
