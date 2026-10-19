const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export function mergeFinance(base, draft, latest, choice) {
  const conflicts = [];
  function merge(a, b, c, path, depth = 0) {
    if (equal(b, a)) return c;
    if (equal(c, a) || equal(b, c)) return b;
    if (
      depth < 20 &&
      Array.isArray(a) &&
      Array.isArray(b) &&
      Array.isArray(c) &&
      [a, b, c].every((items) => items.every((x) => object(x) && typeof x.id === 'string'))
    ) {
      const ids = [...new Set([...c, ...b].map((x) => x.id))];
      return ids
        .map((id) =>
          merge(
            a.find((x) => x.id === id),
            b.find((x) => x.id === id),
            c.find((x) => x.id === id),
            [...path, id],
            depth + 1,
          ),
        )
        .filter((x) => x !== undefined);
    }
    if (depth < 20 && object(a) && object(b) && object(c)) {
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(c)])];
      return Object.fromEntries(
        keys
          .map((k) => [k, merge(a[k], b[k], c[k], [...path, k], depth + 1)])
          .filter(([, v]) => v !== undefined),
      );
    }
    conflicts.push({ path: path.join(' / '), mine: b, latest: c });
    return choice === 'mine' ? b : c;
  }
  return { state: merge(base, draft, latest, []), conflicts };
}
