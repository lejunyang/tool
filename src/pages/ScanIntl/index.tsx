/* eslint-disable no-case-declarations */
/*
 * @Author: junyang.le@hand-china.com
 * @Date: 2022-01-29 14:24:21
 * @LastEditTime: 2022-06-07 16:39:56
 * @LastEditors: junyang.le@hand-china.com
 * @Description: your description
 * @FilePath: \tool\src\pages\ScanIntl\index.tsx
 */
import { Table, Tooltip, Form, Select, Input, notification } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/lib/table';
import { useState, FC } from 'react';
import { set, get as lodashGet } from 'lodash';
import Button from '../../components/Button';
import { Event, IntlItem, Mode } from '../../../electron/types';
import { AppState } from '../../@types';
import { copy } from '../../utils';

type IntlRecord = IntlItem & {
  path?: string;
};

const generateOnCell = (record: IntlRecord, key: keyof IntlRecord) => {
  return {
    onDoubleClick: () => {
      if (copy(record[key])) notification.success({ message: '复制成功' });
    },
  };
};

const filePathRender = (record: IntlRecord) => {
  const { path, code } = record;
  return (
    <a
      onClick={() => {
        if (copy(code)) notification.success({ message: `已复制 ${code}` });
        window.Main.emit(Event.LaunchEditor, path);
      }}
    >
      {path}
    </a>
  );
};

const errorRender = (text: string, record: IntlRecord) => {
  return (
    <Tooltip
      title={() => (
        <div>
          <div>{record.error}</div>
          {filePathRender(record)}
        </div>
      )}
    >
      <span className={record.error ? 'text-red' : ''}>{text || record.error}</span>
    </Tooltip>
  );
};

const excludedPrefixesDefault = [
  'hzero.common',
  'hzero.c7nProUI',
  'hzero.c7nUI',
  'hzero.hzeroUI',
  'hpfm.tenantSelect',
  'hadm.marketclient',
];

const Intl: FC<Pick<AppState, 'pageData'>> = ({
  pageData,
  pageData: {
    existedIntlData,
    remoteData: { intlResult, mode },
  },
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, update] = useState(1); // 用于刷新页面
  const [form] = Form.useForm();
  const { excludedPrefixes = excludedPrefixesDefault, prefix = '', get = '', d = '' } = form.getFieldsValue(true);
  const data = intlResult.filter(
    item =>
      (!item.prefix || !excludedPrefixes.includes(item.prefix)) &&
      (item.prefix || '').includes(prefix) &&
      item.get.includes(get) &&
      item.d.includes(d)
  );
  const errorLength = data.filter(item => item.error).length;
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  let columns: ColumnType<IntlRecord>[] = [
    mode === Mode.HzeroIntlReact && {
      dataIndex: 'prefix',
      title: '前缀',
      onCell: record => {
        return generateOnCell(record, 'prefix');
      },
      render: errorRender,
    },
    {
      dataIndex: 'get',
      title: '编码',
      onCell: record => {
        return generateOnCell(record, 'get');
      },
      render: errorRender,
    },
    {
      dataIndex: 'd',
      title: '描述',
      onCell: record => {
        return generateOnCell(record, 'd');
      },
      render: errorRender,
    },
  ];
  columns = columns.filter(i => i);

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: any) => {
      setSelectedRowKeys(selectedRowKeys);
    },
  };

  const getData = () => {
    if (data.length === 0) {
      notification.info({ message: '没有数据可以导出' });
      return;
    }
    const result = existedIntlData || {};
    let isOverride = false;
    const checkOverride = () => {
      if (isOverride) {
        notification.warn({ message: '导出过程中，存在扫描出的数据和导入数据不同，请前往控制台查看详细信息' });
      }
    }
    switch (mode) {
      case Mode.VueI18N:
        for (const item of data) {
          if (lodashGet(result, item.code) && lodashGet(result, item.code) !== item.d) {
            console.warn('编码“', item.code, '”已经存在值“', lodashGet(result, item.code), '”，它将被覆盖为:', item.d)
            isOverride = true;
          }
          set(result, item.code, item.d);
        }
        checkOverride();
        return JSON.stringify(result, null, 2);
      case Mode.UmiIntlReact:
        for (const item of data) {
          if (result[item.code] && result[item.code] !== item.d) {
            console.warn('编码“', item.code, '”已经存在值“', result[item.code], '”，它将被覆盖为:', item.d)
            isOverride = true;
          }
          result[item.code] = item.d;
        }
        checkOverride();
        return `export default ${JSON.stringify(result, null, 2)}`;
      case Mode.HzeroIntlReact:
        let head = `模板代码,代码,语言,描述\n`;
        for (const item of data) {
          if (!item.error) head += `${item.prefix},${item.get},zh_CN,${item.d}\n`;
        }
        return head;
    }
  };

  return (
    <div className="page-wrapper">
      <Button
        onClick={async () => {
          window.Main.emit(Event.ScanIntl);
          pageData.processing = true;
        }}
      >
        开始扫描
      </Button>
      {!!data.length && (
        <Button
          onClick={async () => {
            window.Main.emit(Event.ReScanIntl);
            pageData.processing = true;
          }}
        >
          更新现有文件并重新扫描
        </Button>
      )}
      <div className="flex gap-normal">
        <Form
          form={form}
          name="query-fields"
          className="flex-1 row-gap-small"
          layout="inline"
          initialValues={{ excludedPrefixes: excludedPrefixesDefault }}
        >
          {mode === Mode.HzeroIntlReact && (
            <Form.Item name="excludedPrefixes" label="排除的前缀" style={{ width: 250 }} className="flex-1">
              <Select mode="tags" allowClear maxTagCount="responsive">
                <Select.Option value="hzero.common">hzero.common</Select.Option>
              </Select>
            </Form.Item>
          )}
          {mode === Mode.HzeroIntlReact && (
            <Form.Item name="prefix" label="前缀">
              <Input onPressEnter={() => update(new Date().getTime())} />
            </Form.Item>
          )}
          <Form.Item name="get" label="编码">
            <Input onPressEnter={() => update(new Date().getTime())} />
          </Form.Item>
          <Form.Item name="d" label="描述">
            <Input onPressEnter={() => update(new Date().getTime())} />
          </Form.Item>
        </Form>
        <Button
          onClick={() => {
            form.resetFields();
            update(new Date().getTime());
          }}
        >
          重置
        </Button>
        <Button onClick={() => update(new Date().getTime())}>筛选</Button>
      </div>
      <Table
        title={() => (
          <span className="flex justify-between">
            <div>
              <strong>Intl扫描结果</strong>
              <Tooltip title="单元格双击可以复制，单击路径可以跳转并复制完整code，跳转需要有vscode且注册了code命令">
                <QuestionCircleOutlined />
              </Tooltip>
              <Tooltip title="导出当前筛选出的数据，并过滤含有错误的条目">
                <Button
                  onClick={() => window.Main.emit(Event.DownloadIntlResult, getData())}
                  style={{ marginLeft: 15 }}
                >
                  导出
                </Button>
              </Tooltip>
            </div>
            <div>
              总计：{data.length}条； <strong className={errorLength ? 'text-red' : ''}>错误：{errorLength}条</strong>
            </div>
          </span>
        )}
        rowKey="path"
        columns={columns}
        dataSource={data}
        rowSelection={rowSelection}
      />
    </div>
  );
};

export default Intl;
