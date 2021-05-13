<a href="https://unly.org"><img src="https://storage.googleapis.com/unly/images/ICON_UNLY.png" align="right" height="20" alt="Unly logo" title="Unly logo" /></a>
[![Maintainability](https://api.codeclimate.com/v1/badges/97a6022a22be785dd2ea/maintainability)](https://codeclimate.com/github/UnlyEd/github-action-deploy-on-vercel/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/97a6022a22be785dd2ea/test_coverage)](https://codeclimate.com/github/UnlyEd/github-action-deploy-on-vercel/test_coverage)

![GitHub Action integration test](https://github.com/UnlyEd/github-action-deploy-on-vercel/workflows/GitHub%20Action%20integration%20test/badge.svg)
![GitHub Action build test](https://github.com/UnlyEd/github-action-deploy-on-vercel/workflows/GitHub%20Action%20build%20test/badge.svg)
![Update Code Climate test coverage](https://github.com/UnlyEd/github-action-deploy-on-vercel/workflows/Update%20Code%20Climate%20test%20coverage/badge.svg)

# GitHub Action - Deploy on Vercel (using a custom command)

## Code snippet example (minimal example)

```yaml
name: 'GitHub Action code snippet'
on:
  pull_request:
  push:
    branches:
      - '*'

jobs:
  run-example-deployment:
    runs-on: ubuntu-18.04
    steps:
      - uses: actions/checkout@v2
      - uses: UnlyEd/github-action-deploy-on-vercel@latest
        with:
          command: "vercel examples/static-deployment --confirm --debug --token ${{ secrets.VERCEL_TOKEN }}"
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

      - run: "echo \"Found deployment url: ${{ env.VERCEL_DEPLOYMENT_URL }}\""
```

> [Source](https://github.com/UnlyEd/github-action-deploy-on-vercel/blob/review/.github/workflows/run-example-deployment.yml)

## What does this GitHub Action do?

You can use this action to deploy a Vercel project online through a GitHub action.

The action will return the url of the Vercel deployment _(and store it as environment variable, too)_, it will also apply domain aliases if there are any configured in the Vercel config file (`vercel.config` by default).

## Differences between `github-action-deploy-on-vercel` and `vercel-action`

This action works quite differently compared to [`vercel-action`](https://github.com/marketplace/actions/vercel-action).

> TL;DR: `vercel-action` is great if you don't need a lot of flexibility over the `vercel deploy` command.
> `github-action-deploy-on-vercel` is great if you need to run a custom command, such as a `npm/yarn` script.

`vercel-action` hides the `vercel deploy` command from you, and acts as a wrapper by providing its own API on top of it.

They simplify the `vercel` command by doing so. Unfortunately, they also reduce the flexibility available to the consumer (you).

In our case, we are dealing with multiple customers (B2B) which are **all sharing the same code base**. 
The `vercel-action` was too limited and would have complicated our setup, because it requires additional information such as `project_id`/`org_id`.

For most project, we believe using `vercel-action` is enough, and we encourage you to use it, if you don't need to run a special `vercel deploy` command.

## Why/when should you use it?

You want to run a custom command that (amongst other things) performs a Vercel deployment and returns the URL of the Vercel deployment.

The URL of the deployment is often necessary to run follow-up actions, such as:
- Running End-to-End tests on the deployed site
- Running LightHouse tests on the deployed site
- Etc.

### Action's API

#### Inputs

Name | Required | Default | Description
---  | --- |--- |---
`command`|✅| | Command starting the vercel deployment
`applyDomainAliases`|✖️|`true`| If true, will create Vercel aliases using the aliases specified in the vercel config file
`failIfAliasNotLinked`|✖️|`false`| If true, will throw an error (and crash CI) when there is an error about aliases link

#### Outputs

The below variables are available as outputs, but are also **injected as environment variables automatically**.

- `VERCEL_DEPLOYMENT_URL`: Full Vercel deployment url (parsed from the deployment logs), e.g: `https://xxx.vercel.app`
- `VERCEL_DEPLOYMENT_DOMAIN`: Url without the protocol declaration, e.g: `xxx.vercel.app`
- `VERCEL_ALIASES_ERROR`: _(optional)_ Vercel errors during domain aliasing
- `VERCEL_ALIASES_CREATED`: List of aliases created successfully, as a string separated by `, ` for each alias
- `VERCEL_ALIASES_CREATED_COUNT`: Number of created aliases
- `VERCEL_ALIASES_CREATED_FULL`: List of aliases created successfully, as a JSON array containing the Vercel's response 
- `VERCEL_ALIASES_CREATED_URLS_MD`: List of aliases created successfully, as a Markdown string separated by `, ` for each alias
- `VERCEL_ALIASES_FAILED_COUNT`: Number of aliases that failed to be created
- `VERCEL_ALIASES_FAILED_FULL`: List of aliases that failed, as a JSON array containing the Vercel's response 
> Hint: You can use `${{ env.VERCEL_DEPLOYMENT_URL }}` in you GitHub Action to read the deployment URL, after the action has run.

## Advanced examples

### Example with dynamic aliases based on GitHub branch (on `push` event)

```yml
name: 'GitHub Action deploy example'
on:
  pull_request:
  push:
    branches:
      - '*'

jobs:
  run-example-deployment:
    runs-on: ubuntu-18.04
    steps:
      - uses: actions/checkout@v2

      # Extracts GitHub metadata (branch name, etc.)
      - name: Expose GitHub slug/short variables # See https://github.com/rlespinasse/github-slug-action#exposed-github-environment-variables
        uses: rlespinasse/github-slug-action@v3.x # See https://github.com/rlespinasse/github-slug-action

      - uses: ./
        with:
          # Deploys examples/static-deployment
          command: "yarn deploy:example --token ${{ secrets.VERCEL_TOKEN }}"
          applyDomainAliases: true
          failIfAliasNotLinked: false
          # Uses dynamically resolved additional aliases (e.g: one based on the current branch's name)
          # Uses alias that's longer than 63 chars to check if it gets shortened, because of RFC 1035 - See https://vercel.com/support/articles/why-is-my-vercel-deployment-url-being-shortened?query=url%20length#rfc-1035
          #  github-action-deploy-on-vercel-example-extra-alias-test-limit-alias-length.vercel.app > github-action-deploy-on-vercel-example-extra-alias-test-limit-a.vercel.app (shortened)
          # TODO Don't always use GITHUB_REF_SLUG (push) but GITHUB_HEAD_REF_SLUG when event is pull_request - See https://github.com/rlespinasse/github-slug-action/issues/71
          extraAliases: >-
            github-action-deploy-on-vercel-example-${{ env.GITHUB_REF_SLUG }}.vercel.app

        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

      - run: "echo \"Found deployment url: ${{ env.VERCEL_DEPLOYMENT_URL }}\""
      - run: "echo \"Created ${{ env.VERCEL_ALIASES_CREATED_COUNT }} aliases\""
      - run: "echo \"Created aliases: ${{ env.VERCEL_ALIASES_CREATED }}\""
      - run: "echo \"Created aliases (full): ${{ env.VERCEL_ALIASES_CREATED_FULL }}\""
      - run: "echo \"Alias markdown generated: ${{ env.VERCEL_ALIASES_CREATED_URLS_MD }}\""
      - run: "echo \"Failed ${{ env.VERCEL_ALIASES_FAILED_COUNT }} aliases\""
      - run: "echo \"Failed aliases (full): ${{ env.VERCEL_ALIASES_FAILED_FULL }}\""
```


## :hugs: Community examples :heart:

Here are a few community-powered examples, those are usually advanced use-cases!

- [Next Right Now](https://github.com/UnlyEd/next-right-now) _(Disclosure: We're the author!)_
  - [PR](https://github.com/UnlyEd/next-right-now/pull/296) - "Using this action helped us reduce a lot of **bash** code which was hardly testable." - _Next Right Now core contributors_

---

# Advanced debugging

> Learn how to enable logging, from within the `github-action-store-variable` action.

## How to enable debug logs

Our GitHub Action is written using the GitHub Actions
native [`core.debug` API](https://github.com/actions/toolkit/blob/main/docs/action-debugging.md#step-debug-logs).

Therefore, it allows you to enable logging whenever you need to debug **what's happening within our action**.

**To enable debug mode**, you have to set a [**GitHub Secret**](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets#creating-encrypted-secrets), such as:

- `ACTIONS_STEP_DEBUG` of value `true`

Please see [the official documentation](https://github.com/actions/toolkit/blob/main/docs/action-debugging.md#how-to-access-step-debug-logs) for more information.

> Enabling debugging using `ACTIONS_STEP_DEBUG` will also enable debugging for all other GitHub Actions you use that are using the `core.debug` API.

---

# Contributing

We gladly accept PRs, but please open an issue first, so we can discuss it beforehand.

---

# Changelog

[Changelog](./CHANGELOG.md)

---

# Releases versioning

We follow Semantic Versioning. (`major.minor.patch`)

Our versioning process is completely automated, any changes landing on the `main` branch will trigger a new [release](../../releases).

- `MAJOR`: Behavioral change of the existing API that would result in a breaking change.
  - E.g: Removing an input, or changing the output would result in a breaking change and thus would be released as a new MAJOR version.
- `Minor`: Behavioral change of the existing API that would **not** result in a breaking change.
  - E.g: Adding an optional input would result in a non-breaking change and thus would be released as a new Minor version.
- `Patch`: Any other change.
  - E.g: Documentation, tests, refactoring, bug fix, etc.

## Releases versions:

- We do not provide major versions that are automatically updated (e.g: `v1`).
- We only provide tags/releases that are not meant to be changed once released (e.g: `v1.1.0`).

> As utility, we provide a special [`latest`](../../releases/tag/latest) tag which is automatically updated to the latest release.
> _This tag/release is **not meant to be used in production systems**, as it is not reliable (might jump to the newest MAJOR version at any time)._

---

# License

[MIT](./LICENSE)

---

# Vulnerability disclosure

[See our policy](https://github.com/UnlyEd/Unly).

---

# Contributors and maintainers

This project is being authored by:

- [Unly] Ambroise Dhenain ([Vadorequest](https://github.com/vadorequest)) **(active)**
- Hugo Martin ([Demmonius](https://github.com/demmonius)) **(active)**

---

# **[ABOUT UNLY]** <a href="https://unly.org"><img src="https://storage.googleapis.com/unly/images/ICON_UNLY.png" height="40" align="right" alt="Unly logo" title="Unly logo" /></a>

> [Unly](https://unly.org) is a socially responsible company, fighting inequality and facilitating access to higher education.
> Unly is committed to making education more inclusive, through responsible funding for students.

We provide technological solutions to help students find the necessary funding for their studies.

We proudly participate in many TechForGood initiatives. To support and learn more about our actions to make education accessible, visit :

- https://twitter.com/UnlyEd
- https://www.facebook.com/UnlyEd/
- https://www.linkedin.com/company/unly
- [Interested to work with us?](https://jobs.zenploy.io/unly/about)

Tech tips and tricks from our CTO on our [Medium page](https://medium.com/unly-org/tech/home)!

# TECHFORGOOD #EDUCATIONFORALL
