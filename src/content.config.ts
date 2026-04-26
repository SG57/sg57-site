import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()),
    author: z.string().default('Cord Rehn'),
    draft: z.boolean().default(false),
    /** Optional featured screenshot or hero image (relative to /public) */
    image: z.string().optional(),
    /** Alt text for the featured image */
    imageAlt: z.string().optional(),
  }),
});

export const collections = { blog };
