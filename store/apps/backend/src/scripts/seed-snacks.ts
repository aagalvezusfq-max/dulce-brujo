import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const STORE_NAME = "Dulce Brujo"
const CATEGORY_NAME = "Dulce"
const COLLECTION_TITLE = "Dulce Brujo"
const COLLECTION_HANDLE = "cacao-brujo"

const HIDE_HANDLES = [
  "chochos-tostados",
  "maiz-tostado",
  "panela-en-cubos",
  "t-shirt",
  "sweatshirt",
  "sweatpants",
  "shorts",
]

const PRODUCTS = [
  {
    title: "Barra Dulzor Eclipse",
    handle: "barra-eclipse-72",
    sku: "CACAO-ECLIPSE",
    description:
      "Tableta dulce de la ficticia Hacienda Umbra. 72% cacao con un toque de azúcar quemada y mora. 80 g.",
    usd: 6.5,
    eur: 6.5,
    weight: 80,
    image: "http://localhost:8000/products/barra-eclipse.jpg",
  },
  {
    title: "Nibs Caramelo Relámpago",
    handle: "nibs-relampago",
    sku: "CACAO-NIBS",
    description:
      "Nibs cubiertos de caramelo relámpago: crujientes, dulces y un poco brujos. Frasco de 150 g.",
    usd: 5,
    eur: 5,
    weight: 150,
    image: "http://localhost:8000/products/nibs-relampago.jpg",
  },
  {
    title: "Trufas Azúcar Invisible",
    handle: "trufas-rio-invisible",
    sku: "CACAO-TRUFAS",
    description:
      "Seis trufas de azúcar invisible: se ven de chocolate y saben a caramelo de flor. Caja Dulce Brujo.",
    usd: 12,
    eur: 12,
    weight: 180,
    image: "http://localhost:8000/products/trufas-rio.jpg",
  },
]

export default async function seedCacao({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const storeModuleService = container.resolve(Modules.STORE)

  const [store] = await storeModuleService.listStores()
  if (store) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { name: STORE_NAME },
      },
    })
    logger.info(`Store renamed to ${STORE_NAME}.`)
  }

  const [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })
  if (!defaultSalesChannel) {
    throw new Error("Default Sales Channel not found. Run migrations first.")
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    throw new Error("No shipping profile found.")
  }

  const hidden = await productModuleService.listProducts({
    handle: HIDE_HANDLES,
  })
  for (const product of hidden) {
    if (product.status !== ProductStatus.DRAFT) {
      await productModuleService.updateProducts(product.id, {
        status: ProductStatus.DRAFT,
      })
      logger.info(`Hid leftover product ${product.handle}.`)
    }
  }

  let [category] = await productModuleService.listProductCategories({
    name: CATEGORY_NAME,
  })
  if (!category) {
    const [oldCacaoCategory] = await productModuleService.listProductCategories({
      name: "Cacao",
    })
    if (oldCacaoCategory) {
      await productModuleService.updateProductCategories(oldCacaoCategory.id, {
        name: CATEGORY_NAME,
      })
      category = oldCacaoCategory
      logger.info("Renamed category Cacao → Dulce.")
    } else {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: [{ name: CATEGORY_NAME, is_active: true }],
        },
      })
      category = result[0]
      logger.info(`Created category ${CATEGORY_NAME}.`)
    }
  }

  let [collection] = await productModuleService.listProductCollections({
    handle: COLLECTION_HANDLE,
  })
  if (!collection) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: {
        collections: [{ title: COLLECTION_TITLE, handle: COLLECTION_HANDLE }],
      },
    })
    collection = result[0]
    logger.info(`Created collection ${COLLECTION_TITLE}.`)
  } else {
    await productModuleService.updateProductCollections(collection.id, {
      title: COLLECTION_TITLE,
    })
    logger.info(`Collection renamed to ${COLLECTION_TITLE}.`)
  }


  const existing = await productModuleService.listProducts({
    handle: PRODUCTS.map((item) => item.handle),
  })
  const existingHandles = new Set(existing.map((product) => product.handle))
  const toCreate = PRODUCTS.filter((item) => !existingHandles.has(item.handle))

  for (const product of existing) {
    const catalog = PRODUCTS.find((item) => item.handle === product.handle)
    if (!catalog) {
      continue
    }
    await productModuleService.updateProducts(product.id, {
      title: catalog.title,
      description: catalog.description,
      images: [{ url: catalog.image }],
      status: ProductStatus.PUBLISHED,
    })
    logger.info(`Updated ${product.handle} → ${catalog.title}.`)
  }

  const leftoverCategories = await productModuleService.listProductCategories({
    name: ["Shirts", "Sweatshirts", "Pants", "Merch", "Snacks Andinos"],
  })
  for (const leftover of leftoverCategories) {
    if (leftover.is_active) {
      await productModuleService.updateProductCategories(leftover.id, {
        is_active: false,
      })
      logger.info(`Hid leftover category ${leftover.name}.`)
    }
  }

  if (!toCreate.length) {
    logger.info("Cacao products already exist. Skipping create.")
  } else {
    await createProductsWorkflow(container).run({
      input: {
        products: toCreate.map((item) => ({
          title: item.title,
          handle: item.handle,
          description: item.description,
          category_ids: [category.id],
          collection_id: collection.id,
          weight: item.weight,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [{ url: item.image }],
          options: [{ title: "Presentación", values: ["Unidad"] }],
          variants: [
            {
              title: "Unidad",
              sku: item.sku,
              options: { Presentación: "Unidad" },
              manage_inventory: true,
              prices: [
                { amount: item.usd, currency_code: "usd" },
                { amount: item.eur, currency_code: "eur" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
        })),
      },
    })
    logger.info(`Created cacao products: ${toCreate.map((item) => item.title).join(", ")}.`)
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  if (!stockLocations.length) {
    throw new Error("No stock locations found. Run add-ec-region.ts first.")
  }

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  })

  const cacaoSkus = new Set(PRODUCTS.map((item) => item.sku))
  const cacaoItems = inventoryItems.filter((item) => cacaoSkus.has(item.sku || ""))

  const { data: existingLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id", "location_id"],
  })
  const levelKey = new Set(
    existingLevels.map((level) => `${level.inventory_item_id}:${level.location_id}`)
  )

  const inventoryLevels: CreateInventoryLevelInput[] = []
  for (const item of cacaoItems) {
    for (const location of stockLocations) {
      const key = `${item.id}:${location.id}`
      if (levelKey.has(key)) {
        continue
      }
      inventoryLevels.push({
        inventory_item_id: item.id,
        location_id: location.id,
        stocked_quantity: 20,
      })
    }
  }

  if (inventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    })
    logger.info(`Set inventory of 20 for ${inventoryLevels.length} cacao location rows.`)
  }

  logger.info("Dulce Brujo catalog is ready.")
}
