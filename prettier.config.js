/** @type {import("prettier").Config} */
const config = {
  plugins: ["prettier-plugin-svelte"],
  printWidth: 140,
  svelteSortOrder: "scripts-options-markup-styles",
  overrides: [{
    files: "*.svelte",
    options: {
      parser: "svelte",
    }
  }],
};

export default config;
