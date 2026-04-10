/**
 * logger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-dependency structured logger for LaunchPard.
 * Output: single-line JSON (production) or pretty-printed (development).
 *
 * Usage:
 *   import logger from '@/lib/logger';
 *   logger.info('event_name', { key: 'value' });
 *   logger.error('error_event', { error: new Error('msg'), context: '...' });
 *
 * Features:
 *   - Respects LOG_LEVEL env var (debug < info < warn < error, default: info)
 *   - Circular reference safety in JSON serialization
 *   - Error object normalization (extracts name, message, stack)
 *   - Child loggers via logger.child({ ...context })
 * ─────────────────────────────────────────────────────────────────────────────
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI color codes
const COLORS = {
  debug: '\x1b[90m',   // gray
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  reset: '\x1b[0m',
};

/**
 * createLogger(options = {})
 * Factory function to create a logger instance.
 *
 * @param {object} options - { childContext: {}, minLevel: 'info' }
 * @returns {object} logger instance with info/warn/error/debug + child
 */
export function createLogger(options = {}) {
  const { childContext = {}, minLevel = null } = options;

  // Determine minimum log level from env or param
  let logLevel = minLevel || process.env.LOG_LEVEL || 'info';
  logLevel = logLevel.toLowerCase();
  const minLevelInt = LOG_LEVELS[logLevel] ?? LOG_LEVELS.info;

  // Determine if we're in dev mode
  const isDev = process.env.NODE_ENV !== 'production';

  /**
   * Serializer: converts objects to JSON, handling circular refs and Errors.
   */
  function serializeValue(obj, seen = new WeakSet()) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    // Error objects: extract name, message, stack
    if (obj instanceof Error) {
      return {
        error_name: obj.name,
        error_message: obj.message,
        error_stack: obj.stack,
      };
    }

    // Circular reference check
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);

    // Arrays and objects
    if (Array.isArray(obj)) {
      return obj.map(v => serializeValue(v, seen));
    }

    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = serializeValue(v, seen);
    }
    return result;
  }

  /**
   * formatTime(date) -> 'HH:MM:SS'
   */
  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /**
   * log(level, event, context)
   * Core logging function.
   */
  function log(level, event, context = {}) {
    const levelInt = LOG_LEVELS[level] ?? LOG_LEVELS.info;

    // Silent drop below threshold
    if (levelInt < minLevelInt) return;

    const timestamp = new Date().toISOString();
    const merged = { ...childContext, ...context };
    const serialized = serializeValue(merged);

    const logEntry = {
      timestamp,
      level,
      event,
      ...serialized,
    };

    const output = isDev
      ? prettyFormat(level, event, timestamp, serialized)
      : JSON.stringify(logEntry);

    // All levels go to console.log (stdout) in structured format
    console.log(output);
  }

  /**
   * prettyFormat(level, event, timestamp, context)
   * Development-friendly formatting with color codes.
   */
  function prettyFormat(level, event, timestamp, context) {
    const color = COLORS[level] || COLORS.info;
    const reset = COLORS.reset;
    const time = formatTime(new Date(timestamp));
    const levelUpper = level.toUpperCase().padEnd(5);
    const contextStr =
      Object.keys(context).length > 0
        ? ' ' + JSON.stringify(context)
        : '';

    return `${color}[${time}] ${levelUpper} ${event}${contextStr}${reset}`;
  }

  /**
   * Logger instance
   */
  const logger = {
    debug: (event, ctx) => log('debug', event, ctx),
    info: (event, ctx) => log('info', event, ctx),
    warn: (event, ctx) => log('warn', event, ctx),
    error: (event, ctx) => log('error', event, ctx),

    /**
     * child(context) -> new logger with merged context
     */
    child: (ctx) =>
      createLogger({
        childContext: { ...childContext, ...ctx },
        minLevel: logLevel,
      }),
  };

  return logger;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

const defaultLogger = createLogger();

export default defaultLogger;
