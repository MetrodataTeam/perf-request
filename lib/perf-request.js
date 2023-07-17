import find from 'lodash/find';
const requesting = {};
const cache = [];
function setCache(cacheKey, data) {
    const item = find(cache, (v) => v.cacheKey === cacheKey);
    if (item) {
        item.data = data;
    }
    else {
        cache.push({
            cacheKey,
            data,
        });
    }
}
function getCache(cacheKey) {
    const item = find(cache, (v) => v.cacheKey === cacheKey);
    if (!item)
        return;
    return item.data;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function perfRequest(service, options) {
    if (!service)
        return;
    const { cacheKey } = options || {};
    //当没有接口在pending时，刷新缓存数据
    if (find(requesting, (v) => !!v)) {
        const data = getCache(cacheKey);
        if (data)
            return data; //缓存数据
    }
    const pms = requesting[cacheKey || ''];
    //公用同一个缓存的promise
    if (pms)
        return await pms;
    const promise = service();
    //cacheKey决定是否缓存pending状态
    if (cacheKey && (promise instanceof Promise)) {
        requesting[cacheKey] = promise;
        promise.finally(() => {
            requesting[cacheKey] = null;
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
