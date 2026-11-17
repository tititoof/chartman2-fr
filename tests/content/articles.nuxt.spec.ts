import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from 'yaml'
import { categories } from '../../app/utils/categories'

const articlesDirectory = join(process.cwd(), 'content/articles')

function findMarkdownFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory()
      ? findMarkdownFiles(path)
      : path.endsWith('.md') ? [path] : []
  })
}

const articleFiles = findMarkdownFiles(articlesDirectory)

function readFrontmatter(file: string): Record<string, unknown> {
  const match = readFileSync(file, 'utf8').match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  return parse(match![1]) as Record<string, unknown>
}

const categoryDirs = new Set(categories.flatMap(category => category.dirs))
const articleDir = (file: string) => relative(articlesDirectory, file).split('/')[0]!
const articleIds = new Set(articleFiles.map(file => readFrontmatter(file).article_id as string))

describe('articles content', () => {
  it('contains Markdown articles', () => {
    expect(articleFiles.length).toBeGreaterThan(0)
  })

  it.each(articleFiles.map(file => [relative(process.cwd(), file), file]))(
    '%s has valid frontmatter and required metadata', (_relativePath, file) => {
      const source = readFileSync(file as string, 'utf8')
      const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)

      expect(match, 'frontmatter delimited by ---').not.toBeNull()
      const frontmatter = parse(match![1]) as Record<string, unknown>

      expect(frontmatter.title).toEqual(expect.any(String))
      expect(frontmatter.description).toEqual(expect.any(String))
      expect(frontmatter.icon).toEqual(expect.any(String))
      // Color comes from the category; an article outside any category must set its own
      expect(frontmatter.color === undefined || typeof frontmatter.color === 'string').toBe(true)
      if (!categoryDirs.has(articleDir(file as string))) {
        expect(frontmatter.color, 'article outside a category needs a color').toEqual(expect.any(String))
      }
      expect(frontmatter.article_id).toEqual(expect.any(String))
      expect(frontmatter.article_id).not.toHaveLength(0)
      expect(frontmatter.draft === undefined || typeof frontmatter.draft === 'boolean').toBe(true)
      // Required: an undated article is filtered out of every list (NULL <= today)
      expect(String(frontmatter.publishedAt)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(source.slice(match![0].length).trim()).not.toBe('')
    },
  )

  it('uses unique article IDs', () => {
    const ids = articleFiles.map((file) => {
      const source = readFileSync(file, 'utf8')
      const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
      return { file: relative(process.cwd(), file), id: parse(match![1]).article_id as string }
    })
    const duplicates = ids
      .filter(({ id }, index) => ids.findIndex(article => article.id === id) !== index)
      .map(({ file, id }) => `${id} (${file})`)

    expect(duplicates).toEqual([])
  })

  it('maps every category folder to an existing folder with articles', () => {
    const empty = [...categoryDirs]
      .filter(dir => !articleFiles.some(file => articleDir(file) === dir))

    expect(empty).toEqual([])
  })

  it('links case studies to existing articles', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/partial/main/case_studies.vue'), 'utf8')
    const linked = [...source.matchAll(/article_id: '([^']+)'/g)].map(([, id]) => id!)

    expect(linked.length).toBeGreaterThan(0)
    expect(linked.filter(id => !articleIds.has(id))).toEqual([])
  })
})
