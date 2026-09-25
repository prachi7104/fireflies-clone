/**
 * Index of the line being spoken at time t: the last line whose start is at or before t, or -1 before the
 * first line. `starts` must be ascending. Binary search keeps this O(log n), so it can run on every
 * animation frame even for very long transcripts.
 */
export function findActiveIndex(starts: number[], t: number): number {
  let low = 0;
  let high = starts.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (starts[mid] <= t) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}
