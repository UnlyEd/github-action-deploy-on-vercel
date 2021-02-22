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