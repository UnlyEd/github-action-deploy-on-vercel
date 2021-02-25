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

/**
 * Official interface by Vercel can be find here: https://vercel.com/docs/api#endpoints/aliases/assign-an-alias-to-a-deployment
 */

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