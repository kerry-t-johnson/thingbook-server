import * as crypto from 'crypto';
import * as token from 'rand-token';

export function generateToken() {
    return token.generate(32);
}

export function sha256(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
    if (val === undefined || val === null) {
        throw new Error(`Expected 'val' to be defined`);
    }
}

export function assertNotDefined<T>(val: T) {
    if (val !== undefined || val !== null) {
        throw new Error(`Expected 'val' to be undefined, but received ${val}`);
    }
}

export function isValidEmailAddress(value: any): boolean {
    const re = /^[a-zA-Z0-9.!#$%&' * +/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    return re.test(String(value).toLowerCase());
}