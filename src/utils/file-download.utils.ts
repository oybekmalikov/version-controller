import * as fs from 'fs';

export async function downloadFile(url: string, dest: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(dest, buffer);
    return dest;
}
