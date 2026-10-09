# Changelog

## [2.3.1](https://github.com/SkyCrew-app/frontend/compare/2.3.0...2.3.1) (2026-10-09)


### Bug Fixes

* :bug: load uploaded files from the configured backend ([#86](https://github.com/SkyCrew-app/frontend/issues/86)) ([4525d7c](https://github.com/SkyCrew-app/frontend/commit/4525d7c40f7ae4629f47a551a5f4c38088d27f3f))
* **notifications:** :bug: connect the live notifications with the session ([#85](https://github.com/SkyCrew-app/frontend/issues/85)) ([a3e2031](https://github.com/SkyCrew-app/frontend/commit/a3e20312d017717623fce2d3b0e9d7971f24eebd))

## [2.3.0](https://github.com/SkyCrew-app/frontend/compare/2.2.2...2.3.0) (2026-10-09)


### Features

* **auth:** :sparkles: confirm two-factor setup with a first code ([#81](https://github.com/SkyCrew-app/frontend/issues/81)) ([3543831](https://github.com/SkyCrew-app/frontend/commit/35438317a7befe16000745c83da6e9dfcb0a25a7))

## [2.2.2](https://github.com/SkyCrew-app/frontend/compare/2.2.1...2.2.2) (2026-10-09)


### Bug Fixes

* **auth:** :bug: ask for the email when the login form is submitted empty ([#73](https://github.com/SkyCrew-app/frontend/issues/73)) ([337350e](https://github.com/SkyCrew-app/frontend/commit/337350e25fe1ba02bb8c7985b681272ad141a0ee))
* **auth:** :bug: generate the two-factor secret only on request ([#72](https://github.com/SkyCrew-app/frontend/issues/72)) ([d6b63c1](https://github.com/SkyCrew-app/frontend/commit/d6b63c108ff5fc6e84a1668d9abd035bfb54809b))
* **deps:** :lock: update Next.js to a patched release ([#76](https://github.com/SkyCrew-app/frontend/issues/76)) ([a7b3e55](https://github.com/SkyCrew-app/frontend/commit/a7b3e55321aa43f2cbf501a8dbf2f324b5ec9091))
* **fleet:** :bug: keep history filters separate for each aircraft ([#74](https://github.com/SkyCrew-app/frontend/issues/74)) ([57fa19d](https://github.com/SkyCrew-app/frontend/commit/57fa19d6c5a8b02a0d4eed0d82c3199d0ca00058))
* **profile:** :bug: check the minimum age on the full birth date ([#75](https://github.com/SkyCrew-app/frontend/issues/75)) ([30003bd](https://github.com/SkyCrew-app/frontend/commit/30003bd94f016afb06cfb803d4ee125879a76d97))

## [2.2.1](https://github.com/SkyCrew-app/frontend/compare/2.2.0...2.2.1) (2026-10-08)


### Bug Fixes

* **fleet:** :bug: repair the history pagination ([#68](https://github.com/SkyCrew-app/frontend/issues/68)) ([65a4d59](https://github.com/SkyCrew-app/frontend/commit/65a4d59dd9defa4ad0b98907e932cf7b64a58d34))
* **maintenance:** :bug: repair the error state, creation and deletion ([#65](https://github.com/SkyCrew-app/frontend/issues/65)) ([dec4ae6](https://github.com/SkyCrew-app/frontend/commit/dec4ae6fd445a423cddcc56e154cbafa6f117d94))
* **profile:** :bug: report a successful password change ([#67](https://github.com/SkyCrew-app/frontend/issues/67)) ([346c973](https://github.com/SkyCrew-app/frontend/commit/346c97397a0045a59c98e7a629d99e6b1fe1f15e))
* **reservations:** :bug: let owners edit and delete their reservations ([#66](https://github.com/SkyCrew-app/frontend/issues/66)) ([2cc5bd5](https://github.com/SkyCrew-app/frontend/commit/2cc5bd56edd8ef65c690dc7db28c23b38630bde8))

## [2.2.0](https://github.com/SkyCrew-app/frontend/compare/2.1.0...2.2.0) (2026-10-08)


### Features

* :sparkles: support hosting under a base path ([#52](https://github.com/SkyCrew-app/frontend/issues/52)) ([c865b03](https://github.com/SkyCrew-app/frontend/commit/c865b03ff6568dc7bc450f25e81e125cab5c9652))
* **auth:** :sparkles: add demo accounts and server-side session detection on login ([#53](https://github.com/SkyCrew-app/frontend/issues/53)) ([909732f](https://github.com/SkyCrew-app/frontend/commit/909732f0bd7c32849906157c19185d7346c6f810))


### Bug Fixes

* **navigation:** :bug: keep the navbar layout while the user is loading ([#54](https://github.com/SkyCrew-app/frontend/issues/54)) ([6a0dd00](https://github.com/SkyCrew-app/frontend/commit/6a0dd0046fecd32f2c268333685b5f05a8aeeb03))
* **release:** :bug: follow the commit convention in the release pull request title ([#60](https://github.com/SkyCrew-app/frontend/issues/60)) ([2c3d5c8](https://github.com/SkyCrew-app/frontend/commit/2c3d5c822070b4837d71cf24a8a4cdb6efc25a80))
* **release:** :bug: give release-please a valid branch name ([#57](https://github.com/SkyCrew-app/frontend/issues/57)) ([6198acc](https://github.com/SkyCrew-app/frontend/commit/6198acce8b6182dae17d247a8d707150ffef0783))
