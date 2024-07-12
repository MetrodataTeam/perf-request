import cloneDeep from 'lodash/cloneDeep';
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
  requesting[cacheKey || ''] = null;
  // requestMap[cacheKey || ''] = [];
}

function removeRequestMapId(cacheKey: string, requestId: string) {
  requestMap[cacheKey] = requestMap[cacheKey] || [];
  const index = requestMap[cacheKey].indexOf(requestId);
  if (index >= 0) {
    requestMap[cacheKey].splice(index, 1);
  }
  if (requestMap[cacheKey].length === 0) {
    deleteCache(cacheKey);
  }
}

export function cancelRequest(cacheKey: string, requestId: string) {
  removeRequestMapId(cacheKey, requestId);
  requesting[cacheKey] = null;
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
  requestMap[cacheKey || ''].push(requestId || '');

 
  const getPromise = (sp: Promise<any>): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      let res;
      try {
        const pres = await sp;
        res = getCache(cacheKey || '') || pres;
      } catch (error) {
        if ((error as any)?.__CANCEL__) {
          if (requestMap[cacheKey || ''].includes(requestId || '')) {
            const res = await perfRequest(service, options, true);
            return resolve(res);
          }
        }
        return reject(error);
      }
     
      return resolve(cloneDeep(res));
    }).finally(() => {
      removeRequestMapId(cacheKey || '', requestId || '');
      // requesting[cacheKey || ''] = null;
    });
  };

  //公用同一个缓存的promise
  if (pms) {
    
    return getPromise(pms);
  }
  const promise = service().then((res) => {
    if (cacheKey) {
      setCache(cacheKey, res);
    }
    return res;
  });
  //cacheKey决定是否缓存pending状态
  if (cacheKey && promise instanceof Promise) {
    
    requesting[cacheKey] = promise;
  }
  const res = await getPromise(promise);
  //cacheKey决定是否缓存数据

  return res;
}

export default perfRequest;
