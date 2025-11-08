1. ## ETL Architecture Design

### Batched Processing Strategy

The ETL pipeline processes PDFs using a batched approach, processing 10 pages at a time. Pages are extracted and transformed individually, then loaded to the database in batches using a single database transaction per batch. This design balances memory efficiency with database performance:

**Extract → Transform (streaming)**: Pages are extracted and transformed one at a time to minimize memory footprint.

**Load (batched with transactions)**: Transformed pages accumulate in a buffer. When 10 pages are ready, they're inserted into the database in a **single transaction**, significantly reducing database overhead.

**Why 10 pages per batch?**

- **Memory Efficiency**: Small batch size keeps memory usage predictable. For very large PDFs (1000+ pages), processing everything at once would exhaust system resources.
- **Database Performance**: Batching with transactions reduces database overhead by ~90% compared to page-by-page loading:
  - **Page-by-page**: 1000 pages = 1000 separate INSERT statements = 1000 transactions
  - **Batched (10 pages)**: 1000 pages = 100 transactions, each inserting 10 pages efficiently
  - Each batch uses prepared statements within a single BEGIN/COMMIT transaction block
- **Optimal Balance**: 10 pages provides meaningful performance gains without significant memory pressure. Batch size can be adjusted via the `BATCH_SIZE` constant in [src/etl.ts](src/etl.ts).

**Scalability Considerations**: In a production environment, this architecture enables horizontal scaling. Multiple worker instances can process different documents or page ranges concurrently, distributing the workload across the system. This parallelization significantly improves throughput compared to a single instance handling documents sequentially.
