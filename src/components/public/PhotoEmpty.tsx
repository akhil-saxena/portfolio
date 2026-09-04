import { Heading } from '@akhil-saxena/design-system/components/Heading';
import { Link } from '@akhil-saxena/design-system/components/Link';
import { Text } from '@akhil-saxena/design-system/components/Text';

export interface PhotoEmptyProps {
  label: string;
  total: number;
}

export function PhotoEmpty({ label, total }: PhotoEmptyProps) {
  return (
    <div className="ph-empty">
      <Heading level={2} size="md">
        No photographs in {label} yet.
      </Heading>
      <Text variant="small">
        Every category on this site has at least one today; this one is new.
      </Text>
      <Link href="/photography" variant="default">
        See all {total}
      </Link>
    </div>
  );
}
