
export interface KeyValueService {

    put(key: string, value: any): Promise<void>;

    get(key: string, default_value?: string | undefined): Promise<string | undefined>;

    del(key: string): Promise<void>;

}