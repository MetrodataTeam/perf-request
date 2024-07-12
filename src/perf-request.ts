import find from 'lodash/find';

export interface PerfRequestOptions {
  cacheKey?: string;
  requestId?: string;
}
export interface ObjectType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const requesting: { [key: string]: Promise<any> | null } = {};
const cache: { data: ObjectType; cacheKey?: string }[] = [];
const requestMap: { [key: string]: string[] } = {};

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

export function deleteCache(cacheKey?: string) {
  const index = cache.findIndex((v) => v.cacheKey === cacheKey);
  if (index >= 0) {
    cache.splice(index, 1);
  }
  requesting[cacheKey!] = null;
  requestMap[cacheKey!] = [];
}

export function cancelRequest(cacheKey: string, requestId: string) {
  requestMap[cacheKey] = requestMap[cacheKey] || [];
  requestMap[cacheKey] = requestMap[cacheKey].filter((v) => v !== requestId);
  requesting[cacheKey] = null;
  if (requestMap[cacheKey].length === 0) {
    deleteCache(cacheKey);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function perfRequest(
  service: () => Promise<any>,
  options?: PerfRequestOptions,
  retry?: boolean,
) {
  if (!service) return;
  const { cacheKey, requestId } = options || {};
  //当没有接口在pending时，刷新缓存数据
  const pms = requesting[cacheKey || ''];
  if (pms) {
    const data = getCache(cacheKey);
    if (data) return data; //缓存数据
  }
  requestMap[cacheKey || ''] = requestMap[cacheKey || ''] || [];
  requestMap[cacheKey || ''].push(requestId!);
  //公用同一个缓存的promise
  if (pms) {
    return new Promise((resolve, reject) => {
      pms.then(resolve).catch(async (error) => {
        if (error?.__CANCEL__) {
          if (requestMap[cacheKey!].includes(requestId!)) {
            const res = await perfRequest(service, options, true);
            return resolve(res);
          }
          reject(error);
        } else {
          reject(error);
        }
      });
    });
  }
  const promise: Promise<any> = new Promise((resolve, reject) => {
    service()
      .then(resolve)
      .catch(async (error) => {
        if (error?.__CANCEL__) {
          if (requestMap[cacheKey!].includes(requestId!)) {
            const res = await perfRequest(service, options, true);
            return resolve(res);
          }
          reject(error);
        } else {
          reject(error);
        }
      });
  });
  //cacheKey决定是否缓存pending状态
  if (cacheKey && promise instanceof Promise) {
    requesting[cacheKey] = promise;
    promise.finally(() => {
      deleteCache(cacheKey);
    });
  }
  const res = await promise;
  //cacheKey决定是否缓存数据
  if (cacheKey) {
    setCache(cacheKey, res);
  }

  return res;
}

export default perfRequest;
