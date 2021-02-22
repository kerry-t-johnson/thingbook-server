import * as crypto from 'crypto';
import * as token from 'rand-token';
const MaskData = require('maskdata');

const emailMaskOptions = {
    maskWith: "*",
    unmaskedStartCharactersBeforeAt: 4,
    unmaskedEndCharactersAfterAt: 256,
    maskAtTheRate: false
};

export function getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
}

export function getRandomIntRange(min: number, max: number) {
    const range: number = max - min;
    return Math.floor(min) + Math.floor(Math.random() * Math.floor(range));
}

export function generateToken() {
    return token.generate(48);
}

export function sha256(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
    if (val === undefined || val === null) {
        throw new Error(`Expected 'val' to be defined`);
    }
}

export function assertNotDefined(val: any) {
    if (val != undefined || val != null) {
        throw new Error(`Expected 'val' to be undefined, but received ${val}`);
    }
}

export function isValidEmailAddress(value: any): boolean {
    const re = /^[a-zA-Z0-9.!#$%&' * +/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    return re.test(String(value).toLowerCase());
}

export function maskEmail(value: string): string {
    return MaskData.maskEmail2(value, emailMaskOptions);
}

export function enumValues(arg: any): string[] {
    return Object.keys(arg).map(k => arg[k]);
}
