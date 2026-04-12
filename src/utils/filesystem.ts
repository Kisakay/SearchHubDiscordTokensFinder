import { readdir } from "node:fs/promises";
import path from "node:path";

export async function getFilesRecursively(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map(async entry => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return getFilesRecursively(entryPath);
        }

        return [entryPath];
    }));

    return files.flat();
}
