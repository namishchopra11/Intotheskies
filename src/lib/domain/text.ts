/**
 * Lowercases the first letter so a title reads mid-sentence ("Call the airline" becomes
 * "call the airline"). Only when the first word is ordinary capitalised text: acronyms and
 * codes such as "BA desk" or "AZ 207" are left alone.
 */
export function lowerFirst(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
