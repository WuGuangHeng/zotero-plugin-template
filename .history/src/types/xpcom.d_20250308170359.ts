/**
 * Mozilla/Zotero XPCOM 组件类型定义
 */
declare namespace Components {
    const classes: {
      "@mozilla.org/files/formdata;1": {
        createInstance: (iface: any) => any;
      };
      "@mozilla.org/file/local;1": {
        createInstance: (iface: any) => any;
      };
      [key: string]: any;
    };
  
    const interfaces: {
      nsIFormData: any;
      nsILocalFile: any;
      nsIFile: any;
      [key: string]: any;
    };
  }
  
  // 扩展 Window 接口，添加 Components
  declare interface Window {
    Components: typeof Components;
  }