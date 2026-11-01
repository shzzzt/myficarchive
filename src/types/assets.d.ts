// Metro turns asset imports into module ids (see metro.config.js assetExts).
declare module '*.txt' {
  const id: number;
  export default id;
}
