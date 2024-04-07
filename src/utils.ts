import { Buffer } from 'buffer';
import LZUTF8 from 'lzutf8';

export function* withLength<T>(str: T[], length: number, defaultValue: T) {
    let i = 0;
    while (i < length && i < str.length) {
        yield str[i];
        i++;
    }

    while (i < length) {
        yield defaultValue;
        i++;
    }
}

export async function decompress(buffer: Buffer) {
    return await new Promise<string>(resolve => LZUTF8.decompressAsync(Buffer.from(buffer), {}, (result: string, err: any) => {
        resolve(result);
    }));
}
