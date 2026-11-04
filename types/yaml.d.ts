// A .yaml file imported as its data (tools/yaml.js): what it holds is checked where it's read, against its form
declare module '*.yaml' {
  const data: unknown;
  export default data;
}
