import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner = `/*
THIS FILE IS GENERATED - DO NOT EDIT DIRECTLY
Recurring Upkeep Scheduler
*/`;

const prod = (process.argv[2] === 'production');

// Get logging state from environment variable
const loggingEnabled = process.env.RECURRING_UPKEEP_LOGGING_ENABLED === 'true';

if (prod) {
  console.log(`Building with logging ${loggingEnabled ? 'ENABLED' : 'DISABLED'}`);
}

const buildOptions = {
  banner: {
    js: banner,
  },
  entryPoints: ['main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: "info",
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  define: {
    // This replaces the environment variable with actual boolean at compile time
    'process.env.RECURRING_UPKEEP_LOGGING_ENABLED': loggingEnabled ? '"true"' : '"false"'
  },
  minify: false,
};

const context = await esbuild.context(buildOptions);

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
