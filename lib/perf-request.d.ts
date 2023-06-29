export interface PerfRequestOptions {
    cacheKey?: string;
}
export interface ObjectType {
    [key: string]: any;
}
declare function perfRequest(service: () => Promise<any>, options?: PerfRequestOptions): Promise<any>;
export default perfRequest;
