import { DataSource } from 'typeorm';
export async function queryTyped<T>(
  dataSource: DataSource,
  query: string,
  params?: any[],
): Promise<T[]> {
  return await dataSource.query(query, params);
}
