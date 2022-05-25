/*
 * @Author: junyang.le@hand-china.com
 * @Date: 2022-01-25 10:52:47
 * @LastEditTime: 2022-05-25 20:47:16
 * @LastEditors: junyang.le@hand-china.com
 * @Description: your description
 * @FilePath: \tool\src\pageSettings.tsx
 */
import type { BasicLayoutProps } from '@ant-design/pro-layout/lib/BasicLayout';
import { SlidersOutlined, ItalicOutlined } from '@ant-design/icons';
import ManageFiles from './pages/ManageFiles';
import ProcessCh from './pages/ProcessCh';
import ManagePrefixes from './pages/ManagePrefixes';
import ScanIntl from './pages/ScanIntl';
import { AppState } from './@types/index';
import ManageOption from './pages/ManageOption';

/**
 * 生成ProLayout的属性设置
 */
export default (state: AppState) =>
  ({
    title: 'Intl Tool',
    navTheme: 'light',
    menu: { defaultOpenAll: true, ignoreFlatMenu: true },
    route: {
      path: '/',
      routes: [
        {
          path: '/manage',
          name: '文件管理',
          icon: <SlidersOutlined />,
          routes: [
            {
              path: '/manage/file',
              name: '文件管理',
              component: ManageFiles,
              tooltip: '管理已经上传的文件，后续的处理均是对此处的文件进行处理',
            },
            {
              path: '/manage/options',
              name: '文件排除选项',
              component: ManageOption,
              tooltip: '设置需要排除的文件格式或文件路径，在文件上传前设置才有效',
            },
          ],
        },
        {
          path: '/intl',
          name: '处理Intl',
          icon: <ItalicOutlined />,
          routes: [
            {
              path: '/intl/manage-prefixes',
              name: '设置前缀',
              component: ManagePrefixes,
              tooltip: '为intl.get设置前缀，以便于扫描后的结果统计，在扫描Intl前设置才有效',
              hideWhenMode: 'Vue',
            },
            {
              path: '/intl/scan',
              name: '扫描Intl',
              component: ScanIntl,
            },
            {
              path: '/intl/process-ch',
              name: '中文转Intl',
              component: ProcessCh,
              tooltip: '扫描代码中的中文，将其替换为intl格式',
            },
          ].filter(r => !r.hideWhenMode || r.hideWhenMode !== state.pageData.remoteData.mode),
        },
      ],
    },
    location: {
      pathname: '/manage/file',
    },
  } as BasicLayoutProps);
