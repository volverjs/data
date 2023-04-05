# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2023-04-03

### Added

- `RepositoryHttp` JSDoc comments;
- `vue` composables return reactive methods;
- `Hash.djb2` function to generate a hash from a string.

### Changed

- `Repository` interface `create()` and `update()` methods now have the `item` as first parameter;
- `Repository` interface methods now return the `responsePromise` instead of `response`;
- `useHttpClient` now returns `{ client, request, requestGet, requestPost, requestPut, requestPatch, requestHead, requestDelete }` and not only `client`;
- `useRepositoryHttp` now returns `{ repository, read, create, update, remove }` and not only `repository`;
- `RepositoryHttp` constructor options now support `httpClientOptions: HttpClientOptions` and not only `prefixUrl: string`;
- `RepositoryHttp` constructor template now support `HttpClientUrlTemplate` (`{ template, params }`) and not only `string`.

## [0.0.4] - 2023-03-21

### Added

- Quality gate with tests in build and release pipeline;

## [0.0.3] - 2023-03-21

### Fixed

- build and test with vite and vitest;
- dependencies update.

## [0.0.2] - 2023-03-14

### Fixed

- `RepositoryHttp` Remove structured clone from default request adapter;

## 0.0.1 - 2023-03-13

### Added

- `HttpClient` a class to make HTTP requests with Ky;
- `UrlBuilder` a class to build URLs through a template;
- `RepositoryHttp` an implementation of `Repository` interface to fetch data through `HttpClient`.

[0.0.3]: https://github.com/volverjs/data/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/volverjs/data/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/volverjs/data/compare/v0.0.1...v0.0.2
