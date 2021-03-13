import * as crypto from 'crypto';
import * as token from 'rand-token';
const MaskData = require('maskdata');

const emailMaskOptions = {
    maskWith: "*",
    unmaskedStartCharactersBeforeAt: 4,
    unmaskedEndCharactersAfterAt: 256,
    maskAtTheRate: false
};

export function nowSeconds(): number {
    return Math.round(Date.now() / 1000)
}

export function toOrdinalString(n: number) {
    const suffixes = ["th", "st", "nd", "rd"];
    const normalized: number = n % 100;
    const suffix = suffixes[(normalized - 20) % 10] || suffixes[normalized] || suffixes[0];
    return `${n}${suffix}`;
}


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

export function ellipsize(value: string, maxLength: number) {
    if (value.length <= maxLength) {
        return value;
    }

    const ellipseLength = 3;
    const maxStringLength = maxLength = ellipseLength;
    const frontLength: number = Math.floor(maxStringLength / 2);
    const backIndex = value.length - maxStringLength - frontLength;

    return `${value.substring(0, frontLength)}...${value.substring(backIndex)}`;
}

export function lstrip(value: string, strip: string) {
    if (value.indexOf(strip) !== 0) {
        return value;
    }

    return value.substring(strip.length);
}

export function enumValues(arg: any): string[] {
    return Object.keys(arg).map(k => arg[k]);
}

export function delaySeconds(s: number) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}