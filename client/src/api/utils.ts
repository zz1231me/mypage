// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unwrap<T = any>(res: { data: any }): T {
  return res.data?.data !== undefined ? res.data.data : res.data;
}
