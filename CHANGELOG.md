# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-03-26

### Changed

- `RepositoryHttp` methods `create()` and `update()` always return the `data` property as an array;

### Added

- `RepositoryHttp` methods `create()` and `update()` support for an array of items;
- `RepositoryHttp` methods `create()` and `update()` now return the `item` property as the first element of `data` array.

## [1.0.5] - 2023-08-30

### Fixed

- `Repository` interface options defitnition;
- Dependencies update.

## [1.0.4] - 2023-06-08

### Fixed

- Dependencies update.

## [1.0.3] - 2023-05-15

### Fixed

- Dependencies update.

## [1.0.2] - 2023-05-11

### Added

- `isSuccess` computed for `useRepositoryHttp()` and `useHttpClient()` Vue composable.

## [1.0.1] - 2023-05-11

### Added

- `RepositoryHttp` second TS generic usefull for `responseAdapter`;
- `useRepositoryHttp()` second TS generic for `RepositoryHttp`.

## [1.0.0] - 2023-04-12

### Added

- `RepositoryHttp` JSDoc comments;
- `vue` composables return reactive methods;
- `Hash.djb2` function to generate a hash from a string;
- `removeHttpClient()` composables to remove a `httpClient` instances;
- `httpClientScope` on `RepositoryHttpOptions` to use an existing `httpClient` instance.

### Changed

- `Repository` interface `create()` and `update()` methods now have the `item` as first parameter;
- `Repository` interface methods now return the `responsePromise` instead of `response`;
- `createHttpClient` update parameters with `HttpClientInstanceOptions & { scope?: string }` to manage multple instances
- `useHttpClient` parameter is now the `httpClient` `scope` (optional `string`)
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

[2.0.0]: https://github.com/volverjs/data/compare/v1.0.5...v2.0.0
[1.0.5]: https://github.com/volverjs/data/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/volverjs/data/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/volverjs/data/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/volverjs/data/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/volverjs/data/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/volverjs/data/compare/v0.0.4...v1.0.0
[0.0.4]: https://github.com/volverjs/data/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/volverjs/data/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/volverjs/data/compare/v0.0.1...v0.0.2
