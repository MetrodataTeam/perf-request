import perfRequest, {cancelRequest} from './index';
import axios from 'axios';

class MdtCancelToken extends axios.CancelToken {
  cancelToken: any;
  callback?: () => void;

  static source() {
    let cancel: any;
    const ct = new MdtCancelToken((c) => {
      cancel = c;
    });
    return {
      token: ct,
      cancel: (...args: any[]) => {
        cancel?.(...args);
        ct.callback?.();
      },
    };
  }
}


const mockService = () => {
  let reqid = 1;
  let count = 1;
  let abort: any = {};
  return (config?: {
    cancelToken?: MdtCancelToken;
  }) => {
    const { cancelToken } = config || {};
    let rid = reqid++;
    cancelToken?.promise.then(() => {
      abort[rid] = true;
    });
    const promise: Promise<any> = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!abort[rid]) {
          resolve({reqid: rid, count});
        } else {
          reject(new axios.Cancel());
        }
      }, 1000);
    });
    return promise;
  } 
}

describe('index', () => {
  let service: (config?: { cancelToken?: MdtCancelToken; }) => Promise<any>;
 
  beforeEach(() => {
    service = mockService();
  });

  it('should export perfRequest as default', () => {
    expect(perfRequest).toBeDefined();
  });

  it('should perfRequest work', async () => {
    const ps1 = perfRequest(service);
    const ps2 = perfRequest(service);
    const resAll = await Promise.allSettled([ps1, ps2]);
    expect(resAll).toStrictEqual([
      { status: 'fulfilled', value: {reqid: 1, count: 1} },
      { status: 'fulfilled', value: {reqid: 2, count: 1} },
    ]);
  });

  it('should perfRequest work with cacheKey', async () => {
    const ps1 = perfRequest(service, { cacheKey: 'cacheKey' });
    const ps2 = perfRequest(service, { cacheKey: 'cacheKey' });
    const resAll = await Promise.allSettled([ps1, ps2]);
    expect(resAll).toStrictEqual([
      { status: 'fulfilled', value: {reqid: 1, count: 1} },
      { status: 'fulfilled', value: {reqid: 1, count: 1} },
    ]);
  });

  it('should perfRequest work with cacheKey and requestId when cancel', async () => {
    const tokenSource = MdtCancelToken.source();
    const token1 = tokenSource.token;
    const tokenSource2 = MdtCancelToken.source();
    const token2 = tokenSource2.token;
    const service1 = () => service({ cancelToken: token1 });
    const service2 = () => service({ cancelToken: token2 });
    const ps1 = perfRequest(service1, { cacheKey: 'cacheKey', requestId: 'requestId' });
    const ps2 = perfRequest(service2, { cacheKey: 'cacheKey', requestId: 'requestId2' });
    token1.promise.then(() => {
      cancelRequest('cacheKey', 'requestId');
    });
    token2.promise.then(() => {
      cancelRequest('cacheKey', 'requestId2');
    });
    setTimeout(() => {
      tokenSource.cancel();
      cancelRequest('cacheKey', 'requestId');
    }, 500);
    const resAll = await Promise.allSettled([ps1, ps2]);
    expect(resAll[0].status).toBe('rejected');
    // @ts-ignore
    expect(resAll[0].reason.__CANCEL__).toEqual(true);
    expect(resAll[1]).toEqual({
      "status": "fulfilled",
      "value": {reqid: 2, count: 1},
    });
  });


  it('should perfRequest work with cacheKey and requestId when cancel2', async () => {
    const tokenSource = MdtCancelToken.source();
    const token1 = tokenSource.token;
    const tokenSource2 = MdtCancelToken.source();
    const token2 = tokenSource2.token;
    const service1 = () => service({ cancelToken: token1 });
    const service2 = () => service({ cancelToken: token2 });
    const ps1 = perfRequest(service1, { cacheKey: 'cacheKey', requestId: 'requestId' });
    const ps2 = perfRequest(service2, { cacheKey: 'cacheKey', requestId: 'requestId2' });
    token1.promise.then(() => {
      cancelRequest('cacheKey', 'requestId');
    });
    token2.promise.then(() => {
      cancelRequest('cacheKey', 'requestId2');
    });
    setTimeout(() => {
      tokenSource2.cancel();
    }, 500);
    const resAll = await Promise.allSettled([ps1, ps2]);
    expect(resAll[1].status).toBe('rejected');
    // @ts-ignore
    expect(resAll[1].reason.__CANCEL__).toEqual(true);
    expect(resAll[0]).toEqual({
      "status": "fulfilled",
      "value": {reqid: 1, count: 1},
    });
  });
});