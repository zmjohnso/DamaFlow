// Type declaration for SQL migration files imported by drizzle-kit's expo driver.
// Metro bundles these as asset strings (enabled by metro.config.js adding 'sql' to assetExts).
declare module '*.sql' {
  const content: string;
  export default content;
}
