export type VercelConfig = {
    version?: number,
    name?: string,
    scope?: string,
    env?: object,
    build?: {
        env: object
    },
    alias: string[],
    regions?: string[],
    public?: boolean
}

export type VercelAliasResponseError = {
    alias: string,
    code: string,
    message: string,
    uid: string
}

export type VercelAliasResponse = {
    error?: VercelAliasResponseError,
    uid?: string,
    alias?: string,
    created?: string
}