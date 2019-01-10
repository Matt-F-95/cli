'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let Utils = require('../../lib/utils')

function * run (context, heroku) {
  let teams = yield heroku.get('/teams')

  if (context.flags.enterprise) {
    teams = teams.filter(o => o.type === 'enterprise')
  }

  if (context.flags.json) {
    Utils.printGroupsJSON(teams)
  } else {
    Utils.printGroups(teams, {label: 'Teams'})
  }
}

module.exports = {
  topic: 'organizations',
  description: 'list the teams that you are a member of',
  needsAuth: true,
  flags: [
    {name: 'json', description: 'output in json format'},
    {name: 'enterprise', hasValue: false, description: 'filter by enterprise teams'},
    {name: 'teams', hasValue: false, description: 'filter by teams', hidden: true}
  ],
  run: cli.command(co.wrap(run))
}
