// types/Article.ts

export interface Article {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  content: string;
}

export interface ArticlePaginated {
  articles: Article[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface CreateArticlePayload {
  name: string;
  content: string;
}

export interface UpdateArticlePayload {
  [K in keyof CreateArticlePayload]?: CreateArticlePayload[K];
}