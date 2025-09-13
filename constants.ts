// ============================================================================
// LOGGING CONFIGURATION - DO NOT MODIFY
// ============================================================================
// 
// This logging system uses esbuild's compile-time substitution:
// - Production: `npm run build` (logging disabled)
// - Development: `npm run build:debug` (logging enabled)
// 
// The expression below gets replaced at BUILD TIME with actual boolean values.
// This ensures zero runtime overhead in production builds.
// 
// ⚠️  NEVER hardcode this to true/false!
// ⚠️  Always use the npm scripts to control logging
// 
// esbuild replaces `process.env.RECURRING_UPKEEP_LOGGING_ENABLED` with the actual
// value at compile time, making this a compile-time constant with no runtime cost.
// ============================================================================
export const RECURRING_UPKEEP_LOGGING_ENABLED = process.env.RECURRING_UPKEEP_LOGGING_ENABLED === 'true';
