
export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
    if (val === undefined || val === null) {
        throw new Error(`Expected 'val' to be defined, but received ${val}`);
    }
}

export function isValidEmailAddress(value: any): boolean {
    const re = /^[a-zA-Z0-9.!#$%&' * +/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    return re.test(String(value).toLowerCase());
}