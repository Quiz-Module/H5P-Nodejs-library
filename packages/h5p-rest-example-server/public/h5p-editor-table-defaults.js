import os from 'os';
import { Request } from 'express';
import { rm } from 'fs/promises';
import * as H5P from '@lumieducation/h5p-server';
/**
 * Displays links to the server at all available IP addresses.
 * @param port The port at which the server can be accessed.
 */
export function displayIps(port: string): void {
    console.log('Example H5P NodeJs server is running:');
    const networkInterfaces = os.networkInterfaces();
    // eslint-disable-next-line guard-for-in
    for (const devName in networkInterfaces) {
        networkInterfaces[devName]
            .filter((int) => !int.internal)
            .forEach((int) =>
                console.log(
                    `http://${int.family === 'IPv6' ? '[' : ''}${int.address}${
                        int.family === 'IPv6' ? ']' : ''
                    }:${port}`
                )
            );
    }
}

/**
 * This method will delete all temporary uploaded files from the request
 */
export async function clearTempFiles(
    req: Request & { files: any }
): Promise<void> {
    if (!req.files) {
        return;
    }

    await Promise.all(
        Object.keys(req.files).map((file) =>
            req.files[file].tempFilePath !== undefined &&
            req.files[file].tempFilePath !== ''
                ? rm(req.files[file].tempFilePath, {
                      recursive: true,
                      force: true
                  })
                : Promise.resolve()
        )
    );
}

export const TABLE_TAGS = [
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td'
];

export function addTableTagsToBlanks(entry: any): any {
    if (entry.type === 'group' && Array.isArray(entry.fields)) {
        return {
            ...entry,
            fields: entry.fields.map(addTableTagsToBlanks)
        };
    }

    if (entry.type === 'list' && entry.field) {
        return {
            ...entry,
            field: addTableTagsToBlanks(entry.field)
        };
    }

    if (entry.type === 'text' && entry.widget === 'html') {
        return {
            ...entry,
            tags: Array.from(new Set([...(entry.tags ?? []), ...TABLE_TAGS]))
        };
    }

    return entry;
}

export function alterLibrarySemanticsHook(
    library: H5P.ILibraryName,
    semantics: any[]
) {
    if (library.machineName !== 'H5P.Blanks') {
        return semantics;
    }

    return semantics.map(addTableTagsToBlanks);
}