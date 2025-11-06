# PDF Parser Project - ETL Pipeline

A Node.js TypeScript application that implements an ETL (Extract, Transform, Load) pipeline for parsing PDF accessibility code documents and storing them in a queryable SQLite database.

## Overview

This project transforms unstructured compliance documents (Building Code Accessibility/ADA) into structured, queryable data. The pipeline extracts text from PDFs page-by-page, enriches it with metadata and accessibility keyword analysis, and stores it in a relational database for efficient querying.

## Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Runtime** | Node.js with TypeScript | Type safety, modern async/await support, excellent tooling |
| **PDF Parsing** | `pdf-parse` | Reliable text extraction with page-level granularity |
| **Database** | SQLite via `sqlite3` | Local, zero-configuration, ACID-compliant relational database |
| **Build Tools** | `ts-node`, `typescript` | Direct TypeScript execution and compilation |

## Prerequisites

- Node.js (v20.x or higher)
- npm (v9.x or higher)
- PDF file named `FBC-115-163.pdf` in the project root

## Installation

1. Clone the repository:
```bash
git clone https://github.com/danielmoreh/pdfParserProject.git
cd pdfParserProject
```

2. Install dependencies:
```bash
npm install
```

3. Ensure the PDF file `FBC-115-163.pdf` is in the project root directory.

## Usage

Run the complete ETL pipeline with a single command:

```bash
npm start
```

This command will:
1. Initialize the SQLite database schema
2. Extract text from the PDF (page-by-page)
3. Transform and enrich the data with accessibility analysis
4. Load the data into the database
5. Run three demonstration queries

### Alternative Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Run in development mode
npm run dev
```

## Database Schema Design

The database schema is optimized for the structure of Building Code Accessibility documents, with a focus on queryability and analytical capabilities.

### Tables

#### 1. `documents` (Metadata Table)

Stores document-level metadata for tracking processed files.

```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  total_pages INTEGER NOT NULL,
  processed_at TEXT NOT NULL
);
```

**Design Rationale:**
- Supports tracking multiple documents over time
- `processed_at` enables audit trail and versioning
- Simple structure for fast metadata retrieval

#### 2. `page_content` (Data Table)

Stores one row per page with enriched content and analytical fields.

```sql
CREATE TABLE page_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  page_number INTEGER NOT NULL,
  raw_text TEXT NOT NULL,
  section_heading TEXT,
  keyword_count INTEGER DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Indexes for performance
CREATE INDEX idx_page_number ON page_content(page_number);
CREATE INDEX idx_keyword_count ON page_content(keyword_count);
```

**Design Rationale:**

1. **Page-Level Granularity**: Each page is a separate row, enabling:
   - Efficient page-specific queries (e.g., "show page 5")
   - Range queries (e.g., "pages 10-20")
   - Individual page updates without reprocessing entire document

2. **Section Heading Extraction**: The `section_heading` field captures:
   - Chapter/Section identifiers (e.g., "SECTION 1104")
   - All-caps headings common in compliance documents
   - Enables hierarchical navigation and categorization

3. **Keyword Analysis**: The `keyword_count` field stores:
   - Count of accessibility-related terms per page
   - Enables relevance ranking and filtering
   - Supports compliance-focused queries

4. **Indexes**: Optimized for common query patterns:
   - `idx_page_number`: Fast page lookups
   - `idx_keyword_count`: Efficient filtering by relevance

**Accessibility Keywords Analyzed:**
- accessible, accessibility, ADA, disabled, wheelchair
- ramp, handrail, braille, visual, hearing, mobility
- clearance, width, slope, elevator, signage, compliance
- barrier-free, universal design

## Demonstration Queries

The pipeline automatically runs three queries to demonstrate the ETL success:

### Query 1: Document Metadata Verification

Confirms successful document loading and metadata extraction.

```sql
SELECT file_name, total_pages
FROM documents;
```

**Purpose**: Verifies the document was processed and basic metadata is captured.

**Expected Output**: File name and page count of the processed PDF.

### Query 2: Content Segmentation

Retrieves content from a specific page (Page 5) to verify page-level segmentation.

```sql
SELECT page_number, raw_text, section_heading
FROM page_content
WHERE page_number = 5;
```

**Purpose**: Demonstrates that content is correctly segmented by page and section headings are extracted.

**Expected Output**: Full text and section heading (if any) for page 5.

### Query 3: Accessibility Relevance Analysis

Identifies pages most relevant to accessibility compliance based on keyword density.

```sql
SELECT page_number, section_heading, keyword_count
FROM page_content
WHERE keyword_count > 3
ORDER BY keyword_count DESC;
```

**Purpose**: Proves analytical enrichment and topic-based filtering capabilities.

**Expected Output**: List of pages with high accessibility keyword counts, sorted by relevance.

## Project Structure

```
pdfParserProject/
├── src/
│   ├── index.ts          # Main ETL orchestrator
│   ├── database.ts       # Database schema and operations
│   ├── extractor.ts      # PDF extraction logic
│   ├── transformer.ts    # Data transformation and enrichment
│   ├── loader.ts         # Database loading logic
│   └── queries.ts        # Demonstration queries
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── FBC-115-163.pdf       # Input PDF file (not in repo)
├── accessibility_codes.db # Generated SQLite database
└── README.md             # This file
```

## ETL Pipeline Stages

### 1. Extract (E)
- Reads PDF file from disk
- Extracts text page-by-page using `pdf-parse`
- Captures metadata (file name, page count)
- **Output**: Raw text per page + metadata

### 2. Transform (T)
- Identifies section headings using pattern matching:
  - SECTION/CHAPTER patterns
  - All-caps lines (likely headings)
  - Lines ending with colons
- Counts accessibility-related keywords per page
- Calculates relevance scores
- **Output**: Enriched page data with analytical fields

### 3. Load (L)
- Initializes SQLite database schema
- Inserts document metadata
- Bulk inserts page content with enriched fields
- Creates indexes for query optimization
- **Output**: Populated database ready for queries

### 4. Query Demonstration
- Runs three predefined queries
- Prints results to console
- Validates ETL success

## Error Handling

The pipeline includes robust error handling:
- **File Validation**: Checks PDF existence and readability before processing
- **Database Errors**: Catches and reports SQL errors with context
- **PDF Parsing Errors**: Handles malformed PDFs gracefully
- **Exit Codes**: Returns non-zero exit code on failure for CI/CD integration

## Performance Considerations

- **Streaming**: Page-by-page processing prevents memory issues with large PDFs
- **Indexes**: Database indexes optimize query performance
- **Batch Inserts**: Efficient database writes (could be further optimized with transactions)
- **Progress Indicators**: Console feedback every 10 pages during loading

## Future Enhancements

Potential improvements for production use:
1. **Transaction Support**: Wrap database operations in transactions for atomicity
2. **Parallel Processing**: Process multiple PDFs concurrently
3. **Full-Text Search**: Add SQLite FTS5 for advanced text search
4. **API Layer**: REST API for querying the database
5. **Web Interface**: Frontend for browsing and searching compliance codes
6. **Advanced NLP**: Use ML models for better section classification
7. **PDF Table Extraction**: Extract tabular data from compliance tables

## License

MIT

## Author

Daniel Moreh

## Acknowledgments

- Built for Node.js ETL Assignment
- Compliance document parsing for ADA/Building Code accessibility
