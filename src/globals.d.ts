// 用于 TypeScript 检查，能够忽略 chrome 对象找不到错误
declare const chrome: any;

interface HTMLElement {
  value?: any;
  checked?: any;
  files?: any;
  height?:any;
  width?:any;
}

interface EventTarget {
  id?: string;
  value?: any;
  className?: string;
  parentElement?: string;
  type?: any;
  classList?:any;
  nextElementSibling?:any;
  attributes?:any;
  textContent?:any;
  closest?:any;
  files?:any;
  height?:any;
  width?:any;
}


interface Element {
  value?: any;
  src?: any;
}