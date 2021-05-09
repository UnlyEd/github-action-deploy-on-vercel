export type VercelConfig = {
  version?: number;
  name?: string;
  scope?: string;
  env?: GenericObject;
  build?: {
    env: GenericObject;
  },
  alias: string[];
  regions?: string[];
  public?: boolean;
}

/**
 * Vercel Alias API error in the response.
 *
 * @see https://vercel.com/docs/api#endpoints/aliases/assign-an-alias-to-a-deployment/response-parameters
 */
export type VercelAliasResponseError = {
  alias: string;
  code: string;
  message: string;
  uid: string;
}

/**
 * Vercel Alias API response.
 *
 * @see https://vercel.com/docs/api#endpoints/aliases/assign-an-alias-to-a-deployment/response-parameters
 */
export type VercelAliasResponse = {
  error?: VercelAliasResponseError,
  uid?: string;
  alias?: string;
  created?: string;
  oldDeploymentId?: string;
}

/**
 * Helper to avoid writing `Record<string, unknown>` everywhere you would usually use "object".
 *
 * @example (data: GenericObject) => void
 * @example variables: GenericObject<string>
 *
 * @see https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-632833366
 */
export type GenericObject<T = unknown> = Record<string, T>;

export type ExecCommandOutput = {
  stdout: string;
  stderr: string;
}
