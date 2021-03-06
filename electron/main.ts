/*
 * @Author: junyang.le@hand-china.com
 * @Date: 2022-01-20 10:11:01
 * @LastEditTime: 2022-06-09 14:00:52
 * @LastEditors: junyang.le@hand-china.com
 * @Description: your description
 * @FilePath: \tool\electron\main.ts
 */
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'fs';
import { Event, ProcessFile, Message, Mode } from './types';
import { manager } from './Manager';
import launchEditor from './utils/launchEditor';
import { readFile, traversePaths } from './utils/fileUtils';
import { handleSquirrelEvent } from './squirrel-startup';

handleSquirrelEvent();

let mainWindow: BrowserWindow | null;

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// const assetsPath =
//   process.env.NODE_ENV === 'production'
//     ? process.resourcesPath
//     : app.getAppPath()

function createWindow() {
  mainWindow = new BrowserWindow({
    // icon: path.join(assetsPath, 'assets', 'icon.png'),
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function updateRemoteData() {
  mainWindow.webContents.send(Event.UpdateRemoteData, manager.getRemoteData());
}

function sendMessage(data: Message) {
  mainWindow.webContents.send(Event.Message, data);
}

const originalConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
  sendMessage({ type: 'error', message: JSON.stringify(args) })
  originalConsoleError(...args);
};

async function registerListeners() {
  ipcMain.on(Event.AddFile, (_, file: ProcessFile) => {
    if (!manager.isFileAllowed(file.name)) return;
    const stat = fs.statSync(file.path);
    if (stat.isFile()) {
      Object.assign(file, {
        content: readFile(file.path),
        path: file.path.replace(/\\/g, '/'),
      });
      manager.addFile(file);
    }
  });

  ipcMain.on(Event.RemoveFile, (_, uid: string) => {
    manager.removeFile(uid);
    updateRemoteData();
  });

  ipcMain.on(Event.ResetFiles, () => {
    manager.resetAll();
    updateRemoteData();
  });

  ipcMain.on(Event.RefreshFiles, () => {
    manager.refreshFiles();
    updateRemoteData();
  });

  ipcMain.on(Event.GetFilesSync, event => {
    event.returnValue = manager.getFiles();
  });

  ipcMain.on(Event.SelectFile, (_, isDir?: boolean) => {
    const paths = dialog.showOpenDialogSync(mainWindow, {
      properties: [isDir ? 'openDirectory' : 'openFile', 'multiSelections'],
      filters: !isDir
        ? [{ name: '????????????', extensions: manager.getAllowedFileSuffix().map(i => i.replace('.', '')) }]
        : [],
    });
    if (paths) {
      traversePaths(paths, {
        fileCallback: file => manager.addFile(file),
        isPathAllowed: path => manager.isPathAllowed(path),
      });
    }
    updateRemoteData(); // ??????????????????????????????????????????loading
  });

  ipcMain.on(Event.GetRemoteData, updateRemoteData);

  ipcMain.on(Event.SwitchMode, (_, mode: any) => {
    manager.switchMode(mode);
    updateRemoteData();
  })

  ipcMain.on(Event.StartProcessCh, (_, prefixPattern?: string) => {
    manager.processAllCh(prefixPattern);
    updateRemoteData();
  });

  ipcMain.on(Event.ReplaceProcessedFile, (_, uid: string) => {
    const file = manager.getFileByUid(uid);
    if (!file || !file.chTransformedContent) return;
    try {
      fs.writeFileSync(file.path, file.chTransformedContent);
      file.content = file.chTransformedContent;
      file.chTransformedContent = '';
      file.diffPatchOfChTransform = '';
      file.parseResult = null;
      file.vueParseResult = null;
    } catch (e) {
      console.error(e);
    }
    updateRemoteData();
  })

  ipcMain.on(Event.ReplaceAllProcessedFile, () => {
    try {
      manager.getOriginalFiles().forEach(file => {
        if (!file.chTransformedContent) return;
        fs.writeFileSync(file.path, file.chTransformedContent);
      });
      manager.refreshFiles();
    } catch (e) {
      console.error(e);
    }
    updateRemoteData();
  })

  ipcMain.on(Event.SetPrefixes, (_, data: string) => {
    manager.setPrefixes(data);
    updateRemoteData();
  });

  ipcMain.on(Event.SetCommonIntlData, (_, data: any) => {
    if (data !== null && typeof data === 'object') {
      manager.setOptionValue('commonIntlData', data);
      updateRemoteData();
    } else {
      console.error('CommonIntlData???????????????');
    }
  })

  ipcMain.on(Event.SetModeOptions, (_, options: any) => {
    manager.setOptions(options);
    updateRemoteData();
  })

  ipcMain.on(Event.ScanIntl, () => {
    manager.traverseAllIntl();
    updateRemoteData();
  });

  ipcMain.on(Event.ReScanIntl, () => {
    manager.refreshFiles();
    manager.traverseAllIntl();
    updateRemoteData();
  });

  ipcMain.on(Event.LaunchEditor, (_, path: string) => {
    const info = path.split(':');
    console.log('LaunchEditor path', path);
    if (info.length > 2) {
      // ????????????????????????????????????????????????:?????????C:/xxx????????????????????????????????????
      if (path.charAt(1) === ':') path = info[0] + ':' + info.slice(1, info.length - 2).join('');
      else path = info.slice(0, info.length - 2).join('');
      console.log('path with line column:', path);
      launchEditor(path, +info[info.length - 2], +info[info.length - 1], { editor: 'code' });
    } else launchEditor(path, 1, 1, { editor: 'code' });
  });

  ipcMain.on(Event.DownloadIntlResult, (_, data) => {
    let filter;
    if (manager.getMode() === Mode.HzeroIntlReact) filter = { name: 'CSV', extensions: ['csv'] };
    else if (manager.getMode() === Mode.VueI18N) filter = { name: 'JSON', extensions: ['json'] };
    else if (manager.getMode() === Mode.UmiIntlReact) filter = { name: 'Javascript', extensions: ['js'] };
    const path = dialog.showSaveDialogSync(mainWindow, {
      /**
       * createDirectory macOS -???????????????????????????????????????????????????
       * showOverwriteConfirmation Linux - ?????????????????????????????????????????????????????????????????????????????????????????????
       */
      properties: ['createDirectory', 'showOverwriteConfirmation'],
      // ????????????
      filters: [filter],
    });
    if (path) {
      // ??????writeFileSync???utf-8?????????BOM??????encoding?????????????????????bom???utf-8????????????bom???utf8???excel?????????????????????
      // ?????????data??????????????????unicode????????? https://blog.csdn.net/cengjingcanghai123/article/details/78035798
      fs.writeFileSync(path, `\ufeff${data}`);
      sendMessage({
        type: 'success',
        message: '????????????',
      });
    }
  });
}

app
  .on('ready', createWindow)
  .whenReady()
  .then(registerListeners)
  .catch(e => console.error(e));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
