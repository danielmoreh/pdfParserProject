# PDF Accessibility Code ETL Pipeline

## How It Works

The pipeline follows this pattern:

- **Extract**: Uses `pdfjs-dist` to pull text and metadata from PDF pages
- **Transform**: Analyzes each page to identify sections, keywords, and content types
- **Load**: Stores processed data in SQLite using batched inserts for performance

### Why Batched Loading?

Instead of inserting pages one at a time, I process them in batches of 10. This means if you have a 100 page PDF, I make 10 database transactions instead of 100. Loading all pages at once could lead to memory issues with large PDFs, so batching keeps memory usage predictable while still being efficient.

## Libraries Used

- **pdfjs-dist**: Extract text from PDFs
- **sqlite3**: Database storage
- **TypeScript**: Type-safe code

## Setup & Run

```bash
npm install
npm start                           # processes FBC-115-163.pdf by default
npm start your-document.pdf         # or specify your own PDF
npm test                            # run tests (unit tests for transformer logic + end-to-end tests)
```

The pipeline creates a database file called `accessibility_codes.db` with all the extracted data.

## Database Schema

The schema has two main tables:

### documents

Stores basic PDF metadata (filename, page count, processing timestamp).

### page_content

Each row represents one page with:

- Basic info: page number, raw text, section headings
- Analysis results: keyword counts, content types, detected figures
- Special fields: `mandatory_language_count` and `exception_language_count`

### Why These Fields?

Building codes have specific language patterns. Pages with lots of "shall", "must", or "required" likely contain important requirements. I added `mandatory_language_count` to track this - it helps quickly find pages that are heavy on compliance requirements.

Similarly, `exception_language_count` tracks exception language ("except when", "unless", etc.). These are important because exceptions modify requirements.

These counters let you write simple queries to find the most regulation dense pages without doing full text searches every time.

### Indexes

I added three indexes to speed up common queries:

1. **idx_page_number**: Makes lookups by page number instant. Even though we could use the primary key, this supports cases where pages might be skipped (blank pages, covers, etc.)

2. **idx_keyword_count**: Optimizes the "most relevant pages" query. Since we're often looking for pages with high keyword counts, this index makes those searches much faster.

3. **idx_document_id**: Supports joins between documents and pages. Right now we process one document at a time, but if you ever want to compare across multiple PDFs, this makes those queries fast.

## Sample Queries

### Query 1: Get document metadata

```sql
SELECT file_name, total_pages
FROM documents
```

### Query 2: Get text from a specific page

```sql
SELECT page_number, raw_text
FROM page_content
WHERE page_number = 5
```

### Query 3: Find pages most relevant to accessibility

```sql
SELECT
  page_number,
  section_headings,
  section_number,
  keyword_count,
  keywords
FROM page_content
WHERE keyword_count > 2
ORDER BY keyword_count DESC
```

These queries run automatically when you start the pipeline to demonstrate the system works.
