/* global app, req, vuex, store */

const { LOCALE_CODE_KEY, LOCALE_DOMAIN_KEY } = require('./constants')

/**
 * Get an array of locale codes from a list of locales
 * @param  {Array}  locales Locales list from nuxt config
 * @return {Array}          List of locale codes
 */
const getLocaleCodes = (locales = []) => {
  if (locales.length) {
    // If first item is a sting, assume locales is a list of codes already
    if (typeof locales[0] === 'string') {
      return locales
    }
    // Attempt to get codes from a list of objects
    if (typeof locales[0][LOCALE_CODE_KEY] === 'string') {
      return locales.map(locale => locale[LOCALE_CODE_KEY])
    }
  }
  return []
}

exports.getLocaleCodes = getLocaleCodes

/**
 * Retrieve page's options from the module's configuration for a given route
 * @param  {Object} route         Route
 * @param  {Object} pages         Pages options from module's configuration
 * @param  {Array} locales        Locale from module's configuration
 * @param  {String} pagesDir      Pages dir from Nuxt's configuration
 * @param  {String} defaultLocale Default locale from Nuxt's configuration
 * @return {Object}               Page options
 */
exports.getPageOptions = (route, pages, locales, pagesDir, defaultLocale) => {
  const options = {
    locales: getLocaleCodes(locales),
    paths: {}
  }
  const pattern = new RegExp(`${pagesDir}/`, 'i')
  const chunkName = route.chunkName ? route.chunkName.replace(pattern, '') : route.name
  const pageOptions = pages[chunkName]
  // Routing disabled
  if (pageOptions === false) {
    return false
  }
  // Skip if no page options defined
  if (!pageOptions) {
    return options
  }

  // Remove disabled locales from page options
  options.locales = options.locales.filter(locale => pageOptions[locale] !== false)

  // Construct paths object
  options.locales
    .forEach(locale => {
      if (typeof pageOptions[locale] === 'string') {
        // Set custom path if any
        options.paths[locale] = pageOptions[locale]
      } else if (typeof pageOptions[defaultLocale] === 'string') {
        // Set default locale's custom path if any
        options.paths[locale] = pageOptions[defaultLocale]
      }
    })

  return options
}

/**
 * Extract locale code from given route:
 * - If route has a name, try to extract locale from it
 * - Otherwise, fall back to using the routes'path
 * @param  {Object} route               Route
 * @param  {String} routesNameSeparator Separator used to add locale suffixes in routes names
 * @param  {String} defaultLocaleRouteNameSuffix Suffix added to default locale routes names
 * @param  {Array}  locales             Locales list from nuxt config
 * @return {String}                     Locale code found if any
 */
exports.getLocaleFromRoute = (route = {}, routesNameSeparator = '', defaultLocaleRouteNameSuffix = '', locales = []) => {
  const codes = getLocaleCodes(locales)
  const localesPattern = `(${codes.join('|')})`
  const defaultSuffixPattern = `(?:${routesNameSeparator}${defaultLocaleRouteNameSuffix})?`
  // Extract from route name
  if (route.name) {
    const regexp = new RegExp(`${routesNameSeparator}${localesPattern}${defaultSuffixPattern}$`, 'i')
    const matches = route.name.match(regexp)
    if (matches && matches.length > 1) {
      return matches[1]
    }
  } else if (route.path) {
    // Extract from path
    const regexp = new RegExp(`^/${localesPattern}/`, 'i')
    const matches = route.path.match(regexp)
    if (matches && matches.length > 1) {
      return matches[1]
    }
  }
  return null
}

/**
 * Get x-forwarded-host
 * @return {String} x-forwarded-host
 */
const getForwarded = () => (
  process.browser ? window.location.href.split('/')[2] : (req.headers['x-forwarded-host'] ? req.headers['x-forwarded-host'] : req.headers.host)
)

exports.getForwarded = getForwarded

/**
 * Get hostname
 * @return {String} Hostname
 */
const getHostname = () => (
  process.browser ? window.location.href.split('/')[2] : req.headers.host // eslint-disable-line
)

exports.getHostname = getHostname

/**
 * Get locale code that corresponds to current hostname
 * @return {String} Locade code found if any
 */
exports.getLocaleDomain = () => {
  const hostname = app.i18n.forwardedHost ? getForwarded() : getHostname()
  if (hostname) {
    const localeDomain = app.i18n.locales.find(l => l[LOCALE_DOMAIN_KEY] === hostname) // eslint-disable-line
    if (localeDomain) {
      return localeDomain[LOCALE_CODE_KEY]
    }
  }
  return null
}

/**
 * Dispatch store module actions to keep it in sync with app's locale data
 * @param  {String} locale   Current locale
 * @param  {Object} messages Current messages
 * @return {Promise(void)}
 */
exports.syncVuex = async (locale = null, messages = null) => {
  if (vuex && store) {
    if (locale !== null && vuex.syncLocale) {
      await store.dispatch(vuex.moduleName + '/setLocale', locale)
    }
    if (messages !== null && vuex.syncMessages) {
      await store.dispatch(vuex.moduleName + '/setMessages', messages)
    }
  }
}
