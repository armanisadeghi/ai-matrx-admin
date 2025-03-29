// import { Pool, QueryResult } from 'pg';

// // Define types for filter conditions
// interface Condition {
//   field: string;
//   operator: string; // e.g., '=', '>', '<', 'LIKE'
//   value: any;
// }

// interface NestedCondition {
//   and?: Condition[];
//   or?: Condition[];
// }

// type FilterCondition = Condition | NestedCondition;

// interface SortOption {
//   field: string;
//   direction?: 'ASC' | 'DESC';
// }

// // Query Builder class with generics for table name
// class QueryBuilder<TTable extends string = string> {
//   private table: TTable;
//   private sql: string;
//   private params: any[];
//   private paramIndex: number;
//   private wheres: string[];
//   private orders: string[];
//   private limit: number | null;
//   private offset: number | null;

//   constructor(table: TTable) {
//     this.table = table;
//     this.sql = `SELECT * FROM ${table}`;
//     this.params = [];
//     this.paramIndex = 1;
//     this.wheres = [];
//     this.orders = [];
//     this.limit = null;
//     this.offset = null;
//   }

//   filter(condition: FilterCondition): this {
//     if ('and' in condition && condition.and) {
//       const andConditions = condition.and.map(c => this._buildCondition(c)).join(' AND ');
//       this.wheres.push(`(${andConditions})`);
//     } else if ('or' in condition && condition.or) {
//       const orConditions = condition.or.map(c => this._buildCondition(c)).join(' OR ');
//       this.wheres.push(`(${orConditions})`);
//     } else {
//       this.wheres.push(this._buildCondition(condition as Condition));
//     }
//     return this;
//   }

//   private _buildCondition({ field, operator, value }: Condition): string {
//     this.params.push(value);
//     return `${field} ${operator} $${this.paramIndex++}`;
//   }

//   order(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
//     this.orders.push(`${field} ${direction}`);
//     return this;
//   }

//   range(from: number, pageSize: number): this {
//     this.limit = pageSize;
//     this.offset = from;
//     return this;
//   }

//   build(): { sql: string; params: any[] } {
//     if (this.wheres.length) {
//       this.sql += ' WHERE ' + this.wheres.join(' AND ');
//     }
//     if (this.orders.length) {
//       this.sql += ' ORDER BY ' + this.orders.join(', ');
//     }
//     if (this.limit !== null) {
//       this.sql += ` LIMIT $${this.paramIndex++}`;
//       this.params.push(this.limit);
//     }
//     if (this.offset !== null) {
//       this.sql += ` OFFSET $${this.paramIndex++}`;
//       this.params.push(this.offset);
//     }
//     return { sql: this.sql, params: this.params };
//   }
// }

// // Centralized Query Executor
// const pool = new Pool({ /* connection details */ });

// async function executeQuery<T = any>({ sql, params }: { sql: string; params: any[] }): Promise<{ data: T[]; count: number }> {
//   const client = await pool.connect();
//   try {
//     const result: QueryResult<T> = await client.query(sql, params);
//     // Extract table name from query (assumes simple "FROM table_name" structure)
//     const tableName = sql.split('FROM')[1].split(' ')[1];
//     const countResult: QueryResult<{ count: string }> = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
//     return {
//       data: result.rows,
//       count: parseInt(countResult.rows[0].count, 10),
//     };
//   } catch (error) {
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// export { QueryBuilder, executeQuery };