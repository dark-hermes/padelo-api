/**
 * Parse an expiresIn configuration value from env/config.
 * If it's a pure integer string (e.g. "3600"), return a number.
 * If it's a non-empty string with non-digits (e.g. "7d"), return the string as-is.
 * If undefined/null/empty, return undefined.
 *
 * We avoid importing the `ms` package types to keep the build simple across
 * environments. Using a plain `string` here is sufficient for jsonwebtoken's
 * `expiresIn` option, which accepts either a number (seconds) or a string like
 * "7d"/"1h"/"500ms".
 */

/**
 * Parse an expiresIn configuration value from env/config.
 * - Numeric-only strings ("3600") -> number
 * - ms-style strings ("7d", "1h", "500 ms") -> returned as StringValue
 * - undefined/empty -> undefined
 *
 * This function validates non-numeric values against a permissive ms-style
 * pattern and throws a descriptive error if the value doesn't match. This
 * prevents silent misconfiguration.
 */
import type { JwtSignOptions } from '@nestjs/jwt';

export function parseExpiresIn(
  value?: string | null,
): JwtSignOptions['expiresIn'] | undefined {
  if (value == null) return undefined;
  const v = value.toString().trim();
  if (v === '') return undefined;

  // integer-only string -> number
  if (/^\d+$/.test(v)) {
    return Number(v);
  }

  // Validate ms-style formats. Accepts patterns like:
  //  - 7d
  //  - 1h
  //  - 500ms
  //  - 3 sec (space allowed)
  //  - 1000 (already handled above as number)
  const msPattern = /^\d+\s*[A-Za-z]+$/;
  if (!msPattern.test(v)) {
    throw new Error(
      `Invalid JWT expiration format: "${value}". Expected a number (seconds) or an ms-style string like '7d', '1h', '500ms'.`,
    );
  }

  // v matches the ms-style pattern; cast to StringValue for typing compatibility
  return v as unknown as JwtSignOptions['expiresIn'];
}
