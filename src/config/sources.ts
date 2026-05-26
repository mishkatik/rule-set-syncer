import { z } from 'zod';

export const RuleSourceSchema = z.object({
  /** Human-readable identifier */
  name: z.string().min(1),
  /** Upstream download URL */
  url: z.url(),
  /** S3 object key (relative, without leading slash) */
  s3Key: z.string().min(1),
});

export type RuleSource = z.infer<typeof RuleSourceSchema>;

/** All Mihomo rule-set sources, loaded from sources.json. */
export const RULE_SOURCES: RuleSource[] = z
  .array(RuleSourceSchema)
  .parse(await Bun.file('./sources.json').json());
