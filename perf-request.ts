import find from 'lodash/find';

export interface PerfRequestOptions {
  cacheKey?: string;
}
export interface ObjectType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const requesting: { [key: string]: Promise<void> } = {};
const cache: { data: ObjectType; cacheKey?: string }[] = [];

function setCache(cacheKey: string, data: ObjectType) {
  const item = find(cache, (v) => v.cacheKey === cacheKey);
  if (item) {
    item.data = data;
  } else {
    cache.push({
      cacheKey,
      data,
    });
  }
}

function getCache(cacheKey?: string) {
  const item = find(cache, (v) => v.cacheKey === cacheKey);
  if (!item) return;
  return item.data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function perfRequest(service: () => Promise<any>, options?: PerfRequestOptions) {
  if (!service) return;
  const { cacheKey } = options || {};
  const data = getCache(cacheKey);
  if (data) return data; //缓存数据
  const pms = requesting[cacheKey || ''];
  if (pms) return await pms;
  const promise = service();
  //cacheKey决定是否缓存pending状态
  if (cacheKey) {
    requesting[cacheKey] = promise;
  }
  const res = await promise;
  //cacheKey决定是否缓存数据
  if (cacheKey) {
    setCache(cacheKey, res);
  }
  return res;
}

export default perfRequest;
