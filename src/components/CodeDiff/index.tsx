/*
 * @Author: junyang.le@hand-china.com
 * @Date: 2022-01-24 16:42:38
 * @LastEditTime: 2022-01-28 17:30:33
 * @LastEditors: junyang.le@hand-china.com
 * @Description: your description
 * @FilePath: \tool\src\components\CodeDiff\index.tsx
 */
import React, { PureComponent } from 'react';
import { createPatch } from 'diff';
// import Diff2Html from 'diff2html';
import {
  Diff2HtmlUI,
  Diff2HtmlUIConfig,
} from 'diff2html/lib/ui/js/diff2html-ui';
import 'highlight.js/styles/github.css';
import 'diff2html/bundles/css/diff2html.min.css';

export type CodeDiffProps = Partial<{
  outputFormat: 'side-by-side' | 'line-by-line';
  matching: string;
  filename: string;
  oldStr: string;
  newStr: string;
  context: number;
  patch: string;
}>;

// 如果直接提供patch那就展示这个，否则就需要提供filename、oldStr、newStr
class CodeDiff extends PureComponent<CodeDiffProps, {}> {
  diff2htmlUi: Diff2HtmlUI;
  divRef: HTMLDivElement;

  show() {
    const {
      filename = '',
      oldStr = '',
      newStr = '',
      context = 5,
      outputFormat = 'side-by-side',
      matching = 'lines',
      patch,
    } = this.props;
    if (!(patch || oldStr || newStr)) return;
    const _patch =
      patch ||
      createPatch(filename, oldStr, newStr, '', '', {
        context,
      });

    if (this.divRef) {
      this.diff2htmlUi = new Diff2HtmlUI(this.divRef, _patch, {
        outputFormat,
        matching,
      } as Diff2HtmlUIConfig);
      this.diff2htmlUi.draw();
    }
  }

  componentWillReceiveProps() {
    this.show();
  }

  componentDidMount() {
    this.show();
  }

  render() {
    return (
      <>
        <div
          style={{ maxWidth: 'calc(100vw - 280px)' }}
          ref={r => {
            this.divRef = r;
          }}
        ></div>
      </>
    );
  }
}

export default CodeDiff;
