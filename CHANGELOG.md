## [1.0.0-beta.3](https://github.com/cabrera-evil/compralatino-orders-api/compare/v1.0.0-beta.2...v1.0.0-beta.3) (2026-10-11)

### Features

* **orders:** add admin analytics RPC for funnel and top products ([354b5f3](https://github.com/cabrera-evil/compralatino-orders-api/commit/354b5f348630daf67c9052c5a85f9a0f160c4872))

## [1.0.0-beta.2](https://github.com/cabrera-evil/compralatino-orders-api/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2026-10-11)

### Features

* **payments:** add simulated payment webhooks and async payment status ([4fea735](https://github.com/cabrera-evil/compralatino-orders-api/commit/4fea735b5f69d660a859fc4398ce0ced3a17859a))

## 1.0.0-beta.1 (2026-10-10)

### Features

* **auth:** add jwt strategy, guard and current-user decorator ([1a0560f](https://github.com/cabrera-evil/compralatino-orders-api/commit/1a0560f360c66f60231ce41bd7009c745f0664bc))
* **cart:** add per-user cart endpoints ([7d827f0](https://github.com/cabrera-evil/compralatino-orders-api/commit/7d827f0364f70c00c55cec2d8bef03b815443fde))
* **catalog-client:** add rabbitmq product validation client ([d56d60d](https://github.com/cabrera-evil/compralatino-orders-api/commit/d56d60d16e433621838167f5b377237f1ddad89d))
* **catalog-tables:** expose checkout options ([85c63ae](https://github.com/cabrera-evil/compralatino-orders-api/commit/85c63ae00879bb74000bb81bf4f0942fa7f1d3a4))
* **checkout:** require full purchase data and minimum bid on purchase intents ([6b43a11](https://github.com/cabrera-evil/compralatino-orders-api/commit/6b43a11bc2745fd15828dbc54f0a6b3f680204df))
* **events:** publish order.created and order.updated with event ids ([fee9167](https://github.com/cabrera-evil/compralatino-orders-api/commit/fee9167ab130a0b6d78be5a5010627500c3aa0c0))
* **health:** report database and rabbitmq status ([39cbf1f](https://github.com/cabrera-evil/compralatino-orders-api/commit/39cbf1f140432930ac3f2b35688943d919be8ea1))
* **orders:** accept and expose an optional bid amount on purchase intents ([43662f1](https://github.com/cabrera-evil/compralatino-orders-api/commit/43662f11f9a625f2ae8b76d2b9b37c58d54c83bb))
* **orders:** add checkout, purchase intents and order tracking endpoints ([3483ff1](https://github.com/cabrera-evil/compralatino-orders-api/commit/3483ff111ae7cce9c94fc2e75b02ae4221631e8c))
* **orders:** serve admin list, get and status update over rabbitmq ([be51877](https://github.com/cabrera-evil/compralatino-orders-api/commit/be518773af84129881f73695ac0c7aa20c034a81))
* prisma schema and initial migration for orders_svc ([901538a](https://github.com/cabrera-evil/compralatino-orders-api/commit/901538a9b4c06bb127f0e25ec2fded070dcb3015))
* **prisma:** add cart, checkout option and order catalog schema with migration ([98b096f](https://github.com/cabrera-evil/compralatino-orders-api/commit/98b096f7b19ba7d934a8b53ed5248878c6a5a133))
* **prisma:** seed checkout options, order statuses and tracking states ([5375d0d](https://github.com/cabrera-evil/compralatino-orders-api/commit/5375d0d966880ae97dcb2f859ecda7a129bb3c33))
* **prisma:** store the bid amount on purchase intent orders ([05297cd](https://github.com/cabrera-evil/compralatino-orders-api/commit/05297cdf1fb8943a4494fcbb8ec56f99101b6c12))
* **rabbitmq:** add rabbitmq transport and order events ([107a9a1](https://github.com/cabrera-evil/compralatino-orders-api/commit/107a9a114baf745a71537cb8a1f75f68c5e1d816))
* **shared:** add decimal money util and order constants ([04f1500](https://github.com/cabrera-evil/compralatino-orders-api/commit/04f1500d4119c8bf40799d0c11595a60ebc5f1e4))

### Bug Fixes

* **auth:** pin jwt verification to hs256 ([0575f67](https://github.com/cabrera-evil/compralatino-orders-api/commit/0575f67d2a337cb80cf7e54b3c5d543850a49d67))
* **cart:** return 404 when an item vanishes during a quantity update ([f3395ad](https://github.com/cabrera-evil/compralatino-orders-api/commit/f3395ad8321a13961b7757b1adf4a9471f14c9b5))
* **deps:** upgrade handlebars to 4.7.10 ([7147788](https://github.com/cabrera-evil/compralatino-orders-api/commit/714778869caeee3ad7a0e509caa391ac7e961155))
* **deps:** upgrade vulnerable dependencies and align nestjs packages ([70678e5](https://github.com/cabrera-evil/compralatino-orders-api/commit/70678e5bcb6559f575d0a220448e2085671bd93a))
* **docker:** migrate and seed on container start ([7af4af7](https://github.com/cabrera-evil/compralatino-orders-api/commit/7af4af77efb53ff52fdcb13ae64090acbbd19224))
* **docker:** redeclare the pnpm version arg in the base stage ([b2e5f6a](https://github.com/cabrera-evil/compralatino-orders-api/commit/b2e5f6a3275a09e99b0597426e8b9bba01367050))
* **health:** make disk threshold a percentage configurable via HEALTH_DISK_THRESHOLD_PERCENT ([947ea40](https://github.com/cabrera-evil/compralatino-orders-api/commit/947ea40e69aa3d200a6135072dc54b8636497129))
* **orders:** return 404 for out-of-range ids and 400 for non-string status ([8f87f2e](https://github.com/cabrera-evil/compralatino-orders-api/commit/8f87f2e991496a479e92d73d0397103502a25c12))
* **ws:** avoid logger name clash with the io adapter ([dee4268](https://github.com/cabrera-evil/compralatino-orders-api/commit/dee4268b0baab4fd336f5ac489dc339e2576f8f3))

## [1.4.0](https://github.com/cabrera-evil/nestjs-template/compare/v1.3.1...v1.4.0) (2025-09-18)

### Features

* prisma integration ([21d711c](https://github.com/cabrera-evil/nestjs-template/commit/21d711cfa7ed100dd147a60006ee1f42925f32f7))

### Bug Fixes

* missing deps from pnpm lock ([9f83b1a](https://github.com/cabrera-evil/nestjs-template/commit/9f83b1a3eda1ba3156b48dc3db83f9b253956eb1))

## [1.4.0-beta.1](https://github.com/cabrera-evil/nestjs-template/compare/v1.3.1...v1.4.0-beta.1) (2025-09-18)

### Features

* prisma integration ([21d711c](https://github.com/cabrera-evil/nestjs-template/commit/21d711cfa7ed100dd147a60006ee1f42925f32f7))

### Bug Fixes

* missing deps from pnpm lock ([9f83b1a](https://github.com/cabrera-evil/nestjs-template/commit/9f83b1a3eda1ba3156b48dc3db83f9b253956eb1))

## [1.3.1](https://github.com/cabrera-evil/nestjs-template/compare/v1.3.0...v1.3.1) (2025-08-10)

### Bug Fixes

* cloudinary provider export ([0ff0450](https://github.com/cabrera-evil/nestjs-template/commit/0ff045098baf4027fb8b3ad3c48e8eef76d3a9fe))

## [1.3.1-beta.1](https://github.com/cabrera-evil/nestjs-template/compare/v1.3.0...v1.3.1-beta.1) (2025-08-10)

### Bug Fixes

* cloudinary provider export ([0ff0450](https://github.com/cabrera-evil/nestjs-template/commit/0ff045098baf4027fb8b3ad3c48e8eef76d3a9fe))

## [1.3.0](https://github.com/cabrera-evil/nestjs-template/compare/v1.2.0...v1.3.0) (2025-08-10)

### Features

* conditional bullmq config integration ([ab97a32](https://github.com/cabrera-evil/nestjs-template/commit/ab97a3297bbf06de25d740a2feb5b9c34965c1f6))
* env.d.ts for production config ([c2ee3d3](https://github.com/cabrera-evil/nestjs-template/commit/c2ee3d3d286c7fb31a92fc110d510b8aedb7ff70))

### Bug Fixes

* mail config types ([b20c140](https://github.com/cabrera-evil/nestjs-template/commit/b20c14036b4a6c2c443f679c29165b0d7d2ac0a3))

## [1.2.0](https://github.com/cabrera-evil/nestjs-template/compare/v1.1.0...v1.2.0) (2025-07-21)

### Features

* jwt implementation with cloudinary provider ([41933b9](https://github.com/cabrera-evil/nestjs-template/commit/41933b95ea63daeece81e4d956402d03c8e18ea6))
* socket gateway integration ([4d7b122](https://github.com/cabrera-evil/nestjs-template/commit/4d7b122b17a7e2d4ba2e3cb8c308944e52391b87))
## [1.2.0-beta.3](https://github.com/cabrera-evil/nestjs-template/compare/v1.2.0-beta.2...v1.2.0-beta.3) (2025-08-10)

### Reverts

* Revert "feat: check ts types hook" ([daef3fb](https://github.com/cabrera-evil/nestjs-template/commit/daef3fbc0521d69a87b6e2655f2151ce2257aee7))

## [1.2.0-beta.2](https://github.com/cabrera-evil/nestjs-template/compare/v1.2.0-beta.1...v1.2.0-beta.2) (2025-08-10)

### Features

* check ts types hook ([b814d1b](https://github.com/cabrera-evil/nestjs-template/commit/b814d1b6142f481a23f5d875abb527d9db35f636))
* conditional bullmq config integration ([ab97a32](https://github.com/cabrera-evil/nestjs-template/commit/ab97a3297bbf06de25d740a2feb5b9c34965c1f6))
* env.d.ts for production config ([c2ee3d3](https://github.com/cabrera-evil/nestjs-template/commit/c2ee3d3d286c7fb31a92fc110d510b8aedb7ff70))

### Bug Fixes

* mail config types ([b20c140](https://github.com/cabrera-evil/nestjs-template/commit/b20c14036b4a6c2c443f679c29165b0d7d2ac0a3))

## [1.2.0-beta.1](https://github.com/cabrera-evil/nestjs-template/compare/v1.1.0...v1.2.0-beta.1) (2025-07-21)

### Features

* jwt implementation with cloudinary provider ([41933b9](https://github.com/cabrera-evil/nestjs-template/commit/41933b95ea63daeece81e4d956402d03c8e18ea6))
* socket gateway integration ([4d7b122](https://github.com/cabrera-evil/nestjs-template/commit/4d7b122b17a7e2d4ba2e3cb8c308944e52391b87))

## [1.1.0](https://github.com/cabrera-evil/nestjs-template/compare/v1.0.0...v1.1.0) (2025-06-19)

### Features

* puppeteer integration with dynamic swagger conf ([7847a99](https://github.com/cabrera-evil/nestjs-template/commit/7847a9973f04e133d93f83a93c0ef3e6f86b9206))

## [1.1.0-beta.1](https://github.com/cabrera-evil/nestjs-template/compare/v1.0.0...v1.1.0-beta.1) (2025-06-19)

### Features

* puppeteer integration with dynamic swagger conf ([7847a99](https://github.com/cabrera-evil/nestjs-template/commit/7847a9973f04e133d93f83a93c0ef3e6f86b9206))

## 1.0.0 (2025-06-02)

### Features

* base config ([44e1e31](https://github.com/cabrera-evil/nestjs-template/commit/44e1e31744fdc6aa49ad65b6b5615b1e32b37fec))
* config kubectl runner on pipeline ([529527f](https://github.com/cabrera-evil/nestjs-template/commit/529527f4b9e658db17bce0671774fc77a241a1a0))
* configmap namespace ([1623134](https://github.com/cabrera-evil/nestjs-template/commit/1623134f7a8ba8d10494a5fc6df1fe16cf6d7cc1))
* copy kubeconfig file ([f24a981](https://github.com/cabrera-evil/nestjs-template/commit/f24a981e2875bec1e9250ba0a2faf2c5efc9854e))
* dynamic env file ([a557c85](https://github.com/cabrera-evil/nestjs-template/commit/a557c8598d720706f3e2930e494331f409b964c9))
* health module and kube deployment settings ([ef1f6f2](https://github.com/cabrera-evil/nestjs-template/commit/ef1f6f229e097e609e92bb738c54e17748e448ed))
* jenkins and docker files ([e5e924e](https://github.com/cabrera-evil/nestjs-template/commit/e5e924ed53e195a17be250601bd9375f11c60524))
* jenkins slave and github trigger ([9bc25a8](https://github.com/cabrera-evil/nestjs-template/commit/9bc25a8b527f528451836e81f533f6b8a478640e))
* k8s config ([0ec3418](https://github.com/cabrera-evil/nestjs-template/commit/0ec341878660563ec7c807f61b00ce6e73b111aa))
* kaniko build ([45b0f41](https://github.com/cabrera-evil/nestjs-template/commit/45b0f41caf4fd1f2fbfa9ed054b26b3e354229a1))
* loadbalancer for production network settings ([32ab72f](https://github.com/cabrera-evil/nestjs-template/commit/32ab72fbcec6cee1103fdd4e2f644bef965b1535))
* node k8 ([55e2d46](https://github.com/cabrera-evil/nestjs-template/commit/55e2d46c381e2e63a1c20d2e450b4bd5a079e703))
* op credential manager ([35354dc](https://github.com/cabrera-evil/nestjs-template/commit/35354dc6e1df0a2797012e221682a8ff8480337b))
* postgres config with production migrations ([90d9c0a](https://github.com/cabrera-evil/nestjs-template/commit/90d9c0a76515f0d5262682c7f2c45bb7e5ac8e19))
* read configmap with kustomize ([ca0bdcc](https://github.com/cabrera-evil/nestjs-template/commit/ca0bdcc1954c0ad4df018eab7fab41d1f684e1e6))
* secrets kubeconf ([a77ae0b](https://github.com/cabrera-evil/nestjs-template/commit/a77ae0b79823c7a40601d4a52fe04154f05fdf41))
* shared lib functions ([0ee3f0e](https://github.com/cabrera-evil/nestjs-template/commit/0ee3f0e5b74ed9e29bae5e2424e64271cff01f4a))

### Bug Fixes

* configmap copy ([cc8b470](https://github.com/cabrera-evil/nestjs-template/commit/cc8b4709d844ea15d2b22a2727653b9190c0a263))
* configmap copy ([23998c2](https://github.com/cabrera-evil/nestjs-template/commit/23998c23e21b23f8ae33331645cde9e403ed26d1))
* configmap debug ([57be887](https://github.com/cabrera-evil/nestjs-template/commit/57be887c6c99b50758bbe3daff71e21cec36e558))
* configmap to env ([79adbfe](https://github.com/cabrera-evil/nestjs-template/commit/79adbfe9a9666ab82f6fe698af3d2b15e19594d5))
* configmap to env ([d1a4fd4](https://github.com/cabrera-evil/nestjs-template/commit/d1a4fd4c1fe59cfcb7fff4d4cb340c89d64c0a5d))
* docker tags array ([bb0fbbd](https://github.com/cabrera-evil/nestjs-template/commit/bb0fbbdb9e66557641b3fd71a06e76eeb564c9f6))
* ingress className ([86df3b9](https://github.com/cabrera-evil/nestjs-template/commit/86df3b966874276e44a1b00f00963473c480897a))
* jenkins environment variables set ([f39db33](https://github.com/cabrera-evil/nestjs-template/commit/f39db33d94c967c97d65f56a1e9b69d734b2b369))
* kubeconfig configure ([a2f9b02](https://github.com/cabrera-evil/nestjs-template/commit/a2f9b02a8825056f1980e903d9bef42469740ceb))
* kubeconfig configure ([1d2a54f](https://github.com/cabrera-evil/nestjs-template/commit/1d2a54fba5da578f9cdf141bd3fc57c6f9a71a12))
* kubeconfig configure ([94359ac](https://github.com/cabrera-evil/nestjs-template/commit/94359ac608e5cb0d5bcaf11b0fd4603c6cad6549))
* kustomize build ([b3ccb44](https://github.com/cabrera-evil/nestjs-template/commit/b3ccb446cbe5e19766c9fa4c381e99b98e2f8215))
* kustomize configmap script ([fc02e38](https://github.com/cabrera-evil/nestjs-template/commit/fc02e38dfc86c6a67dc75d696be9fa67c2af16f2))
* missing bracket ([96fa739](https://github.com/cabrera-evil/nestjs-template/commit/96fa7399319c1c122385dca4c2e55709243b753e))
* missing conventional commits dep ([ccb8e4f](https://github.com/cabrera-evil/nestjs-template/commit/ccb8e4f37bf253d47ae508edd117cef30ef73f6f))
* namespace deploy ([4b0b24f](https://github.com/cabrera-evil/nestjs-template/commit/4b0b24f72bbced060daf1572561f09ccb3f64b39))
* post step ([9c86f85](https://github.com/cabrera-evil/nestjs-template/commit/9c86f853ea08ec3fd90358093e4d7a2bc84270cd))
* redis cache storage ([9fc2246](https://github.com/cabrera-evil/nestjs-template/commit/9fc2246634da3b0dc35a6c7d43c883b1088baadd))
* smtp transporter and microservices ([0c8ca9b](https://github.com/cabrera-evil/nestjs-template/commit/0c8ca9b7edb6ddeda79fcc45235c45ef9b446eb0))
