import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const EC_COUNTRY = "ec"
const REGION_NAME = "Ecuador"
const LOCATION_NAME = "Bodega Quito"
const FULFILLMENT_SET_NAME = "Ecuador delivery"
const SERVICE_ZONE_NAME = "Ecuador"
const SHIPPING_OPTION_NAME = "Standard"

export default async function addEcRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)

  const [store] = await storeModuleService.listStores()
  if (!store) {
    throw new Error("No store found. Run migrations first.")
  }

  const salesChannels = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })
  const defaultSalesChannel = salesChannels[0]
  if (!defaultSalesChannel) {
    throw new Error("Default Sales Channel not found.")
  }

  logger.info("Setting USD as the store default currency (EUR stays secondary)...")
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "Dulce Brujo",
        supported_currencies: [
          { currency_code: "usd", is_default: true },
          { currency_code: "eur", is_default: false },
        ],
        default_sales_channel_id: defaultSalesChannel.id,
      },
    },
  })

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })

  let ecRegion = regions.find((region) =>
    region.countries?.some((country) => country.iso_2 === EC_COUNTRY)
  )

  if (ecRegion) {
    logger.info(`Region ${REGION_NAME} already exists (${ecRegion.id}).`)
  } else {
    logger.info("Creating Ecuador region in USD...")
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: REGION_NAME,
            currency_code: "usd",
            countries: [EC_COUNTRY],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    ecRegion = result[0]
    logger.info(`Created region ${REGION_NAME} (${ecRegion.id}).`)
  }

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  })
  const hasEcTax = taxRegions.some(
    (taxRegion) => taxRegion.country_code === EC_COUNTRY
  )

  if (hasEcTax) {
    logger.info("Tax region for Ecuador already exists.")
  } else {
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: EC_COUNTRY,
          provider_id: "tp_system",
        },
      ],
    })
    logger.info("Created tax region for Ecuador.")
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  let quito = stockLocations.find((location) => location.name === LOCATION_NAME)

  if (quito) {
    logger.info(`Stock location ${LOCATION_NAME} already exists (${quito.id}).`)
  } else {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: LOCATION_NAME,
            address: {
              city: "Quito",
              country_code: "EC",
              address_1: "Av. Amazonas y Naciones Unidas",
            },
          },
        ],
      },
    })
    quito = result[0]
    logger.info(`Created stock location ${LOCATION_NAME} (${quito.id}).`)
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: quito.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    })
  } catch {
    logger.info("Fulfillment provider already linked to Bodega Quito.")
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    throw new Error("No shipping profile found.")
  }

  const existingSets = await fulfillmentModuleService.listFulfillmentSets(
    { name: FULFILLMENT_SET_NAME },
    { relations: ["service_zones", "service_zones.geo_zones"] }
  )

  let fulfillmentSet = existingSets[0]
  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: FULFILLMENT_SET_NAME,
      type: "shipping",
      service_zones: [
        {
          name: SERVICE_ZONE_NAME,
          geo_zones: [
            {
              country_code: EC_COUNTRY,
              type: "country",
            },
          ],
        },
      ],
    })
    logger.info("Created Ecuador fulfillment set and service zone.")
  } else {
    logger.info("Ecuador fulfillment set already exists.")
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: quito.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    })
  } catch {
    logger.info("Fulfillment set already linked to Bodega Quito.")
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: quito.id,
      add: [defaultSalesChannel.id],
    },
  })

  const serviceZone =
    fulfillmentSet.service_zones?.find((zone) => zone.name === SERVICE_ZONE_NAME) ||
    fulfillmentSet.service_zones?.[0]

  if (!serviceZone) {
    throw new Error("Ecuador service zone not found.")
  }

  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
  })
  const hasStandard = shippingOptions.some(
    (option) =>
      option.name === SHIPPING_OPTION_NAME &&
      option.service_zone_id === serviceZone.id
  )

  if (hasStandard) {
    logger.info("Standard shipping for Ecuador already exists.")
  } else {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: SHIPPING_OPTION_NAME,
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZone.id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Envío a Ecuador en 2-3 días.",
            code: "standard",
          },
          prices: [
            { currency_code: "usd", amount: 10 },
            { currency_code: "eur", amount: 10 },
            { region_id: ecRegion.id, amount: 10 },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    })
    logger.info("Created Standard shipping option for Ecuador ($10 USD).")
  }

  logger.info("Ecuador USD region is ready. /ec should show dollars; /dk stays in euros.")
}
