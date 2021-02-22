

export class ResourceListOptions {

    public sort_field: string = '_id';
    public sort_asc: boolean = true;
    public offset: number = 0;
    public limit: number = 30;

    constructor({
        sort_field = '_id',
        sort_asc = true,
        offset = 0,
        limit = 30 } = {}) {
        this.sort_field = sort_field;
        this.sort_asc = sort_asc;
        this.offset = offset;
        this.limit = limit;
    }

    public asSortCriteria(): any {
        const sort_field: string = this.sort_field || '_id';
        const sort_value: string = this.sort_asc ? 'asc' : 'desc';
        return { [sort_field]: sort_value };
    }

}
