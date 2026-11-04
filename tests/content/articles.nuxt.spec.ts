import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from 'yaml'

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

describe('articles content', () => {
  it('contains Markdown articles', () => {
    expect(articleFiles.length).toBeGreaterThan(0)
  })

  it.each(articleFiles.map((file) => [relative(process.cwd(), file), file]))(
    '%s has valid frontmatter and required metadata', (_relativePath, file) => {
      const source = readFileSync(file as string, 'utf8')
      const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)

      expect(match, 'frontmatter delimited by ---').not.toBeNull()
      const frontmatter = parse(match![1]) as Record<string, unknown>

      expect(frontmatter.title).toEqual(expect.any(String))
      expect(frontmatter.description).toEqual(expect.any(String))
      expect(frontmatter.icon).toEqual(expect.any(String))
      expect(frontmatter.color).toEqual(expect.any(String))
      expect(frontmatter.article_id).toEqual(expect.any(String))
      expect(frontmatter.article_id).not.toHaveLength(0)
      expect(frontmatter.draft === undefined || typeof frontmatter.draft === 'boolean').toBe(true)
      expect(frontmatter.publishedAt === undefined || /^\d{4}-\d{2}-\d{2}$/.test(String(frontmatter.publishedAt))).toBe(true)
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
      .filter(({ id }, index) => ids.findIndex((article) => article.id === id) !== index)
      .map(({ file, id }) => `${id} (${file})`)

    expect(duplicates).toEqual([])
  })
})
