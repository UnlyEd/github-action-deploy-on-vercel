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
 * Vercel Alias API error in the response.
 *
 * @see https://vercel.com/docs/api#endpoints/aliases/assign-an-alias-to-a-deployment/response-parameters
 */
export type VercelAliasResponseError = {
  alias: string,
  code: string,
  message: string,
  uid: string
}

/**
 * Vercel Alias API response.
 *
 * @see https://vercel.com/docs/api#endpoints/aliases/assign-an-alias-to-a-deployment/response-parameters
 */
export type VercelAliasResponse = {
  error?: VercelAliasResponseError,
  uid?: string,
  alias?: string,
  created?: string
}
