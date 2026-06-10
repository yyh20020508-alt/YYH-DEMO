export const isInNewApp = false;
export const isPcClient = false;
export const isPcWeb = false;
export const isPc = false;
export const os = { ios: false, android: false, harmonyos: false };
export const browser = { safari: false, wechat: false, qq: false };
export const STATIC_HOST = typeof window !== 'undefined' ? window.location.origin : '';
export function appendShareSource(url: string) { return url; }
export function getShareUrl(pagePath: string) { return pagePath; }
export function getEnvSummary() { return 'browser'; }
