// CHANGELOG:
// - state is now shown only when --extended is provided

import * as Heroku from '@heroku-cli/schema'

import {Command, flags} from '@heroku-cli/command'

import ux, {cli} from 'cli-ux'

function getAddonName(addon: Heroku.AddOn) {
  let addonService: Heroku.AddOnService | undefined = addon.addon_service
  if (addonService && addonService.human_name) {
    return `${addonService.human_name} (${addon.name})`
  } else {
    return addon.name
  }
}

function getPrice(addon: Heroku.Plan) {
  if ((addon.plan) && (addon.plan.price)) {
    const price = addon.plan.price
    if (price.contract) return 'contract'
    if (price.cents === 0) return 'free'
    // implement something smarter to return full price in dollars
    return price.cents
  }
}

function getAddonState(addon: Heroku.AddOn) {
  let state

  switch (addon.state) {
  case 'provisioned':
    state = 'created'
    break
  case 'provisioning':
    state = 'creating'
    break
  case 'deprovisioned':
    state = 'errored'
  }
  return state
}
export default class AddonsIndex extends Command {
  static description = 'lists your add-ons and attachments'

  static examples = [
    '$ heroku addons --all',
    '$ heroku addons --app acme-inc-www'
  ]

  static flags = {
    all: flags.boolean({char: 'A', description: 'show add-ons and attachments for all accessible apps', required: false}),
    app: flags.app(),
    json: flags.boolean({description: 'returns add-ons in json format', required: false}),
    ...cli.table.flags()
  }

  async run() {
    const {flags} = this.parse(AddonsIndex)
    let url

    if (flags.app) {
      url = `/apps/${flags.app}/addons`
    } else {
      url = '/addons'
    }

    const headers = {'Accept-Expansion': 'addon_service, plan'}
    const {body: addons} = await this.heroku.get<Heroku.AddOn[]>(url, {headers})

    if (flags.json) {
      ux.styledJSON(addons)
    } else {
      ux.table(addons, {
        name: {
          get: getAddonName
        },
        plan: {
          get: row => row.plan && row.plan.name
        },
        price: {
          get: getPrice
        },
        state: {
          get: getAddonState,
          extended: true
        }
      }, {
        ...flags,
        sort: flags.sort || 'name'
      })
    }
  }
}
