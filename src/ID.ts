
// From: https://twitter.com/SimonHoiberg/status/1503295286264967174
export function unique_id() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
} // export function
