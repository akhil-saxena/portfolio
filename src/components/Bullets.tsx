import { Fragment } from 'react';
import { parseBullet } from '../lib/bullets';

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, itemIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: derived deterministically, never reordered
        <li key={itemIndex}>
          {parseBullet(item).map((run, runIndex) =>
            run.bold ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              <strong key={runIndex}>{run.text}</strong>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: see above
              <Fragment key={runIndex}>{run.text}</Fragment>
            )
          )}
        </li>
      ))}
    </ul>
  );
}
